import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentContext";
import StudentLayout from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/MathText";
import {
  Calendar,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  HelpCircle,
  Layers,
  Crown,
  Bell,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface PYQQuestion {
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
  difficulty: string | null;
  year: number | null;
}

export const PYQPractice = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<PYQQuestion[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [pyqTab, setPyqTab] = useState<"year" | "subject" | "topic">("year");
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null);

  const loadPYQData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: bookmarks } = await supabase
        .from("student_bookmarks")
        .select("question_id")
        .eq("user_id", session.user.id);

      if (bookmarks) {
        setBookmarkedIds(new Set(bookmarks.map(b => b.question_id)));
      }

      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic, difficulty, year")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Error loading PYQs:", error);
        toast.error("Failed to load Previous Year Questions");
        return;
      }

      if (data) {
        const qList = data as PYQQuestion[];
        setQuestions(qList);

        const yearsSet = new Set<number>();
        const subsSet = new Set<string>();

        qList.forEach(q => {
          if (q.year) yearsSet.add(q.year);
          if (q.subject) subsSet.add(q.subject);
        });

        const defaultYears = [2025, 2024, 2023, 2022, 2021, 2020];
        const combinedYears = Array.from(yearsSet).length > 0
          ? Array.from(yearsSet).sort((a, b) => b - a)
          : defaultYears;

        setAvailableYears(combinedYears);
        setAvailableSubjects(Array.from(subsSet).sort());
      }
    } catch (err) {
      console.error("Error in loadPYQData:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadPYQData();
  }, [loadPYQData]);

  const toggleReveal = (id: string) => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBookmark = async (questionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const isBookmarked = bookmarkedIds.has(questionId);
    if (isBookmarked) {
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
      toast.info("Removed from Bookmarks");
    } else {
      await supabase
        .from("student_bookmarks")
        .insert({
          user_id: session.user.id,
          question_id: questionId
        });

      setBookmarkedIds(prev => new Set(prev).add(questionId));
      toast.success("Saved to Bookmarks");
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (selectedYear !== "all" && q.year && q.year.toString() !== selectedYear) return false;
    if (selectedSubject !== "all" && q.subject !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const qText = q.question_text.toLowerCase();
      const sub = (q.subject || "").toLowerCase();
      const top = (q.topic || "").toLowerCase();
      const search = searchQuery.toLowerCase();
      return qText.includes(search) || sub.includes(search) || top.includes(search);
    }
    return true;
  });

  return (
    <StudentLayout title="Previous Year Questions" subtitle="Exam Vault">
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
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  PYQ Vault
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Previous Year Papers & Solved Questions</p>
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

        {/* Hero Header Banner */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mb-24" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FBBF24] text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                WB Competitive Exam Archive
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight font-display text-white">
                Previous Year <span className="text-[#FBBF24]">Question Vault</span>
              </h1>
              <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                Practice actual questions asked in West Bengal Panchayat, WBSSC Group C/D, WBP Constable/SI, and WBCS exams with step-by-step solutions.
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[90px]">
                <p className="text-2xl font-black text-amber-300 leading-none">{availableYears.length}</p>
                <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">Exam Years</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[90px]">
                <p className="text-2xl font-black text-emerald-300 leading-none">{questions.length}</p>
                <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">PYQ MCQs</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SCREEN 16 SUB-TABS: [ Year | Subject | Topic ]
            ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center max-w-md border border-slate-200/80">
          {[
            { id: "year", label: "Year" },
            { id: "subject", label: "Subject" },
            { id: "topic", label: "Topic" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPyqTab(tab.id as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                pyqTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Screen 16: 4 Year Paper Cards when Year tab is active */}
        {pyqTab === "year" && (
          <div className="space-y-2.5">
            {[
              { id: "p-2024", title: "Panchayat PYQ 2024", subtitle: "100 Questions Real Exam Paper", year: 2024, iconBg: "bg-purple-100 text-purple-700" },
              { id: "p-2023", title: "Panchayat PYQ 2023", subtitle: "100 Questions", year: 2023, iconBg: "bg-emerald-100 text-emerald-700" },
              { id: "p-2022", title: "Panchayat PYQ 2022", subtitle: "100 Questions", year: 2022, iconBg: "bg-blue-100 text-blue-700" },
              { id: "p-2021", title: "Panchayat PYQ 2021", subtitle: "100 Questions", year: 2021, iconBg: "bg-purple-100 text-purple-700" },
            ].map((paper) => (
              <motion.div
                key={paper.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedYear(paper.year.toString());
                  setSelectedPaper(paper.id);
                  toast.success(`Loaded ${paper.title}`);
                }}
                className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                  selectedYear === paper.year.toString()
                    ? "border-blue-500 ring-2 ring-blue-500/10"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${paper.iconBg}`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 leading-tight">
                      {paper.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {paper.subtitle}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-3.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search PYQs by topic, keyword, or exam question..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50/70 border border-slate-200/80 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* Year Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mr-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Year:
            </span>
            <button
              onClick={() => setSelectedYear("all")}
              className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                selectedYear === "all"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Years
            </button>
            {availableYears.map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr.toString())}
                className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                  selectedYear === yr.toString()
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Subject Filter Chips */}
          {availableSubjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mr-1">
                <Layers className="w-3.5 h-3.5 text-emerald-600" /> Subject:
              </span>
              <button
                onClick={() => setSelectedSubject("all")}
                className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                  selectedSubject === "all"
                    ? "bg-[#0F172A] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Subjects
              </button>
              {availableSubjects.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                    selectedSubject === sub
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Counter and Action Bar */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-slate-600">
            Showing <span className="text-blue-600 font-black">{filteredQuestions.length}</span> PYQ Questions
          </p>
          <button
            onClick={() => {
              if (revealedAnswers.size > 0) setRevealedAnswers(new Set());
              else setRevealedAnswers(new Set(filteredQuestions.map(q => q.id)));
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            {revealedAnswers.size > 0 ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Hide All Answers
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Reveal All Answers
              </>
            )}
          </button>
        </div>

        {/* Question Cards List */}
        {loading ? (
          <div className="py-12 space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">No PYQ questions match your filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try switching your year or subject filter to explore more solved previous year papers.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedYear("all");
                setSelectedSubject("all");
                setSearchQuery("");
              }}
              className="mt-4 rounded-xl text-xs font-bold"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const isRevealed = revealedAnswers.has(q.id);
              const isBookmarked = bookmarkedIds.has(q.id);

              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                  className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-blue-200 transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-mono font-black text-xs flex items-center justify-center border border-blue-100">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {q.year && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          PYQ {q.year}
                        </span>
                      )}
                      {q.subject && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                          {q.subject}
                        </span>
                      )}
                      {q.topic && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          • {q.topic}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleBookmark(q.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"
                      title={isBookmarked ? "Remove Bookmark" : "Save Question"}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-5 h-5 text-amber-500 fill-amber-500" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Question Text */}
                  <div className="text-slate-900 font-bold text-base leading-relaxed font-bengali">
                    <MathText text={q.question_text} />
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: "A", text: q.option_a },
                      { key: "B", text: q.option_b },
                      { key: "C", text: q.option_c },
                      { key: "D", text: q.option_d },
                    ].map(opt => {
                      const isCorrect = opt.key === q.correct_answer.toUpperCase();
                      const highlight = isRevealed && isCorrect;

                      return (
                        <div
                          key={opt.key}
                          className={`p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-all ${
                            highlight
                              ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm"
                              : "bg-slate-50/60 border-slate-200/80 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                              highlight
                                ? "bg-emerald-600 text-white"
                                : "bg-white border border-slate-200 text-slate-600"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="flex-1 font-bengali">
                            <MathText text={opt.text} />
                          </span>
                          {highlight && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Toggle Answer & Explanation */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      onClick={() => toggleReveal(q.id)}
                      className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide Solution
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> View Answer & Explanation
                        </>
                      )}
                    </button>

                    {isRevealed && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs sm:text-sm leading-relaxed font-bengali mt-1 space-y-1">
                        {(() => {
                          const ans = (q.correct_answer || '').toUpperCase().trim();
                          const correctText = ans === 'A' ? q.option_a : ans === 'B' ? q.option_b : ans === 'C' ? q.option_c : ans === 'D' ? q.option_d : null;
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
                        {q.explanation ? (
                          <div className="text-slate-700 pt-1 border-t border-slate-200/60">
                            <strong className="text-slate-900 block mb-0.5">ব্যাখ্যা (Explanation):</strong>
                            <MathText text={q.explanation} />
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs italic">Standard syllabus question from West Bengal competitive exams.</p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default PYQPractice;
