import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Lock,
  Crown,
  CheckCircle2,
  Play,
  Shield,
  Landmark,
  Siren,
  GraduationCap,
  Building2,
  Train,
  Flag,
  LayoutGrid,
  Globe2,
  History,
  Map as MapIcon,
  Scale,
  FlaskConical,
  Calculator,
  Brain,
  Languages,
  BookOpen,
  FileText,
  Layers,
  ClipboardList,
  Inbox,
} from "lucide-react";
import { motion } from "framer-motion";

export const PK_BLUE = "#0066FF";

/* ── icon maps ─────────────────────────────────────────────── */

const EXAM_ICONS: Record<string, typeof Shield> = {
  shield: Shield,
  landmark: Landmark,
  siren: Siren,
  graduation: GraduationCap,
  building: Building2,
  train: Train,
  flag: Flag,
  grid: LayoutGrid,
};

export function ExamGroupIcon({ icon, tile, size = "md" }: { icon: string; tile: string; size?: "sm" | "md" }) {
  const Icon = EXAM_ICONS[icon] || LayoutGrid;
  const box = size === "sm" ? "w-10 h-10 rounded-xl" : "w-12 h-12 rounded-2xl";
  const ic = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <div className={`${box} ${tile} border flex items-center justify-center shrink-0`}>
      <Icon className={`${ic} stroke-[2]`} />
    </div>
  );
}

const SUBJECT_TILES: Array<{ match: string[]; tile: string; icon: typeof Globe2 }> = [
  { match: ["general awareness", "general knowledge", "gk"], tile: "bg-sky-50 text-sky-700 border-sky-200", icon: Globe2 },
  { match: ["history"], tile: "bg-red-50 text-red-700 border-red-200", icon: History },
  { match: ["geography"], tile: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: MapIcon },
  { match: ["polity", "constitution"], tile: "bg-amber-50 text-amber-700 border-amber-200", icon: Scale },
  { match: ["science", "physics", "chemistry", "biology"], tile: "bg-violet-50 text-violet-700 border-violet-200", icon: FlaskConical },
  { match: ["math", "arithmetic", "quant"], tile: "bg-blue-50 text-blue-700 border-blue-200", icon: Calculator },
  { match: ["reasoning", "intelligence"], tile: "bg-teal-50 text-teal-700 border-teal-200", icon: Brain },
  { match: ["english"], tile: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Languages },
  { match: ["bengali", "bengla"], tile: "bg-green-50 text-green-700 border-green-200", icon: BookOpen },
];

export function SubjectIcon({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const n = name.toLowerCase();
  const found = SUBJECT_TILES.find((t) => t.match.some((m) => n.includes(m))) || {
    tile: "bg-slate-100 text-slate-600 border-slate-200",
    icon: BookOpen,
  };
  const Icon = found.icon;
  const box = size === "sm" ? "w-10 h-10 rounded-xl" : "w-12 h-12 rounded-2xl";
  const ic = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <div className={`${box} ${found.tile} border flex items-center justify-center shrink-0`}>
      <Icon className={`${ic} stroke-[2]`} />
    </div>
  );
}

/* ── screen chrome ─────────────────────────────────────────── */

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="w-10 h-10 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 active:scale-95 transition-all shrink-0"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 text-center min-w-0">
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium truncate">{subtitle}</p>}
      </div>
      <div className="w-10 shrink-0 flex justify-end">{right}</div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-slate-200/90 text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#0066FF]/50 focus:ring-2 focus:ring-[#0066FF]/10 transition-all"
      />
    </div>
  );
}

export function FilterChips<T extends string>({ options, value, onChange }: { options: Array<{ id: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-4 h-9 rounded-full text-xs font-bold whitespace-nowrap transition-all border active:scale-95 ${
            value === o.id
              ? "bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/25"
              : "bg-white text-slate-500 border-slate-200/90"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── cards & rows ──────────────────────────────────────────── */

export function ExamCard({ icon, tile, name, subtitle, testsLabel, onClick }: { icon: string; tile: string; name: string; subtitle: string; testsLabel: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-left"
    >
      <ExamGroupIcon icon={icon} tile={tile} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-slate-900 tracking-tight truncate">{name}</p>
        <p className="text-xs text-slate-500 font-medium truncate">{subtitle}</p>
        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{testsLabel}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
    </motion.button>
  );
}

export function NavCard({ icon, tint, title, desc, onClick }: { icon: ReactNode; tint: string; title: string; desc: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-left"
    >
      <div className={`w-12 h-12 rounded-2xl ${tint} border flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-slate-900 tracking-tight">{title}</p>
        <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
    </motion.button>
  );
}

export type TestStatus = "start" | "continue" | "completed" | "pro";

export function StatusPill({ status, onClick }: { status: TestStatus; onClick?: () => void }) {
  if (status === "pro") {
    return (
      <button
        onClick={onClick}
        className="h-9 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-extrabold flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
      >
        <Lock className="w-3.5 h-3.5" /> Pro
      </button>
    );
  }
  if (status === "completed") {
    return (
      <span className="h-9 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold flex items-center gap-1.5 shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" /> Done
      </span>
    );
  }
  if (status === "continue") {
    return (
      <button
        onClick={onClick}
        className="h-9 px-4 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/25 text-[#0066FF] text-xs font-extrabold active:scale-95 transition-all shrink-0"
      >
        Continue
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="h-9 px-5 rounded-xl bg-[#0066FF] text-white text-xs font-extrabold shadow-sm shadow-blue-500/25 active:scale-95 transition-all shrink-0"
    >
      Start Test
    </button>
  );
}

export function CompactStatusButton({ status, onClick }: { status: TestStatus; onClick?: () => void }) {
  if (status === "pro") {
    return (
      <button onClick={onClick} className="h-8 px-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-extrabold flex items-center gap-1 active:scale-95 transition-all shrink-0">
        <Lock className="w-3 h-3" /> Pro
      </button>
    );
  }
  if (status === "completed") {
    return (
      <span className="h-8 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold flex items-center gap-1 shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" /> Done
      </span>
    );
  }
  if (status === "continue") {
    return (
      <button onClick={onClick} className="h-8 px-3.5 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/25 text-[#0066FF] text-xs font-extrabold active:scale-95 transition-all shrink-0">
        Continue
      </button>
    );
  }
  return (
    <button onClick={onClick} className="h-8 px-4 rounded-xl bg-[#0066FF] text-white text-xs font-extrabold shadow-sm shadow-blue-500/25 active:scale-95 transition-all shrink-0">
      Start
    </button>
  );
}

export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
      <Crown className="w-3 h-3 fill-amber-500 text-amber-600" /> Pro
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-700">Your Progress</span>
          <span className="text-xs font-extrabold text-slate-900">{label}</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#0066FF] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6 rounded-2xl bg-white border border-slate-200/90">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Inbox className="w-6 h-6" />
      </div>
      <p className="text-sm font-extrabold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionTitle({ icon, title, right }: { icon?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
        {icon} {title}
      </h2>
      {right}
    </div>
  );
}

export { FileText, Layers, ClipboardList, Play };
