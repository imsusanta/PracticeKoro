import { useNavigate } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import { useStudentAuth } from "@/contexts/StudentContext";
import { useTodayMetrics } from "@/hooks/useStudentData";
import {
  BookOpen,
  RotateCcw,
  Bookmark,
  Calendar,
  ArrowRight,
  Target,
  Clock,
  CheckCircle2,
  Flame,
  Sparkles,
  Newspaper,
  ChevronRight,
  Play,
  Zap,
} from "lucide-react";

export const PracticeHub = () => {
  const navigate = useNavigate();
  const { user } = useStudentAuth();

  // Dynamic live stats
  const { data: todayMetrics = { questions: 0, accuracy: 0, studyTimeMinutes: 0, streakDays: 0 } } =
    useTodayMetrics(user?.id);

  return (
    <StudentLayout title="Practice" subtitle="Master your speed & accuracy">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 md:py-6 pb-24 md:pb-12 space-y-6">

        {/* ═══════════════════════════════════════════════════════════════
            PAGE HEADER
            ═══════════════════════════════════════════════════════════════ */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Practice Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Practice & Revision
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Choose a mode below to practice questions, test your speed, or review previous mistakes.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TODAY'S ACTIVITY STRIP
            ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Day Streak */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {todayMetrics.streakDays} <span className="text-xs font-normal text-slate-500">Days</span>
              </div>
              <p className="text-xs text-slate-500 truncate">Daily Streak</p>
            </div>
          </div>

          {/* Questions Today */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {todayMetrics.questions} <span className="text-xs font-normal text-slate-500">MCQs</span>
              </div>
              <p className="text-xs text-slate-500 truncate">Solved Today</p>
            </div>
          </div>

          {/* Accuracy */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {todayMetrics.accuracy}%
              </div>
              <p className="text-xs text-slate-500 truncate">Accuracy</p>
            </div>
          </div>

          {/* Study Time */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {todayMetrics.studyTimeMinutes} <span className="text-xs font-normal text-slate-500">mins</span>
              </div>
              <p className="text-xs text-slate-500 truncate">Practice Time</p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FEATURED: DAILY 10 SPEED CHALLENGE
            ═══════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 shadow-md border border-slate-800">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Today&apos;s Challenge</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Daily 10 Speed Drill
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                10 curated questions across subjects designed to boost your daily exam speed. Takes only 5 minutes with instant solutions and explanation.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 font-medium">
                  ⚡ 10 MCQs
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 font-medium">
                  ⏱️ 5 Minutes
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  ✓ Instant Solutions
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/student/daily")}
              className="h-11 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>Start Daily 10</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PRIMARY PRACTICE MODES (3 Clear Cards)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Practice Modes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Subject Practice */}
            <div
              onClick={() => navigate("/student/practice/subject")}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                    Chapter-wise
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                  Subject Practice
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Practice questions organized by subject and topic with in-depth explanations.
                </p>
              </div>

              <div className="pt-5 mt-auto">
                <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:gap-1.5 transition-all">
                  <span>Start Subject Practice</span>
                  <ChevronRight className="w-4 h-4 ml-1 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* 2. PYQ Practice */}
            <div
              onClick={() => navigate("/student/pyq")}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                    Real Exams
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Previous Year Questions
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Solve real past questions from WBCS, WBP, SSC, and Railway exams.
                </p>
              </div>

              <div className="pt-5 mt-auto">
                <div className="flex items-center text-xs font-semibold text-indigo-600 group-hover:gap-1.5 transition-all">
                  <span>Explore PYQs</span>
                  <ChevronRight className="w-4 h-4 ml-1 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* 3. Mistakes Notebook */}
            <div
              onClick={() => navigate("/student/mistakes")}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-rose-400 p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60">
                    Auto-saved
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-rose-600 transition-colors">
                  Mistakes Notebook
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Review questions you got wrong and re-attempt them to improve your accuracy.
                </p>
              </div>

              <div className="pt-5 mt-auto">
                <div className="flex items-center text-xs font-semibold text-rose-600 group-hover:gap-1.5 transition-all">
                  <span>Review Mistakes</span>
                  <ChevronRight className="w-4 h-4 ml-1 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            QUICK REVISION TOOLS (Bookmarks & Current Affairs)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Revision & Quick Access
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Bookmarked Questions */}
            <div
              onClick={() => navigate("/student/bookmarks")}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-400 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                    Bookmarked Questions
                  </h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Quickly revise your starred and saved questions
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* Current Affairs */}
            <div
              onClick={() => navigate("/student/current-affairs")}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-teal-400 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-600 transition-colors truncate">
                    Current Affairs
                  </h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Daily exam-focused national & state updates
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>

      </div>
    </StudentLayout>
  );
};

export default PracticeHub;
