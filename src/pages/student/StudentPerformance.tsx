import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/contexts/StudentContext";
import StudentLayout from "@/components/student/StudentLayout";
import {
  BarChart3,
  TrendingUp,
  Award,
  Target,
  ArrowRight,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Sparkles,
  BookOpen,
  RotateCcw,
  Zap,
  CheckCircle2,
  Clock,
  Flame,
  ShieldCheck,
  HelpCircle,
  Play,
  Brain,
  Crosshair,
  Gauge,
  Trophy,
  Star,
  Swords,
  CircleCheckBig,
  TriangleAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EXAM_CATALOG } from "@/data/examCatalog";
import { fetchStudentReadiness } from "@/services/readinessService";
import { ExamReadinessResult } from "@/types/readiness";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";

// Stagger children animation
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export const StudentPerformance = () => {
  const navigate = useNavigate();
  const { user } = useStudentAuth();

  const [selectedExamId, setSelectedExamId] = useState<string>("wb-panchayat");
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState<ExamReadinessResult | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchStudentReadiness(user?.id, selectedExamId).then((res) => {
      if (!isCancelled) {
        setReadiness(res);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [user?.id, selectedExamId]);

  const selectedExam = EXAM_CATALOG.find((e) => e.id === selectedExamId) || EXAM_CATALOG[0];

  // Map exam catalog IDs to their primary mock test preset IDs
  const getPrimaryMockForExam = (examId: string, examName?: string) => {
    const map: Record<string, { mockId: string; title: string; questions: number; duration: number; marks: number; negative: string }> = {
      "wb-panchayat": { mockId: "panchayat-mock-1", title: "Panchayat Full Mock Test 1", questions: 100, duration: 90, marks: 100, negative: "-0.25" },
      "wbp-constable": { mockId: "wbp-mock-1", title: "WBP Constable Full Mock 1 (Prelims)", questions: 85, duration: 60, marks: 85, negative: "-0.25" },
      "wbp-si": { mockId: "kp-si-mock-1", title: "KP & WBP SI Prelims Full Mock 1", questions: 100, duration: 90, marks: 200, negative: "-0.50" },
      "psc-clerkship": { mockId: "psc-clerkship-mock-1", title: "WBPSC Clerkship Part-I Full Mock 1", questions: 100, duration: 90, marks: 100, negative: "-0.25" },
      "wbcs": { mockId: "wbcs-mock-1", title: "WBCS Executive Prelims Full Mock 1", questions: 200, duration: 150, marks: 200, negative: "-0.33" },
      "wb-tet": { mockId: "wb-tet-mock-1", title: "WB Primary TET Full Mock 1", questions: 150, duration: 150, marks: 150, negative: "No Negative" },
      "ssc-gd": { mockId: "ssc-gd-mock-1", title: "SSC GD Constable Full Mock 1", questions: 80, duration: 60, marks: 160, negative: "-0.50" },
      "rrb-group-d": { mockId: "rrb-gd-mock-1", title: "Railway Group D Full Mock 1", questions: 100, duration: 90, marks: 100, negative: "-0.33" },
    };
    return map[examId] || null;
  };

  const [selectedTestForModal, setSelectedTestForModal] = useState<any | null>(null);

  const handleStartFullMock = (examId: string, examName?: string) => {
    const mock = getPrimaryMockForExam(examId, examName);
    if (mock) {
      setSelectedTestForModal({
        id: mock.mockId,
        title: mock.title,
        examName: examName || selectedExam.name,
        totalQuestions: mock.questions,
        durationMinutes: mock.duration,
        totalMarks: mock.marks,
        negativeMarking: mock.negative,
        isPaid: false,
        language: "Bengali & English",
        attemptsAllowed: "Unlimited",
        validity: "1 Year",
      });
    } else {
      // Fallback: navigate to exam page
      navigate(`/student/exam?exam=${examId}`);
    }
  };

  const getReadinessGradient = (value: number) => {
    if (value >= 80) return { from: "#10B981", to: "#059669", label: "text-emerald-400" };
    if (value >= 65) return { from: "#3B82F6", to: "#2563EB", label: "text-blue-400" };
    if (value >= 45) return { from: "#F59E0B", to: "#D97706", label: "text-amber-400" };
    return { from: "#EF4444", to: "#DC2626", label: "text-rose-400" };
  };

  const factorIcons = [
    { icon: Crosshair, color: "text-blue-400", bg: "bg-blue-500/15" },
    { icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { icon: RotateCcw, color: "text-purple-400", bg: "bg-purple-500/15" },
    { icon: Flame, color: "text-amber-400", bg: "bg-amber-500/15" },
  ];

  const getActionIcon = (type: string) => {
    switch (type) {
      case "topic_drill": return { icon: Target, gradient: "from-blue-500 to-cyan-500" };
      case "mistake_revision": return { icon: RotateCcw, gradient: "from-purple-500 to-pink-500" };
      case "pyq_drill": return { icon: BookOpen, gradient: "from-emerald-500 to-teal-500" };
      case "mock_test": return { icon: Play, gradient: "from-amber-500 to-orange-500" };
      default: return { icon: Zap, gradient: "from-blue-500 to-indigo-500" };
    }
  };

  return (
    <StudentLayout title="My Readiness" subtitle="Exam Readiness & Cutoff Analytics">
      <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 pb-24 md:pb-8 space-y-6">

        {/* ═══════════════ TOP HEADER ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Gauge className="w-4.5 h-4.5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                My Readiness & Cutoff Meter
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 ml-[42px] sm:ml-[42px]">
              Cutoff benchmark, projected marks & subject-wise readiness for your target exam.
            </p>
          </div>

          <button
            onClick={() => navigate("/student/practice")}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 hover:border-blue-300 transition-all"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Practice</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* ═══════════════ EXAM SELECTOR RIBBON ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Target Exam:
            </span>
            <span className="text-[11px] font-bold text-blue-600 font-mono bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
              Max {readiness?.maxScore || 100} Marks
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
            {EXAM_CATALOG.map((exam) => (
              <motion.button
                key={exam.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedExamId(exam.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  selectedExamId === exam.id
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 ring-2 ring-slate-900/10 scale-[1.02]"
                    : "bg-white border border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span>{exam.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold font-mono ${
                  selectedExamId === exam.id
                    ? "bg-white/20 text-white/90"
                    : "bg-blue-50 text-blue-700 border border-blue-100"
                }`}>
                  {exam.defaultQuestions}Q
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════ HERO READINESS GAUGE ═══════════════ */}
        {readiness && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-indigo-950" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] -ml-20 -mb-20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-gradient-to-r from-transparent via-blue-500/5 to-transparent rotate-12" />

            <div className="relative z-10 px-5 py-5 sm:p-7 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">

                {/* Left: Gauge + Status */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                  {/* Circular Meter with Glow */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center shrink-0"
                  >
                    {/* Glow ring */}
                    <div
                      className="absolute inset-0 rounded-full blur-xl opacity-30"
                      style={{ background: `radial-gradient(circle, ${getReadinessGradient(readiness.overallReadiness).from}40, transparent 70%)` }}
                    />
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={getReadinessGradient(readiness.overallReadiness).from} />
                          <stop offset="100%" stopColor={getReadinessGradient(readiness.overallReadiness).to} />
                        </linearGradient>
                      </defs>
                      {/* Track */}
                      <circle cx="50" cy="50" r="40" strokeWidth="8" stroke="rgba(255,255,255,0.07)" fill="transparent" />
                      {/* Progress */}
                      <motion.circle
                        cx="50" cy="50" r="40"
                        strokeWidth="8"
                        stroke="url(#gaugeGradient)"
                        fill="transparent"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 40}
                        initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - readiness.overallReadiness / 100) }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white leading-none"
                      >
                        {readiness.overallReadiness}
                        <span className="text-lg text-white/60">%</span>
                      </motion.span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Readiness
                      </span>
                    </div>
                  </motion.div>

                  {/* Score & Verdict */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="space-y-2"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/[0.08] backdrop-blur-sm border border-white/[0.12]">
                      <Sparkles className={`w-3.5 h-3.5 ${getReadinessGradient(readiness.overallReadiness).label}`} />
                      <span className={getReadinessGradient(readiness.overallReadiness).label}>
                        {readiness.readinessLabel}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white font-display leading-tight">
                      {selectedExam.name}
                    </h2>
                    <p className="hidden sm:block text-xs sm:text-sm text-slate-400 font-medium max-w-md leading-relaxed">
                      Projected Score:{" "}
                      <strong className="text-white font-mono text-base bg-white/10 px-2 py-0.5 rounded-lg">
                        {readiness.projectedScore}
                      </strong>{" "}
                      <span className="text-slate-500">/ {readiness.maxScore}</span>{" "}
                      <span className="text-slate-500 text-[11px]">(based on mocks, PYQs & revision)</span>
                    </p>
                    {/* Mobile projected score */}
                    <p className="sm:hidden text-xs text-slate-400">
                      Projected: <strong className="text-white font-mono">{readiness.projectedScore}</strong> / {readiness.maxScore}
                    </p>
                  </motion.div>
                </div>

                {/* Right: 4-Factor Breakdown */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-white/[0.05] backdrop-blur-lg rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3 min-w-0 w-full sm:min-w-[280px] md:min-w-[320px]"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-2 border-b border-white/[0.06]">
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                      4 Readiness Factors
                    </span>
                    <span className="text-blue-400 font-mono">Weight</span>
                  </div>

                  {[
                    { label: "Full Mock Test Accuracy", value: readiness.mockAccuracy, weight: "40%", idx: 0 },
                    { label: "PYQ Practice & Topic Tests", value: readiness.topicDrillAccuracy, weight: "25%", idx: 1 },
                    { label: "Mistakes Revision Mastery", value: readiness.mistakeMasteryRate, weight: "20%", idx: 2 },
                    { label: "Daily Study Consistency", value: readiness.consistencyScore, weight: "15%", idx: 3 },
                  ].map((factor) => {
                    const Icon = factorIcons[factor.idx].icon;
                    return (
                      <motion.div
                        key={factor.label}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.5 + factor.idx * 0.1 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <span className={`w-5 h-5 rounded-md ${factorIcons[factor.idx].bg} flex items-center justify-center`}>
                              <Icon className={`w-3 h-3 ${factorIcons[factor.idx].color}`} />
                            </span>
                            {factor.label}
                          </span>
                          <span className="font-mono font-bold text-white/80">
                            {factor.value}%{" "}
                            <span className="text-slate-500 text-[10px]">({factor.weight})</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${factor.value}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 + factor.idx * 0.1 }}
                            className={`h-full rounded-full ${
                              factor.idx === 0 ? "bg-gradient-to-r from-blue-500 to-blue-400" :
                              factor.idx === 1 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                              factor.idx === 2 ? "bg-gradient-to-r from-purple-500 to-purple-400" :
                              "bg-gradient-to-r from-amber-500 to-amber-400"
                            }`}
                          />
                        </div>
                      </motion.div>
                    );
                  })}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStartFullMock(selectedExamId, readiness.targetExamName)}
                    className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-400/20 hover:border-blue-400/40 text-blue-300 hover:text-white text-xs font-bold transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Give Full Mock Test →</span>
                  </motion.button>
                </motion.div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════ CUTOFF BENCHMARK ═══════════════ */}
        {readiness && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
          >
            {/* Header with gradient accent */}
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display">
                      Cutoff Meter — Passing Benchmark
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {readiness.cutoffBenchmark.examName} — Your standing vs. official cutoff scores
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Score</span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-black text-sm shadow-md shadow-blue-500/20">
                      {readiness.projectedScore} / {readiness.maxScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cutoff Cards */}
            <div className="p-5 sm:p-6">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                {[
                  { cat: "UR (General)", cutoff: readiness.cutoffBenchmark.expectedCutoffUR, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50", borderColor: "border-blue-200", lightBg: "bg-blue-100" },
                  { cat: "OBC", cutoff: readiness.cutoffBenchmark.expectedCutoffOBC, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", borderColor: "border-emerald-200", lightBg: "bg-emerald-100" },
                  { cat: "SC", cutoff: readiness.cutoffBenchmark.expectedCutoffSC, gradient: "from-purple-500 to-purple-600", bg: "bg-purple-50", borderColor: "border-purple-200", lightBg: "bg-purple-100" },
                  { cat: "ST", cutoff: readiness.cutoffBenchmark.expectedCutoffST, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50", borderColor: "border-amber-200", lightBg: "bg-amber-100" },
                ].map((c) => {
                  const diff = Math.round((readiness.projectedScore - c.cutoff) * 10) / 10;
                  const isCleared = diff >= 0;
                  const fillPercent = Math.min(100, Math.round((readiness.projectedScore / c.cutoff) * 100));

                  return (
                    <motion.div
                      key={c.cat}
                      variants={staggerItem}
                      className={`p-4 rounded-2xl border ${c.borderColor} ${c.bg} space-y-3 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">{c.cat}</span>
                        <span className="text-xs font-mono font-black text-slate-900">{c.cutoff}</span>
                      </div>

                      {/* Visual progress */}
                      <div className="space-y-1">
                        <div className={`w-full h-2 ${c.lightBg} rounded-full overflow-hidden`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(fillPercent, 100)}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                            className={`h-full rounded-full bg-gradient-to-r ${c.gradient}`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isCleared ? (
                          <span className="text-[11px] font-black text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-lg">
                            <CircleCheckBig className="w-3 h-3" /> +{diff} Safe
                          </span>
                        ) : (
                          <span className="text-[11px] font-black text-rose-600 flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded-lg">
                            <TriangleAlert className="w-3 h-3" /> -{Math.abs(diff)} Below
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════ TODAY'S MISSION ═══════════════ */}
        {readiness && readiness.recommendedActions.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <Zap className="w-5 h-5 text-white fill-white/80" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-display">
                  Today's Mission — 3 Steps to Boost Score
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Completing these actions will directly elevate your selection readiness.
                </p>
              </div>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {readiness.recommendedActions.map((act, idx) => {
                const actionStyle = getActionIcon(act.type);
                const ActionIcon = actionStyle.icon;

                return (
                  <motion.div
                    key={act.id}
                    variants={staggerItem}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    onClick={() => {
                      if (act.type === "mock_test") {
                        handleStartFullMock(selectedExamId, readiness.targetExamName);
                      } else {
                        navigate(act.actionUrl);
                      }
                    }}
                    className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Step number watermark */}
                    <span className="absolute top-3 right-4 text-[48px] font-black text-slate-100 leading-none select-none pointer-events-none">
                      {idx + 1}
                    </span>

                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${actionStyle.gradient} flex items-center justify-center shadow-sm`}>
                            <ActionIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {act.impactLabel}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-snug pr-6">
                        {act.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {act.subtitle}
                      </p>
                    </div>

                    <div className="pt-4 mt-auto">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:text-blue-700 bg-blue-50 group-hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">
                        Start Now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}

        {/* ═══════════════ SUBJECT DIAGNOSTIC MATRIX ═══════════════ */}
        {readiness && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display">
                      Subject Diagnostic — Readiness Breakdown
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Identify strong zones and urgent weak areas across the syllabus.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/student/practice/subject")}
                  className="rounded-xl text-xs font-bold gap-1.5 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all self-start sm:self-auto"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Practice All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Subject Grid */}
            <div className="p-5 sm:p-6">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {readiness.subjectReadiness.map((item, idx) => {
                  const statusConfig = {
                    strong: {
                      badge: "Strong",
                      emoji: "🔥",
                      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      barGradient: "from-emerald-500 to-emerald-400",
                      barBg: "bg-emerald-100",
                    },
                    weak: {
                      badge: "Needs Focus",
                      emoji: "⚠️",
                      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
                      barGradient: "from-rose-500 to-rose-400",
                      barBg: "bg-rose-100",
                    },
                    average: {
                      badge: "Moderate",
                      emoji: "⚡",
                      badgeBg: "bg-slate-100 text-slate-600 border-slate-200",
                      barGradient: "from-blue-500 to-blue-400",
                      barBg: "bg-blue-100",
                    },
                  }[item.status];

                  return (
                    <motion.div
                      key={item.subject}
                      variants={staggerItem}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      onClick={() => navigate(`/student/practice/subject?subject=${encodeURIComponent(item.subject)}`)}
                      className="p-4 rounded-2xl border border-slate-200/70 hover:border-blue-200 hover:shadow-md bg-white hover:bg-slate-50/30 transition-all cursor-pointer space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3 h-3 rounded-full ${item.color} shadow-sm`} />
                          <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {item.subject}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${statusConfig.badgeBg}`}>
                          {statusConfig.badge} {statusConfig.emoji}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Accuracy</span>
                          <span className="font-mono font-black text-slate-800">{item.scorePercent}%</span>
                        </div>
                        <div className={`w-full h-2.5 ${statusConfig.barBg} rounded-full overflow-hidden`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.scorePercent}%` }}
                            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 + idx * 0.05 }}
                            className={`h-full rounded-full bg-gradient-to-r ${statusConfig.barGradient}`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>
        )}

      </div>

      {/* Full Mock Test Details Modal */}
      <TestDetailsModal
        isOpen={!!selectedTestForModal}
        onClose={() => setSelectedTestForModal(null)}
        test={selectedTestForModal}
      />
    </StudentLayout>
  );
};

export default StudentPerformance;
