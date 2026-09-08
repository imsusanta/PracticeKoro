import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentContext";
import StudentLayout from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/MathText";
import {
  AlertOctagon,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  Crown,
  Bell,
  Bookmark
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface MistakeItem {
  id: string;
  question_id: string;
  selected_answer: string | null;
  correct_answer: string;
  is_mastered: boolean;
  retry_count: number;
  created_at: string;
  questions: {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string | null;
    subject: string | null;
    topic: string | null;
  };
}

export const MistakesNotebook = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterMastered, setFilterMastered] = useState<"all" | "active" | "mastered">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [retryMode, setRetryMode] = useState(false);
  const [activeRetryIndex, setActiveRetryIndex] = useState(0);
  const [retryAnswers, setRetryAnswers] = useState<{ [qId: string]: string }>({});
  const [showRetryResult, setShowRetryResult] = useState(false);

  const loadMistakes = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("student_mistakes")
        .select(`
          id,
          question_id,
          selected_answer,
          correct_answer,
          is_mastered,
          retry_count,
          created_at,
          questions (
            id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            explanation,
            subject,
            topic
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const items = data.map((item: any) => ({
          ...item,
          questions: Array.isArray(item.questions) ? item.questions[0] : item.questions
        })).filter(item => item.questions != null) as MistakeItem[];

        setMistakes(items);
        return;
      }

      const masteredLocal = JSON.parse(localStorage.getItem("pk_mastered_mistakes") || "[]");
      const masteredSet = new Set(masteredLocal);

      const { data: attemptsData } = await supabase
        .from("test_attempts")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_active", false)
        .limit(20);

      if (attemptsData && attemptsData.length > 0) {
        const attemptIds = attemptsData.map(a => a.id);
        const { data: wrongAnswers } = await supabase
          .from("test_answers")
          .select(`
            id,
            question_id,
            selected_answer,
            created_at,
            questions (
              id,
              question_text,
              option_a,
              option_b,
              option_c,
              option_d,
              correct_answer,
              explanation,
              subject,
              topic
            )
          `)
          .in("attempt_id", attemptIds)
          .eq("is_correct", false);

        if (wrongAnswers && wrongAnswers.length > 0) {
          const seen = new Set<string>();
          const fallbackItems: MistakeItem[] = [];

          wrongAnswers.forEach((wa: any) => {
            if (!seen.has(wa.question_id) && wa.questions) {
              seen.add(wa.question_id);
              const qObj = Array.isArray(wa.questions) ? wa.questions[0] : wa.questions;
              fallbackItems.push({
                id: wa.id,
                question_id: wa.question_id,
                selected_answer: wa.selected_answer,
                correct_answer: qObj.correct_answer,
                is_mastered: masteredSet.has(wa.question_id),
                retry_count: 1,
                created_at: wa.created_at || new Date().toISOString(),
                questions: qObj
              });
            }
          });

          setMistakes(fallbackItems);
          return;
        }
      }

      const localCached = JSON.parse(localStorage.getItem("pk_student_mistakes") || "[]");
      if (localCached.length > 0) {
        setMistakes(localCached);
      } else {
        // Fallback matching Screen 17 of blueprint
        setMistakes([
          {
            id: "m-1",
            question_id: "q-1",
            selected_answer: "A",
            correct_answer: "B",
            is_mastered: false,
            retry_count: 2,
            created_at: new Date().toISOString(),
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
              topic: "Constitution"
            }
          },
          {
            id: "m-2",
            question_id: "q-2",
            selected_answer: "C",
            correct_answer: "A",
            is_mastered: false,
            retry_count: 3,
            created_at: new Date().toISOString(),
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
              topic: "Geography"
            }
          },
          {
            id: "m-3",
            question_id: "q-3",
            selected_answer: "A",
            correct_answer: "B",
            is_mastered: false,
            retry_count: 1,
            created_at: new Date().toISOString(),
            questions: {
              id: "q-3",
              question_text: "ভারতের জাতীয় গান কোনটি?",
              option_a: "জন গণ মন",
              option_b: "বন্দে মাতরম্",
              option_c: "সারে জাহাঁ সে আচ্ছা",
              option_d: "আমার সোনার বাংলা",
              correct_answer: "B",
              explanation: "ভারতের জাতীয় গান হলো বঙ্কিমচন্দ্র চট্টোপাধ্যায় রচিত 'বন্দে মাতরম্' ।",
              subject: "General Knowledge",
              topic: "National Symbols"
            }
          },
          {
            id: "m-4",
            question_id: "q-4",
            selected_answer: "D",
            correct_answer: "B",
            is_mastered: false,
            retry_count: 2,
            created_at: new Date().toISOString(),
            questions: {
              id: "q-4",
              question_text: "ভারতীয় সংবিধানের কোন অনুচ্ছেদ অনুযায়ী মৌলিক অধিকার সুরক্ষিত?",
              option_a: "অনুচ্ছেদ ১৯",
              option_b: "অনুচ্ছেদ ৩২",
              option_c: "অনুচ্ছেদ ২১",
              option_d: "অনুচ্ছেদ ৪৪",
              correct_answer: "B",
              explanation: "অনুচ্ছেদ ৩২ কে ড. বি. আর. আম্বেদকর সংবিধানের 'হৃদয় ও আত্মা' আখ্যা দিয়েছেন।",
              subject: "Indian Polity",
              topic: "Fundamental Rights"
            }
          }
        ]);
      }
    } catch (err) {
      console.error("Error in loadMistakes:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadMistakes();
  }, [loadMistakes]);

  const toggleMastered = async (mistakeId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    setMistakes(prev =>
      prev.map(m => (m.id === mistakeId ? { ...m, is_mastered: nextStatus } : m))
    );

    try {
      const targetMistake = mistakes.find(m => m.id === mistakeId);
      const masteredLocal: string[] = JSON.parse(localStorage.getItem("pk_mastered_mistakes") || "[]");
      if (targetMistake) {
        if (nextStatus) {
          if (!masteredLocal.includes(targetMistake.question_id)) masteredLocal.push(targetMistake.question_id);
        } else {
          const idx = masteredLocal.indexOf(targetMistake.question_id);
          if (idx > -1) masteredLocal.splice(idx, 1);
        }
        localStorage.setItem("pk_mastered_mistakes", JSON.stringify(masteredLocal));
      }
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }

    try {
      await supabase
        .from("student_mistakes")
        .update({ is_mastered: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", mistakeId);
    } catch (err) {
      // Quiet fallback
    }

    toast.success(nextStatus ? "Marked as Mastered! 🎉" : "Moved back to active mistakes");
  };

  const handleRetrySelect = (ans: string) => {
    const currentItem = filteredMistakes[activeRetryIndex];
    setRetryAnswers(prev => ({ ...prev, [currentItem.question_id]: ans }));
    setShowRetryResult(true);

    if (ans.toUpperCase() === currentItem.correct_answer.toUpperCase()) {
      supabase
        .from("student_mistakes")
        .update({ is_mastered: true, updated_at: new Date().toISOString() })
        .eq("id", currentItem.id)
        .then();
    }
  };

  const nextRetryQuestion = () => {
    if (activeRetryIndex < filteredMistakes.length - 1) {
      setActiveRetryIndex(prev => prev + 1);
      setShowRetryResult(false);
    } else {
      toast.success("Retry session completed! Outstanding practice!");
      setRetryMode(false);
      loadMistakes();
    }
  };

  const availableSubjects = Array.from(
    new Set(mistakes.map(m => m.questions?.subject).filter(Boolean))
  ) as string[];

  const filteredMistakes = mistakes.filter(m => {
    if (filterMastered === "active" && m.is_mastered) return false;
    if (filterMastered === "mastered" && !m.is_mastered) return false;
    if (filterSubject !== "all" && m.questions?.subject !== filterSubject) return false;
    if (searchQuery.trim()) {
      const text = (m.questions?.question_text || "").toLowerCase();
      const sub = (m.questions?.subject || "").toLowerCase();
      const search = searchQuery.toLowerCase();
      return text.includes(search) || sub.includes(search);
    }
    return true;
  });

  return (
    <StudentLayout title="Mistakes Notebook" subtitle="Error Revision Vault">
      <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 pb-24 md:pb-8 space-y-4 md:space-y-6">
        {/* Top Brand Header */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/80 bg-white">
              <img src="/logo-circle.png" alt="PracticeKoro" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 font-display">
                  Practice<span className="text-blue-600">Koro</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Mistakes
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Automatic Error Notebook & Targeted Drills</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(hasSubscription ? "/student/profile" : "/student/exams")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors shadow-2xs ${
                hasSubscription
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-[#FEF3C7] text-amber-900 border-amber-200 hover:bg-amber-100"
              }`}
              title={hasSubscription ? "Pro Plan Active" : "Upgrade to Pro"}
            >
              <Crown className={`w-3.5 h-3.5 shrink-0 ${hasSubscription ? "text-emerald-600 fill-emerald-500" : "text-amber-600 fill-amber-500"}`} />
              <span>{hasSubscription ? "Pro Plan" : "Upgrade to Pro"}</span>
            </button>
            <button
              onClick={() => navigate("/student/notifications")}
              className="relative w-9 h-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!retryMode ? (
          <>
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-rose-500/15 rounded-full blur-2xl pointer-events-none -mb-24" />
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FBBF24] text-[11px] font-black uppercase tracking-wider">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Error Elimination Engine
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight font-display text-white">
                    My Mistakes <span className="text-[#FBBF24]">Notebook</span>
                  </h1>
                  <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                    Every incorrect answer from your mock tests and practice sets is automatically cataloged here. Re-attempt them until you achieve 100% accuracy.
                  </p>
                </div>

                {filteredMistakes.length > 0 && (
                  <div className="shrink-0">
                    <Button
                      onClick={() => {
                        setActiveRetryIndex(0);
                        setShowRetryResult(false);
                        setRetryMode(true);
                      }}
                      className="h-12 px-5 rounded-2xl bg-[#FBBF24] hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retry Mistakes ({filteredMistakes.length})
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Search Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-3.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search mistake questions or topics..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50/70 border border-slate-200/80 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              {/* Screen 17 Filter Chips: All, Subject, Topic, Difficulty */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {["All", "Subject", "Topic", "Difficulty"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      if (chip === "All") setFilterSubject("all");
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      (chip === "All" && filterSubject === "all") || (chip === "Subject" && filterSubject !== "all")
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                {/* Status Toggle Pills */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilterMastered("active")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      filterMastered === "active"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Active Mistakes ({mistakes.filter(m => !m.is_mastered).length})
                  </button>
                  <button
                    onClick={() => setFilterMastered("mastered")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      filterMastered === "mastered"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Mastered ({mistakes.filter(m => m.is_mastered).length})
                  </button>
                  <button
                    onClick={() => setFilterMastered("all")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      filterMastered === "all"
                        ? "bg-[#0F172A] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({mistakes.length})
                  </button>
                </div>

                {/* Subject Filter */}
                {availableSubjects.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setFilterSubject("all")}
                      className={`px-2.5 py-1 text-xs rounded-xl font-bold ${
                        filterSubject === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      All Subjects
                    </button>
                    {availableSubjects.map(sub => (
                      <button
                        key={sub}
                        onClick={() => setFilterSubject(sub)}
                        className={`px-2.5 py-1 text-xs rounded-xl font-bold whitespace-nowrap ${
                          filterSubject === sub ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mistakes List */}
            {loading ? (
              <div className="py-12 space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : filteredMistakes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">
                  {filterMastered === "active" ? "Zero Unresolved Mistakes! 🎉" : "No Questions Found"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {filterMastered === "active"
                    ? "You have mastered all recorded errors or answered all test questions correctly. Keep up the high accuracy!"
                    : "No questions match your current search and filters."}
                </p>
                <Button
                  onClick={() => navigate("/student/exam")}
                  className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Take a Mock Test
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMistakes.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-blue-200 transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Letter Circle (A, B, C, D) matching Screen 17 */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          ["bg-rose-100 text-rose-700 border border-rose-200", "bg-emerald-100 text-emerald-700 border border-emerald-200", "bg-purple-100 text-purple-700 border border-purple-200", "bg-amber-100 text-amber-700 border border-amber-200"][idx % 4]
                        }`}>
                          {String.fromCharCode(65 + (idx % 4))}
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          {/* Question Text */}
                          <div className="text-slate-900 font-bold text-sm sm:text-base leading-snug font-bengali">
                            <MathText text={item.questions.question_text} />
                          </div>

                          {/* Tags: Subject + Wrong X times red badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.questions.subject && (
                              <span className="text-[11px] font-semibold text-slate-500">
                                {item.questions.subject}
                              </span>
                            )}
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                              Wrong {item.retry_count || 2} {item.retry_count === 1 ? "time" : "times"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Bookmark Icon matching Screen 17 */}
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                          <Bookmark className="w-4 h-4 fill-blue-600" />
                        </div>
                      </div>
                    </div>

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { key: "A", text: item.questions.option_a },
                        { key: "B", text: item.questions.option_b },
                        { key: "C", text: item.questions.option_c },
                        { key: "D", text: item.questions.option_d },
                      ].map(opt => {
                        const isCorrect = opt.key === item.correct_answer.toUpperCase();
                        const isWrongSelected = opt.key === item.selected_answer?.toUpperCase() && !isCorrect;

                        let style = "bg-slate-50/60 border-slate-200/80 text-slate-700";
                        if (isCorrect) style = "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm";
                        if (isWrongSelected) style = "bg-rose-50 border-rose-400 text-rose-950 font-bold";

                        return (
                          <div
                            key={opt.key}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs sm:text-sm ${style}`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : isWrongSelected
                                  ? "bg-rose-600 text-white"
                                  : "bg-white border border-slate-200 text-slate-600"
                              }`}
                            >
                              {opt.key}
                            </span>
                            <span className="flex-1 font-bengali">
                              <MathText text={opt.text} />
                            </span>
                            {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            {isWrongSelected && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {item.questions.explanation && (
                      <div className="bg-slate-50 rounded-2xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-bengali border border-slate-200/80">
                        <strong className="text-slate-900 block mb-0.5 font-bold">💡 Explanation (ব্যাখ্যা):</strong>
                        <MathText text={item.questions.explanation} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Interactive Practice / Retry Flow */
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Mistakes Drill Mode
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">
                  Question {activeRetryIndex + 1} of {filteredMistakes.length}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRetryMode(false)}
                  className="text-xs h-8 rounded-xl font-bold"
                >
                  Exit Drill
                </Button>
              </div>
            </div>

            {filteredMistakes[activeRetryIndex] && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
                <div className="text-slate-900 font-bold text-base sm:text-lg leading-relaxed font-bengali">
                  <MathText text={filteredMistakes[activeRetryIndex].questions.question_text} />
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "A", text: filteredMistakes[activeRetryIndex].questions.option_a },
                    { key: "B", text: filteredMistakes[activeRetryIndex].questions.option_b },
                    { key: "C", text: filteredMistakes[activeRetryIndex].questions.option_c },
                    { key: "D", text: filteredMistakes[activeRetryIndex].questions.option_d },
                  ].map(opt => {
                    const selected = retryAnswers[filteredMistakes[activeRetryIndex].question_id] === opt.key;
                    const isCorrect = opt.key === filteredMistakes[activeRetryIndex].correct_answer.toUpperCase();

                    let style = "bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-100/70 hover:border-slate-300";
                    if (showRetryResult) {
                      if (isCorrect) style = "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm";
                      else if (selected) style = "bg-rose-50 border-rose-400 text-rose-950 font-bold";
                    }

                    return (
                      <button
                        key={opt.key}
                        disabled={showRetryResult}
                        onClick={() => handleRetrySelect(opt.key)}
                        className={`w-full flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all ${style}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                            showRetryResult && isCorrect
                              ? "bg-emerald-600 text-white"
                              : showRetryResult && selected && !isCorrect
                              ? "bg-rose-600 text-white"
                              : "bg-white border border-slate-200 text-slate-700"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1 font-bengali">
                          <MathText text={opt.text} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {showRetryResult && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="bg-slate-50 rounded-2xl p-4 text-xs sm:text-sm leading-relaxed font-bengali border border-slate-200/80">
                      {(() => {
                        const q = filteredMistakes[activeRetryIndex].questions;
                        const ans = (filteredMistakes[activeRetryIndex].correct_answer || '').toUpperCase().trim();
                        const correctText = ans === 'A' ? q.option_a : ans === 'B' ? q.option_b : ans === 'C' ? q.option_c : ans === 'D' ? q.option_d : null;
                        return (
                          <div className="font-bold text-emerald-800 mb-1.5 flex items-center flex-wrap gap-1.5">
                            <span>✓ Correct Answer: ({ans})</span>
                            {correctText && (
                              <span className="font-semibold text-emerald-950">
                                <MathText text={correctText} formatBullets={false} />
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {filteredMistakes[activeRetryIndex].questions.explanation && (
                        <MathText text={filteredMistakes[activeRetryIndex].questions.explanation!} />
                      )}
                    </div>
                    <Button
                      onClick={nextRetryQuestion}
                      className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm"
                    >
                      {activeRetryIndex < filteredMistakes.length - 1 ? "Next Mistake" : "Finish Drill"}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default MistakesNotebook;
