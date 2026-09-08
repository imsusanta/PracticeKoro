import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Bookmark,
  Save,
  ArrowLeft,
  Send,
  Timer,
  ListChecks,
  Zap,
  Home,
  Lock,
  CreditCard,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useExamSecurity } from "@/hooks/useExamSecurity";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast as sonnerToast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { initRazorpayPayment } from "@/utils/payment";
import { getYearlySubscriptionFee, hasActiveSubscription } from "@/lib/subscription";

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
  difficulty: string | null;
}

interface TestQuestion {
  id: string;
  question_id: string;
  marks: number;
  question_order: number;
  questions: Question;
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
}

const TakeTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<MockTest | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [isPurchased, setIsPurchased] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [fiveMinuteWarningShown, setFiveMinuteWarningShown] = useState(false);
  const [subscriptionFee, setSubscriptionFee] = useState<number>(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<Date>(new Date());
  const submitLockRef = useRef(false);
  const answersRef = useRef(answers);
  const markedForReviewRef = useRef(markedForReview);
  const questionsRef = useRef(questions);
  const testRef = useRef(test);
  const startTimeRef = useRef(startTime);
  const autoSavingRef = useRef(false);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { markedForReviewRef.current = markedForReview; }, [markedForReview]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { testRef.current = test; }, [test]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  // Anti-cheating security
  const {
    tabViolations,
    fullscreenViolations,
    isFullscreen,
    enterFullscreen
  } = useExamSecurity({
    onTabSwitch: violations => console.log('Tab violations:', violations),
    onFullscreenExit: violations => console.log('Fullscreen violations:', violations),
    maxTabViolations: 3,
    maxFullscreenViolations: 3,
    onMaxViolations: () => handleAutoSubmit()
  });

  const handleSubmitTest = useCallback(async () => {
    if (submitLockRef.current) return;
    const currentTest = testRef.current;
    const currentStartTime = startTimeRef.current;
    const currentQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;
    if (!currentTest || !testId || !currentStartTime) return;

    submitLockRef.current = true;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Session expired", description: "Please log in again to submit your test.", variant: "destructive" });
      submitLockRef.current = false;
      setSubmitting(false);
      return;
    }

    const answeredQuestions = Object.keys(currentAnswers).filter(qId => currentAnswers[qId]);
    const unansweredCount = currentQuestions.length - answeredQuestions.length;
    let correctCount = 0, wrongCount = 0, totalScore = 0;
    const answerRecords: any[] = [];

    currentQuestions.forEach(tq => {
      const selectedAnswer = currentAnswers[tq.question_id];
      const correctAnswer = tq.questions?.correct_answer;
      const isCorrect = !!selectedAnswer && !!correctAnswer && selectedAnswer === correctAnswer;
      const marksObtained = isCorrect ? tq.marks : 0;
      if (selectedAnswer) {
        isCorrect ? correctCount++ : wrongCount++;
      }
      totalScore += marksObtained;
      answerRecords.push({
        question_id: tq.question_id, selected_answer: selectedAnswer || null,
        is_correct: isCorrect, marks_obtained: marksObtained
      });
    });

    const totalMarks = currentTest.total_marks || 0;
    const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
    const passed = totalScore >= currentTest.passing_marks;
    const timeTakenSeconds = Math.floor((Date.now() - currentStartTime.getTime()) / 1000);

    const { data: attemptData, error: attemptError } = await supabase.from("test_attempts").insert({
      test_id: testId, user_id: session.user.id, score: totalScore,
      total_marks: totalMarks, percentage, passed,
      started_at: currentStartTime.toISOString(), completed_at: new Date().toISOString(),
      time_taken_seconds: timeTakenSeconds, unanswered_count: unansweredCount,
      correct_count: correctCount, wrong_count: wrongCount, is_active: false,
      tab_violations: tabViolations, fullscreen_violations: fullscreenViolations
    }).select().single();

    if (attemptError || !attemptData) {
      toast({ title: "Error", description: "Failed to submit test", variant: "destructive" });
      submitLockRef.current = false;
      setSubmitting(false);
      return;
    }

    const { error: answersError } = await supabase.from("test_answers").insert(answerRecords.map(ans => ({ ...ans, attempt_id: attemptData.id })));
    if (answersError) {
      toast({ title: "Error", description: "Test recorded but answers failed to save. Please contact support with your attempt ID.", variant: "destructive" });
      submitLockRef.current = false;
      setSubmitting(false);
      return;
    }

    await supabase.from("test_answer_drafts").delete().eq("test_id", testId).eq("user_id", session.user.id);
    await supabase.from("test_timers").delete().eq("test_id", testId).eq("user_id", session.user.id);

    sonnerToast.success("Test Submitted!", { description: `You scored ${totalScore}/${totalMarks} (${percentage}%)` });
    navigate(`/student/test-review/${attemptData.id}`);
  }, [testId, tabViolations, fullscreenViolations, navigate, toast]);

  const handleAutoSubmit = useCallback(() => {
    if (submitLockRef.current) return;
    sonnerToast.error("⏰ Time's Up!", { description: "Submitting your test automatically...", duration: 5000 });
    handleSubmitTest();
  }, [handleSubmitTest]);

  const autoSaveAnswers = useCallback(async (opts?: { silent?: boolean }) => {
    if (!testId || autoSavingRef.current) return;
    const currentQuestions = questionsRef.current;
    if (currentQuestions.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    autoSavingRef.current = true;
    setAutoSaving(true);
    try {
      const currentAnswers = answersRef.current;
      const currentMarked = markedForReviewRef.current;
      const drafts = currentQuestions.map(q => ({
        test_id: testId, user_id: session.user.id, question_id: q.question_id,
        selected_answer: currentAnswers[q.question_id] || null,
        marked_for_review: currentMarked.has(q.question_id),
        last_saved_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("test_answer_drafts").upsert(drafts, { onConflict: "test_id,user_id,question_id" });
      if (!error) {
        lastSaveRef.current = new Date();
        if (!opts?.silent) {
          sonnerToast.success("Progress saved", { duration: 2000 });
        }
      }
    } catch (error) {
      console.error("Auto-save error:", error);
    } finally {
      autoSavingRef.current = false;
      setAutoSaving(false);
    }
  }, [testId]);

  const loadTest = useCallback(async () => {
    if (!testId) return;

    const fee = await getYearlySubscriptionFee();
    if (fee) setSubscriptionFee(fee);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      navigate("/login");
      return;
    }

    // Check approval status
    const { data: approvalData } = await supabase.from("approval_status").select("status").eq("user_id", session.user.id).single();
    if (approvalData?.status === "payment_locked") {
      setApprovalStatus("approved"); // Fallback to approved
    } else {
      setApprovalStatus(approvalData?.status || "pending");
    }

    const { data: activeAttempt } = await supabase.from("test_attempts").select("id").eq("test_id", testId).eq("user_id", session.user.id).eq("is_active", true).maybeSingle();
    if (activeAttempt) {
      toast({ title: "Test Already in Progress", description: "Complete or abandon your active attempt first.", variant: "destructive" });
      setLoading(false);
      navigate("/student/exams");
      return;
    }

    const { data: testData, error: testError } = await supabase.from("mock_tests").select("*").eq("id", testId).single();
    if (testError || !testData) {
      toast({ title: "Error", description: "Test not found", variant: "destructive" });
      setLoading(false);
      navigate("/student/exams");
      return;
    }

    // Check if test is paid and if user has active subscription
    if (testData.is_paid) {
      const purchased = await hasActiveSubscription(session.user.id);
      if (!purchased) {
        setTest(testData);
        setIsPurchased(false);
        setLoading(false);
        return;
      }
      setIsPurchased(true);
    } else {
      setIsPurchased(true);
    }

    const { data: questionsData, error: questionsError } = await supabase
      .from("test_questions")
      .select(`*, questions (*)`)
      .eq("test_id", testId)
      .order("question_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (questionsError) {
      toast({ title: "Error", description: "Failed to load questions", variant: "destructive" });
      setLoading(false);
      navigate("/student/exams");
      return;
    }

    const processedQuestions = questionsData as any[];
    // Shuffling disabled as per user request to maintain upload order

    const restoreDrafts = async () => {
      const { data: savedAnswers } = await supabase.from("test_answer_drafts").select("*").eq("test_id", testId).eq("user_id", session.user.id);
      if (savedAnswers) {
        const answersMap: { [key: string]: string } = {};
        const reviewSet = new Set<string>();
        savedAnswers.forEach(ans => {
          if (ans.selected_answer) answersMap[ans.question_id] = ans.selected_answer;
          if (ans.marked_for_review) reviewSet.add(ans.question_id);
        });
        setAnswers(answersMap);
        setMarkedForReview(reviewSet);
      }
    };

    const { data: existingTimer } = await supabase.from("test_timers").select("*").eq("test_id", testId).eq("user_id", session.user.id).maybeSingle();
    let initialTime: number;
    let startDateTime: Date;

    if (existingTimer) {
      const endsAt = new Date(existingTimer.ends_at);
      initialTime = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
      startDateTime = new Date(existingTimer.started_at);
      await restoreDrafts();
      sonnerToast.success("Test resumed", { description: "Your progress has been restored." });
    } else {
      initialTime = testData.duration_minutes * 60;
      startDateTime = new Date();
      const endsAt = new Date(startDateTime.getTime() + initialTime * 1000);
      const { error: timerInsertError } = await supabase.from("test_timers").insert({
        test_id: testId, user_id: session.user.id,
        started_at: startDateTime.toISOString(), duration_minutes: testData.duration_minutes,
        ends_at: endsAt.toISOString()
      });
      // Concurrent tab: reuse the timer that won the unique (test_id, user_id) insert
      if (timerInsertError) {
        const { data: racedTimer } = await supabase.from("test_timers").select("*").eq("test_id", testId).eq("user_id", session.user.id).maybeSingle();
        if (racedTimer) {
          const racedEndsAt = new Date(racedTimer.ends_at);
          initialTime = Math.max(0, Math.floor((racedEndsAt.getTime() - Date.now()) / 1000));
          startDateTime = new Date(racedTimer.started_at);
          await restoreDrafts();
        }
      }
    }

    setTest(testData);
    setQuestions(processedQuestions);
    setTimeRemaining(initialTime);
    setStartTime(startDateTime);
    setLoading(false);
  }, [testId, navigate, toast]);

  useEffect(() => {
    loadTest();
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [loadTest]);

  const handleAutoSubmitRef = useRef(handleAutoSubmit);
  handleAutoSubmitRef.current = handleAutoSubmit;
  const timeExpired = !loading && !!startTime && timeRemaining <= 0;

  // Countdown is independent of answer changes so the interval is not torn down every keystroke.
  useEffect(() => {
    if (loading || !startTime) return;
    if (timeExpired) {
      handleAutoSubmitRef.current();
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, startTime, timeExpired]);

  useEffect(() => {
    if (timeRemaining === 300 && !fiveMinuteWarningShown && startTime) {
      setFiveMinuteWarningShown(true);
      sonnerToast.warning("⏰ 5 minutes remaining!", {
        description: "Review your answers and submit soon.",
        duration: 10000
      });
    }
  }, [timeRemaining, fiveMinuteWarningShown, startTime]);

  useEffect(() => {
    if (!test || !testId) return;
    autoSaveTimerRef.current = setInterval(() => autoSaveAnswers({ silent: true }), 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [test, testId, autoSaveAnswers]);

  // Debounced save so a refresh shortly after answering does not lose work
  useEffect(() => {
    if (!test || !testId) return;
    const timeout = setTimeout(() => autoSaveAnswers({ silent: true }), 2000);
    return () => clearTimeout(timeout);
  }, [answers, markedForReview, test, testId, autoSaveAnswers]);

  useEffect(() => {
    const flush = () => { void autoSaveAnswers({ silent: true }); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [autoSaveAnswers]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };


  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      newSet.has(questionId) ? newSet.delete(questionId) : newSet.add(questionId);
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 backdrop-blur-sm rounded-[32px] p-8 shadow-2xl text-center max-w-sm w-full border border-white/50"
        >
          <div className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-indigo-500/30">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2 font-display">Preparing Your Test</h2>
          <p className="text-slate-500 mb-6">Loading questions...</p>
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <Button onClick={enterFullscreen} className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl h-14 font-bold shadow-indigo-500/25 hover:transition-all">
            Enter Fullscreen Mode
          </Button>
        </motion.div>
      </div>
    );

  }

  // Show Payment Lock Screen

  // Show Purchase Required Screen
  if (test && test.is_paid && !isPurchased) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/30">
              <CreditCard className="w-10 h-10 text-white" />
            </div>
            <Badge className="bg-white/20 text-white border-0 text-[10px] font-black tracking-widest uppercase px-3 py-1 mb-3">
              Premium Content
            </Badge>
            <h1 className="text-2xl font-black text-white mb-2 font-display">Unlock Premium Access</h1>
            <p className="text-indigo-100 font-medium">{test.title}</p>
          </div>

          <div className="p-8 flex flex-col gap-6">
            <div className="text-center space-y-2">
              <p className="text-gray-500 text-sm">Join our yearly plan to unlock all premium notes and mock tests.</p>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900">₹{subscriptionFee}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Per Year</span>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 font-black text-lg group transition-all"
                onClick={async () => {
                  if (!test) return;
                  try {
                    await initRazorpayPayment({
                      amount: subscriptionFee,
                      contentId: "site_yearly_subscription",
                      contentType: "subscription" as any,
                      title: "Yearly Premium Subscription",
                      description: "Unlock all premium notes and mock tests for 1 year"
                    });
                    sonnerToast.success("Subscription Active", { description: "You now have full access to all premium content!" });
                    setIsPurchased(true);
                    setLoading(true);
                    loadTest();
                  } catch (err: any) {
                    toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
                  }
                }}
              >
                Buy Now
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="ghost"
                className="w-full h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-50"
                onClick={() => navigate("/student/exams")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Browse Other Tests
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                Secure payment handled by Razorpay
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-indigo-50/20 to-violet-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-[28px] p-8 text-center border border-slate-100">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-slate-800 text-lg mb-4 font-display font-bold">No questions found</p>
          <Button onClick={() => navigate("/student/exams")} className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl h-12 px-6 font-bold shadow-indigo-500/25">
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion?.questions) {
    return null;
  }

  const answeredCount = Object.keys(answers).filter(qId => answers[qId]).length;
  const unansweredCount = questions.length - answeredCount;
  const timeWarning = timeRemaining < 300;
  const timeCritical = timeRemaining < 60;

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      {/* Sleek Header */}
      <header className={`shrink-0 transition-all duration-150 ${timeCritical
        ? 'bg-gradient-to-r from-rose-500 to-rose-600'
        : timeWarning
          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
          : 'bg-gradient-to-r from-indigo-600 to-violet-600'
        }`}>
        <div className="px-3 py-3 safe-area-top">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/student/exams")}
              className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>

            {/* Question Counter */}
            <div className="flex-1 text-center">
              <span className="inline-block px-3 py-1.5 rounded-full bg-white/20 text-white text-[13px] font-bold backdrop-blur-sm whitespace-nowrap">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>

            {/* Timer */}
            <motion.div
              animate={timeCritical ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeCritical ? Infinity : 0 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 ${timeCritical
                ? 'bg-white text-rose-600'
                : 'bg-white/15 text-white backdrop-blur-sm'
                }`}
            >
              <Timer className="w-4 h-4" />
              <span className="text-[13px] font-bold font-mono">{formatTime(timeRemaining)}</span>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>
      </header>

      {/* Main Content - Full Screen Question Display */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Question Section - Takes Full Available Space */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Question Header with Badges */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs font-bold px-3 py-1">
                      {currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}
                    </Badge>
                    {currentQuestion.questions.difficulty && (
                      <Badge className={`border-0 text-xs font-bold px-3 py-1 ${currentQuestion.questions.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                        currentQuestion.questions.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                        {currentQuestion.questions.difficulty}
                      </Badge>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleMarkForReview(currentQuestion.question_id)}
                    className={`p-2 rounded-xl transition-all ${markedForReview.has(currentQuestion.question_id)
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    <Bookmark className={`w-5 h-5 ${markedForReview.has(currentQuestion.question_id) ? 'fill-current' : ''}`} />
                  </motion.button>
                </div>
              </div>

              {/* Question Text - Large and Prominent */}
              <div className="px-4 py-3">
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                  <p className="text-slate-900 text-base sm:text-lg lg:text-xl leading-relaxed font-semibold">
                    {currentQuestion.questions.question_text}
                  </p>
                </div>
              </div>

              {/* Options - Large Touch Targets */}
              <div className="px-4 pb-6 space-y-3">
                <RadioGroup
                  value={answers[currentQuestion.question_id] || ""}
                  onValueChange={value => setAnswers({ ...answers, [currentQuestion.question_id]: value })}
                  className="space-y-3"
                >
                  {['A', 'B', 'C', 'D'].map((option, idx) => {
                    const isSelected = answers[currentQuestion.question_id] === option;
                    const optionText = currentQuestion.questions[`option_${option.toLowerCase()}` as keyof Question] as string;
                    return (
                      <motion.div
                        key={option}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAnswers({ ...answers, [currentQuestion.question_id]: option })}
                        className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected
                          ? 'bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-white border-slate-200 active:border-indigo-300'
                          }`}
                      >
                        <RadioGroupItem value={option} id={`option-${option}`} className="sr-only" />
                        <span className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 ${isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                          }`}>
                          {option}
                        </span>
                        <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer pt-1 min-h-[44px]">
                          <span className={`text-[14px] sm:text-base leading-snug block mt-1 ${isSelected ? 'text-indigo-900 font-bold' : 'text-slate-700 font-medium'}`}>
                            {optionText}
                          </span>
                        </Label>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-2" />
                        )}
                      </motion.div>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Clean and Modern */}
      <nav className="shrink-0 bg-white border-t border-slate-200 safe-area-bottom">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Previous */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex-1 h-12 rounded-xl border-2 border-slate-200 font-bold text-slate-600 text-sm flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </motion.button>

            {/* Navigator & Submit */}
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNavigator(!showNavigator)}
                className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center relative border border-slate-200"
              >
                <ListChecks className="w-5 h-5 text-slate-600" />
                {markedForReview.size > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {markedForReview.size}
                  </span>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSubmitDialog(true)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentQuestionIndex === questions.length - 1 && answers[currentQuestion.question_id]
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg'
                  : 'bg-indigo-600 shadow-indigo-500/30'
                  }`}
              >
                <Send className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Next */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex-1 h-12 rounded-xl bg-indigo-600 font-bold text-white text-sm flex items-center justify-center gap-1 disabled:opacity-40 shadow-indigo-500/30"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Question Navigator Sheet */}
      <AnimatePresence>
        {showNavigator && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowNavigator(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-50 max-h-[60vh] overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100">
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">Questions</h3>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-slate-600">
                    <div className="w-3 h-3 rounded bg-indigo-500" /> {answeredCount} Done
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <div className="w-3 h-3 rounded bg-slate-200" /> {unansweredCount} Left
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Bookmark className="w-3 h-3 fill-amber-500 text-amber-500" /> {markedForReview.size}
                  </span>
                </div>
              </div>
              <div className="p-4 overflow-auto max-h-[45vh]">
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                  {questions.map((q, index) => {
                    const isAnswered = !!answers[q.question_id];
                    const isMarked = markedForReview.has(q.question_id);
                    const isCurrent = index === currentQuestionIndex;
                    return (
                      <motion.button
                        key={q.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setCurrentQuestionIndex(index);
                          setShowNavigator(false);
                        }}
                        className={`relative h-11 rounded-xl font-black text-[13px] flex items-center justify-center ${isCurrent
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'
                          : isAnswered
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                      >
                        {index + 1}
                        {isMarked && (
                          <div className="absolute -top-1 -right-1">
                            <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="w-[90vw] max-w-sm mx-auto rounded-[24px] p-5 gap-4 border-0 shadow-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6 text-white" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-center">Submit Test?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="flex justify-center gap-6 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-indigo-600">{answeredCount}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Done</span>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-amber-500">{unansweredCount}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Skip</span>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-violet-600">{markedForReview.size}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Mark</span>
                  </div>
                </div>
                {unansweredCount > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-center font-medium">
                    ⚠️ {unansweredCount} unanswered
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 pt-1">
            <AlertDialogCancel disabled={submitting} className="flex-1 h-11 rounded-xl text-sm font-bold border-2">
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitTest}
              disabled={submitting}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-bold"
            >
              {submitting ? "..." : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakeTest;
