import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DrillConfig, DrillQuestion, DrillResult } from "@/types/drills";
import { evaluateDrill, syncDrillMistakesToVault, recordDrillActivity } from "@/services/drillService";
import { MathText } from "@/components/ui/MathText";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  BookOpen,
  X,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Flame,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentContext";

interface InteractiveDrillRunnerProps {
  config: DrillConfig;
  questions: DrillQuestion[];
  onClose: () => void;
}

export const InteractiveDrillRunner: React.FC<InteractiveDrillRunnerProps> = ({
  config,
  questions,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user } = useStudentAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Timer
  const [startTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const totalAllowedSeconds = (config.timeLimitMinutes || 15) * 60;
  const isTimed = config.mode === "timed_quiz";

  // Load bookmarks
  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_bookmarks")
      .select("question_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          setBookmarkedIds(new Set(data.map((b: any) => b.question_id)));
        }
      });
  }, [user]);

  // Active Timer Tick
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);

      if (isTimed && elapsed >= totalAllowedSeconds) {
        toast.warning("Time is up! Auto-submitting your drill...");
        handleFinish();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isFinished, isTimed, totalAllowedSeconds, startTime]);

  const currentQ = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  const toggleBookmark = async (qId: string) => {
    if (!user) {
      toast.info("Please log in to save bookmarks");
      return;
    }
    const isBookmarked = bookmarkedIds.has(qId);
    if (isBookmarked) {
      await supabase.from("student_bookmarks").delete().eq("user_id", user.id).eq("question_id", qId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      toast.info("Removed from Bookmarks");
    } else {
      await supabase.from("student_bookmarks").insert({ user_id: user.id, question_id: qId });
      setBookmarkedIds((prev) => new Set(prev).add(qId));
      toast.success("Saved to Bookmarks ⭐");
    }
  };

  const handleSelectOption = (optKey: string) => {
    if (!currentQ) return;
    if (config.mode === "instant_feedback" && revealedQuestions.has(currentQ.id)) {
      return; // Locked in instant feedback mode once answered
    }

    setAnswers((prev) => ({ ...prev, [currentQ.id]: optKey }));

    if (config.mode === "instant_feedback") {
      setRevealedQuestions((prev) => new Set(prev).add(currentQ.id));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    const timeSpent = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const evalResult = evaluateDrill(
      questions,
      answers,
      config.marksPerQuestion,
      config.negativeMarks,
      timeSpent
    );

    setResult(evalResult);
    setIsFinished(true);

    // Sync activity & mistakes
    recordDrillActivity(evalResult);
    if (evalResult.incorrectQuestions.length > 0) {
      await syncDrillMistakesToVault(user?.id, evalResult.incorrectQuestions);
      toast.info(
        `${evalResult.incorrectQuestions.length} mistakes saved to your Mistakes Notebook!`
      );
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* TOP CONTROLS & HEADER */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                {config.mode === "instant_feedback" ? "Instant Feedback" : "Timed Quiz"}
              </span>
              {config.negativeMarks > 0 ? (
                <span className="text-[10px] font-bold text-rose-400">
                  -{config.negativeMarks} Neg
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-400">No Negative</span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-white truncate font-display mt-0.5">
              {config.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-mono font-bold text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isTimed
                  ? formatSeconds(Math.max(0, totalAllowedSeconds - elapsedSeconds))
                  : formatSeconds(elapsedSeconds)}
              </span>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                if (isFinished || Object.keys(answers).length === 0) {
                  onClose();
                } else if (confirm("Exit drill? Your current progress and score will be submitted.")) {
                  handleFinish();
                }
              }}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PROGRESS TRACKER */}
        {!isFinished && (
          <div className="bg-slate-100 border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-mono font-black">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-medium">
                {Object.keys(answers).length} answered
              </span>
            </div>
            <div className="w-24 sm:w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* BODY CONTENT */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {!isFinished ? (
            /* ACTIVE QUESTION VIEW */
            currentQ && (
              <div className="space-y-5">
                {/* Meta Pills */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {currentQ.year && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black">
                        PYQ {currentQ.year}
                      </span>
                    )}
                    {currentQ.subject && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        {currentQ.subject}
                      </span>
                    )}
                    {currentQ.topic && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {currentQ.topic}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                      +{config.marksPerQuestion} / -{config.negativeMarks}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleBookmark(currentQ.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"
                    title={bookmarkedIds.has(currentQ.id) ? "Remove Bookmark" : "Save Question"}
                  >
                    {bookmarkedIds.has(currentQ.id) ? (
                      <BookmarkCheck className="w-5 h-5 text-amber-500 fill-amber-500" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Question Text */}
                <div className="text-slate-900 font-bold text-base sm:text-lg leading-relaxed font-bengali">
                  <MathText text={currentQ.question_text} />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { key: "A", text: currentQ.option_a },
                    { key: "B", text: currentQ.option_b },
                    { key: "C", text: currentQ.option_c },
                    { key: "D", text: currentQ.option_d },
                  ].map((opt) => {
                    const isSelected = answers[currentQ.id] === opt.key;
                    const isRevealed =
                      config.mode === "instant_feedback" && revealedQuestions.has(currentQ.id);
                    const isCorrect = opt.key === currentQ.correct_answer.toUpperCase().trim();

                    let optionClass =
                      "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40";
                    let badgeClass = "border-slate-200 bg-slate-100 text-slate-600";

                    if (isRevealed) {
                      if (isCorrect) {
                        optionClass = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs";
                        badgeClass = "bg-emerald-600 text-white border-emerald-600";
                      } else if (isSelected && !isCorrect) {
                        optionClass = "border-rose-500 bg-rose-50 text-rose-950 font-bold shadow-xs";
                        badgeClass = "bg-rose-600 text-white border-rose-600";
                      }
                    } else if (isSelected) {
                      optionClass = "border-blue-600 bg-blue-50/80 text-blue-950 font-bold shadow-xs";
                      badgeClass = "bg-blue-600 text-white border-blue-600";
                    }

                    return (
                      <motion.div
                        key={opt.key}
                        whileHover={!isRevealed ? { x: 2 } : {}}
                        whileTap={!isRevealed ? { scale: 0.99 } : {}}
                        onClick={() => handleSelectOption(opt.key)}
                        className={`p-3.5 sm:p-4 rounded-2xl border text-sm flex items-center gap-3 cursor-pointer transition-all ${optionClass}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 border ${badgeClass}`}
                        >
                          {opt.key}
                        </span>
                        <div className="flex-1 font-bengali">
                          <MathText text={opt.text} />
                        </div>
                        {isRevealed && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                        {isRevealed && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Instant Feedback Explanation Banner */}
                {config.mode === "instant_feedback" && revealedQuestions.has(currentQ.id) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 sm:p-5 bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bengali space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {answers[currentQ.id]?.toUpperCase() === currentQ.correct_answer.toUpperCase() ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct! (+{config.marksPerQuestion})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect (-{config.negativeMarks})
                        </span>
                      )}
                      <span className="text-slate-600 font-bold">
                        Correct Option: ({currentQ.correct_answer})
                      </span>
                    </div>

                    {currentQ.explanation ? (
                      <div className="pt-2 border-t border-slate-200 text-slate-700 leading-relaxed">
                        <strong className="text-slate-900 block mb-1">Explanation & Shortcut:</strong>
                        <MathText text={currentQ.explanation} />
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">Standard exam-level question.</p>
                    )}
                  </motion.div>
                )}
              </div>
            )
          ) : (
            /* DRILL SUMMARY / COMPLETION SCREEN */
            result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                    Drill Completed! 🎉
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Performance analytics and negative marking breakdown generated.
                  </p>
                </div>

                {/* Score Card */}
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white rounded-3xl p-5 sm:p-6 shadow-lg space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono">
                      {result.score}
                    </span>
                    <span className="text-blue-200 text-sm font-bold self-end mb-1">
                      / {result.maxScore} marks
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs font-bold text-blue-100 pt-1 border-t border-white/15">
                    <span>Correct: {result.correctCount}</span>
                    <span>•</span>
                    <span>Wrong: {result.wrongCount}</span>
                    <span>•</span>
                    <span>Skipped: {result.unattemptedCount}</span>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Target className="w-3.5 h-3.5 text-emerald-600" /> Accuracy
                    </div>
                    <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                      {result.accuracyPercentage}%
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" /> Time Spent
                    </div>
                    <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                      {formatSeconds(result.timeSpentSeconds)}
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Flame className="w-3.5 h-3.5 text-rose-600" /> Saved Mistakes
                    </div>
                    <p className="text-lg font-black text-rose-600 mt-1 font-mono">
                      {result.wrongCount} {result.wrongCount === 1 ? "mistake" : "mistakes"}
                    </p>
                  </div>
                </div>

                {/* Mistakes Alert Notice */}
                {result.wrongCount > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Mistakes Saved to Vault:</strong> Your incorrect questions have been automatically logged into your Mistakes Notebook so you can tag the root cause and master them.
                    </div>
                  </div>
                )}
              </motion.div>
            )
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {!isFinished ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="rounded-xl text-xs font-bold gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentIndex === questions.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={handleFinish}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1 px-4 shadow-sm"
                  >
                    <span>Finish Drill</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1 px-4 shadow-sm"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
              {result && result.wrongCount > 0 && (
                <Button
                  onClick={() => {
                    onClose();
                    navigate("/student/mistakes");
                  }}
                  className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Mistakes Notebook ({result.wrongCount})</span>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setAnswers({});
                  setRevealedQuestions(new Set());
                  setIsFinished(false);
                  setCurrentIndex(0);
                  setResult(null);
                }}
                className="w-full sm:w-auto rounded-xl text-xs font-bold gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Drill</span>
              </Button>

              <Button
                variant="secondary"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl text-xs font-bold"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default InteractiveDrillRunner;
