import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  ArrowLeft,
  Send,
  Timer,
  ListChecks,
  RotateCcw,
  CreditCard,
  WifiOff,
  Wifi,
  ShieldAlert,
  Sparkles,
  Check,
  HelpCircle,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useExamSecurity } from "@/hooks/useExamSecurity";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast as sonnerToast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { initRazorpayPayment } from "@/utils/payment";
import { MathText } from "@/components/ui/MathText";

interface QuestionDetails {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: string;
  explanation?: string | null;
  subject: string | null;
  topic: string | null;
  difficulty: string | null;
  year?: number | null;
}

interface TestQuestion {
  id: string;
  question_id: string;
  marks: number;
  question_order: number;
  questions: QuestionDetails;
}

interface MockTest {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  is_paid: boolean;
  price: number;
  negative_marking?: boolean | null;
  negative_marks_per_question?: number | null;
}

const TakeTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<MockTest | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [isPurchased, setIsPurchased] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [warned10m, setWarned10m] = useState(false);
  const [warned5m, setWarned5m] = useState(false);
  const [warned1m, setWarned1m] = useState(false);
  const [subscriptionFee, setSubscriptionFee] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<Date>(new Date());

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sonnerToast.success("Connection restored", { description: "Your answers are syncing with the server." });
      autoSaveAnswers();
    };
    const handleOffline = () => {
      setIsOnline(false);
      sonnerToast.warning("Connection lost", { description: "Answers saved locally. Will sync when online." });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Anti-cheating security
  const {
    tabViolations,
    fullscreenViolations,
    enterFullscreen
  } = useExamSecurity({
    onTabSwitch: violations => console.log('Tab violations:', violations),
    onFullscreenExit: violations => console.log('Fullscreen violations:', violations),
    maxTabViolations: 3,
    maxFullscreenViolations: 3,
    onMaxViolations: () => handleAutoSubmit()
  });

  const handleSubmitTest = useCallback(async () => {
    if (!test || !testId || !startTime) return;
    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const timeTakenSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

    try {
      // 1. Primary: Secure Server-Side Scoring RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc("submit_exam_attempt", {
        p_test_id: testId,
        p_answers: answers as any,
        p_time_taken_seconds: timeTakenSeconds,
        p_tab_violations: tabViolations,
        p_fullscreen_violations: fullscreenViolations
      });

      if (!rpcError && rpcResult && (rpcResult as any).attempt_id) {
        const res = rpcResult as any;
        localStorage.removeItem(`pk_answers_${testId}`);
        sonnerToast.success("Test Submitted Successfully!", {
          description: `Score: ${res.score}/${res.total_marks} (${res.percentage}%)`
        });
        navigate(`/student/test-review/${res.attempt_id}`);
        return;
      }

      console.warn("Server RPC scoring unavailable, using client-side fallback with negative marking...", rpcError);

      // 2. Client-side Fallback (if RPC is pending deployment)
      const answeredQuestions = Object.keys(answers).filter(qId => answers[qId]);
      const unansweredCount = questions.length - answeredQuestions.length;
      let correctCount = 0;
      let wrongCount = 0;
      let totalScore = 0;
      const negMark = test.negative_marking ? (test.negative_marks_per_question || 0.25) : 0;
      const answerRecords: any[] = [];

      const mistakeRecords: Array<{
        user_id: string;
        question_id: string;
        selected_answer: string;
        correct_answer: string;
        is_mastered: boolean;
        updated_at: string;
      }> = [];

      questions.forEach(tq => {
        const selectedAnswer = answers[tq.question_id];
        const isCorrect = selectedAnswer
          ? selectedAnswer.toUpperCase() === tq.questions.correct_answer.toUpperCase()
          : false;

        let marksObtained = 0;
        if (selectedAnswer) {
          if (isCorrect) {
            correctCount++;
            marksObtained = tq.marks;
          } else {
            wrongCount++;
            marksObtained = -negMark;
            mistakeRecords.push({
              user_id: session.user.id,
              question_id: tq.question_id,
              selected_answer: selectedAnswer,
              correct_answer: tq.questions.correct_answer || "",
              is_mastered: false,
              updated_at: new Date().toISOString()
            });
          }
        }
        totalScore += marksObtained;
        answerRecords.push({
          question_id: tq.question_id,
          selected_answer: selectedAnswer || null,
          is_correct: isCorrect,
          marks_obtained: marksObtained
        });
      });

      if (totalScore < 0) totalScore = 0;
      const percentage = Math.round((totalScore / test.total_marks) * 100);
      const passed = totalScore >= test.passing_marks;

      const { data: attemptData, error: attemptError } = await supabase.from("test_attempts").insert({
        test_id: testId,
        user_id: session.user.id,
        score: totalScore,
        total_marks: test.total_marks,
        percentage,
        passed,
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString(),
        time_taken_seconds: timeTakenSeconds,
        unanswered_count: unansweredCount,
        correct_count: correctCount,
        wrong_count: wrongCount,
        is_active: false,
        tab_violations: tabViolations,
        fullscreen_violations: fullscreenViolations
      }).select().single();

      if (attemptError) {
        toast({ title: "Submission Error", description: "Failed to submit test. Please retry.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      await supabase.from("test_answers").insert(
        answerRecords.map(ans => ({ ...ans, attempt_id: attemptData.id }))
      );

      // Record mistakes for Mistakes Notebook and AI recommendations
      if (mistakeRecords.length > 0) {
        try {
          await supabase.from("student_mistakes").upsert(mistakeRecords, {
            onConflict: "user_id,question_id"
          });
        } catch (mErr) {
          console.warn("Recording mistakes fallback:", mErr);
        }
      }

      // Clean up drafts & timer
      await supabase.from("test_answer_drafts").delete().eq("test_id", testId).eq("user_id", session.user.id);
      await supabase.from("test_timers").delete().eq("test_id", testId).eq("user_id", session.user.id);
      localStorage.removeItem(`pk_answers_${testId}`);

      sonnerToast.success("Test Submitted!", { description: `You scored ${totalScore}/${test.total_marks} (${percentage}%)` });
      navigate(`/student/test-review/${attemptData.id}`);
    } catch (err: any) {
      console.error("Submission failed:", err);
      toast({ title: "Submission Failed", description: err.message || "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [test, testId, startTime, questions, answers, tabViolations, fullscreenViolations, navigate, toast]);

  const handleAutoSubmit = useCallback(() => {
    sonnerToast.error("⏰ Time's Up!", { description: "Submitting your test automatically...", duration: 5000 });
    handleSubmitTest();
  }, [handleSubmitTest]);

  const autoSaveAnswers = useCallback(async () => {
    if (!testId || autoSaving) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Save to local storage first (instant & offline-resilient)
    localStorage.setItem(`pk_answers_${testId}`, JSON.stringify(answers));

    if (!navigator.onLine) return;

    setAutoSaving(true);
    try {
      const drafts = questions.map(q => ({
        test_id: testId,
        user_id: session.user.id,
        question_id: q.question_id,
        selected_answer: answers[q.question_id] || null,
        marked_for_review: markedForReview.has(q.question_id),
        last_saved_at: new Date().toISOString()
      }));

      await supabase.from("test_answer_drafts").upsert(drafts, { onConflict: "test_id,user_id,question_id" });
      lastSaveRef.current = new Date();
    } catch (error) {
      console.error("Auto-save sync error:", error);
    } finally {
      setAutoSaving(false);
    }
  }, [testId, autoSaving, questions, answers, markedForReview]);

  const loadTest = useCallback(async () => {
    if (!testId) return;

    // Fetch site subscription fee
    const { data: settingsData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "yearly_subscription_fee")
      .maybeSingle();

    if (settingsData?.value) {
      setSubscriptionFee(parseFloat(settingsData.value) || 0);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    // Fetch mock test configuration
    const { data: testData, error: testError } = await supabase
      .from("mock_tests")
      .select("*")
      .eq("id", testId)
      .single();

    let activeTest = testData;
    let processedQuestions: TestQuestion[] = [];

    if (!activeTest) {
      activeTest = {
        id: testId || "panchayat-mock-1",
        title: "Panchayat Full Mock Test 1",
        description: "Official pattern full-length mock test",
        duration_minutes: 90,
        total_marks: 100,
        passing_marks: 40,
        shuffle_questions: false,
        shuffle_options: false,
        is_paid: false,
        price: 0,
        negative_marking: true,
        negative_marks_per_question: 0.25,
      };

      processedQuestions = [
        {
          id: "q-1",
          question_id: "q-1",
          marks: 1,
          question_order: 1,
          questions: {
            id: "q-1",
            question_text: "ভারতের সংবিধান কোন সালে কার্যকর হয়?",
            option_a: "1947",
            option_b: "1950",
            option_c: "1952",
            option_d: "1955",
            correct_answer: "B",
            explanation: "ভারতের সংবিধান ১৯৫০ সালের ২৬শে জানুয়ারি কার্যকর হয়।",
            subject: "Indian Polity",
            topic: "Constitution",
            difficulty: "Medium",
          }
        },
        {
          id: "q-2",
          question_id: "q-2",
          marks: 1,
          question_order: 2,
          questions: {
            id: "q-2",
            question_text: "পশ্চিমবঙ্গের সবচেয়ে বড় জেলা কোনটি?",
            option_a: "দক্ষিণ ২৪ পরগনা",
            option_b: "উত্তর ২৪ পরগনা",
            option_c: "পশ্চিম মেদিনীপুর",
            option_d: "মুর্শিদাবাদ",
            correct_answer: "A",
            explanation: "আয়তনের দিক থেকে পশ্চিমবঙ্গের বৃহত্তম জেলা দক্ষিণ ২৪ পরগনা।",
            subject: "West Bengal GK",
            topic: "Geography",
            difficulty: "Medium",
          }
        },
        {
          id: "q-3",
          question_id: "q-3",
          marks: 1,
          question_order: 3,
          questions: {
            id: "q-3",
            question_text: "মানব শরীরে রক্তের প্রধান উপাদান কোনটি?",
            option_a: "প্লাজমা",
            option_b: "লোহিত রক্তকণিকা",
            option_c: "শ্বেত রক্তকণিকা",
            option_d: "অণুচক্রিকা",
            correct_answer: "A",
            explanation: "রক্তের প্রায় ৫৫ শতাংশই হলো প্লাজমা বা রক্তরস।",
            subject: "General Science",
            topic: "Biology",
            difficulty: "Medium",
          }
        },
        {
          id: "q-4",
          question_id: "q-4",
          marks: 1,
          question_order: 4,
          questions: {
            id: "q-4",
            question_text: "ভারতের জাতীয় গান কোনটি?",
            option_a: "জন গণ মন",
            option_b: "বন্দে মাতরম্",
            option_c: "সারে জাহাঁ সে আচ্ছা",
            option_d: "আমার সোনার বাংলা",
            correct_answer: "B",
            explanation: "ভারতের জাতীয় গান হলো বঙ্কিমচন্দ্র চট্টোপাধ্যায় রচিত 'বন্দে মাতরম্' এবং জাতীয় সংগীত হলো রবীন্দ্রনাথ ঠাকুরের 'জন গণ মন' ।",
            subject: "General Knowledge",
            topic: "National Symbols",
            difficulty: "Easy",
          }
        }
      ];
      setIsPurchased(true);
    } else {
      // Entitlement Check for Paid Tests
      if (activeTest.is_paid) {
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const { data: purchaseData } = await supabase
          .from("purchases")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("content_type", "subscription")
          .eq("status", "completed")
          .gt("created_at", oneYearAgo.toISOString())
          .limit(1)
          .maybeSingle();

        if (!purchaseData) {
          setTest(activeTest as any);
          setIsPurchased(false);
          setLoading(false);
          return;
        }
        setIsPurchased(true);
      } else {
        setIsPurchased(true);
      }

      // 1. Attempt to load questions via secure RPC get_student_exam_questions
      const { data: rpcQuestions, error: rpcQuestionsError } = await supabase.rpc("get_student_exam_questions", {
        p_test_id: testId
      });

      if (!rpcQuestionsError && rpcQuestions && rpcQuestions.length > 0) {
        processedQuestions = (rpcQuestions as any[]).map(rq => ({
          id: rq.id,
          question_id: rq.question_id,
          marks: rq.marks,
          question_order: rq.question_order,
          questions: {
            id: rq.question_id,
            question_text: rq.question_text,
            option_a: rq.option_a,
            option_b: rq.option_b,
            option_c: rq.option_c,
            option_d: rq.option_d,
            subject: rq.subject,
            topic: rq.topic,
            difficulty: rq.difficulty,
            year: rq.year
          }
        }));
      } else {
        // Fallback query (stripping explanations during exam)
        const { data: questionsData } = await supabase
          .from("test_questions")
          .select(`*, questions (*)`)
          .eq("test_id", testId)
          .order("question_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (questionsData && questionsData.length > 0) {
          processedQuestions = (questionsData as any[]).map(tq => ({
            ...tq,
            questions: {
              ...tq.questions,
              explanation: null // Never show explanation while taking test
            }
          }));
        }
      }
    }

    // Restore Timer from DB or initialize
    const { data: existingTimer } = await supabase
      .from("test_timers")
      .select("*")
      .eq("test_id", testId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    let initialTime: number;
    let startDateTime: Date;

    if (existingTimer) {
      const endsAt = new Date(existingTimer.ends_at);
      initialTime = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
      startDateTime = new Date(existingTimer.started_at);

      // Restore saved answers from drafts or local storage
      const answersMap: { [key: string]: string } = {};
      const reviewSet = new Set<string>();

      // Check local storage backup
      const localBackup = localStorage.getItem(`pk_answers_${testId}`);
      if (localBackup) {
        try {
          const parsed = JSON.parse(localBackup);
          Object.assign(answersMap, parsed);
        } catch (e) {
          console.warn("Could not parse local backup:", e);
        }
      }

      // Check Supabase draft table
      const { data: savedAnswers } = await supabase
        .from("test_answer_drafts")
        .select("*")
        .eq("test_id", testId)
        .eq("user_id", session.user.id);

      if (savedAnswers) {
        savedAnswers.forEach(ans => {
          if (ans.selected_answer) answersMap[ans.question_id] = ans.selected_answer;
          if (ans.marked_for_review) reviewSet.add(ans.question_id);
        });
      }

      setAnswers(answersMap);
      setMarkedForReview(reviewSet);
      sonnerToast.success("Test Resumed", { description: "Your answers and timer were restored." });
    } else {
      initialTime = testData.duration_minutes * 60;
      startDateTime = new Date();
      const endsAt = new Date(startDateTime.getTime() + initialTime * 1000);

      await supabase.from("test_timers").insert({
        test_id: testId,
        user_id: session.user.id,
        started_at: startDateTime.toISOString(),
        duration_minutes: activeTest.duration_minutes,
        ends_at: endsAt.toISOString()
      });
    }

    setTest(activeTest as any);
    setQuestions(processedQuestions);
    setTimeRemaining(initialTime);
    setStartTime(startDateTime);
    setLoading(false);
  }, [testId, navigate, toast]);

  useEffect(() => {
    loadTest();
  }, [loadTest]);

  // Countdown Timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }

        // Timer alert toasts
        if (prev === 600 && !warned10m) {
          setWarned10m(true);
          sonnerToast.warning("10 Minutes Remaining", { description: "Double-check your marked answers." });
        } else if (prev === 300 && !warned5m) {
          setWarned5m(true);
          sonnerToast.warning("5 Minutes Remaining!", { description: "Begin wrapping up your test." });
        } else if (prev === 60 && !warned1m) {
          setWarned1m(true);
          sonnerToast.error("1 Minute Remaining!", { description: "Test will automatically submit in 60 seconds." });
        }

        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, warned10m, warned5m, warned1m, handleAutoSubmit]);

  // Periodic Auto-Save
  useEffect(() => {
    if (!test || !testId) return;
    autoSaveTimerRef.current = setInterval(() => autoSaveAnswers(), 20000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [answers, markedForReview, test, testId, autoSaveAnswers]);

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const clearCurrentAnswer = (questionId: string) => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    sonnerToast.info("Choice cleared");
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#F8FAFC]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm w-full border border-slate-100"
        >
          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 mx-auto mb-4 shadow-lg shadow-blue-500/20 border border-slate-100 bg-white">
            <img src="/logo-icon.png" alt="PracticeKoro" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="text-lg font-black tracking-tight text-[#0F172A]">Practice</span>
            <span className="text-lg font-black tracking-tight text-[#2563EB]">Koro</span>
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">পরীক্ষার পরিবেশ লোড হচ্ছে...</h2>
          <p className="text-slate-400 text-xs mb-6">প্রশ্নপত্র সুরক্ষিত হচ্ছে ও টাইমার প্রস্তুত করা হচ্ছে</p>
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <Button
            onClick={enterFullscreen}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs h-11 shadow-sm"
          >
            Enter Fullscreen Mode
          </Button>
        </motion.div>
      </div>
    );
  }

  // Paywall for Unsubscribed Users
  if (test && test.is_paid && !isPurchased) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#F8FAFC]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="p-8 text-center bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white relative">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
              <Lock className="w-8 h-8 text-amber-300" />
            </div>
            <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase mb-2">
              Pro Mock Test
            </Badge>
            <h1 className="text-xl font-black">{test.title}</h1>
            <p className="text-blue-100/80 text-xs mt-1">Unlock with PracticeKoro Pro Pass</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-slate-500 text-xs">Unlock all Mock Tests, Previous Year Questions & Notes</p>
              <div className="text-3xl font-black text-slate-900">₹{subscriptionFee || 99}</div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase">
                1 Year Complete Access
              </span>
            </div>

            <Button
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/20"
              onClick={async () => {
                try {
                  await initRazorpayPayment({
                    amount: subscriptionFee || 99,
                    contentId: "site_yearly_subscription",
                    contentType: "subscription" as any,
                    title: "PracticeKoro Complete Exam Pack",
                    description: "Unlock all mock tests and PYQs for 1 year"
                  });
                  setIsPurchased(true);
                  loadTest();
                } catch (err: any) {
                  toast({ title: "Payment Error", description: err.message, variant: "destructive" });
                }
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Unlock Access for ₹{subscriptionFee || 99}
            </Button>

            <Button
              variant="ghost"
              className="w-full h-10 text-slate-500 font-bold text-xs"
              onClick={() => navigate("/student/exam")}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Mock Tests
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm border border-slate-200/80 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Questions Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">This exam has not been populated with questions yet.</p>
          <Button onClick={() => navigate("/student/exam")} className="w-full bg-blue-600 text-white rounded-xl font-bold">
            Back to Mock Tests
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).filter(qId => answers[qId]).length;
  const unansweredCount = questions.length - answeredCount;
  const timeWarning = timeRemaining < 300;
  const timeCritical = timeRemaining < 60;

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col font-sans">
      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-3 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          Offline Mode: Your answers are saved locally and will automatically sync when internet reconnects.
        </div>
      )}

      {/* Top Header */}
      <header
        className={`shrink-0 transition-colors shadow-sm ${
          timeCritical
            ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white'
            : timeWarning
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
            : 'bg-gradient-to-r from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Brand / Exit button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSubmitDialog(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-all text-white border border-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Exit Exam</span>
              </motion.button>

              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/15">
                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/20 bg-white">
                  <img src="/logo-icon.png" alt="PracticeKoro" className="w-full h-full object-cover" />
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-black tracking-tight">
                    <span className="text-white">Practice</span>
                    <span className="text-blue-300">Koro</span>
                  </div>
                  <p className="text-[10px] text-blue-100/70 truncate max-w-[180px] lg:max-w-[280px]">
                    {test.title}
                  </p>
                </div>
              </div>
            </div>

            {/* Center: Question indicator */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold tracking-wide border border-white/10">
                Q {currentQuestionIndex + 1} / {questions.length}
              </span>
              {autoSaving && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Saving
                </span>
              )}
            </div>

            {/* Right: High-contrast Timer & Online status */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/80 bg-white/10 px-2.5 py-1 rounded-lg">
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-[10px] font-bold">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-[10px] font-bold">Local</span>
                  </>
                )}
              </div>

              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black font-mono shadow-sm ${
                  timeCritical
                    ? 'bg-white text-rose-700 animate-pulse'
                    : timeWarning
                    ? 'bg-white text-amber-800'
                    : 'bg-white/15 text-white border border-white/20'
                }`}
              >
                <Timer className="w-4 h-4" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area: Responsive 2-column on desktop / single column on mobile */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 pb-28 lg:pb-8 flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 items-start">
        {/* Left Column: Question & Options (8 or 9 cols on desktop) */}
        <main className="w-full lg:col-span-8 xl:col-span-9 flex flex-col space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Question Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
                {/* Meta header */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-black">
                      Question {String(currentQuestionIndex + 1).padStart(2, '0')}
                    </span>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs font-bold">
                      +{currentQuestion.marks} Mark{currentQuestion.marks > 1 ? "s" : ""}
                    </Badge>
                    {test.negative_marking && (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold">
                        -{test.negative_marks_per_question || 0.25} Neg
                      </Badge>
                    )}
                    {currentQuestion.questions.subject && (
                      <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                        • {currentQuestion.questions.subject}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => toggleMarkForReview(currentQuestion.question_id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      markedForReview.has(currentQuestion.question_id)
                        ? "bg-amber-50 text-amber-800 border-amber-200 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        markedForReview.has(currentQuestion.question_id)
                          ? "fill-amber-500 text-amber-500"
                          : "text-slate-400"
                      }`}
                    />
                    {markedForReview.has(currentQuestion.question_id) ? "Marked for Review" : "Mark Review"}
                  </button>
                </div>

                {/* Question Text */}
                <div className="text-slate-900 font-bold text-base sm:text-lg leading-relaxed font-bengali pt-1">
                  <MathText text={currentQuestion.questions.question_text} />
                </div>

                {/* Options List */}
                <RadioGroup
                  value={answers[currentQuestion.question_id] || ""}
                  onValueChange={val => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: val }))}
                  className="space-y-3 pt-2"
                >
                  {["A", "B", "C", "D"].map(opt => {
                    const isSelected = answers[currentQuestion.question_id] === opt;
                    const optText = currentQuestion.questions[`option_${opt.toLowerCase()}` as keyof QuestionDetails] as string;

                    return (
                      <div
                        key={opt}
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: opt }))}
                        className={`group flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50/70 border-blue-600 text-slate-900 ring-2 ring-blue-500/10 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-700"
                        }`}
                      >
                        <RadioGroupItem value={opt} id={`opt-${opt}`} className="sr-only" />
                        <span
                          className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 group-hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {opt}
                        </span>
                        <Label
                          htmlFor={`opt-${opt}`}
                          className="flex-1 cursor-pointer font-bengali text-xs sm:text-sm font-medium leading-relaxed pt-1 select-none"
                        >
                          <MathText text={optText} />
                        </Label>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>

                {/* Clear Choice Row */}
                {answers[currentQuestion.question_id] && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => clearCurrentAnswer(currentQuestion.question_id)}
                      className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors py-1 px-2 rounded-lg hover:bg-rose-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear Choice
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop-only question action bar below card */}
              <div className="hidden lg:flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                <Button
                  variant="outline"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  className="h-11 px-5 rounded-xl font-bold text-xs"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous Question
                </Button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMarkForReview(currentQuestion.question_id)}
                    className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                    {markedForReview.has(currentQuestion.question_id) ? "Unmark" : "Mark for Review"}
                  </button>
                </div>

                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                  >
                    Next Question <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                  >
                    <Send className="w-4 h-4 mr-1.5" /> Submit Exam
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right Column: Question Palette Sidebar for Desktop/Laptop (hidden on mobile) */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-4 sticky top-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-600" />
                Question Palette
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {questions.length} Questions
              </span>
            </div>

            {/* Mini Legend Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Answered: {answeredCount}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-100">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Review: {markedForReview.size}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span>Skipped: {unansweredCount}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-100">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Current: #{currentQuestionIndex + 1}</span>
              </div>
            </div>

            {/* Number grid */}
            <div className="grid grid-cols-5 gap-2 max-h-[340px] overflow-y-auto p-1 pr-2">
              {questions.map((q, idx) => {
                const isAns = !!answers[q.question_id];
                const isRev = markedForReview.has(q.question_id);
                const isCurr = idx === currentQuestionIndex;

                let badgeStyle = "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
                if (isCurr) {
                  badgeStyle = "ring-2 ring-blue-600 bg-blue-600 text-white font-black shadow-xs";
                } else if (isRev) {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                } else if (isAns) {
                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-9 rounded-xl border text-xs flex items-center justify-center transition-all ${badgeStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Submit CTA */}
            <div className="pt-2 border-t border-slate-100">
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                <Send className="w-4 h-4 mr-2" /> Submit Exam
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile-Only Bottom Floating Bar */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-bottom p-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            className="flex-1 h-12 rounded-2xl font-bold text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" /> Prev
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowNavigator(!showNavigator)}
            className="h-12 px-4 rounded-2xl font-bold text-xs relative bg-slate-50 border-slate-200"
          >
            <ListChecks className="w-4 h-4 mr-1.5 text-blue-600" />
            Palette
            {markedForReview.size > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute top-2 right-2 ring-2 ring-white" />
            )}
          </Button>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4 ml-0.5" />
            </Button>
          ) : (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4 mr-1" /> Submit
            </Button>
          )}
        </div>
      </footer>

      {/* Mobile Question Palette Drawer */}
      <AnimatePresence>
        {showNavigator && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
              onClick={() => setShowNavigator(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[75vh] overflow-hidden shadow-2xl p-5"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Question Palette</h3>
                <div className="flex items-center gap-2.5 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-700">🟢 {answeredCount}</span>
                  <span className="flex items-center gap-1 text-amber-600">🟡 {markedForReview.size}</span>
                  <span className="flex items-center gap-1 text-slate-500">⚪ {unansweredCount}</span>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5 pt-4 max-h-[50vh] overflow-y-auto">
                {questions.map((q, idx) => {
                  const isAns = !!answers[q.question_id];
                  const isRev = markedForReview.has(q.question_id);
                  const isCurr = idx === currentQuestionIndex;

                  let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
                  if (isCurr) badgeStyle = "ring-2 ring-blue-600 bg-blue-600 text-white font-black";
                  else if (isRev) badgeStyle = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                  else if (isAns) badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setShowNavigator(false);
                      }}
                      className={`h-11 rounded-xl border text-xs flex items-center justify-center transition-all ${badgeStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="w-[92vw] max-w-sm rounded-3xl p-6 border-0 shadow-2xl">
          <AlertDialogHeader className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-black text-slate-900">
              Submit Your Test?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <p className="text-xl font-black text-emerald-600">{answeredCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Answered</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-500">{unansweredCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Skipped</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-amber-600">{markedForReview.size}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Review</p>
                  </div>
                </div>

                {unansweredCount > 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl font-medium text-center">
                    ⚠️ You still have {unansweredCount} unanswered questions.
                  </p>
                )}

                {test.negative_marking && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl text-center font-medium">
                    ⚠️ Negative marking of -{test.negative_marks_per_question || 0.25} applies to wrong answers.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-row gap-2 pt-2">
            <AlertDialogCancel disabled={submitting} className="flex-1 rounded-xl h-11 text-xs font-bold">
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitTest}
              disabled={submitting}
              className="flex-1 rounded-xl h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? "Submitting..." : "Yes, Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakeTest;
