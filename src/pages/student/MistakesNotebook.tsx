import { useState, useEffect, useCallback, useMemo } from "react";
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
  Bookmark,
  Brain,
  Zap,
  Clock,
  Dices,
  Tag,
  MessageSquareQuote,
  Edit3,
  TrendingUp,
  Target,
  Layers,
  BarChart2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { MistakeItem, ErrorType, MistakesAnalytics } from "@/types/mistakes";
import { ERROR_TYPE_DEFINITIONS } from "@/types/mistakes";
import {
  fetchStudentMistakes,
  computeMistakesAnalytics,
  filterMistakes,
  classifyStudentMistake,
  toggleMistakeMastered,
} from "@/services/mistakesService";
import { MistakeClassificationModal } from "@/components/student/MistakeClassificationModal";
import { RevisionDrillModal } from "@/components/student/RevisionDrillModal";

export const MistakesNotebook = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterMastered, setFilterMastered] = useState<"all" | "active" | "mastered">("active");
  const [filterErrorType, setFilterErrorType] = useState<ErrorType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [classifyingItem, setClassifyingItem] = useState<MistakeItem | null>(null);
  const [drillModalConfig, setDrillModalConfig] = useState<{
    isOpen: boolean;
    items: MistakeItem[];
    title: string;
  }>({
    isOpen: false,
    items: [],
    title: "Targeted Revision Drill",
  });

  const loadMistakes = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const items = await fetchStudentMistakes(session.user.id);
      setMistakes(items);
    } catch (err) {
      console.error("Error in loadMistakes:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadMistakes();
  }, [loadMistakes]);

  // Derived analytics
  const analytics: MistakesAnalytics = useMemo(() => {
    return computeMistakesAnalytics(mistakes);
  }, [mistakes]);

  // Derived filtered items
  const filteredMistakes = useMemo(() => {
    return filterMistakes(mistakes, {
      status: filterMastered,
      subject: filterSubject,
      errorType: filterErrorType,
      searchQuery,
    });
  }, [mistakes, filterMastered, filterSubject, filterErrorType, searchQuery]);

  const availableSubjects = useMemo(() => {
    return Array.from(
      new Set(mistakes.map((m) => m.questions?.subject).filter(Boolean))
    ) as string[];
  }, [mistakes]);

  // Handlers
  const handleToggleMastered = async (mistakeId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    setMistakes((prev) =>
      prev.map((m) => (m.id === mistakeId ? { ...m, is_mastered: nextStatus } : m))
    );

    await toggleMistakeMastered(mistakeId, nextStatus);
    toast.success(nextStatus ? "Marked as Mastered! 🎉" : "Moved back to active mistakes");
  };

  const handleSaveClassification = async (errorType: ErrorType, notes: string) => {
    if (!classifyingItem) return;

    setMistakes((prev) =>
      prev.map((m) =>
        m.id === classifyingItem.id
          ? { ...m, error_type: errorType, student_notes: notes }
          : m
      )
    );

    await classifyStudentMistake(classifyingItem.id, errorType, notes);
  };

  const handleLaunchDrill = (customItems?: MistakeItem[], title?: string) => {
    const targetItems = customItems || filteredMistakes.filter((m) => !m.is_mastered);
    if (targetItems.length === 0) {
      toast.info("No active mistakes to drill in this category!");
      return;
    }

    setDrillModalConfig({
      isOpen: true,
      items: targetItems,
      title: title || `Revision Drill (${targetItems.length} questions)`,
    });
  };

  return (
    <StudentLayout title="Mistakes Vault" subtitle="Personalized Error Revision">
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
                  Mistakes Vault
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

        {/* Hero Header & Diagnostics Banner */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-rose-500/15 rounded-full blur-2xl pointer-events-none -mb-24" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FBBF24] text-[11px] font-black uppercase tracking-wider">
                <AlertOctagon className="w-3.5 h-3.5" />
                নেগেটিভ মার্কিং কমাও (Zero Negative Marking)
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight font-display text-white">
                ভুলের খাতা <span className="text-[#FBBF24]">— Mistakes Notebook</span>
              </h1>
              <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed font-bengali">
                মক টেস্ট ও ড্রিল দেওয়ার পর যেসব প্রশ্নে মার্কস কাটা গেছে, সেগুলোকে ভালো করে রিভাইজ দিয়ে পাক্কা করো — যাতে আসল পরীক্ষায় ১ নম্বরও নষ্ট না হয়!
              </p>
            </div>

            {/* Launch Drill Action */}
            {analytics.activeMistakes > 0 && (
              <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
                <Button
                  onClick={() => handleLaunchDrill()}
                  className="h-12 px-6 rounded-2xl bg-[#FBBF24] hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  রিভিশন ড্রিল শুরু করো 🚀 ({analytics.activeMistakes})
                </Button>
                {analytics.weakestSubject && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const subjectItems = mistakes.filter(
                        (m) => !m.is_mastered && m.questions?.subject === analytics.weakestSubject
                      );
                      handleLaunchDrill(subjectItems, `Drill ${analytics.weakestSubject} (${subjectItems.length})`);
                    }}
                    className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    দুর্বল বিষয় রিভাইজ: {analytics.weakestSubject}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 4 Glass Analytics KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-6 mt-6 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15">
              <span className="text-2xl sm:text-3xl font-black text-rose-300 leading-tight block">
                {analytics.activeMistakes}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider mt-1 block font-bengali">
                রিভিশন বাকি (Pending)
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15">
              <span className="text-2xl sm:text-3xl font-black text-emerald-300 leading-tight block">
                {analytics.masteredMistakes}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider mt-1 block font-bengali">
                পাক্কা রেডি (Mastered 🔥)
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15">
              <span className="text-2xl sm:text-3xl font-black text-[#FBBF24] leading-tight block">
                {analytics.masteryRate}%
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider mt-1 block font-bengali">
                মাস্টারি রেট (Accuracy)
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15">
              <span className="text-base sm:text-lg font-black text-cyan-300 leading-tight block truncate">
                {analytics.weakestSubject || "সব ক্লিয়ার"}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-wider mt-1 block font-bengali">
                বেশি ভুল হওয়া বিষয়
              </span>
            </div>
          </div>
        </div>

        {/* Error Classification Distribution Bar */}
        {analytics.totalMistakes > 0 && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight font-bengali">
                  ভুলের কারণ অ্যানালিসিস (কেন মার্কস কেটেছিল?)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-bengali">
                মোট {analytics.totalMistakes}টি ভুলের রেকর্ড
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(["conceptual", "careless", "time_pressure", "guess"] as ErrorType[]).map((errType) => {
                const def = ERROR_TYPE_DEFINITIONS[errType];
                const count = analytics.errorTypeBreakdown[errType].count;
                const pct = analytics.errorTypeBreakdown[errType].percentage;
                const isFiltered = filterErrorType === errType;

                return (
                  <button
                    key={errType}
                    type="button"
                    onClick={() => setFilterErrorType(isFiltered ? "all" : errType)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isFiltered
                        ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/50"
                        : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{def.labelEn}</span>
                      <span className="text-xs font-black text-blue-600">{pct}%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bengali mt-0.5">{def.labelBn}</p>
                    <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full ${def.pillBgClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold mt-1 block font-bengali">
                      {count}টি প্রশ্ন
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-3.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ভুল প্রশ্ন, বিষয়, চ্যাপ্টার বা তোমার রিফ্লেকশন নোট খুঁজুন..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50/70 border border-slate-200/80 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bengali"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterMastered("active")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all font-bengali ${
                  filterMastered === "active"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                রিভিশন বাকি ({analytics.activeMistakes})
              </button>
              <button
                type="button"
                onClick={() => setFilterMastered("mastered")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all font-bengali ${
                  filterMastered === "mastered"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                পাক্কা রেডি ({analytics.masteredMistakes})
              </button>
              <button
                type="button"
                onClick={() => setFilterMastered("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all font-bengali ${
                  filterMastered === "all"
                    ? "bg-[#0F172A] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                সব প্রশ্ন ({analytics.totalMistakes})
              </button>
            </div>

            {/* Error Type Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setFilterErrorType("all")}
                className={`px-3 py-1 text-xs rounded-xl font-bold transition-all font-bengali ${
                  filterErrorType === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                সব কারণ
              </button>
              {(["conceptual", "careless", "time_pressure", "guess"] as ErrorType[]).map((t) => {
                const def = ERROR_TYPE_DEFINITIONS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterErrorType(t)}
                    className={`px-3 py-1 text-xs rounded-xl font-bold whitespace-nowrap transition-all ${
                      filterErrorType === t
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {def.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Filter Chips */}
          {availableSubjects.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFilterSubject("all")}
                className={`px-3 py-1 text-xs rounded-xl font-bold shrink-0 ${
                  filterSubject === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                All Subjects
              </button>
              {availableSubjects.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setFilterSubject(sub)}
                  className={`px-3 py-1 text-xs rounded-xl font-bold shrink-0 whitespace-nowrap ${
                    filterSubject === sub ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mistakes List */}
        {loading ? (
          <div className="py-12 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : filteredMistakes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center bg-white space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 font-bengali">
              {filterMastered === "active" ? "দারুণ! কোনো ভুল পেন্ডিং নেই! 🎉" : "কোনো প্রশ্ন পাওয়া যায়নি"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-bengali leading-relaxed">
              {filterMastered === "active"
                ? "ভুলের খাতার সব প্রশ্ন রিভাইজ করে পাক্কা করে নিয়েছো। এই অ্যাকুরেসি বজায় রাখলে আসল পরীক্ষায় নেগেটিভ মার্কিং শূন্য হবে!"
                : "তোমার সিলেক্ট করা ফিল্টারে কোনো ভুল প্রশ্ন নেই।"}
            </p>
            <Button
              onClick={() => navigate("/student/exams")}
              className="mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-bengali"
            >
              নতুন মক টেস্ট দাও 🚀
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map((item, idx) => {
              const errDef = ERROR_TYPE_DEFINITIONS[item.error_type || "unclassified"];

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-blue-200 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Number Index */}
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>

                      <div className="space-y-1.5 min-w-0">
                        {/* Question Text */}
                        <div className="text-slate-900 font-bold text-sm sm:text-base leading-relaxed font-bengali">
                          <MathText text={item.questions.question_text} />
                        </div>

                        {/* Metadata Tags */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {item.questions.subject && (
                            <span className="font-semibold text-slate-500">
                              {item.questions.subject} {item.questions.topic ? `• ${item.questions.topic}` : ""}
                            </span>
                          )}

                          {/* Error Classification Badge */}
                          <button
                            type="button"
                            onClick={() => setClassifyingItem(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-colors hover:opacity-90 ${
                              errDef?.badgeClass || "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                            title="Click to change error category"
                          >
                            <Tag className="w-3 h-3" />
                            <span>{errDef?.labelEn}</span>
                            <span className="opacity-75 font-bengali">({errDef?.labelBn})</span>
                          </button>

                          {/* Retry Count */}
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                            Wrong {item.retry_count || 1} {item.retry_count === 1 ? "time" : "times"}
                          </span>

                          {item.is_mastered && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Mastered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mastered Toggle Icon */}
                    <button
                      type="button"
                      onClick={() => handleToggleMastered(item.id, item.is_mastered)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                        item.is_mastered
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs"
                          : "bg-slate-50 text-slate-400 border-slate-200 hover:text-emerald-600 hover:border-emerald-300"
                      }`}
                      title={item.is_mastered ? "Marked as Mastered (click to unmark)" : "Click to mark as Mastered"}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Options Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: "A", text: item.questions.option_a },
                      { key: "B", text: item.questions.option_b },
                      { key: "C", text: item.questions.option_c },
                      { key: "D", text: item.questions.option_d },
                    ].map((opt) => {
                      const isCorrect = opt.key === item.correct_answer.toUpperCase();
                      const isWrongSelected = opt.key === item.selected_answer?.toUpperCase() && !isCorrect;

                      let style = "bg-slate-50/60 border-slate-200/80 text-slate-700";
                      if (isCorrect) style = "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs";
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

                  {/* Student Reflection Note Box */}
                  {item.student_notes ? (
                    <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2 min-w-0">
                        <MessageSquareQuote className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-bold text-blue-950 block text-[11px]">
                            My Learning Takeaway (আমার নোট):
                          </span>
                          <p className="text-blue-900 font-medium font-bengali leading-relaxed pt-0.5">
                            {item.student_notes}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClassifyingItem(item)}
                        className="p-1 rounded-lg text-blue-600 hover:bg-blue-100 shrink-0"
                        title="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setClassifyingItem(item)}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors font-bengali"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>✍️ + ভুলের কারণ ট্যাগ করো ও কী শিখলে নোট লেখো</span>
                    </button>
                  )}

                  {/* Explanation Toggle */}
                  {item.questions.explanation && (
                    <div className="bg-slate-50 rounded-2xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-bengali border border-slate-200/80">
                      <strong className="text-slate-900 block mb-0.5 font-bold">💡 সঠিক ব্যাখ্যা ও ট্রিক:</strong>
                      <MathText text={item.questions.explanation} />
                    </div>
                  )}

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLaunchDrill([item], "Single Mistake Re-attempt")}
                      className="rounded-xl h-8 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 font-bengali"
                    >
                      <RotateCcw className="w-3 h-3" />
                      আবার চেষ্টা করো (Re-attempt)
                    </Button>

                    <Button
                      size="sm"
                      variant={item.is_mastered ? "outline" : "default"}
                      onClick={() => handleToggleMastered(item.id, item.is_mastered)}
                      className={`rounded-xl h-8 text-xs font-bold font-bengali ${
                        item.is_mastered
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      }`}
                    >
                      {item.is_mastered ? "✓ পাক্কা রেডি (Mastered)" : "পাক্কা রেডি মার্ক করো 🔥"}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Classification Modal */}
        {classifyingItem && (
          <MistakeClassificationModal
            isOpen={!!classifyingItem}
            onClose={() => setClassifyingItem(null)}
            questionId={classifyingItem.question_id}
            initialErrorType={classifyingItem.error_type}
            initialNotes={classifyingItem.student_notes}
            questionSnippet={classifyingItem.questions.question_text}
            onSave={handleSaveClassification}
          />
        )}

        {/* Targeted Revision Drill Modal */}
        {drillModalConfig.isOpen && (
          <RevisionDrillModal
            isOpen={drillModalConfig.isOpen}
            onClose={() => setDrillModalConfig((prev) => ({ ...prev, isOpen: false }))}
            mistakes={drillModalConfig.items}
            title={drillModalConfig.title}
            onMistakeUpdated={(mistakeId, isMastered) => {
              setMistakes((prev) =>
                prev.map((m) => (m.id === mistakeId ? { ...m, is_mastered: isMastered } : m))
              );
            }}
          />
        )}
      </div>
    </StudentLayout>
  );
};

export default MistakesNotebook;
