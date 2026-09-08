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
  ChevronRight,
  Play,
  Zap,
  RotateCcw,
  Target,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { EXAM_CATALOG } from "@/data/examCatalog";
import { fetchPYQQuestions } from "@/services/drillService";
import { DrillConfig, DrillQuestion } from "@/types/drills";
import InteractiveDrillRunner from "@/components/student/InteractiveDrillRunner";

export const PYQPractice = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  // Selection States
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  
  // Active Interactive Drill Modal
  const [activeDrillConfig, setActiveDrillConfig] = useState<DrillConfig | null>(null);

  const selectedExam = EXAM_CATALOG.find(e => e.id === selectedExamId);

  const loadPYQData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: bookmarks } = await supabase
          .from("student_bookmarks")
          .select("question_id")
          .eq("user_id", session.user.id);

        if (bookmarks) {
          setBookmarkedIds(new Set(bookmarks.map(b => b.question_id)));
        }
      }

      const qList = await fetchPYQQuestions({
        year: selectedYear !== "all" ? Number(selectedYear) : undefined,
        subject: selectedSubject !== "all" ? selectedSubject : undefined,
        questionCount: 150
      });

      setQuestions(qList);

      const yearsSet = new Set<number>();
      const subsSet = new Set<string>();

      qList.forEach(q => {
        if (q.year) yearsSet.add(q.year);
        if (q.subject) subsSet.add(q.subject);
      });

      const defaultYears = selectedExam?.pyqYears || [2024, 2023, 2022, 2021, 2020];
      defaultYears.forEach(y => yearsSet.add(y));

      setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));
      setAvailableSubjects(Array.from(subsSet).sort());
    } catch (err) {
      console.error("Error in loadPYQData:", err);
      toast.error("Failed to load Previous Year Questions");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedSubject, selectedExam]);

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
    if (!session) {
      toast.info("Please sign in to bookmark questions");
      return;
    }

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
      toast.success("Saved to Bookmarks ⭐");
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (selectedYear !== "all" && q.year && q.year.toString() !== selectedYear) return false;
    if (selectedSubject !== "all" && q.subject && q.subject.toLowerCase() !== selectedSubject.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const qText = q.question_text.toLowerCase();
      const sub = (q.subject || "").toLowerCase();
      const top = (q.topic || "").toLowerCase();
      const src = (q.source || "").toLowerCase();
      const search = searchQuery.toLowerCase();
      return qText.includes(search) || sub.includes(search) || top.includes(search) || src.includes(search);
    }
    return true;
  });

  const launchDrill = (mode: "instant_feedback" | "timed_quiz", count: number = 10) => {
    const deck = filteredQuestions.length > 0 ? filteredQuestions : questions;
    const drillQuestions = deck.slice(0, count);

    const examTitle = selectedExam ? selectedExam.name : "West Bengal PYQ Drill";
    const yearSub = selectedYear !== "all" ? `(${selectedYear})` : "Archive";

    setActiveDrillConfig({
      title: `${examTitle} ${yearSub}`,
      subtitle: `${count} Questions • ${mode === "instant_feedback" ? "Instant Solutions" : "Timed Quiz"}`,
      examId: selectedExamId,
      examName: examTitle,
      subject: selectedSubject !== "all" ? selectedSubject : undefined,
      year: selectedYear !== "all" ? Number(selectedYear) : undefined,
      questionCount: count,
      marksPerQuestion: 1,
      negativeMarks: selectedExam?.defaultNegativeMarks ?? 0.25,
      timeLimitMinutes: Math.max(5, Math.round(count * 1.2)),
      mode: mode
    });
  };

  return (
    <StudentLayout title="বিগত বছরের প্রশ্ন" subtitle="PYQ বুস্টার ও স্পিড ড্রিল">
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
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bengali">
                  PYQ বুস্টার
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium font-bengali">বিগত ১০ বছরের আসল প্রশ্ন ও চ্যাপ্টার ড্রিল</p>
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FBBF24] text-[11px] font-black uppercase tracking-wider font-bengali">
                <Sparkles className="w-3.5 h-3.5" />
                আসল পরীক্ষার প্রশ্নমালা (Official Exam Archive)
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight font-display text-white">
                বিগত বছরের প্রশ্ন <span className="text-[#FBBF24]">— PYQ Booster</span>
              </h1>
              <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed font-bengali">
                পঞ্চায়েত, পুলিশ কনস্টেবল/এসআই, ক্লার্কশিপ, প্রাইমারি টেট, WBCS ও রেলওয়ের বিগত ১০ বছরের আসল প্রশ্ন — টাইমার অন করে বা ব্যাখ্যা সহ প্র্যাকটিস করো!
              </p>

              {/* Quick Launch Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  onClick={() => launchDrill("instant_feedback", 10)}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md gap-1.5 h-9 font-bengali"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>১০টি MCQ স্পিড ড্রিল</span>
                </Button>
                <Button
                  onClick={() => launchDrill("timed_quiz", 20)}
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs rounded-xl gap-1.5 h-9 backdrop-blur-sm font-bengali"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>২০টি MCQ টাইমার টেস্ট</span>
                </Button>
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[90px]">
                <p className="text-2xl font-black text-amber-300 leading-none">{EXAM_CATALOG.length}</p>
                <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">Exams</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[90px]">
                <p className="text-2xl font-black text-emerald-300 leading-none">{questions.length}</p>
                <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">PYQ MCQs</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            EXAM SELECTOR RIBBON / CAROUSEL
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Target Examination:
            </span>
            <span className="text-xs font-bold text-blue-600">
              {selectedExam ? selectedExam.conductingBody : "All Boards"}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedExamId("all")}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 ${
                selectedExamId === "all"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-white border border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              All Exams (সকল পরীক্ষা)
            </button>
            {EXAM_CATALOG.map((exam) => (
              <button
                key={exam.id}
                onClick={() => {
                  setSelectedExamId(exam.id);
                  if (exam.pyqYears.length > 0) {
                    setSelectedYear(exam.pyqYears[0].toString());
                  }
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  selectedExamId === exam.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{exam.name}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-mono font-bold">
                  {exam.pyqYears[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Exam Detailed Overview Pill */}
        {selectedExam && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 font-display">
                  {selectedExam.bengaliName}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                  {selectedExam.conductingBody}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  -{selectedExam.defaultNegativeMarks} Negative
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {selectedExam.description}
              </p>
            </div>

            <Button
              onClick={() => launchDrill("instant_feedback", 15)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shrink-0 shadow-sm font-bengali"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ {selectedExam.name} ড্রিল শুরু করো</span>
            </Button>
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
              placeholder="টপিক, সূত্র বা প্রশ্ন দিয়ে সার্চ করো (যেমন: লসাগু, অনুচ্ছেদ, সংবিধান)..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50/70 border border-slate-200/80 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bengali"
            />
          </div>

          {/* Year Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mr-1 font-bengali">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> বছর (Year):
            </span>
            <button
              onClick={() => setSelectedYear("all")}
              className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all font-bengali ${
                selectedYear === "all"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              সব বছর
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
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mr-1 font-bengali">
                <Layers className="w-3.5 h-3.5 text-emerald-600" /> বিষয় (Subject):
              </span>
              <button
                onClick={() => setSelectedSubject("all")}
                className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all font-bengali ${
                  selectedSubject === "all"
                    ? "bg-[#0F172A] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                সব বিষয়
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
          <p className="text-xs font-bold text-slate-600 font-bengali">
            মোট <span className="text-blue-600 font-black">{filteredQuestions.length}</span>টি বিগত বছরের সলভড প্রশ্ন
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (revealedAnswers.size > 0) setRevealedAnswers(new Set());
                else setRevealedAnswers(new Set(filteredQuestions.map(q => q.id)));
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors font-bengali"
            >
              {revealedAnswers.size > 0 ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> সমাধান লুকান
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> 💡 সঠিক উত্তর ও সমাধান দেখুন
                </>
              )}
            </button>
            <Button
              size="sm"
              onClick={() => launchDrill("instant_feedback", 10)}
              className="h-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold gap-1 shadow-2xs font-bengali"
            >
              <Play className="w-3 h-3" />
              <span>স্পিড টেস্ট শুরু করো ⏱️</span>
            </Button>
          </div>
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
            <h3 className="text-base font-bold text-slate-800 font-bengali">এই ফিল্টারে কোনো প্রশ্ন পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-bengali">
              অন্য বছর বা বিষয় বেছে নিয়ে বিগত বছরের আসল প্রশ্ন প্র্যাকটিস করো।
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedExamId("all");
                setSelectedYear("all");
                setSelectedSubject("all");
                setSearchQuery("");
              }}
              className="mt-4 rounded-xl text-xs font-bold font-bengali"
            >
              ফিল্টার রিসেট করো
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
                      {q.source && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          {q.source}
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
                      const isCorrect = opt.key === q.correct_answer.toUpperCase().trim();
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
                      className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors font-bengali"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> সমাধান লুকান
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> 💡 সঠিক উত্তর ও ব্যাখ্যা দেখুন
                        </>
                      )}
                    </button>

                    {isRevealed && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs sm:text-sm leading-relaxed font-bengali mt-1 space-y-1">
                        {(() => {
                          const ans = (q.correct_answer || '').toUpperCase().trim();
                          const correctText = ans === 'A' ? q.option_a : ans === 'B' ? q.option_b : ans === 'C' ? q.option_c : ans === 'D' ? q.option_d : null;
                          return (
                            <div className="font-bold text-emerald-800 flex items-center flex-wrap gap-1.5 font-bengali">
                              <span>✓ সঠিক উত্তর: ({ans})</span>
                              {correctText && (
                                <span className="font-semibold text-emerald-950">
                                  <MathText text={correctText} formatBullets={false} />
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {q.explanation ? (
                          <div className="text-slate-700 pt-1 border-t border-slate-200/60 font-bengali">
                            <strong className="text-slate-900 block mb-0.5">💡 বিস্তারিত সমাধান ও ট্রিক (Explanation):</strong>
                            <MathText text={q.explanation} />
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs italic font-bengali">পশ্চিমবঙ্গের সরকারি চাকরির বিগত বছরের গুরুত্বপূর্ণ প্রশ্ন।</p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Interactive Drill Modal */}
        {activeDrillConfig && (
          <InteractiveDrillRunner
            config={activeDrillConfig}
            questions={filteredQuestions.length > 0 ? filteredQuestions.slice(0, activeDrillConfig.questionCount) : questions.slice(0, activeDrillConfig.questionCount)}
            onClose={() => setActiveDrillConfig(null)}
          />
        )}

      </div>
    </StudentLayout>
  );
};

export default PYQPractice;
