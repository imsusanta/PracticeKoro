import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

/* ═════════════════════════════════════════════════════════════════════════════
   PRACTICEKORO UNIFIED DESIGN SYSTEM COMPONENTS
   Directly modeled after the 20-screen reference UI
   ═════════════════════════════════════════════════════════════════════════════ */

/**
 * 1. ProgressRing - Circular progress indicator with gradient or solid stroke
 */
interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  bgColor?: string;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 7,
  strokeColor = "#2563EB",
  bgColor = "#E2E8F0",
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

/**
 * 2. SubjectProgressItem - Used in Exam Detail (Screen 6) & Analytics (Screen 12)
 */
interface SubjectProgressItemProps {
  label: string;
  letter: string;
  percentage: number;
  colorClass?: string;
  bgColorClass?: string;
}

export const SubjectProgressItem: React.FC<SubjectProgressItemProps> = ({
  label,
  letter,
  percentage,
  colorClass = "bg-blue-600",
  bgColorClass = "bg-blue-50 text-blue-700 border-blue-200",
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border ${bgColorClass}`}>
            {letter}
          </div>
          <span className="text-slate-800">{label}</span>
        </div>
        <span className="text-slate-600 font-bold">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${colorClass}`}
        />
      </div>
    </div>
  );
};

/**
 * 3. QuickActionSquircle - Used in Screen 4 (Home Dashboard Quick Actions)
 */
interface QuickActionSquircleProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  onClick: () => void;
  badge?: string;
}

export const QuickActionSquircle: React.FC<QuickActionSquircleProps> = ({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  onClick,
  badge,
}) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-blue-300 active:scale-95 transition-all text-center group"
    >
      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${iconBg} flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
      </div>
      <span className="text-[11px] sm:text-xs font-bold text-slate-800 group-hover:text-blue-600 leading-tight">
        {title}
      </span>
      {badge && (
        <span className="mt-0.5 text-[9px] font-semibold text-slate-400">
          {badge}
        </span>
      )}
    </button>
  );
};

/**
 * 4. PracticeModeCard - Used in Screen 13 (Practice Hub)
 */
interface PracticeModeCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  theme: "amber" | "sky" | "blue" | "purple" | "rose" | "emerald" | "indigo" | "orange";
  onClick: () => void;
}

const themeStyles = {
  amber: { bg: "bg-amber-50/60 border-amber-200/80 hover:border-amber-300", iconBg: "bg-amber-500 text-white" },
  sky: { bg: "bg-sky-50/60 border-sky-200/80 hover:border-sky-300", iconBg: "bg-sky-500 text-white" },
  blue: { bg: "bg-blue-50/60 border-blue-200/80 hover:border-blue-300", iconBg: "bg-blue-600 text-white" },
  purple: { bg: "bg-purple-50/60 border-purple-200/80 hover:border-purple-300", iconBg: "bg-purple-600 text-white" },
  rose: { bg: "bg-rose-50/60 border-rose-200/80 hover:border-rose-300", iconBg: "bg-rose-500 text-white" },
  emerald: { bg: "bg-emerald-50/60 border-emerald-200/80 hover:border-emerald-300", iconBg: "bg-emerald-600 text-white" },
  indigo: { bg: "bg-indigo-50/60 border-indigo-200/80 hover:border-indigo-300", iconBg: "bg-indigo-600 text-white" },
  orange: { bg: "bg-orange-50/60 border-orange-200/80 hover:border-orange-300", iconBg: "bg-orange-500 text-white" },
};

export const PracticeModeCard: React.FC<PracticeModeCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  theme,
  onClick,
}) => {
  const styles = themeStyles[theme] || themeStyles.blue;
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border ${styles.bg} text-left flex flex-col justify-between h-32 sm:h-36 shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all group`}
    >
      <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center shadow-xs transition-transform group-hover:scale-105`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 leading-snug">
          {title}
        </h4>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
          {subtitle}
        </p>
      </div>
    </button>
  );
};

/**
 * 5. BengaliText - Wrapper ensuring proper font and line-height for Bengali script
 */
export const BengaliText: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  return (
    <span
      className={`font-['Hind_Siliguri',sans-serif] leading-relaxed tracking-normal ${className}`}
      style={{ wordBreak: "break-word" }}
    >
      {children}
    </span>
  );
};
