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
  HelpCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EXAM_CATALOG } from "@/data/examCatalog";
import { fetchStudentReadiness } from "@/services/readinessService";
import { ExamReadinessResult } from "@/types/readiness";

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

  const getBandBadge = (band: string) => {
    switch (band) {
      case "exam_ready":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "competitive":
        return "bg-blue-50 text-blue-800 border-blue-300";
      case "developing":
        return "bg-amber-50 text-amber-800 border-amber-300";
      default:
        return "bg-rose-50 text-rose-800 border-rose-300";
    }
  };

  return (
    <StudentLayout title="Readiness Meter" subtitle="Selection & Cutoff Analytics">
      <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 pb-24 md:pb-8 space-y-5">
        
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Selection Readiness & Cutoff Meter
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Score
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Cutoff benchmark, projected marks, and subject-wise readiness for your target exam.
            </p>
          </div>

          <button
            onClick={() => navigate("/student/practice")}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>Practice Hub</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TARGET EXAM SELECTOR RIBBON
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Target Examination Benchmark:
            </span>
            <span className="text-xs font-bold text-blue-600 font-mono">
              Total {readiness?.maxScore || 100} Marks
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {EXAM_CATALOG.map((exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedExamId(exam.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  selectedExamId === exam.id
                    ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20"
                    : "bg-white border border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{exam.name}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 font-bold font-mono">
                  {exam.defaultQuestions}Q
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            HERO EXAM READINESS GAUGE CARD
            ═══════════════════════════════════════════════════════════════ */}
        {readiness && (
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mb-20" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Left Gauge & Status */}
              <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left">
                {/* Circular Meter */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="text-white/10"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="text-[#FBBF24] transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - readiness.overallReadiness / 100)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black font-mono tracking-tight text-white leading-none">
                      {readiness.overallReadiness}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">
                      Readiness
                    </span>
                  </div>
                </div>

                {/* Score & Verdict Info */}
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-sm border border-white/20 text-[#FBBF24]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{readiness.readinessLabel}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                    {selectedExam.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-md leading-relaxed">
                    Projected Score: <strong className="text-amber-300 font-mono text-base">{readiness.projectedScore}</strong> / {readiness.maxScore} (based on mock tests, PYQs & mistakes revision)
                  </p>
                </div>
              </div>

              {/* Right 4-Factor Breakdown Bars */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2.5 min-w-[260px] sm:min-w-[300px]">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 pb-1 border-b border-white/10">
                  <span>4 Readiness Factors</span>
                  <span className="text-amber-400">Weightage</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-200">
                    <span>Full Mock Test Accuracy</span>
                    <span className="font-mono font-bold">{readiness.mockAccuracy}% (40%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full rounded-full" style={{ width: `${readiness.mockAccuracy}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-200">
                    <span>PYQ Practice & Topic Quizzes</span>
                    <span className="font-mono font-bold">{readiness.topicDrillAccuracy}% (25%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${readiness.topicDrillAccuracy}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-200">
                    <span>Mistakes Revision Mastery</span>
                    <span className="font-mono font-bold">{readiness.mistakeMasteryRate}% (20%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="bg-purple-400 h-full rounded-full" style={{ width: `${readiness.mistakeMasteryRate}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-200">
                    <span>Daily Study Consistency</span>
                    <span className="font-mono font-bold">{readiness.consistencyScore}% (15%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${readiness.consistencyScore}%` }} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PREDICTIVE CUTOFF BENCHMARK COMPARISON
            ═══════════════════════════════════════════════════════════════ */}
        {readiness && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span>Cutoff Meter — Passing Benchmark ({readiness.cutoffBenchmark.examName})</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Your current standing compared to official previous year cutoff scores.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-bold text-slate-600">Projected Score:</span>
                <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-mono font-black text-sm shadow-xs">
                  {readiness.projectedScore} / {readiness.maxScore}
                </span>
              </div>
            </div>

            {/* Cutoff Category Comparison Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { cat: "UR (General)", cutoff: readiness.cutoffBenchmark.expectedCutoffUR, color: "border-blue-200 bg-blue-50/40" },
                { cat: "OBC", cutoff: readiness.cutoffBenchmark.expectedCutoffOBC, color: "border-emerald-200 bg-emerald-50/40" },
                { cat: "SC", cutoff: readiness.cutoffBenchmark.expectedCutoffSC, color: "border-purple-200 bg-purple-50/40" },
                { cat: "ST", cutoff: readiness.cutoffBenchmark.expectedCutoffST, color: "border-amber-200 bg-amber-50/40" },
              ].map((c) => {
                const diff = Math.round((readiness.projectedScore - c.cutoff) * 10) / 10;
                const isCleared = diff >= 0;

                return (
                  <div key={c.cat} className={`p-4 rounded-2xl border ${c.color} space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">{c.cat}</span>
                      <span className="text-xs font-mono font-black text-slate-900">{c.cutoff} Marks</span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {isCleared ? (
                        <span className="text-[11px] font-black text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> +{diff} Safe Zone 🔥
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-rose-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {Math.abs(diff)} Below Cutoff ⚠️
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PRESCRIBED NEXT BEST ACTIONS ("Today's Mission")
            ═══════════════════════════════════════════════════════════════ */}
        {readiness && readiness.recommendedActions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span>Today's Mission — 3 Steps to Boost Score</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Completing these 3 actions will directly elevate your selection readiness today.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {readiness.recommendedActions.map((act) => (
                <div
                  key={act.id}
                  onClick={() => navigate(act.actionUrl)}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {act.impactLabel}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {act.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {act.subtitle}
                    </p>
                  </div>

                  <div className="pt-4 mt-auto">
                    <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                      Start Now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            9-SUBJECT DIAGNOSTIC MATRIX
            ═══════════════════════════════════════════════════════════════ */}
        {readiness && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 font-display">
                  Subject Diagnostic — Readiness Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Identify your strong zones and urgent weak areas across the syllabus.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/student/practice/subject")}
                className="rounded-xl text-xs font-bold gap-1"
              >
                <span>Practice All Subjects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {readiness.subjectReadiness.map((item) => (
                <div
                  key={item.subject}
                  onClick={() => navigate(`/student/practice/subject?subject=${encodeURIComponent(item.subject)}`)}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {item.subject}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        item.status === "strong"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.status === "weak"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.status === "strong" ? "Strong 🔥" : item.status === "weak" ? "Needs Focus ⚠️" : "Moderate ⚡"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Accuracy</span>
                      <span className="font-mono font-black text-slate-800">{item.scorePercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.status === "strong"
                            ? "bg-emerald-500"
                            : item.status === "weak"
                            ? "bg-rose-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${item.scorePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </StudentLayout>
  );
};

export default StudentPerformance;
