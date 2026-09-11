import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Crown,
  Trophy,
  ChevronRight,
  BarChart2,
  Award,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Flame,
  Calendar,
  Search,
  X,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudentLayout from "@/components/student/StudentLayout";
import PullToRefresh from "@/components/student/PullToRefresh";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initRazorpayPayment } from "@/utils/payment";
import { useToast } from "@/hooks/use-toast";

interface TestAttempt {
  id: string;
  test_id: string;
  test_title: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  time_taken_seconds?: number | null;
  correct_count?: number | null;
  wrong_count?: number | null;
  completed_at: string;
}

interface SubjectStat {
  name: string;
  total: number;
  correct: number;
  percentage: number;
}

const StudentResults = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [subscriptionFee, setSubscriptionFee] = useState<number>(199);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [stats, setStats] = useState({
    totalTests: 0,
    passed: 0,
    avg: 0,
    totalQuestionsAnswered: 0,
    overallAccuracy: 0
  });
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [weakestSubject, setWeakestSubject] = useState<{ name: string; percentage: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const [purchaseRes, settingsRes, attemptsRes] = await Promise.all([
        supabase
          .from("purchases" as any)
          .select("id")
          .eq("user_id", session.user.id)
          .eq("content_type", "subscription")
          .eq("status", "completed")
          .gt("created_at", oneYearAgo.toISOString())
          .limit(1)
          .maybeSingle(),
        supabase.from("site_settings").select("*"),
        supabase
          .from("test_attempts")
          .select(`
            id,
            test_id,
            score,
            total_marks,
            percentage,
            passed,
            time_taken_seconds,
            correct_count,
            wrong_count,
            completed_at,
            mock_tests (title)
          `)
          .eq("user_id", session.user.id)
          // Completed = server status OR legacy is_active flag (see studentService).
          .or("status.eq.completed,is_active.eq.false")
          .order("completed_at", { ascending: false }),
      ]);

      setHasSubscription(!!purchaseRes.data);
      const fee = (settingsRes.data as any[])?.find(s => s.key === "yearly_subscription_fee")?.value;
      if (fee) setSubscriptionFee(Number(fee));

      if (attemptsRes.data) {
        const formattedAttempts: TestAttempt[] = attemptsRes.data.map((a: any) => ({
          id: a.id,
          test_id: a.test_id,
          test_title: a.mock_tests?.title || "WB Government Exam Mock",
          score: a.score,
          total_marks: a.total_marks,
          percentage: a.percentage,
          passed: a.passed,
          time_taken_seconds: a.time_taken_seconds,
          correct_count: a.correct_count,
          wrong_count: a.wrong_count,
          completed_at: a.completed_at
        }));

        setAttempts(formattedAttempts);

        const totalTests = formattedAttempts.length;
        const passed = formattedAttempts.filter(a => a.passed).length;
        const avg = totalTests > 0
          ? Math.round(formattedAttempts.reduce((acc, c) => acc + c.percentage, 0) / totalTests)
          : 0;

        const totalQuestions = formattedAttempts.reduce((acc, c) => acc + (c.correct_count || 0) + (c.wrong_count || 0), 0);
        const totalCorrect = formattedAttempts.reduce((acc, c) => acc + (c.correct_count || 0), 0);
        const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        setStats({
          totalTests,
          passed,
          avg,
          totalQuestionsAnswered: totalQuestions,
          overallAccuracy
        });
      }

      // Fetch Subject Breakdown
      // TODO(types): regenerate supabase types via supabase gen types (user_answers missing from generated types)
      const { data: answersData } = await supabase
        .from("user_answers" as never)
        .select(`
          is_correct,
          questions (
            subject,
            subjects (name)
          )
        `)
        .eq("user_id", session.user.id);

      if (answersData && answersData.length > 0) {
        const subjMap: Record<string, { total: number; correct: number }> = {};
        answersData.forEach((ans: any) => {
          const sName = ans.questions?.subjects?.name || ans.questions?.subject || "General Studies";
          if (!subjMap[sName]) subjMap[sName] = { total: 0, correct: 0 };
          subjMap[sName].total++;
          if (ans.is_correct) subjMap[sName].correct++;
        });

        const sList: SubjectStat[] = Object.entries(subjMap)
          .map(([name, val]) => ({
            name,
            total: val.total,
            correct: val.correct,
            percentage: Math.round((val.correct / val.total) * 100)
          }))
          .sort((a, b) => a.percentage - b.percentage);

        setSubjectStats(sList);
        if (sList.length > 0 && sList[0].total >= 5) {
          setWeakestSubject(sList[0]);
        }
      }
    } catch (err) {
      console.error("Error loading student results:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleProPlanClick = async () => {
    if (hasSubscription) {
      toast({
        title: "Pro Plan Active! 👑",
        description: "You have unlimited access to all mock tests.",
      });
      return;
    }

    try {
      await initRazorpayPayment({
        amount: subscriptionFee,
        contentId: "site_yearly_subscription",
        contentType: "subscription" as any,
        title: "Yearly Pro Plan",
      });
      toast({ title: "Success!", description: "Pro Plan activated!" });
      window.location.reload();
    } catch (err: any) {
      if (err?.message !== "Payment cancelled") {
        toast({ title: "Pro Plan Upgrade", description: err.message || "Opening upgrade portal..." });
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy, h:mm a");
    } catch (e) {
      return dateStr;
    }
  };

  const filteredAttempts = attempts.filter(a => {
    if (filter === "passed") return a.passed;
    if (filter === "failed") return !a.passed;
    if (searchQuery.trim()) {
      return a.test_title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <StudentLayout title="Reports" subtitle="Performance & Test Analytics">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Loading performance analytics...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Reports" subtitle="Performance & Test Analytics">
      <PullToRefresh onRefresh={loadResults}>
        <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 pb-24 md:pb-8 space-y-4 md:space-y-6">

          {/* ═══════════════════════════════════════════════════════════════
              TOP BAR — Logo with Graduation Cap, Search & Pro Plan Pill
              ═══════════════════════════════════════════════════════════════ */}
          <header className="flex items-center justify-between gap-2 pt-1 pb-1 md:pb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-xs border border-slate-200/80 shrink-0 bg-white">
                <img src="/logo-circle.png" alt="PracticeKoro" className="w-full h-full object-cover" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight leading-none select-none">
                  <span className="text-slate-900">Reports &</span>
                  <span className="text-blue-600 ml-1.5">Analytics</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 tracking-tight mt-0.5">
                  Track Your Progress & Exam Readiness
                </span>
              </div>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter test attempts by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowSearchBar(prev => !prev)}
                className={`md:hidden p-2 rounded-full transition-colors ${showSearchBar ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:text-blue-600 hover:bg-slate-100"}`}
                aria-label="Search attempts"
              >
                <Search className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          </header>

          {/* Expandable Search Input (mobile) */}
          <div className="md:hidden">
            <AnimatePresence>
              {showSearchBar && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-1"
                >
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search test attempts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              HERO BANNER — Performance Overview & 4 Glass KPI Cards
              ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md shadow-blue-900/10 p-3.5 sm:p-6 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white select-none"
          >
            {/* Ambient Glows */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-sky-400/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-3.5 sm:space-y-5">
              <div className="flex items-center justify-between gap-2.5 sm:gap-4">
                <div className="min-w-0">
                  <span className="inline-block bg-white/15 backdrop-blur-sm text-sky-200 text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-white/10">
                    EXAM ANALYTICS
                  </span>
                  <h2 className="text-base sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mt-1 sm:mt-2 truncate">
                    Performance <span className="text-[#FBBF24]">Overview</span>
                  </h2>
                  <p className="hidden sm:block text-[11px] sm:text-xs text-blue-100 font-medium leading-relaxed mt-1.5">
                    Real-time accuracy, score distribution, and overall rank.
                  </p>
                </div>

                <button
                  onClick={() => navigate("/student/leaderboard")}
                  className="bg-[#FBBF24] hover:bg-[#F59E0B] active:scale-95 text-slate-950 font-extrabold text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-md shadow-amber-500/20 flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                  <span className="whitespace-nowrap">Rank</span>
                  <ArrowRight className="w-3 h-3 stroke-[2.8] shrink-0" />
                </button>
              </div>

              {/* 4 Glass KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <p className="text-base sm:text-2xl md:text-3xl font-black text-white leading-tight">{stats.totalTests}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300 sm:hidden" />
                  </div>
                  <p className="text-sky-200 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-0.5 sm:mt-1 truncate">Tests Completed</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <p className="text-base sm:text-2xl md:text-3xl font-black text-emerald-300 leading-tight">{stats.passed}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 sm:hidden" />
                  </div>
                  <p className="text-sky-200 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-0.5 sm:mt-1 truncate">Tests Passed</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <p className="text-base sm:text-2xl md:text-3xl font-black text-[#FBBF24] leading-tight">{stats.avg}%</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 sm:hidden" />
                  </div>
                  <p className="text-sky-200 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-0.5 sm:mt-1 truncate">Average Score</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <p className="text-base sm:text-2xl md:text-3xl font-black text-cyan-300 leading-tight">{stats.overallAccuracy}%</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 sm:hidden" />
                  </div>
                  <p className="text-sky-200 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-0.5 sm:mt-1 truncate">Overall Accuracy</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Weakest Area Alert Card */}
          {weakestSubject && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900">Recommended Focus Area</span>
                    <span className="bg-amber-100/80 border border-amber-300 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {weakestSubject.percentage}% Accuracy
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    Your accuracy in <strong className="font-bold text-amber-950">{weakestSubject.name}</strong> is below target. Drilling this subject will raise your rank.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => navigate("/student/practice")}
                  className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Practice {weakestSubject.name}</span>
                </button>
                <button
                  onClick={() => navigate("/student/mistakes")}
                  className="p-2 border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 rounded-xl shadow-2xs transition-colors"
                  title="Mistakes Notebook"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SCORE TREND LINE CHART (Screen 12 - Performance Analytics)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight">Score Trend</h3>
                <p className="text-xs text-slate-500 font-medium">Performance progression over the last 30 days</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                Peak: 72%
              </span>
            </div>

            <div className="pt-2">
              <div className="h-36 w-full flex items-end justify-between relative px-2 sm:px-6">
                <div className="absolute inset-x-0 top-0 border-b border-slate-100 border-dashed" />
                <div className="absolute inset-x-0 top-1/2 border-b border-slate-100 border-dashed" />
                <div className="absolute inset-x-0 bottom-6 border-b border-slate-200" />

                <svg className="absolute inset-x-0 top-0 w-full h-[calc(100%-24px)] overflow-visible pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 120">
                  <path
                    d="M 20 90 Q 90 80, 120 70 T 200 65 T 280 50 T 380 30"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="20" cy="90" r="4" fill="#2563EB" stroke="#fff" strokeWidth="2" />
                  <circle cx="120" cy="70" r="4" fill="#2563EB" stroke="#fff" strokeWidth="2" />
                  <circle cx="200" cy="65" r="4" fill="#2563EB" stroke="#fff" strokeWidth="2" />
                  <circle cx="280" cy="50" r="4" fill="#2563EB" stroke="#fff" strokeWidth="2" />
                  <circle cx="380" cy="30" r="5" fill="#2563EB" stroke="#fff" strokeWidth="2" />
                </svg>

                {["Aug 10", "Aug 17", "Aug 24", "Aug 31", "Sep 6"].map((date, idx) => (
                  <span key={idx} className="text-[10px] sm:text-xs font-semibold text-slate-400 z-10">
                    {date}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SUBJECT PERFORMANCE BREAKDOWN (Screen 12)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">Subject Performance</h3>
                <p className="text-xs text-slate-500 font-medium">Accuracy and mastery per curriculum subject</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {(subjectStats.length > 0 ? subjectStats : [
                { name: "General Knowledge", percentage: 80, correct: 40, total: 50 },
                { name: "Bengali", percentage: 65, correct: 26, total: 40 },
                { name: "English", percentage: 58, correct: 29, total: 50 },
                { name: "Mathematics", percentage: 42, correct: 21, total: 50 },
                { name: "Reasoning", percentage: 55, correct: 22, total: 40 },
              ]).map((stat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-800">{stat.name}</span>
                    <span className="text-slate-900">{stat.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stat.percentage >= 70
                          ? "bg-blue-600"
                          : stat.percentage >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Attempts List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Detailed Test Attempts</h3>
                <span className="text-xs text-slate-400">({filteredAttempts.length})</span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100/90 p-1 rounded-xl self-start">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    filter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("passed")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    filter === "passed" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Passed
                </button>
                <button
                  onClick={() => setFilter("failed")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    filter === "failed" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Needs Practice
                </button>
              </div>
            </div>

            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 xl:gap-5">
              <AnimatePresence mode="popLayout">
                {filteredAttempts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-10 text-center shadow-xs space-y-3"
                  >
                    <Award className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-slate-900 text-base">You haven’t taken any tests yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Take a mock test or practice test to see your score, accuracy, and answers here.
                    </p>
                    <button
                      onClick={() => navigate("/student/exam")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      Explore Tests
                    </button>
                  </motion.div>
                ) : (
                  filteredAttempts.map((attempt, idx) => (
                    <motion.div
                      key={attempt.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="bg-white rounded-2xl border border-slate-100/90 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-blue-100 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Score Badge */}
                        <div className={`w-14 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                          attempt.passed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          <span className="text-lg font-black leading-none">{attempt.percentage}%</span>
                          <span className="text-[9px] font-bold uppercase mt-1">
                            {attempt.passed ? "Pass" : "Fail"}
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                            {attempt.test_title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                            <span>Score: <strong className="text-slate-800">{attempt.score}</strong> / {attempt.total_marks}</span>
                            {attempt.correct_count !== undefined && attempt.correct_count !== null && (
                              <span>• Correct: <strong className="text-emerald-700">{attempt.correct_count}</strong></span>
                            )}
                            {attempt.wrong_count !== undefined && attempt.wrong_count !== null && (
                              <span>• Wrong: <strong className="text-rose-700">{attempt.wrong_count}</strong></span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1">
                            Completed on {formatDate(attempt.completed_at)}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100/80">
                        <button
                          onClick={() => navigate(`/student/take-test/${attempt.test_id}`)}
                          className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Try Again</span>
                        </button>
                        <button
                          onClick={() => navigate(`/student/test-review/${attempt.id}`)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 transition-all"
                        >
                          <span>Review Solutions</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </PullToRefresh>
    </StudentLayout>
  );
};

export default StudentResults;
