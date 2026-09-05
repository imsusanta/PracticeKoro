import { BarChart3, Target, Trophy, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { StudentPerformance } from "@/lib/studentManagement";

interface StudentPerformanceSummaryProps {
  stats?: StudentPerformance;
  compact?: boolean;
}

const formatScore = (value: number | null) => (value === null ? "—" : `${value}%`);

export const StudentPerformanceSummary = ({ stats, compact = false }: StudentPerformanceSummaryProps) => {
  if (!stats || stats.attempts === 0) {
    return compact ? (
      <span className="text-xs text-gray-400">No attempts</span>
    ) : (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-400 font-medium">No completed test attempts yet</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{stats.attempts} tests</p>
        <p className="text-[11px] text-gray-500 truncate">
          Best {formatScore(stats.bestScore)} · Avg {formatScore(stats.averageScore)}
        </p>
        <p className="text-[11px] text-emerald-600 font-medium">{stats.passRate}% pass</p>
      </div>
    );
  }

  const cards = [
    { label: "Attempts", value: String(stats.attempts), icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Best score", value: formatScore(stats.bestScore), icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Average", value: formatScore(stats.averageScore), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pass rate", value: `${stats.passRate}%`, icon: Target, color: "text-teal-600", bg: "bg-teal-50" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-100 bg-white p-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{card.label}</p>
                <p className="text-sm font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pass rate</span>
          <span className="text-[11px] text-slate-500">{stats.passed}/{stats.attempts} passed</span>
        </div>
        <Progress value={stats.passRate ?? 0} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />
      </div>
    </div>
  );
};
