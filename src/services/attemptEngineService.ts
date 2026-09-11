/**
 * Server-Authoritative Attempt Engine Service
 * Consumed by both Web (React) and mobile platforms.
 */

import { supabase } from "@/integrations/supabase/client";
import { calculateAttemptScore, QuestionScoringRule } from "./attemptScoring";
import { fetchTopicQuestions } from "./drillService";
import { FALLBACK_DRILL_QUESTIONS } from "@/data/examCatalog";
import { getFullMockQuestions, getMockTestPreset } from "@/data/fullMockQuestionBank";
import type {
  StartAttemptRequest,
  StartAttemptResponse,
  SaveAnswersRequest,
  SaveAnswersResponse,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  AttemptResultResponse,
  LocalAttemptDraft,
  SanitizedQuestionItem,
} from "@/types/attemptEngine";

const LOCAL_DRAFT_PREFIX = "pk_draft_";

// TODO(types): regenerate supabase types via supabase gen types —
// start_exam_attempt, save_exam_progress, submit_exam_attempt and get_attempt_results
// are missing from the generated Database functions, and student_mistakes is missing
// from the generated Database tables.
const staleRpc = supabase.rpc as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

function mistakesTable() {
  return supabase.from("student_mistakes" as unknown as "questions");
}

interface TopicInfo {
  id: string;
  name: string;
  subject_id: string | null;
  subjects: { name: string | null } | { name: string | null }[] | null;
}

function subjectNameOf(rel: TopicInfo["subjects"]): string {
  return (Array.isArray(rel) ? rel[0]?.name : rel?.name) ?? "General";
}

/** Drops unanswered (null) entries so local drafts fit Record<string, string> state. */
function stringAnswers(answers: Record<string, string | null>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(answers).filter((entry): entry is [string, string] => entry[1] !== null)
  );
}

/**
 * Persists answer draft locally to IndexedDB/localStorage for resilient crash recovery.
 */
export function saveLocalDraft(draft: LocalAttemptDraft): void {
  try {
    localStorage.setItem(`${LOCAL_DRAFT_PREFIX}${draft.attemptId}`, JSON.stringify(draft));
  } catch (err) {
    console.warn("[AttemptEngine] Failed to persist local draft to storage", err);
  }
}

/**
 * Retrieves cached local draft for attempt recovery after page reload or network loss.
 */
