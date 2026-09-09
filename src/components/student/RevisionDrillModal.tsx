import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/MathText";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Flame,
  ChevronRight,
  Trophy,
  X,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MistakeItem } from "@/types/mistakes";
import { ERROR_TYPE_DEFINITIONS } from "@/types/mistakes";
import { evaluateReAttempt, recordMistakeReattempt } from "@/services/mistakesService";

interface RevisionDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistakes: MistakeItem[];
  title?: string;
  onMistakeUpdated?: (mistakeId: string, isMastered: boolean) => void;
}

export const RevisionDrillModal: React.FC<RevisionDrillModalProps> = ({
  isOpen,
  onClose,
  mistakes,
  title = "Targeted Revision Test",
  onMistakeUpdated,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setCorrectCount(0);
      setCurrentStreak(0);
      setIsFinished(false);
    }
  }, [isOpen]);

  if (!isOpen || mistakes.length === 0) return null;

  const currentMistake = mistakes[currentIndex];
  const q = currentMistake?.questions;
  const progressPercent = Math.round(((currentIndex + (hasAnswered ? 1 : 0)) / mistakes.length) * 100);

  const handleSelectOption = async (optionKey: string) => {
    if (hasAnswered || !currentMistake) return;

    setSelectedAnswer(optionKey);
    setHasAnswered(true);

    const evaluation = evaluateReAttempt(currentMistake, optionKey);

    if (evaluation.isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setCurrentStreak((prev) => prev + 1);
      onMistakeUpdated?.(currentMistake.id, true);
      recordMistakeReattempt(currentMistake.id, true).catch(() => {});
    } else {
      setCurrentStreak(0);
      recordMistakeReattempt(currentMistake.id, false).catch(() => {});
    }
  };

  const handleNext = () => {
    if (currentIndex < mistakes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xl">
        {!isFinished ? (
          <div className="space-y-4">
            {/* Header with Progress & Streak */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-none">
                    {title}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Question {currentIndex + 1} of {mistakes.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {currentStreak > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Streak: {currentStreak}</span>
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="w-8 h-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Question Details Card */}
            {q && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {q.subject && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                      {q.subject}
                    </span>
                  )}
                  {currentMistake.error_type && currentMistake.error_type !== "unclassified" && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        ERROR_TYPE_DEFINITIONS[currentMistake.error_type]?.badgeClass || ""
                      }`}
                    >
                      {ERROR_TYPE_DEFINITIONS[currentMistake.error_type]?.labelEn}
                    </span>
                  )}
                  {currentMistake.student_notes && (
                    <span className="text-[11px] text-blue-600 font-medium italic">
                      Note: {currentMistake.student_notes}
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <div className="text-slate-900 font-bold text-base sm:text-lg leading-relaxed font-bengali">
                  <MathText text={q.question_text} />
                </div>

                {/* Options Grid */}
                <div className="space-y-2 pt-1">
                  {[
                    { key: "A", text: q.option_a },
                    { key: "B", text: q.option_b },
                    { key: "C", text: q.option_c },
                    { key: "D", text: q.option_d },
                  ].map((opt) => {
                    const isSelected = selectedAnswer === opt.key;
                    const isCorrect = opt.key === currentMistake.correct_answer.toUpperCase();

                    let style =
                      "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300 text-slate-800";
                    if (hasAnswered) {
                      if (isCorrect) {
                        style = "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs";
                      } else if (isSelected) {
                        style = "bg-rose-50 border-rose-400 text-rose-950 font-bold";
                      } else {
                        style = "opacity-50 bg-slate-50 border-slate-200 text-slate-500";
                      }
                    }

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(opt.key)}
                        className={`w-full flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border text-left text-sm font-medium transition-all ${style}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                            hasAnswered && isCorrect
                              ? "bg-emerald-600 text-white"
                              : hasAnswered && isSelected && !isCorrect
                              ? "bg-rose-600 text-white"
                              : "bg-white border border-slate-200 text-slate-700"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1 font-bengali text-sm sm:text-base">
                          <MathText text={opt.text} />
                        </span>
                        {hasAnswered && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                        {hasAnswered && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback & Explanation Section */}
                <AnimatePresence>
                  {hasAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 pt-2"
                    >
                      {selectedAnswer?.toUpperCase() === currentMistake.correct_answer.toUpperCase() ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm font-bold flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Brilliant! You mastered this question 🎉</span>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs sm:text-sm font-bold flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Not quite. Review the official solution below:</span>
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="bg-slate-50 rounded-2xl p-4 text-xs sm:text-sm leading-relaxed font-bengali border border-slate-200/80">
                        <strong className="text-slate-900 block mb-1 font-bold">
                          💡 Explanation & Key Rule:
                        </strong>
                        {q.explanation ? (
                          <MathText text={q.explanation} />
                        ) : (
                          <span className="text-slate-500 italic">
                            Correct answer is option ({currentMistake.correct_answer.toUpperCase()}).
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={handleNext}
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span>{currentIndex < mistakes.length - 1 ? "Next Mistake" : "Finish Test"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : (
          /* Completion Summary */
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Revision Test Completed! 🎉
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                You re-attempted {mistakes.length} mistakes and solved {correctCount} correctly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto pt-2">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <span className="text-2xl font-black text-emerald-600 block leading-tight">
                  {correctCount}
                </span>
                <span className="text-[11px] text-slate-500 font-bold uppercase">Mastered</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <span className="text-2xl font-black text-blue-600 block leading-tight">
                  {Math.round((correctCount / mistakes.length) * 100)}%
                </span>
                <span className="text-[11px] text-slate-500 font-bold uppercase">Accuracy</span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
              >
                Back to Mistakes Notebook
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RevisionDrillModal;
