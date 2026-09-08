import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  RotateCcw,
  Clock,
  Target,
  BarChart3,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Tag,
  MessageSquareQuote,
  Edit3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MathText } from "@/components/ui/MathText";
import { toast as sonnerToast } from "sonner";
import { initRazorpayPayment } from "@/utils/payment";
import { MistakeClassificationModal } from "@/components/student/MistakeClassificationModal";
import { RevisionDrillModal } from "@/components/student/RevisionDrillModal";
import { classifyStudentMistake } from "@/services/mistakesService";
import type { ErrorType, MistakeItem } from "@/types/mistakes";
import { ERROR_TYPE_DEFINITIONS } from "@/types/mistakes";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  subject: string | null;
  topic: string | null;
  explanation: string | null;
}

interface TestAnswer {
  id: string;
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean;
  marks_obtained: number;
  questions: Question;
}

interface TestAttempt {
  id: string;
  test_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  time_taken_seconds?: number | null;
  correct_count?: number | null;
  wrong_count?: number | null;
  unanswered_count?: number | null;
  started_at: string;
  completed_at: string;
  mock_tests: {
    id: string;
    title: string;
    passing_marks: number;
    is_paid?: boolean;
    price?: number;
  };
}

export const ReviewTest = () => {
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "skipped">("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);

  // Phase 2: Mistakes Classification & Targeted Revision Drill
  const [mistakeMetaMap, setMistakeMetaMap] = useState<
    Record<string, { id?: string; errorType?: ErrorType; notes?: string; isMastered?: boolean; retryCount?: number }>
  >({});
  const [classifyingItem, setClassifyingItem] = useState<{
    questionId: string;
    questionText: string;
    mistakeId?: string;
    errorType?: ErrorType;
    notes?: string;
  } | null>(null);
  const [isDrillOpen, setIsDrillOpen] = useState(false);

  const loadTestReview = useCallback(async () => {
    if (!attemptId) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const [attemptResult, answersResult, bookmarksResult, purchaseResult, mistakesResult] = await Promise.all([
        supabase
          .from("test_attempts")
          .select(`*, mock_tests (id, title, passing_marks, is_paid, price)`)
          .eq("id", attemptId)
          .eq("user_id", session.user.id)
          .single(),
        supabase
          .from("test_answers")
          .select(`*, questions (*)`)
          .eq("attempt_id", attemptId)
          .order("created_at", { ascending: true }),
        supabase
          .from("student_bookmarks")
          .select("question_id")
          .eq("user_id", session.user.id),
        supabase
          .from("purchases")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("status", "completed")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("student_mistakes")
          .select("id, question_id, error_type, student_notes, is_mastered, retry_count")
          .eq("user_id", session.user.id),
      ]);

      if (attemptResult.error || !attemptResult.data) {
        toast({ title: "Error", description: "Test attempt not found", variant: "destructive" });
        navigate("/student/results");
        return;
      }

      if (answersResult.error) {
        toast({ title: "Error", description: "Failed to load your answers", variant: "destructive" });
      }

      if (mistakesResult.data) {
        const metaMap: Record<string, any> = {};
        mistakesResult.data.forEach((m: any) => {
          metaMap[m.question_id] = {
            id: m.id,
            errorType: (m.error_type || "unclassified") as ErrorType,
            notes: m.student_notes,
            isMastered: m.is_mastered,
            retryCount: m.retry_count,
          };
        });
        setMistakeMetaMap(metaMap);
      }

      // Handle both object and array for mock_tests join
      const rawAttempt = attemptResult.data as any;
      if (Array.isArray(rawAttempt.mock_tests)) {
        rawAttempt.mock_tests = rawAttempt.mock_tests[0];
      }
      setAttempt(rawAttempt);

      const rawAnswers = (answersResult.data || []).map((a: any) => ({
        ...a,
        questions: Array.isArray(a.questions) ? a.questions[0] : a.questions
      })).filter((a: any) => a.questions != null);

      if (rawAttempt.test_id && rawAnswers.length > 0) {
        const { data: testQuestions } = await supabase
          .from("test_questions")
          .select("question_id, question_order")
          .eq("test_id", rawAttempt.test_id);
        if (testQuestions?.length) {
          const orderByQuestion = new Map(testQuestions.map((q: any) => [q.question_id, q.question_order ?? 999]));
          rawAnswers.sort((a: any, b: any) =>
            (orderByQuestion.get(a.question_id) ?? 999) - (orderByQuestion.get(b.question_id) ?? 999)
          );
        }
      }

      setAnswers(rawAnswers);

      if (bookmarksResult.data) {
        setBookmarkedIds(new Set(bookmarksResult.data.map((b: any) => b.question_id)));
      }

      setHasSubscription(!!purchaseResult.data);
    } catch (error) {
      console.error("[ReviewTest] Error loading test review:", error);
      toast({
        title: "Error",
        description: "Something went wrong while loading the test review",
        variant: "destructive"
      });
      navigate("/student/results");
    } finally {
      setLoading(false);
    }
  }, [attemptId, navigate, toast]);

  useEffect(() => {
    loadTestReview();
  }, [loadTestReview]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleBookmark = async (questionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (bookmarkedIds.has(questionId)) {
      await supabase
        .from("student_bookmarks")
        .delete()
        .eq("user_id", session.user.id)
        .eq("question_id", questionId);

      setBookmarkedIds(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      sonnerToast.info("Removed from bookmarks");
    } else {
      await supabase
        .from("student_bookmarks")
        .insert({ user_id: session.user.id, question_id: questionId });

      setBookmarkedIds(prev => new Set(prev).add(questionId));
      sonnerToast.success("Saved to bookmarks");
    }
  };

  const handleSaveClassification = async (errorType: ErrorType, notes: string) => {
    if (!classifyingItem) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const qId = classifyingItem.questionId;
    const existing = mistakeMetaMap[qId];

    setMistakeMetaMap(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        errorType,
        notes,
      }
    }));

    try {
      if (existing?.id) {
        await classifyStudentMistake(existing.id, errorType, notes);
      } else {
        const targetAnswer = answers.find(a => a.question_id === qId);
        const { data: newMistake } = await supabase.from("student_mistakes").upsert({
          user_id: session.user.id,
          question_id: qId,
          attempt_id: attemptId,
          selected_answer: targetAnswer?.selected_answer || null,
          correct_answer: targetAnswer?.questions?.correct_answer || "",
          is_mastered: false,
          error_type: errorType,
          student_notes: notes,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,question_id" }).select("id").single();

        if (newMistake?.id) {
          setMistakeMetaMap(prev => ({
            ...prev,
            [qId]: { ...prev[qId], id: newMistake.id }
          }));
        }
      }
    } catch (err) {
      console.warn("Classification save error:", err);
    }
  };

  const totalQuestions = answers.length;
  const correctAnswers = answers.filter(a => a.is_correct);
  const wrongAnswers = answers.filter(a => !a.is_correct && a.selected_answer);
  const skippedAnswers = answers.filter(a => !a.selected_answer);

  const drillMistakes: MistakeItem[] = wrongAnswers.map((wa) => {
    const meta = mistakeMetaMap[wa.question_id];
    return {
      id: meta?.id || `drill_${wa.question_id}`,
      question_id: wa.question_id,
      attempt_id: attemptId,
      selected_answer: wa.selected_answer,
      correct_answer: wa.questions.correct_answer,
      is_mastered: meta?.isMastered ?? false,
      retry_count: meta?.retryCount ?? 1,
      streak: 0,
      error_type: meta?.errorType || "unclassified",
      student_notes: meta?.notes || null,
      created_at: new Date().toISOString(),
      questions: wa.questions,
    };
  });

  const correctCount = attempt?.correct_count ?? correctAnswers.length;
  const wrongCount = attempt?.wrong_count ?? wrongAnswers.length;
  const skippedCount = attempt?.unanswered_count ?? skippedAnswers.length;

  const attemptedCount = correctCount + wrongCount;
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
  const timeTaken = attempt?.time_taken_seconds || 0;
  const avgSecondsPerQuestion = totalQuestions > 0 ? Math.round(timeTaken / totalQuestions) : 0;

  const subjectStats: { [sub: string]: { total: number; correct: number; wrong: number } } = {};
  const topicStats: { [topic: string]: { subject: string; total: number; correct: number; wrong: number } } = {};

  answers.forEach(a => {
    const sub = a.questions.subject || "General";
    const top = a.questions.topic || "General Knowledge";

    if (!subjectStats[sub]) subjectStats[sub] = { total: 0, correct: 0, wrong: 0 };
    subjectStats[sub].total++;
    if (a.is_correct) subjectStats[sub].correct++;
    else if (a.selected_answer) subjectStats[sub].wrong++;

    if (!topicStats[top]) topicStats[top] = { subject: sub, total: 0, correct: 0, wrong: 0 };
    topicStats[top].total++;
    if (a.is_correct) topicStats[top].correct++;
    else if (a.selected_answer) topicStats[top].wrong++;
  });

  const weakTopics: { topic: string; subject: string; accuracy: number }[] = [];
  const strongTopics: { topic: string; subject: string; accuracy: number }[] = [];

  Object.entries(topicStats).forEach(([top, stat]) => {
    const acc = Math.round((stat.correct / stat.total) * 100);
    if (acc < 60) weakTopics.push({ topic: top, subject: stat.subject, accuracy: acc });
    else strongTopics.push({ topic: top, subject: stat.subject, accuracy: acc });
  });

  const filteredAnswers = answers.filter(a => {
    if (filter === "correct") return a.is_correct;
    if (filter === "incorrect") return !a.is_correct && a.selected_answer;
    if (filter === "skipped") return !a.selected_answer;
    return true;
  });

  if (loading || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Generating Performance Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/student/results")}
            className="text-slate-600 hover:text-slate-900 -ml-2 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> All Results
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-100 bg-white">
              <img src="/logo-icon.png" alt="PracticeKoro" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-800 truncate max-w-[160px] sm:max-w-none">
              {attempt.mock_tests?.title || "Exam Review"}
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => navigate(`/student/take-test/${attempt.test_id}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retake
          </Button>
        </div>
      </header>

      <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 space-y-4 md:space-y-6">
        {/* Scorecard Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl px-4 py-3.5 sm:p-7 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none -mb-24" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-wider ${
                  attempt.passed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                }`}>
                  {attempt.passed ? "✓ Cutoff Cleared 🎉" : "Needs Improvement"}
                </span>
                <span className="text-white/60 text-xs">•</span>
                <span className="text-white/80 text-xs font-semibold">
                  Passing Cutoff: {attempt.mock_tests?.passing_marks}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight font-display text-white">
                {attempt.mock_tests?.title}
              </h1>
              <p className="hidden sm:block text-slate-200 text-xs sm:text-sm font-medium">
                Detailed exam review, answer key comparison, and syllabus weakness breakdown.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 sm:p-4 text-center border border-white/15 min-w-[82px] sm:min-w-[105px]">
                <p className="text-lg sm:text-2xl md:text-3xl font-black text-white">{attempt.score}</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">Score / {attempt.total_marks}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 sm:p-4 text-center border border-white/15 min-w-[82px] sm:min-w-[105px]">
                <p className="text-lg sm:text-2xl md:text-3xl font-black text-emerald-300">{attempt.percentage}%</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">Percentage</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100/90 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">{correctCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Correct</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100/90 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">{wrongCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Wrong</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100/90 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">{accuracy}%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Accuracy</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100/90 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">{avgSecondsPerQuestion}s</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Avg / Question</p>
            </div>
          </div>
        </div>

        {/* Personalized Learning Recommendation */}
        <div className="bg-blue-50/70 rounded-3xl border border-blue-100 p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm sm:text-base">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Practice Recommendation & Action Plan
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
              Smart Loop
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            Based on this attempt, your weakest area is{" "}
            <span className="font-bold text-blue-700">
              {weakTopics.length > 0 ? weakTopics[0].topic : "General Revision"}
            </span>
            . Practicing focused drill questions will boost your test score significantly.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {wrongCount > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={() => setIsDrillOpen(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl h-10 px-4 shadow-sm flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  🎯 Launch Revision Drill ({wrongCount} Mistakes)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/student/mistakes")}
                  className="bg-white hover:bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold rounded-xl h-10 px-3 shadow-2xs"
                >
                  View in Mistakes Vault
                </Button>
              </>
            )}
            {weakTopics.length > 0 && (
              <Button
                size="sm"
                onClick={() => navigate("/student/practice")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-10 px-4 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                Drill {weakTopics[0].topic}
              </Button>
            )}
          </div>
        </div>

        {/* Subject & Topic Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-slate-100/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Subject Accuracy Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(subjectStats).map(([sub, stat]) => {
                const subAcc = Math.round((stat.correct / stat.total) * 100);
                return (
                  <div key={sub} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{sub}</span>
                      <span className={subAcc >= 70 ? "text-emerald-600" : "text-slate-500"}>
                        {subAcc}% ({stat.correct}/{stat.total})
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          subAcc >= 75 ? "bg-emerald-500" : subAcc >= 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${subAcc}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" /> Syllabus Weaknesses & Strengths
            </h3>
            <div className="space-y-2.5 text-xs">
              {weakTopics.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Needs Practice (&lt;60%)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {weakTopics.map(w => (
                      <span key={w.topic} className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                        {w.topic} ({w.accuracy}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {strongTopics.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Strong Command (≥60%)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {strongTopics.map(s => (
                      <span key={s.topic} className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                        {s.topic} ({s.accuracy}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900"
            }`}
          >
            All Questions ({answers.length})
          </button>
          <button
            onClick={() => setFilter("correct")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === "correct" ? "bg-emerald-600 text-white shadow-sm" : "bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900"
            }`}
          >
            Correct ({correctCount})
          </button>
          <button
            onClick={() => setFilter("incorrect")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === "incorrect" ? "bg-rose-600 text-white shadow-sm" : "bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900"
            }`}
          >
            Incorrect ({wrongCount})
          </button>
          <button
            onClick={() => setFilter("skipped")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === "skipped" ? "bg-slate-700 text-white shadow-sm" : "bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900"
            }`}
          >
            Skipped ({skippedCount})
          </button>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-4">
          {filteredAnswers.map((a, idx) => {
            const isExpanded = expandedQuestions.has(a.id);
            const isBookmarked = bookmarkedIds.has(a.question_id);

            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono font-black text-xs flex items-center justify-center">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      a.is_correct
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : a.selected_answer
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {a.is_correct ? "Correct (+1)" : a.selected_answer ? `Incorrect (${a.marks_obtained !== undefined && a.marks_obtained !== 0 ? a.marks_obtained : '-0.25'})` : "Skipped"}
                    </span>
                    {a.questions.subject && (
                      <span className="text-xs text-slate-400 font-medium">
                        {a.questions.subject} {a.questions.topic ? `• ${a.questions.topic}` : ""}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => toggleBookmark(a.question_id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-5 h-5 text-amber-500 fill-amber-500" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="text-slate-900 font-bold text-base sm:text-lg md:text-xl leading-relaxed font-bengali">
                  <MathText text={a.questions.question_text} />
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: "A", text: a.questions.option_a },
                    { key: "B", text: a.questions.option_b },
                    { key: "C", text: a.questions.option_c },
                    { key: "D", text: a.questions.option_d },
                  ].map(opt => {
                    const isCorrectOption = opt.key === a.questions.correct_answer.toUpperCase();
                    const isUserSelected = opt.key === a.selected_answer?.toUpperCase();

                    let style = "bg-slate-50/60 border-slate-200/80 text-slate-700";
                    if (isCorrectOption) style = "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs";
                    if (isUserSelected && !isCorrectOption) style = "bg-rose-50 border-rose-400 text-rose-950 font-bold";

                    return (
                      <div
                        key={opt.key}
                        className={`p-3 sm:p-3.5 rounded-xl border text-sm sm:text-base font-medium flex items-center gap-2.5 ${style}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 ${
                            isCorrectOption
                              ? "bg-emerald-600 text-white"
                              : isUserSelected
                              ? "bg-rose-600 text-white"
                              : "bg-white border border-slate-200 text-slate-600"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1 font-bengali">
                          <MathText text={opt.text} />
                        </span>
                        {isCorrectOption && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {isUserSelected && !isCorrectOption && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Toggle */}
                <div className="pt-1">
                  <button
                    onClick={() => toggleQuestion(a.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Hide Solution & Explanation
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> View Solution & Explanation
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 rounded-2xl p-4 text-xs sm:text-sm leading-relaxed font-bengali mt-2 space-y-1 border border-slate-200/80">
                      {(() => {
                        const ans = (a.questions.correct_answer || '').toUpperCase().trim();
                        const correctText = ans === 'A' ? a.questions.option_a : ans === 'B' ? a.questions.option_b : ans === 'C' ? a.questions.option_c : ans === 'D' ? a.questions.option_d : null;
                        return (
                          <div className="font-bold text-emerald-800 flex items-center flex-wrap gap-1.5">
                            <span>✓ Correct Answer: ({ans})</span>
                            {correctText && (
                              <span className="font-semibold text-emerald-950">
                                <MathText text={correctText} formatBullets={false} />
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {a.questions.explanation ? (
                        <div className="text-slate-700 pt-1 border-t border-slate-200/60">
                          <strong className="text-slate-900 block mb-0.5">💡 Solution & Key Rule:</strong>
                          <MathText text={a.questions.explanation} />
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs italic">Standard syllabus solution applies for this question.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Phase 2: Error Classification & Reflection Row for Incorrect Answers */}
                {!a.is_correct && a.selected_answer && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {mistakeMetaMap[a.question_id]?.errorType && mistakeMetaMap[a.question_id]?.errorType !== "unclassified" ? (
                        <button
                          type="button"
                          onClick={() => setClassifyingItem({
                            questionId: a.question_id,
                            questionText: a.questions.question_text,
                            mistakeId: mistakeMetaMap[a.question_id]?.id,
                            errorType: mistakeMetaMap[a.question_id]?.errorType,
                            notes: mistakeMetaMap[a.question_id]?.notes,
                          })}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all hover:opacity-90 ${
                            ERROR_TYPE_DEFINITIONS[mistakeMetaMap[a.question_id].errorType!]?.badgeClass
                          }`}
                          title="Click to edit error classification"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{ERROR_TYPE_DEFINITIONS[mistakeMetaMap[a.question_id].errorType!]?.labelEn}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setClassifyingItem({
                            questionId: a.question_id,
                            questionText: a.questions.question_text,
                            mistakeId: mistakeMetaMap[a.question_id]?.id,
                            errorType: "unclassified",
                            notes: mistakeMetaMap[a.question_id]?.notes,
                          })}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          <Tag className="w-3 h-3 text-amber-600" />
                          <span>Tag Error Cause & Takeaway</span>
                        </button>
                      )}

                      {mistakeMetaMap[a.question_id]?.notes ? (
                        <button
                          type="button"
                          onClick={() => setClassifyingItem({
                            questionId: a.question_id,
                            questionText: a.questions.question_text,
                            mistakeId: mistakeMetaMap[a.question_id]?.id,
                            errorType: mistakeMetaMap[a.question_id]?.errorType,
                            notes: mistakeMetaMap[a.question_id]?.notes,
                          })}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <MessageSquareQuote className="w-3 h-3" />
                          <span className="font-bengali truncate max-w-[200px]">
                            {mistakeMetaMap[a.question_id].notes}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setClassifyingItem({
                            questionId: a.question_id,
                            questionText: a.questions.question_text,
                            mistakeId: mistakeMetaMap[a.question_id]?.id,
                            errorType: mistakeMetaMap[a.question_id]?.errorType,
                            notes: "",
                          })}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>+ Add Note</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      In Mistakes Vault
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Phase 2: Classification Modal & Revision Drill Modal */}
        {classifyingItem && (
          <MistakeClassificationModal
            isOpen={!!classifyingItem}
            onClose={() => setClassifyingItem(null)}
            questionId={classifyingItem.questionId}
            initialErrorType={classifyingItem.errorType}
            initialNotes={classifyingItem.notes}
            questionSnippet={classifyingItem.questionText}
            onSave={handleSaveClassification}
          />
        )}

        {isDrillOpen && (
          <RevisionDrillModal
            isOpen={isDrillOpen}
            onClose={() => setIsDrillOpen(false)}
            mistakes={drillMistakes}
            title="Revise Mistakes From This Test"
            onMistakeUpdated={(mistakeId, isMastered) => {
              setMistakeMetaMap(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(k => {
                  if (updated[k].id === mistakeId) {
                    updated[k].isMastered = isMastered;
                  }
                });
                return updated;
              });
            }}
          />
        )}
      </main>
    </div>
  );
};

export default ReviewTest;
