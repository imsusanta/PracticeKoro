import { useNavigate } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import {
  BookOpen,
  Bookmark,
  ArrowRight,
  Clock,
  Check,
  ChevronRight,
  Play,
  Zap,
  Newspaper,
  FileText,
  TrendingUp,
  Brain,
  Globe,
  Calculator,
  Monitor,
  BarChart3,
} from "lucide-react";

// Stylized Vector Illustration for Hero Banner (Checklist + Target Bullseye)
const HeroPracticeIllustration = ({ className = "" }: { className?: string }) => (
  <div className={`relative shrink-0 flex items-center justify-center select-none pointer-events-none ${className}`}>
    <div className="relative w-44 sm:w-56 h-36 sm:h-44 flex items-center justify-center origin-center scale-[0.52] sm:scale-80 md:scale-100">
      {/* Soft ambient background glow */}
      <div className="absolute w-36 h-36 bg-blue-300/25 rounded-full blur-2xl" />
      <div className="absolute -top-2 -right-2 w-16 h-16 bg-sky-200/30 rounded-full blur-xl" />
      <div className="absolute -bottom-2 -left-2 w-14 h-14 bg-indigo-300/25 rounded-full blur-lg" />

      {/* Floating decorative elements */}
      <div className="absolute top-1 right-6 w-2.5 h-2.5 rounded-full bg-white/40" />
      <div className="absolute bottom-4 left-3 w-2 h-2 rounded-full bg-white/30" />

      {/* White Checklist Card */}
      <div className="relative z-10 w-32 sm:w-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-blue-950/20 p-3 sm:p-3.5 border border-white/80 transform -rotate-3">
        {/* Header bar */}
        <div className="w-10 h-2 rounded-full bg-blue-100 mx-auto mb-2.5" />

        {/* Checklist items */}
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-md bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <div className="flex-1 space-y-1">
                <div
                  className={`h-1.5 rounded-full bg-slate-200 ${
                    item === 1 ? "w-14" : item === 2 ? "w-18" : "w-12"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Target Bullseye Board with Arrow (Overlapping bottom right) */}
      <div className="absolute -bottom-1 -right-1 sm:right-1 z-20 w-20 h-20 sm:w-24 sm:h-24 drop-shadow-xl">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Outer Ring */}
          <circle cx="50" cy="50" r="44" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="4.5" />
          {/* Middle Ring */}
          <circle cx="50" cy="50" r="30" fill="#DBEAFE" stroke="#2563EB" strokeWidth="4.5" />
          {/* Inner Bullseye */}
          <circle cx="50" cy="50" r="16" fill="#1D4ED8" />
          <circle cx="50" cy="50" r="7" fill="#FFFFFF" />

          {/* Dart Shaft */}
          <line x1="16" y1="16" x2="47" y2="47" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
          {/* Dart Tip */}
          <polygon points="45,39 52,48 43,54" fill="#0284C7" />
          {/* Dart Fletching */}
          <path d="M12 18 L18 12 M17 23 L23 17" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  </div>
);

export const PracticeHub = () => {
  const navigate = useNavigate();

  // 4 Top Category Cards
  const featureCards = [
    {
      id: "topic-practice",
      title: "Topic-wise Practice",
      subtitle: "Practice by subject & topic",
      icon: FileText,
      iconBg: "bg-[#D9E9FF] text-[#0066FF]",
      cardBg: "bg-[#EFF6FF] border-blue-100 hover:border-blue-300",
      arrowColor: "text-[#0066FF]",
      path: "/student/practice/subject",
    },
    {
      id: "pyq-practice",
      title: "Previous Year Papers",
      subtitle: "Real exam questions for better preparation",
      icon: TrendingUp,
      iconBg: "bg-[#D1F6E2] text-emerald-600",
      cardBg: "bg-[#F0FDF4] border-emerald-100 hover:border-emerald-300",
      arrowColor: "text-emerald-600",
      path: "/student/pyq",
    },
    {
      id: "saved-questions",
      title: "Saved Questions",
      subtitle: "Revise your bookmarked questions",
      icon: Bookmark,
      iconBg: "bg-[#EFE3FE] text-purple-600",
      cardBg: "bg-[#FAF5FF] border-purple-100 hover:border-purple-300",
      arrowColor: "text-purple-600",
      path: "/student/bookmarks",
    },
    {
      id: "practice-history",
      title: "Practice History",
      subtitle: "Track your progress over time",
      icon: Clock,
      iconBg: "bg-[#FFE8D0] text-amber-600",
      cardBg: "bg-[#FFF7ED] border-amber-100 hover:border-amber-300",
      arrowColor: "text-amber-600",
      path: "/student/results",
    },
  ];

  // 6 Core Subjects
  const subjectCards = [
    {
      id: "reasoning",
      name: "General Intelligence & Reasoning",
      questionCount: "1,250+ Questions",
      icon: Brain,
      badgeBg: "bg-blue-50 text-blue-600 border-blue-100",
      path: "/student/practice/subject?subject=Reasoning",
    },
    {
      id: "awareness",
      name: "General Awareness",
      questionCount: "980+ Questions",
      icon: Globe,
      badgeBg: "bg-teal-50 text-teal-600 border-teal-100",
      path: "/student/practice/subject?subject=General Knowledge",
    },
    {
      id: "math",
      name: "Quantitative Aptitude",
      questionCount: "1,100+ Questions",
      icon: Calculator,
      badgeBg: "bg-purple-50 text-purple-600 border-purple-100",
      path: "/student/practice/subject?subject=Mathematics",
    },
    {
      id: "english",
      name: "English Comprehension",
      questionCount: "850+ Questions",
      icon: BookOpen,
      badgeBg: "bg-amber-50 text-amber-600 border-amber-100",
      path: "/student/practice/subject?subject=English",
    },
    {
      id: "bengali",
      name: "Bengali Language",
      questionCount: "600+ Questions",
      customIcon: (
        <span className="text-xl font-bold leading-none text-emerald-600">
          অ
        </span>
      ),
      badgeBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      path: "/student/practice/subject?subject=Bengali",
    },
    {
      id: "computer",
      name: "Computer Knowledge",
      questionCount: "450+ Questions",
      icon: Monitor,
      badgeBg: "bg-sky-50 text-sky-600 border-sky-100",
      path: "/student/practice/subject?subject=General Science",
    },
  ];

  // Quick Action Buttons
  const quickActions = [
    {
      label: "Take a Random Test",
      icon: Zap,
      style: "bg-blue-50/70 hover:bg-blue-100/70 border-blue-200/80 text-blue-700",
      iconColor: "text-blue-600 fill-blue-600",
      path: "/student/daily",
    },
    {
      label: "Resume Practice",
      icon: Play,
      style: "bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200/80 text-emerald-700",
      iconColor: "text-emerald-600 fill-emerald-600",
      path: "/student/practice/subject",
    },
    {
      label: "View Performance",
      icon: BarChart3,
      style: "bg-purple-50/70 hover:bg-purple-100/70 border-purple-200/80 text-purple-700",
      iconColor: "text-purple-600",
      path: "/student/results",
    },
  ];

  return (
    <StudentLayout title="Practice" subtitle="Master your speed & accuracy">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-3 md:py-6 pb-3 md:pb-8 space-y-4 sm:space-y-6 md:space-y-7">

        {/* ═══════════════════════════════════════════════════════════════
            1. PAGE HEADER
            ═══════════════════════════════════════════════════════════════ */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0B1930] tracking-tight">
            Practice & Revision
          </h1>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 sm:mt-1 font-medium">
            Strengthen your concepts with focused practice
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            2. HERO BLUE BANNER (Practice Today, Score Tomorrow)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:px-6 sm:py-5 md:p-6 bg-gradient-to-r from-[#0062E0] via-[#1272F3] to-[#2E82FE] text-white shadow-xl shadow-blue-600/15">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-300/10 rounded-full blur-2xl pointer-events-none -mb-20" />

          <div className="relative z-10 flex items-center justify-between gap-2.5 sm:gap-4 md:gap-6">
            <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
              <h2 className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-black text-white leading-tight tracking-tight">
                Practice Today, Score Tomorrow
              </h2>
              <p className="text-[10px] sm:text-xs md:text-sm text-blue-100/90 leading-snug font-normal max-w-sm line-clamp-2 sm:line-clamp-none">
                Topic-wise questions, previous year papers and smart revision tools — all in one place.
              </p>
              <div className="pt-1 sm:hidden">
                <button
                  onClick={() => navigate("/student/practice/subject")}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-blue-50 text-[#0062E0] active:scale-95 font-bold text-[11px] px-3.5 py-1.5 rounded-full shadow-md shadow-blue-900/15 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Start Practicing</span>
                  <ArrowRight className="w-3 h-3 text-[#0062E0] stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Desktop Center Button */}
            <div className="hidden sm:block shrink-0">
              <button
                onClick={() => navigate("/student/practice/subject")}
                className="inline-flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-blue-50 text-[#0062E0] active:scale-95 font-bold text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-md shadow-blue-900/15 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Start Practicing</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0062E0] stroke-[2.5]" />
              </button>
            </div>

            {/* Right Illustration — visible on all screen sizes */}
            <HeroPracticeIllustration className="w-20 h-18 sm:w-32 sm:h-26 md:w-44 md:h-36 shrink-0" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            3. FOUR TOP FEATURE CARDS (Web view layout for all mobile devices)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => navigate(card.path)}
                className={`rounded-2xl border p-3.5 sm:p-5 flex flex-col items-center text-center justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group ${card.cardBg}`}
              >
                <div className="flex flex-col items-center w-full">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 sm:mb-3 shadow-2xs group-hover:scale-110 transition-transform ${card.iconBg}`}
                  >
                    <Icon className="w-4.5 h-4.5 sm:w-6 sm:h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-[10.5px] sm:text-xs text-slate-500 mt-1 leading-snug">
                    {card.subtitle}
                  </p>
                </div>

                <div className="pt-2 sm:pt-3">
                  <ArrowRight
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${card.arrowColor} stroke-[2.2] group-hover:translate-x-1 transition-transform`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            4. SUBJECTS SECTION (6 Cards + View All)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Subjects
            </h3>
            <button
              onClick={() => navigate("/student/practice/subject")}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0062E0] hover:text-blue-700 transition-colors cursor-pointer group"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {subjectCards.map((subj) => {
              const Icon = subj.icon;
              return (
                <div
                  key={subj.id}
                  onClick={() => navigate(subj.path)}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${subj.badgeBg}`}
                    >
                      {subj.customIcon ? (
                        subj.customIcon
                      ) : Icon ? (
                        <Icon className="w-5 h-5 stroke-[2.2]" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#0062E0] transition-colors leading-snug line-clamp-2">
                        {subj.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {subj.questionCount}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0062E0] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            5. QUICK ACTIONS (3 Pills)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Quick Actions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {quickActions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => navigate(action.path)}
                  className={`h-12 px-4 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm shadow-2xs hover:shadow-xs active:scale-98 transition-all cursor-pointer ${action.style}`}
                >
                  <ActionIcon className={`w-4 h-4 shrink-0 ${action.iconColor}`} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            6. REVISION & QUICK ACCESS (Preserved exactly as requested)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Revision & Quick Access
          </h3>

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