export function getLocalDraft(attemptId: string): LocalAttemptDraft | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_DRAFT_PREFIX}${attemptId}`);
    if (!raw) return null;
    return JSON.parse(raw) as LocalAttemptDraft;
  } catch (err) {
    console.warn("[AttemptEngine] Failed to read local draft", err);
    return null;
  }
}

/**
 * Cleans up local draft once test is successfully submitted.
 */
export function clearLocalDraft(attemptId: string): void {
  try {
    localStorage.removeItem(`${LOCAL_DRAFT_PREFIX}${attemptId}`);
  } catch (err) {
    console.warn("[AttemptEngine] Failed to clear local draft", err);
  }
}

/**
 * 1. Start or resume an authorized exam attempt.
 * Server creates or resumes attempt record, establishes server deadline,
 * and returns sanitized questions with ZERO correct_answer or explanation leakage.
 */
export async function startAttempt(req: StartAttemptRequest): Promise<StartAttemptResponse> {
  const { data, error } = await staleRpc("start_exam_attempt", {
    p_test_id: req.testId,
    p_mode: req.mode || "simulation",
  });

  if (!error && data) {
    const res = data as StartAttemptResponse;
    if (res.questions && res.questions.length > 0) {
      const local = getLocalDraft(res.attemptId);
      if (local && local.answers) {
        res.savedResponses = {
          ...res.savedResponses,
          ...stringAnswers(local.answers),
        };
      }
      return res;
    }
  }

  // Graceful fallback if RPC is pending deployment on remote database or questions empty
  console.warn("[AttemptEngine] Primary start_exam_attempt RPC unavailable or returned 0 questions, synthesizing sanitized test paper", error?.message);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Authentication required to take exam");
  }

  const { data: testData } = await supabase
    .from("mock_tests")
    .select("*")
    .eq("id", req.testId)
    .maybeSingle();

  // mock_tests has no negative_marking columns in generated types (legacy runtime fields).
  const legacyTestFlags = testData as unknown as {
    negative_marking?: boolean | null;
    negative_marks_per_question?: number | null;
  } | null;

  const presetMeta = getMockTestPreset(req.testId);

  // Check if this is a topic-based chapter test
  const isTopicId = req.testId.startsWith("topic-") || (!testData && !presetMeta && req.testId.length < 30);
  let topicInfo: TopicInfo | null = null;
  if (isTopicId) {
    const rawTopicId = req.testId.replace(/^topic-/, "");
    const { data: tData } = await supabase
      .from("topics")
      .select("id, name, subject_id, subjects(name)")
      .eq("id", rawTopicId)
      .maybeSingle();
    topicInfo = tData as unknown as TopicInfo | null;
  }

  const durationMinutes = topicInfo
    ? 15
    : (testData?.duration_minutes || presetMeta?.duration || 90);
  let totalMarks = topicInfo
    ? 15
    : (testData?.total_marks || presetMeta?.marks || presetMeta?.questions || 100);
  let passingMarks = topicInfo
    ? 6
    : (testData?.passing_marks || Math.round(totalMarks * 0.4));
  const negativeMarking = Boolean(
    topicInfo
      ? true
      : (testData ? legacyTestFlags?.negative_marking : (presetMeta ? presetMeta.negative !== "No Negative" : true))
  );
  const negativeMarksPerQuestion = topicInfo
    ? 0.25
    : (legacyTestFlags?.negative_marks_per_question ?? (presetMeta?.negative ? parseFloat(presetMeta.negative.replace(/[^0-9.]/g, "")) || 0.25 : 0.25));
  const testTitle = topicInfo
    ? `${topicInfo.name} অধ্যায় মক টেস্ট 01`
    : (testData?.title || presetMeta?.title || "Panchayat Full Mock Test 1");

  const targetQuestions = topicInfo
    ? 15
    : (presetMeta?.questions || (testData?.total_marks && testData.total_marks >= 10 ? testData.total_marks : 100));

  let attemptId = "";
  let startedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  let savedResponses: Record<string, string> = {};
  let savedReviews: string[] = [];

  if (testData) {
    // Check if there is an active in-progress attempt to resume
    const { data: existingAttempt } = await supabase
      .from("test_attempts")
      .select("id, started_at")
      .eq("test_id", req.testId)
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAttempt) {
      attemptId = existingAttempt.id;
      startedAt = existingAttempt.started_at || startedAt;
    } else {
      // Create new in-progress attempt
      const { data: newAttempt, error: newAttErr } = await supabase
        .from("test_attempts")
        .insert({
          test_id: req.testId,
          user_id: session.user.id,
          score: 0,
          total_marks: totalMarks,
          percentage: 0,
          passed: false,
          is_active: true,
          started_at: startedAt,
        })
        .select("id, started_at")
        .single();

      if (!newAttErr && newAttempt) {
        attemptId = newAttempt.id;
      }
    }

    // Load drafts from test_answer_drafts
    const { data: savedDrafts } = await supabase
      .from("test_answer_drafts")
      .select("question_id, selected_answer, marked_for_review")
      .eq("test_id", req.testId)
      .eq("user_id", session.user.id);

    if (savedDrafts) {
      savedDrafts.forEach((sd: any) => {
        if (sd.selected_answer) savedResponses[sd.question_id] = sd.selected_answer;
        if (sd.marked_for_review) savedReviews.push(sd.question_id);
      });
    }
  }

  if (!attemptId) {
    attemptId = `att_${req.testId}_${Date.now()}`;
  }

  // Restore local draft backup
  const local = getLocalDraft(attemptId);
  if (local?.answers) {
    savedResponses = { ...savedResponses, ...stringAnswers(local.answers) };
  }
  if (local?.reviewFlags && local.reviewFlags.length > 0) {
    savedReviews = Array.from(new Set([...savedReviews, ...local.reviewFlags]));
  }

  let sanitizedQuestions: SanitizedQuestionItem[] = [];

  if (topicInfo) {
    // Topic-wise mock test: dynamically fetch 15 questions for this chapter!
    const subjectName = subjectNameOf(topicInfo.subjects);
    const topicQuestions = await fetchTopicQuestions(subjectName, topicInfo.name, "all", 15);
    sanitizedQuestions = topicQuestions.map((tq, idx) => ({
      id: `tq-${tq.id}`,
      questionId: tq.id,
      orderIndex: idx + 1,
      marks: 1,
      negativeMarks: negativeMarking ? negativeMarksPerQuestion : 0,
      questionText: tq.question_text,
      optionA: tq.option_a,
      optionB: tq.option_b,
      optionC: tq.option_c,
      optionD: tq.option_d,
      subject: tq.subject || subjectName,
      topic: tq.topic || topicInfo.name,
      difficulty: tq.difficulty || "medium",
      year: tq.year ?? undefined,
    }));
  } else {
    // Strictly sanitized query: NEVER query correct_answer or explanation
    const { data: questionsData, error: qErr } = await supabase
      .from("test_questions")
      .select("id, question_id, question_order, marks, questions(id, question_text, option_a, option_b, option_c, option_d, subject, topic, difficulty, year)")
      .eq("test_id", req.testId)
      .order("question_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (qErr) {
      console.warn("[AttemptEngine] test_questions query warning:", qErr.message);
    }

    if (questionsData && questionsData.length > 0) {
      // Strictly deliver 100% of uploaded questions: if admin uploaded N questions, deliver all N questions!
      sanitizedQuestions = questionsData.map((tq: any, idx: number) => {
        const q = Array.isArray(tq.questions) ? tq.questions[0] : tq.questions;
        return {
          id: tq.id,
          questionId: tq.question_id,
          orderIndex: tq.question_order ?? idx + 1,
          marks: tq.marks ?? 1,
          negativeMarks: negativeMarking ? negativeMarksPerQuestion : 0,
          questionText: q?.question_text || "",
          optionA: q?.option_a || "",
          optionB: q?.option_b || "",
          optionC: q?.option_c || "",
          optionD: q?.option_d || "",
          subject: q?.subject || "General",
          topic: q?.topic || "",
          difficulty: q?.difficulty || "medium",
          year: q?.year,
        };
      });

      // Recalculate total marks and passing marks dynamically to match exact uploaded questions
      totalMarks = sanitizedQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
      passingMarks = testData?.passing_marks && testData.passing_marks <= totalMarks
        ? testData.passing_marks
        : Math.round(totalMarks * 0.4);
    } else {
      // RLS lockdown: students have no direct test_questions SELECT, so an
      // empty read for a REAL seeded test means the paper is unreachable
      // (RLS or RPC outage) — never disguise the local bank as the real paper.
      // Local bank fallback stays ONLY for topic-practice / placeholder tests.
      const isTopicFallback = isTopicId || !testData;
      if (!isTopicFallback) {
        throw new Error(
          "Question paper unavailable (server attempt RPC failed and direct reads are locked down). " +
          "Please check connection and retry — do not attempt against placeholder questions."
        );
      }
      // ONLY fallback when 0 questions are uploaded to test_questions (e.g. unseeded/placeholder mock test)
      const fullMockQuestions = getFullMockQuestions(targetQuestions, req.testId || testTitle);
      sanitizedQuestions = fullMockQuestions.map((fq, idx) => ({
        id: `tq-${fq.id}`,
        questionId: fq.id,
        orderIndex: idx + 1,
        marks: 1,
        negativeMarks: negativeMarking ? negativeMarksPerQuestion : 0,
        questionText: fq.question_text,
        optionA: fq.option_a,
        optionB: fq.option_b,
        optionC: fq.option_c,
        optionD: fq.option_d,
        subject: fq.subject || "General Knowledge",
        topic: fq.topic || testTitle || "",
        difficulty: fq.difficulty || "medium",
        year: fq.year ?? undefined,
      }));
      totalMarks = sanitizedQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
      passingMarks = Math.round(totalMarks * 0.4);
    }
  }

  return {
    attemptId,
    testId: testData?.id || req.testId,
    testTitle,
    durationMinutes,
    totalMarks,
    passingMarks,
    negativeMarking,
    negativeMarksPerQuestion,
    serverTime: new Date().toISOString(),
    startedAt,
    expiresAt,
    questions: sanitizedQuestions,
    savedResponses,
    savedReviews,
  };
}

/**
 * 2. Save progress / Autosave
 * Idempotently updates the server with student's current answers and review flags.
 */
export async function saveAnswers(req: SaveAnswersRequest): Promise<SaveAnswersResponse> {
  // Always write locally first for zero-data-loss guarantee
  saveLocalDraft({
    attemptId: req.attemptId,
    testId: "",
    answers: req.answers,
    reviewFlags: req.reviewFlags || [],
    lastSavedAt: new Date().toISOString(),
    syncedWithServer: false,
    serverExpiresAt: "",
  });

  const { data, error } = await staleRpc("save_exam_progress", {
    p_attempt_id: req.attemptId,
    p_answers: req.answers as any,
    p_review_flags: (req.reviewFlags || []) as any,
  });

  if (!error && data) {
    const result = data as SaveAnswersResponse;
    const existing = getLocalDraft(req.attemptId);
    if (existing) {
      existing.syncedWithServer = true;
      saveLocalDraft(existing);
    }
    return result;
  }

  // Graceful fallback: persist to test_answer_drafts if authenticated
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && req.attemptId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.attemptId);
      if (isUuid) {
        // Find test_id for this attempt
        const { data: attemptRow } = await supabase
          .from("test_attempts")
          .select("test_id")
          .eq("id", req.attemptId)
          .maybeSingle();

        if (attemptRow?.test_id) {
          const drafts = Object.entries(req.answers).map(([qId, ans]) => ({
            test_id: attemptRow.test_id,
            user_id: session.user.id,
            question_id: qId,
            selected_answer: ans || null,
            marked_for_review: (req.reviewFlags || []).includes(qId),
            last_saved_at: new Date().toISOString(),
          }));

          if (drafts.length > 0) {
            await supabase.from("test_answer_drafts").upsert(drafts, {
              onConflict: "test_id,user_id,question_id",
            });
          }
        }
      }
    }
  } catch (draftErr) {
    console.warn("[AttemptEngine] Fallback draft upsert error:", draftErr);
  }

  return {
    success: true,
    serverTime: new Date().toISOString(),
    remainingSeconds: 3600,
    isExpired: false,
  };
}

/**
 * 3. Submit exam attempt
 * Commits answers and runs server-side deterministic grading.
 */
export async function submitAttempt(
  req: SubmitAttemptRequest,
  scoringFallbackRules?: QuestionScoringRule[]
): Promise<SubmitAttemptResponse> {
  const { data, error } = await staleRpc("submit_exam_attempt", {
    p_attempt_id: req.attemptId,
    p_final_answers: (req.finalAnswers || null) as any,
    p_time_taken_seconds: req.timeTakenSeconds || 0,
    p_tab_violations: req.tabViolations || 0,
    p_fullscreen_violations: req.fullscreenViolations || 0,
  });

  if (!error && data) {
    clearLocalDraft(req.attemptId);
    return data as SubmitAttemptResponse;
  }

  // Fallback: evaluate score deterministically using calculateAttemptScore and persist attempt
  console.warn("[AttemptEngine] Primary submit RPC unavailable, using deterministic evaluator", error?.message);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Authentication required to submit test");
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.attemptId);
  let resolvedTestId = (req as SubmitAttemptRequest & { testId?: string }).testId || "";

  if (isUuid && !resolvedTestId) {
    const { data: attData } = await supabase
      .from("test_attempts")
      .select("test_id")
      .eq("id", req.attemptId)
      .maybeSingle();
    if (attData?.test_id) {
      resolvedTestId = attData.test_id;
    }
  }

  // Retrieve canonical questions and answers for grading now that submission is triggered
  let rules: QuestionScoringRule[] = scoringFallbackRules || [];
  let candidateQuestions: any[] = [];
  let testTitle = "Mock Test";
  let passingMarks = 40;

  // Check if this is a topic-based test
  const rawTopicId = resolvedTestId.replace(/^topic-/, "");
  const { data: topicData } = await supabase
    .from("topics")
    .select("id, name, subject_id, subjects(name)")
    .eq("id", rawTopicId)
    .maybeSingle();

  if (topicData) {
    testTitle = `${topicData.name} অধ্যায় মক টেস্ট 01`;
    passingMarks = 6;
    const subjectName = subjectNameOf((topicData as unknown as TopicInfo | null)?.subjects ?? null);
    candidateQuestions = await fetchTopicQuestions(subjectName, topicData.name, "all", 25);
  }

  let testMeta: any = null;
  const presetMeta = getMockTestPreset(resolvedTestId);

  if (resolvedTestId) {
    const { data: tm } = await supabase
      .from("mock_tests")
      .select("id, title, passing_marks, total_marks")
      .eq("id", resolvedTestId)
      .maybeSingle();
    testMeta = tm;
    if (testMeta) {
      testTitle = testMeta.title;
      passingMarks = testMeta.passing_marks || 40;
    } else if (presetMeta) {
      testTitle = presetMeta.title;
      passingMarks = Math.round((presetMeta.marks || 100) * 0.4);
    }
  }

  const targetCount = topicData
    ? 15
    : (presetMeta?.questions || (testMeta?.total_marks && testMeta.total_marks >= 10 ? testMeta.total_marks : 100));

  // RLS lockdown: server submit_exam_attempt is authoritative for real tests.
  // Direct correct_answer reads are revoked; this fallback only serves
  // topic-practice tests (client-scored by design). For real test UUIDs
  // without server grading + without DB answer keys, fail loudly instead
  // of persisting a mis-scored local-bank result.
  const isTopicTest = !resolvedTestId ||
    resolvedTestId.startsWith("topic-") ||
    resolvedTestId.length < 30;

  if (resolvedTestId && (rules.length === 0 || !rules.some(r => r.correctAnswer))) {
    const { data: tqData } = await supabase
      .from("test_questions")
      .select("question_id, marks, questions(id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic)")
      .eq("test_id", resolvedTestId);

    if (!tqData || tqData.length === 0) {
      if (!isTopicTest && !topicData) {
        throw new Error(
          "Server grading unavailable and answer keys are not readable client-side (RLS lockdown). " +
          "Please retry submission — do not trust a locally computed score for this test."
        );
      }
    }

    if (tqData && tqData.length > 0) {
      rules = tqData.map((tq: any) => {
        const q = Array.isArray(tq.questions) ? tq.questions[0] : tq.questions;
        return {
          questionId: tq.question_id,
          marks: tq.marks ?? 1,
          negativeMarks: 0.25,
          correctAnswer: q?.correct_answer || "",
          subject: q?.subject || undefined,
          topic: q?.topic || undefined,
        };
      });
      candidateQuestions = tqData.map((tq: any) => {
        const q = Array.isArray(tq.questions) ? tq.questions[0] : tq.questions;
        return {
          id: tq.question_id,
          question_text: q?.question_text || "",
          option_a: q?.option_a || "",
          option_b: q?.option_b || "",
          option_c: q?.option_c || "",
          option_d: q?.option_d || "",
          correct_answer: q?.correct_answer || "",
          explanation: q?.explanation || "",
          subject: q?.subject || "General",
          topic: q?.topic || "",
        };
      });
    }
  }

  // If rules are still empty (meaning 0 questions uploaded in database for this test), use authentic full mock question bank
  if (rules.length === 0) {
    const fullMockQuestions = getFullMockQuestions(targetCount, resolvedTestId || testTitle);
    candidateQuestions = fullMockQuestions;
    rules = fullMockQuestions.map((fq) => ({
      questionId: fq.id,
      marks: 1,
      negativeMarks: 0.25,
      correctAnswer: fq.correct_answer,
      subject: fq.subject || "General Knowledge",
      topic: fq.topic || "",
    }));
  }

  const calculatedTotalMarks = rules.reduce((acc, r) => acc + (r.marks || 1), 0);
  if (passingMarks > calculatedTotalMarks) {
    passingMarks = Math.round(calculatedTotalMarks * 0.4);
  }

  const evaluated = calculateAttemptScore({
    rules,
    answers: req.finalAnswers || {},
    totalTestMarks: calculatedTotalMarks,
    passingMarks,
  });

  let finalAttemptId = req.attemptId;

  // Persist attempt record to test_attempts if UUID or create row
  if (isUuid) {
    try {
      await supabase.from("test_attempts").update({
        score: evaluated.score,
        total_marks: evaluated.totalMarks,
        percentage: evaluated.percentage,
        passed: evaluated.passed,
        completed_at: new Date().toISOString(),
        time_taken_seconds: req.timeTakenSeconds || 0,
        unanswered_count: evaluated.unansweredCount,
        correct_count: evaluated.correctCount,
        wrong_count: evaluated.incorrectCount,
        is_active: false,
        tab_violations: req.tabViolations || 0,
        fullscreen_violations: req.fullscreenViolations || 0,
      }).eq("id", req.attemptId);
    } catch (updErr) {
      console.warn("[AttemptEngine] test_attempts update warning:", updErr);
    }
  } else if (resolvedTestId && !resolvedTestId.startsWith("topic-")) {
    try {
      const { data: newAtt } = await supabase.from("test_attempts").insert({
        test_id: resolvedTestId,
        user_id: session.user.id,
        score: evaluated.score,
        total_marks: evaluated.totalMarks,
        percentage: evaluated.percentage,
        passed: evaluated.passed,
        started_at: new Date(Date.now() - (req.timeTakenSeconds || 60) * 1000).toISOString(),
        completed_at: new Date().toISOString(),
        time_taken_seconds: req.timeTakenSeconds || 0,
        unanswered_count: evaluated.unansweredCount,
        correct_count: evaluated.correctCount,
        wrong_count: evaluated.incorrectCount,
        is_active: false,
        tab_violations: req.tabViolations || 0,
        fullscreen_violations: req.fullscreenViolations || 0,
      }).select("id").single();

      if (newAtt?.id) {
        finalAttemptId = newAtt.id;
      }
    } catch (insErr) {
      console.warn("[AttemptEngine] test_attempts insert warning:", insErr);
    }
  }

  // Local storage persistence: guarantees 100% data availability for ReviewTest & badges
  try {
    const reviewAnswers = rules.map((r) => {
      const qDet =
        candidateQuestions.find((cq) => cq.id === r.questionId) ||
        FALLBACK_DRILL_QUESTIONS.find((fb) => fb.id === r.questionId) || {
          id: r.questionId,
          question_text: "Question",
          option_a: "Option A",
          option_b: "Option B",
          option_c: "Option C",
          option_d: "Option D",
          correct_answer: r.correctAnswer,
          explanation: "Official explanation is being updated.",
          subject: r.subject || "General",
          topic: r.topic || "",
        };

      const selected = req.finalAnswers?.[r.questionId] || null;
      const isCorrect = selected ? selected.toUpperCase() === r.correctAnswer.toUpperCase() : false;
      return {
        id: `ans-${r.questionId}`,
        attempt_id: finalAttemptId,
        question_id: r.questionId,
        selected_answer: selected,
        is_correct: isCorrect,
        marks_obtained: selected ? (isCorrect ? r.marks : -(r.negativeMarks || 0)) : 0,
        questions: qDet,
      };
    });

    const fullAttemptRecord = {
      attempt: {
        id: finalAttemptId,
        test_id: resolvedTestId,
        user_id: session.user.id,
        score: evaluated.score,
        total_marks: evaluated.totalMarks,
        percentage: evaluated.percentage,
        passed: evaluated.passed,
        time_taken_seconds: req.timeTakenSeconds || 0,
        unanswered_count: evaluated.unansweredCount,
        correct_count: evaluated.correctCount,
        wrong_count: evaluated.incorrectCount,
        mock_tests: {
          id: resolvedTestId,
          title: testTitle,
          passing_marks: passingMarks,
          is_paid: false,
          price: 0,
        },
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      answers: reviewAnswers,
    };
    localStorage.setItem(`pk_completed_attempt_${finalAttemptId}`, JSON.stringify(fullAttemptRecord));

    // Update user attempts cache for chapter status badge
    const userAttemptsKey = `pk_user_attempts_${session.user.id}`;
    const localUserAttRaw = localStorage.getItem(userAttemptsKey);
    const localUserAtt = localUserAttRaw ? JSON.parse(localUserAttRaw) : {};
    const prev = localUserAtt[resolvedTestId];
    localUserAtt[resolvedTestId] = {
      test_id: resolvedTestId,
      attempt_id: finalAttemptId,
      best_percentage: prev ? Math.max(prev.best_percentage, evaluated.percentage) : evaluated.percentage,
      passed: prev ? (prev.passed || evaluated.passed) : evaluated.passed,
      attempt_count: (prev?.attempt_count || 0) + 1,
    };
    localStorage.setItem(userAttemptsKey, JSON.stringify(localUserAtt));
  } catch (storageErr) {
    console.warn("[AttemptEngine] Local attempt caching warning:", storageErr);
  }

  // Insert answers into test_answers if valid attempt ID
  const isValidFinalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(finalAttemptId);
  if (isValidFinalUuid) {
    const answerRecords = rules.map((r) => {
      const selected = req.finalAnswers?.[r.questionId];
      const isCorrect = selected ? selected.toUpperCase() === r.correctAnswer.toUpperCase() : false;
      let marksObtained = 0;
      if (selected) {
        marksObtained = isCorrect ? r.marks : -(r.negativeMarks || 0);
      }
      return {
        attempt_id: finalAttemptId,
        question_id: r.questionId,
        selected_answer: selected || null,
        is_correct: isCorrect,
        marks_obtained: marksObtained,
      };
    });

    try {
      await supabase.from("test_answers").insert(answerRecords);
    } catch (ansErr) {
      console.warn("[AttemptEngine] Fallback answers insert error:", ansErr);
    }

    // Persist mistake records for notebook
    const mistakeRecords = rules
      .filter((r) => {
        const selected = req.finalAnswers?.[r.questionId];
        return selected && selected.toUpperCase() !== r.correctAnswer.toUpperCase();
      })
      .map((r) => ({
        user_id: session.user.id,
        question_id: r.questionId,
        selected_answer: req.finalAnswers?.[r.questionId] ?? null,
        correct_answer: r.correctAnswer,
        is_mastered: false,
        updated_at: new Date().toISOString(),
      }));

    if (mistakeRecords.length > 0) {
      try {
        await mistakesTable().upsert(mistakeRecords as unknown as never, {
          onConflict: "user_id,question_id",
        });
      } catch (mErr) {
        console.warn("[AttemptEngine] Fallback mistakes upsert error:", mErr);
      }
    }

    // Clean up drafts & timers
    if (resolvedTestId) {
      await supabase.from("test_answer_drafts").delete().eq("test_id", resolvedTestId).eq("user_id", session.user.id);
      await supabase.from("test_timers").delete().eq("test_id", resolvedTestId).eq("user_id", session.user.id);
    }
  }

  clearLocalDraft(req.attemptId);
  if (finalAttemptId !== req.attemptId) {
    clearLocalDraft(finalAttemptId);
  }

  return {
    attemptId: finalAttemptId,
    testId: resolvedTestId,
    status: "completed",
    score: evaluated.score,
    totalMarks: evaluated.totalMarks,
    percentage: evaluated.percentage,
    correctCount: evaluated.correctCount,
    incorrectCount: evaluated.incorrectCount,
    unansweredCount: evaluated.unansweredCount,
    passed: evaluated.passed,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * 4. Get results & solutions
 * Retrieves final score, section breakdowns, and releases explanations
 * ONLY for completed attempts.
 */
export async function getAttemptResults(attemptId: string): Promise<AttemptResultResponse> {
  const { data, error } = await staleRpc("get_attempt_results", {
    p_attempt_id: attemptId,
  });

  if (error) {
    throw new Error(error.message || "Failed to retrieve attempt results from server");
  }

  return data as AttemptResultResponse;
}
