import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Award,
  Target,
  BookOpen,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RotateCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
  mock_tests: {
    id: string;
    title: string;
    passing_marks: number;
  };
}

const ReviewTest = () => {
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "skipped">("all");

  useEffect(() => {
    loadTestReview();
  }, [attemptId]);

  const loadTestReview = async () => {
    if (!attemptId) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const [attemptResult, answersResult] = await Promise.all([
        supabase.from("test_attempts").select(`*, mock_tests (id, title, passing_marks)`).eq("id", attemptId).eq("user_id", session.user.id).single(),
        supabase.from("test_answers").select(`*, questions (*)`).eq("attempt_id", attemptId).order("created_at", { ascending: true })
      ]);

      if (attemptResult.error || !attemptResult.data) {
        toast({ title: "Error", description: "Test attempt not found", variant: "destructive" });
        navigate("/student/results");
        return;
      }

      // Handle both object and array for mock_tests join
      const rawAttempt = attemptResult.data as any;
      if (Array.isArray(rawAttempt.mock_tests)) {
        rawAttempt.mock_tests = rawAttempt.mock_tests[0];
      }
      setAttempt(rawAttempt);

      console.log("[ReviewTest] Fetched answers with questions:", answersResult.data);

      const rawAnswers = answersResult.data || [];
      // Ensure questions is always an object, not an array
      const processedAnswers = rawAnswers.map((a: any) => {
        if (Array.isArray(a.questions)) {
          a.questions = a.questions[0];
        }
        return a;
      });

      setAnswers(processedAnswers);
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
  };

  const toggleQuestion = (id: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const filteredAnswers = answers.filter(a => {
    if (filter === "correct") return a.is_correct;
    if (filter === "incorrect") return !a.is_correct && a.selected_answer;
    if (filter === "skipped") return !a.selected_answer;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-emerald-500/30">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading Review...</p>
        </motion.div>
      </div>
    );
  }

  if (!attempt || !answers || answers.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 text-center max-w-sm"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-800 text-lg font-bold mb-2">We couldn't load this review</p>
          <p className="text-slate-500 text-sm mb-6">This attempt may be missing or still saving. Go back and try again.</p>
          <Button onClick={() => navigate("/student/results")} className="bg-indigo-600 text-white rounded-xl h-11 w-full">
            Back to Results
          </Button>
        </motion.div>
      </div>
    );
  }

  const correctAnswers = answers.filter(a => a.is_correct).length;
  const incorrectAnswers = answers.filter(a => !a.is_correct && a.selected_answer).length;
  const skippedAnswers = answers.filter(a => !a.selected_answer).length;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-indigo-50/30 pb-8">
      {/* ═══════════════════════════════════════════════════════════════
          COMPACT HERO HEADER - Pass/Fail Gradient
          ═══════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden safe-area-top"
        style={{
          background: attempt.passed
            ? 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0d9488 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #f43f5e 50%, #e11d48 100%)'
        }}
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/30 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        </div>

        <div className="relative px-4 pt-2 pb-4 md:px-6 md:pt-3 md:pb-6">
          {/* Navigation */}
          <div className="flex items-center mb-4">
            <motion.button
              type="button"
              aria-label="Back to results"
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/student/results")}
              className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </motion.button>
          </div>

          {/* Result Display - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2 border-2 border-white/30"
              style={{ boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)' }}
            >
              {attempt.passed ? (
                <Trophy className="w-7 h-7 md:w-8 md:h-8 text-yellow-300" />
              ) : (
                <XCircle className="w-7 h-7 md:w-8 md:h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-0.5 font-mono">{attempt?.percentage || 0}%</h1>
            <p className="text-white/80 text-[11px] md:text-sm mb-2">{attempt?.score || 0} / {attempt?.total_marks || 0} marks</p>
            <Badge className="bg-white/20 text-white text-[10px] px-2.5 py-0.5 border border-white/30">
              {attempt?.passed ? '🎉 Passed!' : '📚 Keep Practicing!'}
            </Badge>
            <p className="text-white/70 text-[10px] md:text-xs mt-2 font-medium px-4 truncate">{attempt?.mock_tests?.title || 'Unknown Test'}</p>
          </motion.div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          STATS CARDS - Floating Above Header
          ═══════════════════════════════════════════════════════════════ */}
      <div className="px-5 -mt-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[24px] p-5 grid grid-cols-3 gap-4"
          style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)' }}
        >
          <div className="text-center">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-2"
              style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-slate-900 font-mono">{correctAnswers}</p>
            <p className="text-[10px] md:text-xs text-slate-500 font-semibold">Correct</p>
          </div>
          <div className="text-center">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mx-auto mb-2"
              style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
            >
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-slate-900 font-mono">{incorrectAnswers}</p>
            <p className="text-[10px] md:text-xs text-slate-500 font-semibold">Incorrect</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2"
              style={{ boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
            >
              <Target className="w-5 h-5 text-white" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 font-mono">{skippedAnswers}</p>
            <p className="text-[10px] md:text-xs text-slate-500 font-semibold">Skipped</p>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════ */}
      <main className="px-5 pt-6 space-y-4 max-w-4xl mx-auto">
        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-native">
          {[
            { key: "all", label: `All (${answers.length})` },
            { key: "correct", label: `Correct (${correctAnswers})` },
            { key: "incorrect", label: `Wrong (${incorrectAnswers})` },
            { key: "skipped", label: `Skipped (${skippedAnswers})` },
          ].map(({ key, label }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(key as any)}
              className={`chip-animated whitespace-nowrap shrink-0 ${filter === key ? 'active' : ''}`}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {filteredAnswers.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <p className="font-bold text-slate-900">
                No {filter === "all" ? "" : filter} questions in this attempt
              </p>
              <p className="text-sm text-slate-500 mt-1">Try another filter to review your answers.</p>
            </div>
          )}
          {filteredAnswers.map((answer, index) => {
            const isExpanded = expandedQuestions.has(answer.id);
            const originalIndex = answers.findIndex(a => a.id === answer.id);

            return (
              <motion.div
                key={answer.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-[20px] overflow-hidden"
                style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)' }}
              >
                {/* Question Header */}
                <div
                  onClick={() => toggleQuestion(answer.id)}
                  className="p-4 cursor-pointer active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 ${answer.is_correct
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                      : answer.selected_answer
                        ? 'bg-gradient-to-br from-red-500 to-rose-500'
                        : 'bg-gradient-to-br from-amber-500 to-orange-500'
                      }`}
                      style={{
                        boxShadow: answer.is_correct
                          ? '0 4px 12px rgba(16, 185, 129, 0.25)'
                          : answer.selected_answer
                            ? '0 4px 12px rgba(239, 68, 68, 0.25)'
                            : '0 4px 12px rgba(245, 158, 11, 0.25)'
                      }}
                    >
                      {answer.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : answer.selected_answer ? (
                        <XCircle className="w-5 h-5 text-white" />
                      ) : (
                        <Target className="w-5 h-5 text-white" />
                      )}
                    </div>

                    {/* Question Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400">Q{originalIndex + 1}</span>
                        <Badge className={`text-[10px] ${answer.is_correct
                          ? 'bg-emerald-100 text-emerald-700'
                          : answer.selected_answer
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                          }`}>
                          {answer.is_correct ? 'Correct' : answer.selected_answer ? 'Wrong' : 'Skipped'}
                        </Badge>
                      </div>
                      {(() => {
                        const q = answer.questions;
                        return (
                          <p className={`text-slate-900 text-sm md:text-base leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {q?.question_text || "Question text not available"}
                          </p>
                        );
                      })()}
                    </div>

                    {/* Expand Icon */}
                    <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-100"
                    >
                      <div className="p-4 space-y-3">
                        {/* Options */}
                        {(() => {
                          const q = answer.questions;
                          return ['A', 'B', 'C', 'D'].map(option => {
                            const isCorrect = option === q?.correct_answer;
                            const isSelected = option === answer?.selected_answer;
                            const optionText = q ? (q[`option_${option.toLowerCase()}` as keyof Question] as string) : "Option not available";

                            return (
                              <div
                                key={option}
                                className={`p-3.5 rounded-xl border-2 ${isCorrect
                                  ? 'bg-emerald-50 border-emerald-400'
                                  : isSelected
                                    ? 'bg-red-50 border-red-400'
                                    : 'bg-slate-50 border-slate-200'
                                  }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${isCorrect
                                    ? 'bg-emerald-500 text-white'
                                    : isSelected
                                      ? 'bg-red-500 text-white'
                                      : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {option}
                                  </span>
                                  <div className="flex-1">
                                    <p className={`text-sm ${isCorrect ? 'text-emerald-800' : isSelected ? 'text-red-800' : 'text-slate-700'
                                      }`}>
                                      {optionText}
                                    </p>
                                    {isCorrect && (
                                      <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
                                        ✓ Correct Answer
                                      </span>
                                    )}
                                    {isSelected && !isCorrect && (
                                      <span className="text-[10px] text-red-600 font-semibold mt-1 inline-block">
                                        ✗ Your Answer
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}

                        {/* Explanation - Premium Glassmorphism Style */}
                        {(() => {
                          const q = answer.questions;
                          console.log("[ReviewTest] Question explanation:", { questionId: q?.id, explanation: q?.explanation });
                          if (!q?.explanation) return null;

                          return (
                            <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50"
                              style={{
                                background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.9) 0%, rgba(224, 231, 255, 0.7) 100%)',
                                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.1)'
                              }}
                            >
                              <div className="absolute inset-0 opacity-30">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-400/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                              </div>
                              <div className="relative p-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0"
                                    style={{ boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                                  >
                                    <Lightbulb className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-indigo-900 text-sm mb-1.5">Short Notes</h4>
                                    <p className="text-indigo-800/90 text-sm whitespace-pre-line leading-relaxed">
                                      {q.explanation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-3 pb-8">
          <motion.button
            type="button"
            disabled={!attempt?.mock_tests?.id}
            aria-disabled={!attempt?.mock_tests?.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => attempt?.mock_tests?.id && navigate(`/student/take-test/${attempt.mock_tests.id}`)}
            className="w-full btn-native bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RotateCw className="w-5 h-5" />
            Retake This Test
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/student/exams")}
            className="w-full btn-native bg-slate-100 text-slate-700"
          >
            <Zap className="w-5 h-5" />
            Try Another Test
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default ReviewTest;
