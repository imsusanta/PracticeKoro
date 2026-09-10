import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Crown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  Target,
  BookOpen,
  Bookmark,
  Calendar,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Landmark,
  Award,
  Play,
  Lock,
  FileText,
  Newspaper,
  Trophy,
} from "lucide-react";
import StudentLayout from "@/components/student/StudentLayout";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";
import { DashboardSearch } from "@/components/student/DashboardSearch";
import { initRazorpayPayment } from "@/utils/payment";
import { useStudentAuth } from "@/contexts/StudentContext";
import {
  useExams,
  useMockTests,
  useTodayMetrics,
  useUnfinishedPractice,
  useWeakestSubjectRecommendation,
  useUnreadNotificationsCount,
  useRecentAttempts,
  useUserAttempts,
  useStudentOverallRank,
} from "@/hooks/useStudentData";
import { formatDistanceToNow } from "date-fns";
import { fetchStudentReadiness } from "@/services/readinessService";
import { ExamReadinessResult } from "@/types/readiness";

// Ashoka Emblem SVG for State Govt Exams
const AshokaEmblem = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="currentColor">
    <rect x="8" y="41" width="32" height="3.5" rx="1" fill="#1e293b" />
    <path d="M12 41L15 36h18l3 5H12z" fill="#334155" />
    <circle cx="24" cy="38.5" r="2.2" fill="none" stroke="#2563eb" strokeWidth="1" />
    <rect x="15" y="34" width="18" height="2" rx="0.5" fill="#475569" />
    <path d="M20 34c-1.5-4-1-12 0-16 1.5-3 4-4.5 4-4.5s2.5 1.5 4 4.5c1 4 1.5 12 0 16H20z" fill="#1e293b" />
    <path d="M15 33c-2.5-3-3-9-1.5-12 1-1.5 2.5-2 4-2v14h-2.5z" fill="#334155" />
    <path d="M33 33c2.5-3 3-9 1.5-12-1-1.5-2.5-2-4-2v14h2.5z" fill="#334155" />
    <circle cx="24" cy="15" r="2.5" fill="#64748b" />
  </svg>
);

// Time-based greeting helper
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

interface BannerSlide {
  image: string;
  badge: string;
  title: React.ReactNode;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  buttonStyle?: string;
  badgeColor?: string;
}

// 3-Image Swipeable Hero Banner Carousel
const HeroBannerCarousel = ({
  greeting,
  firstName,
  onNavigate,
}: {
  greeting: string;
  firstName: string;
  onNavigate: (path: string) => void;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const slides: BannerSlide[] = [
    {
      image: "/images/student_hero_banner.jpg",
      badge: "Target Govt Job Selection 🎯",
      title: (
        <>
          Turn Preparation Into{" "}
          <span className="text-[#FBBF24]">Selection 🔥</span>
        </>
      ),
      subtitle: `${greeting}, ${firstName}! Smart Practice • Mistakes • Speed Test • Selection`,
      buttonText: "Start Practice 🚀",
      buttonLink: "/student/practice",
      buttonStyle: "bg-[#FBBF24] hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/25",
      badgeColor: "bg-blue-500/30 border-blue-300/40 text-blue-100",
    },
    {
      image: "/images/student_hero_himalaya.jpg",
      badge: "Full Mock Tests & Live Ranks",
      title: (
        <>
          WB & Central <span className="text-[#60A5FA]">Crack Cutoff</span>
        </>
      ),
      subtitle: "Real exam simulation with negative marking for Police, Clerkship, Panchayat, TET, WBCS & SSC/Railways.",
      buttonText: "Explore Mock Tests",
      buttonLink: "/student/exam",
      buttonStyle: "bg-[#0066FF] hover:bg-blue-600 text-white font-bold shadow-blue-500/30",
      badgeColor: "bg-indigo-500/30 border-indigo-300/40 text-indigo-100",
    },
    {
      image: "/images/student_mountains.jpg",
      badge: "Daily Speed Booster",
      title: (
        <>
          Daily 10 <span className="text-[#FBBF24]">Speed Test ⏱️</span>
        </>
      ),
      subtitle: "Build exam-ready speed and eliminate timer panic with 10 high-yield daily MCQs.",
      buttonText: "Take Daily Test",
      buttonLink: "/student/daily",
      buttonStyle: "bg-[#FBBF24] hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/25",
      badgeColor: "bg-amber-500/30 border-amber-300/40 text-amber-100",
    },
  ];

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay timer every 5 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      nextSlide();
    } else if (diff < -45) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl h-44 sm:h-52 md:h-56 shadow-sm border border-slate-200/80 group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding Track */}
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, idx) => (
          <div key={idx} className="relative w-full h-full shrink-0">
            {/* Background Image */}
            <img
              src={slide.image}
              alt={typeof slide.title === "string" ? slide.title : "PracticeKoro Banner"}
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading={idx === 0 ? "eager" : "lazy"}
            />

            {/* Dark & Gradient Overlays with Brand Navy for crystal clear contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/75 to-[#0A1628]/30 sm:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/85 via-transparent to-transparent sm:hidden" />

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-between p-4 sm:p-6 text-white max-w-lg">
              <div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider backdrop-blur-md border ${slide.badgeColor}`}
                >
                  <Sparkles className="w-3 h-3" />
                  {slide.badge}
                </span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight mt-1.5 leading-snug drop-shadow-sm">
                  {slide.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1 leading-relaxed line-clamp-2 max-w-md drop-shadow-sm">
                  {slide.subtitle}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate(slide.buttonLink)}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-95 flex items-center gap-1.5 transition-all cursor-pointer ${slide.buttonStyle}`}
                >
                  <span>{slide.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Prev / Next Buttons */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 text-white items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 text-white items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Pagination Indicators / Dots */}
      <div className="absolute bottom-3.5 right-4 z-20 flex items-center gap-1.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              currentSlide === idx
                ? "w-6 h-1.5 bg-white shadow-xs"
                : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    user,
    profile,
    hasSubscription,
    subscriptionFee,
    refreshSubscription,
    isLoading: authLoading,
  } = useStudentAuth();

  // Queries
  const {
    data: exams = [],
    isLoading: loadingExams,
    isError: errorExams,
    refetch: refetchExams,
  } = useExams();

  const {
    data: dbTests = [],
    isLoading: loadingTests,
    isError: errorTests,
    refetch: refetchTests,
  } = useMockTests();

  const {
    data: todayMetrics = {
      questions: 0,
      accuracy: 0,
      studyTimeMinutes: 0,
      streakDays: 0,
    },
    isLoading: loadingToday,
    isError: errorToday,
    refetch: refetchToday,
  } = useTodayMetrics(user?.id);

  const {
    data: unfinishedPractice,
    isLoading: loadingUnfinished,
    isError: errorUnfinished,
    refetch: refetchUnfinished,
  } = useUnfinishedPractice(user?.id);

  const {
    data: recommendation,
    isLoading: loadingRec,
    isError: errorRec,
    refetch: refetchRec,
  } = useWeakestSubjectRecommendation(user?.id);

  const {
    data: unreadCount = 0,
    refetch: refetchNotifs,
  } = useUnreadNotificationsCount(user?.id);

  const {
    data: recentAttempts = [],
    isLoading: loadingRecent,
    isError: errorRecent,
    refetch: refetchRecent,
  } = useRecentAttempts(user?.id);

  const {
    data: testAttempts = {},
    refetch: refetchAttempts,
  } = useUserAttempts(user?.id);

  const {
    data: rankData,
    refetch: refetchRank,
  } = useStudentOverallRank(user?.id);
  const overallRank = rankData?.rank ?? null;

  const [selectedTestForModal, setSelectedTestForModal] = useState<any | null>(null);

  // Overall Loading & Error States - resilient against secondary metric failures
  const isLoading = authLoading || (loadingExams && exams.length === 0);

  const isError = errorExams && exams.length === 0 && errorTests && dbTests.length === 0;

  // Refetch all queries on error retry
  const handleRetryAll = () => {
    refetchExams();
    refetchTests();
    refetchToday();
    refetchUnfinished();
    refetchRec();
    refetchNotifs();
    refetchRecent();
    refetchAttempts();
    refetchRank();
  };

  const [readiness, setReadiness] = useState<ExamReadinessResult | null>(null);

  useEffect(() => {
    let isCancelled = false;
    fetchStudentReadiness(user?.id, "wb-panchayat").then((res) => {
      if (!isCancelled) setReadiness(res);
    });
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  // Student details
  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Aspirant";
  const firstName = displayName.split(" ")[0] || "Aspirant";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const initials = (firstName[0] || "A").toUpperCase();
  const greeting = getGreeting();

  // Map mock tests count by exam_id
  const examMockCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dbTests.forEach((t) => {
      if (t.exam_id) {
        counts[t.exam_id] = (counts[t.exam_id] || 0) + 1;
      }
    });
    return counts;
  }, [dbTests]);

  // Handle Pro Plan Subscription Click
  const handleProPlanClick = async () => {
    if (hasSubscription) {
      toast({
        title: "Pro Plan Active! 👑",
        description: "You have unlimited access to all mock tests and materials.",
      });
      return;
    }

    try {
      await initRazorpayPayment({
        amount: subscriptionFee,
        contentId: "site_yearly_subscription",
        contentType: "subscription",
        title: "PracticeKoro Yearly Pro Plan",
      });
      await refreshSubscription();
      toast({ title: "Success!", description: "PracticeKoro Pro Plan activated!" });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Opening upgrade portal...";
      if (errorMsg !== "Payment cancelled") {
        toast({
          title: "Pro Plan Upgrade",
          description: errorMsg,
        });
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SKELETON LOADING STATE (Mirrors Dashboard Structure)
  // ═══════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <StudentLayout title="PracticeKoro" subtitle="Your Exam Preparation Partner">
        <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4 space-y-4 md:space-y-5 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between gap-2.5 sm:gap-3.5 pt-1">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200" />
              <div className="h-5 w-24 sm:w-28 bg-slate-200 rounded-md hidden sm:block" />
            </div>
            <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-8.5 sm:h-9 md:h-9.5 bg-slate-200 rounded-full mx-2 sm:mx-4" />
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <div className="w-18 sm:w-22 h-8 rounded-full bg-slate-200 hidden xs:block" />
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200" />
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200" />
            </div>
          </div>

          {/* Hero Skeleton */}
          <div className="rounded-3xl bg-slate-200/80 h-36 sm:h-40 w-full" />

          {/* Today's Progress Skeleton */}
          <div className="rounded-3xl bg-white border border-slate-100 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-200 rounded" />
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 sm:h-24 bg-slate-100 rounded-xl sm:rounded-2xl" />
              ))}
            </div>
          </div>

          {/* Popular Exams Skeleton */}
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[155px] sm:w-[170px] h-28 bg-slate-100 rounded-2xl shrink-0" />
            ))}
          </div>

          {/* Continue Practice Skeleton */}
          <div className="rounded-2xl bg-white border border-slate-100 p-4 h-20" />

          {/* Recommended Skeleton */}
          <div className="rounded-2xl bg-slate-100 h-20" />

          {/* Quick Actions Skeleton */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </StudentLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // BENGALI ERROR STATE (Graceful Failure with Retry)
  // ═══════════════════════════════════════════════════════════════
  if (isError) {
    return (
      <StudentLayout title="PracticeKoro" subtitle="Your Exam Preparation Partner">
        <div className="w-full max-w-md mx-auto px-4 py-16 text-center">
          <div className="rounded-3xl bg-white border border-rose-200 p-6 sm:p-8 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">
              Something went wrong. Please try again.
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Unable to load your dashboard data right now. Please retry.
            </p>
            <button
              onClick={handleRetryAll}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <RefreshCw className="w-4 h-4 stroke-[2.2]" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="PracticeKoro" subtitle="Your Exam Preparation Partner">
      <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-2 md:py-4 pb-2 md:pb-6 space-y-4 md:space-y-5">
        
        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1: HEADER (Responsive Native App Header)
            ═══════════════════════════════════════════════════════════════ */}
        <header className="space-y-2.5 pt-0.5 pb-1">
          {/* Top Row: Brand on Left, Actions on Right */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: PracticeKoro Brand */}
            <div
              onClick={() => navigate("/student/dashboard")}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/80 group-hover:scale-105 transition-transform bg-white">
                <img src="/logo-circle.png" alt="PracticeKoro" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center leading-none">
                  <span className="text-base sm:text-lg font-black tracking-tight text-[#0F172A]">Practice</span>
                  <span className="text-base sm:text-lg font-black tracking-tight text-[#0066FF]">Koro</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5 hidden sm:block">
                  Your Exam Preparation Partner
                </span>
              </div>
            </div>

            {/* Desktop Center Search Bar */}
            <div className="hidden sm:block flex-1 max-w-sm md:max-w-md mx-2">
              <DashboardSearch
                exams={exams}
                mockTests={dbTests}
                onSelectTest={(test) => setSelectedTestForModal(test)}
              />
            </div>

            {/* Right: Pro Plan Badge + Notifications Bell + Avatar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Pro Plan pill button */}
              <button
                onClick={handleProPlanClick}
                className={`h-8 px-2.5 rounded-full flex items-center gap-1.5 font-bold text-xs transition-all shadow-2xs cursor-pointer border ${
                  hasSubscription
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-[#FEF3C7] text-amber-900 border-amber-200 hover:bg-amber-200/80"
                }`}
                title={hasSubscription ? "Pro Plan Active" : "Upgrade to Pro"}
              >
                <Crown className={`w-3.5 h-3.5 shrink-0 ${hasSubscription ? "text-emerald-600 fill-emerald-500" : "text-amber-600 fill-amber-500"}`} />
                <span className="text-[11px] font-bold hidden xs:inline">
                  {hasSubscription ? "Pro Plan" : "Upgrade"}
                </span>
              </button>

              {/* Notifications */}
              <button
                onClick={() => navigate("/student/notifications")}
                className="relative w-8 h-8 rounded-full bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 hover:text-[#0066FF] hover:border-[#0066FF]/40 shadow-xs transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 stroke-[2.2]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[9.5px] font-black flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Avatar */}
              <button
                onClick={() => navigate("/student/profile")}
                className="w-8 h-8 rounded-full bg-white shadow-xs border border-slate-200 overflow-hidden hover:ring-2 hover:ring-[#0066FF]/30 transition-all flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Student Profile"
              >
                <img
                  src={avatarUrl || "/logo-circle.png"}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo-circle.png";
                  }}
                />
              </button>
            </div>
          </div>

          {/* Mobile Full-Width Search Row */}
          <div className="sm:hidden w-full">
            <DashboardSearch
              exams={exams}
              mockTests={dbTests}
              onSelectTest={(test) => setSelectedTestForModal(test)}
            />
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2: HERO CAROUSEL (3 Swipeable Image Slides)
            ═══════════════════════════════════════════════════════════════ */}
        <HeroBannerCarousel
          greeting={greeting}
          firstName={firstName}
          onNavigate={(path) => navigate(path)}
        />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3: TODAY'S PROGRESS (Questions, Accuracy, Study Time, Streak)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                  Today's Progress
                </h3>
              </div>
              {todayMetrics.streakDays > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-amber-900 bg-gradient-to-r from-amber-100/90 to-orange-100/80 px-2 py-0.5 sm:px-2.5 rounded-full border border-amber-300/60 shadow-2xs whitespace-nowrap">
                  <Flame className="w-3 h-3 text-amber-600 fill-amber-500 animate-pulse shrink-0" />
                  {todayMetrics.streakDays} Day Streak
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Daily Goal
                </span>
              )}
            </div>
            <button
              onClick={() => navigate("/student/results")}
              className="text-xs font-bold text-[#0066FF] hover:text-blue-700 flex items-center gap-1 transition-all group shrink-0 active:opacity-70"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 text-center">
            {/* Metric 1: Questions Solved */}
            <div
              onClick={() => navigate("/student/results")}
              className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-blue-50/70 to-indigo-50/30 border border-blue-100/80 hover:border-blue-300 hover:shadow-2xs active:scale-[0.98] transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1 sm:mb-2 shadow-2xs">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
              </div>
              <p className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {todayMetrics.questions}
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-1 sm:mt-1.5 truncate w-full">
                Solved
              </p>
            </div>

            {/* Metric 2: Accuracy */}
            <div
              onClick={() => navigate("/student/results")}
              className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-purple-50/70 to-violet-50/30 border border-purple-100/80 hover:border-purple-300 hover:shadow-2xs active:scale-[0.98] transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mb-1 sm:mb-2 shadow-2xs">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
              </div>
              <p className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {todayMetrics.accuracy}%
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-1 sm:mt-1.5 truncate w-full">
                Accuracy
              </p>
            </div>

            {/* Metric 3: Study Time */}
            <div
              onClick={() => navigate("/student/results")}
              className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-amber-50/70 to-orange-50/30 border border-amber-100/80 hover:border-amber-300 hover:shadow-2xs active:scale-[0.98] transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-1 sm:mb-2 shadow-2xs">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
              </div>
              <p className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {todayMetrics.studyTimeMinutes}m
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-1 sm:mt-1.5 truncate w-full">
                Study Time
              </p>
            </div>

            {/* Metric 4: Day Streak */}
            <div
              onClick={() => navigate("/student/results")}
              className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-emerald-50/90 to-teal-50/40 border border-emerald-200/90 hover:border-emerald-300 hover:shadow-2xs active:scale-[0.98] transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-1 sm:mb-2 shadow-2xs">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500 animate-pulse" />
              </div>
              <p className="text-base sm:text-2xl font-black text-emerald-800 tracking-tight leading-none">
                {todayMetrics.streakDays}
              </p>
              <p className="text-[10px] sm:text-[11px] font-black text-emerald-700 mt-1 sm:mt-1.5 truncate w-full">
                Streak
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION: RANK (Overall Rank among all mock test participants)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-2xs">
              <Trophy className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</h4>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {overallRank ? `#${overallRank}` : "--"}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/student/leaderboard")}
            className="text-xs font-bold text-[#0066FF] hover:text-blue-700 flex items-center gap-1 transition-all group shrink-0 active:opacity-70 cursor-pointer"
          >
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.2] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3.5: TARGET EXAM READINESS CARD (Phase 4 Diagnostic Engine)
            ═══════════════════════════════════════════════════════════════ */}
        {readiness && (
          <div
            onClick={() => navigate("/student/performance")}
            className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-indigo-500/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="text-white/10" strokeWidth="12" stroke="currentColor" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-[#FBBF24] transition-all duration-700"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - readiness.overallReadiness / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-sm font-black font-mono text-white">
                  {readiness.overallReadiness}%
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    🎯 {readiness.readinessLabel}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {readiness.targetExamName}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-white mt-1">
                  Projected Score: <span className="text-amber-300 font-mono font-black">{readiness.projectedScore}</span> / {readiness.maxScore}
                  {readiness.weakestSubject && (
                    <span className="text-slate-300 font-normal ml-2 hidden md:inline">
                      • Focus Area: <span className="text-rose-400 font-bold">{readiness.weakestSubject.subject}</span>
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
              <span className="text-xs font-bold text-blue-300 group-hover:text-white transition-colors">
                View Cutoff & 3 Missions
              </span>
              <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4: POPULAR EXAMS (Side-scrollable, right below Today's Progress)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
              Popular Exams
            </h3>
            <button
              onClick={() => navigate("/student/exam")}
              className="text-xs font-bold text-[#0066FF] hover:text-blue-700 flex items-center gap-0.5 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>

          {exams && exams.length > 0 ? (
            <div className="flex items-stretch gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain touch-pan-x pb-2 pt-0.5 -mx-1 px-1 sm:mx-0 sm:px-0">
              {exams.map((exam) => {
                const count = examMockCounts[exam.id] || 0;
                const region = exam.name.toLowerCase().includes("wb")
                  ? "West Bengal"
                  : exam.name.toLowerCase().includes("railway")
                  ? "National / RRB"
                  : "State Govt";

                return (
                  <div
                    key={exam.id}
                    onClick={() =>
                      navigate(`/student/exam?exam=${encodeURIComponent(exam.id)}`)
                    }
                    className="w-[155px] sm:w-[170px] shrink-0 bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 flex flex-col items-center text-center shadow-xs hover:shadow-sm hover:border-[#0066FF]/40 transition-all cursor-pointer group select-none"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      {exam.name.toLowerCase().includes("wb") ? (
                        <AshokaEmblem className="w-6 h-6 text-slate-800" />
                      ) : (
                        <Landmark className="w-6 h-6 text-[#0066FF]" />
                      )}
                    </div>
                    <h4 className="text-[11.5px] sm:text-xs font-bold text-slate-900 leading-tight line-clamp-1">
                      {exam.name}
                    </h4>
                    <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium mt-0.5">
                      {region}
                    </span>
                    <div className="mt-auto pt-2.5 w-full">
                      <div className="w-full py-0.5 px-1.5 rounded-full bg-blue-50 text-[#0066FF] text-[9.5px] sm:text-[10px] font-bold text-center">
                        {count > 0 ? `${count} Mock Tests` : "New Tests"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              No exams found.
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION: MOCK TEST SERIES (Directly below Popular Exams)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                Mock Test Series
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Simulated exam mocks with detailed solutions & analysis
              </p>
            </div>
            <button
              onClick={() => navigate("/student/exam")}
              className="text-xs font-bold text-[#0066FF] hover:text-blue-700 flex items-center gap-0.5 transition-colors shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>

          {dbTests && dbTests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {dbTests.slice(0, 4).map((test) => {
                const attempt = testAttempts[test.id];
                const isTopic = test.test_type === "topic_wise";
                const tagLabel = isTopic
                  ? (test.subjects?.name || "Chapter Test")
                  : (test.exams?.name || "Full Mock");

                return (
                  <div
                    key={test.id}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 hover:border-[#0066FF]/40 hover:shadow-sm transition-all flex items-center justify-between gap-3 group"
                  >
                    {/* Left Icon / Score Badge */}
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                        attempt
                          ? attempt.passed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                          : isTopic
                          ? "bg-purple-50 text-purple-700 border-purple-100"
                          : "bg-blue-50 text-[#0066FF] border-blue-100"
                      }`}
                    >
                      {attempt ? (
                        <>
                          <span className="text-xs sm:text-sm font-black leading-none">{attempt.best_percentage}%</span>
                          <span className="text-[8.5px] font-bold uppercase mt-1">
                            {attempt.passed ? "Passed" : "Retry"}
                          </span>
                        </>
                      ) : isTopic ? (
                        <>
                          <Target className="w-5 h-5 stroke-[2.2]" />
                          <span className="text-[8.5px] font-black uppercase tracking-wider mt-0.5">Topic</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-5 h-5 stroke-[2.2]" />
                          <span className="text-[8.5px] font-black uppercase tracking-wider mt-0.5">Mock</span>
                        </>
                      )}
                    </div>

                    {/* Middle Info - Click opens modal */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setSelectedTestForModal({
                          id: test.id,
                          title: test.title,
                          examName: test.exams?.name || test.subjects?.name || "West Bengal Mock Test",
                          totalQuestions: (test as any).total_questions || 100,
                          durationMinutes: test.duration_minutes || 90,
                          totalMarks: test.total_marks || 100,
                          negativeMarking: (test as any).negative_marks ? `-${(test as any).negative_marks}` : "-0.25",
                          isPaid: test.is_paid,
                          language: "Bengali & English",
                          attemptsAllowed: "Unlimited",
                          validity: "1 Year",
                        });
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${
                            isTopic
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-[#0066FF] border-blue-200"
                          }`}
                        >
                          {tagLabel}
                        </span>

                        {test.is_paid ? (
                          <Badge
                            variant="outline"
                            className={`text-[8.5px] px-1 py-0 font-bold ${
                              hasSubscription
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {hasSubscription ? "PRO" : "PRO"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8.5px] px-1 py-0 font-bold bg-slate-50 text-slate-600 border-slate-200">
                            FREE
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-1 group-hover:text-[#0066FF] transition-colors">
                        {test.title}
                      </h4>

                      <div className="flex items-center gap-2.5 text-slate-500 text-[11px] mt-1 flex-wrap font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {test.duration_minutes} Mins
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          {test.total_marks} Marks
                        </span>
                      </div>
                    </div>

                    {/* Right Button */}
                    <div className="flex flex-col items-end shrink-0">
                      <button
                        onClick={() => {
                          if (test.is_paid && !hasSubscription) {
                            handleProPlanClick();
                          } else {
                            navigate(`/student/take-test/${test.id}`);
                          }
                        }}
                        className={`h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          attempt
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : test.is_paid && !hasSubscription
                            ? "bg-[#FEF3C7] hover:bg-amber-200 text-amber-900 border border-amber-200"
                            : "bg-[#0066FF] hover:bg-blue-700 text-white"
                        }`}
                      >
                        {attempt ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </>
                        ) : test.is_paid && !hasSubscription ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Unlock</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              No mock tests available at the moment.
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 5: CONTINUE PRACTICE (Unfinished test or empty state)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 tracking-tight">Continue Practice</h3>
            <button
              onClick={() => navigate("/student/practice")}
              className="text-xs font-bold text-[#0066FF] hover:text-blue-700 flex items-center gap-0.5 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>

          {unfinishedPractice ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#0066FF] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {unfinishedPractice.testTitle}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                    {unfinishedPractice.questionCount} Questions • {unfinishedPractice.completedPercentage}% completed
                  </p>
                  <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#0066FF] rounded-full transition-all duration-300"
                      style={{ width: `${unfinishedPractice.completedPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate(`/student/take-test/${unfinishedPractice.testId}`)}
                className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
              >
                Resume
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                    Ready to practice?
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                    Start your first practice session.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/student/practice")}
                className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
              >
                Start Practice
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 5: RECOMMENDED FOR YOU (AI-powered Weakest Subject)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900 tracking-tight">Recommended For You</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300/70">
                <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500" />
                AI Powered
              </span>
            </div>
          </div>

          {recommendation?.hasSufficientData && recommendation.subjectName ? (
            <div className="bg-amber-50/70 rounded-2xl border border-amber-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                    Focus on {recommendation.subjectName}
                  </h4>
                  <p className="text-[11px] text-amber-950 font-medium mt-0.5">
                    Your accuracy in <strong>{recommendation.subjectName}</strong> is lower than your recent average. Practice these topics to improve.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  navigate(`/student/practice?subject=${encodeURIComponent(recommendation.subjectName || "")}`)
                }
                className="self-start sm:self-auto px-4 py-2 bg-[#FBBF24] hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-2xs transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Start Practice</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.4]" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0066FF] border border-blue-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <Target className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                    Personalized Recommendations
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Take a few practice tests to unlock personalized recommendations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/student/exam")}
                className="self-start sm:self-auto px-4 py-2 bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Take a Test</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.4]" />
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 6: QUICK ACTIONS (6 Practice & Study Tools)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900 tracking-tight">Quick Actions</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {[
              {
                title: "Daily Test",
                icon: Zap,
                bg: "bg-amber-50 border-amber-200/80 text-amber-600",
                path: "/student/daily",
              },
              {
                title: "Chapter Test",
                icon: Target,
                bg: "bg-purple-50 border-purple-200/80 text-purple-600",
                path: "/student/practice/subject",
              },
              {
                title: "Current Affairs",
                icon: Newspaper,
                bg: "bg-emerald-50 border-emerald-200/80 text-emerald-600",
                path: "/student/current-affairs",
              },
              {
                title: "Mistakes",
                icon: RotateCcw,
                bg: "bg-rose-50 border-rose-200/80 text-rose-600",
                path: "/student/mistakes",
              },
              {
                title: "Study Notes",
                icon: BookOpen,
                bg: "bg-blue-50 border-blue-200/80 text-[#0066FF]",
                path: "/student/notes",
              },
              {
                title: "Save Questions",
                icon: Bookmark,
                bg: "bg-cyan-50 border-cyan-200/80 text-cyan-600",
                path: "/student/bookmarks",
              },
            ].map((action, idx) => (
              <motion.button
                key={idx}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.path)}
                className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-xs hover:border-[#0066FF]/40 hover:shadow-sm transition-all cursor-pointer"
              >
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-1.5 border ${action.bg}`}
                >
                  <action.icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight font-bengali">
                  {action.title}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 7: RECENT ACTIVITY (Up to 4 recent test attempts)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
              Recent Activity
            </h3>
            <button
              onClick={() => navigate("/student/results")}
              className="text-xs font-bold text-[#0066FF] hover:text-blue-700 flex items-center gap-0.5 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>

          {recentAttempts && recentAttempts.length > 0 ? (
            <div className="space-y-2">
              {recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  onClick={() => navigate(`/student/test-review/${attempt.id}`)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs hover:border-[#0066FF]/40 hover:bg-blue-50/20 flex items-center justify-between gap-3 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        attempt.passed
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-blue-50 text-[#0066FF] border border-blue-100"
                      }`}
                    >
                      {attempt.passed ? (
                        <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                      ) : (
                        <Clock className="w-5 h-5 stroke-[2.2]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {attempt.testTitle}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                        Completed • {attempt.score}/{attempt.totalMarks} ({attempt.percentage}%)
                        {" • "}
                        {formatDistanceToNow(new Date(attempt.completedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 text-center shadow-xs">
              <p className="text-xs font-bold text-slate-900">No activity yet.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Start your first practice test.
              </p>
              <button
                onClick={() => navigate("/student/exam")}
                className="mt-3 px-4 py-1.5 bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Take a Test
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 9: PREMIUM / PRO BANNER (Upgrade banner or Pro Active)
            ═══════════════════════════════════════════════════════════════ */}
        {!hasSubscription && (
          <div className="bg-[#0A1628] rounded-2xl p-4 sm:p-5 text-white flex items-center justify-between gap-3 shadow-md relative overflow-hidden">
            <div className="absolute left-0 top-0 w-28 h-28 bg-[#F6C344]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute right-10 bottom-0 w-32 h-32 bg-[#0066FF]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F6C344] to-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                <Crown className="w-5 h-5 text-slate-950 fill-slate-950" />
              </div>

              <div className="flex flex-col">
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Upgrade to PracticeKoro Pro
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight mt-0.5 max-w-[200px] sm:max-w-xs md:max-w-md">
                  Unlock mock tests, previous year papers and advanced analysis.
                </p>
              </div>
            </div>

            <button
              onClick={handleProPlanClick}
              className="bg-[#F6C344] hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-[11px] sm:text-xs px-4 py-2 rounded-xl flex items-center gap-1 whitespace-nowrap transition-all shrink-0 relative z-10 shadow-xs cursor-pointer"
            >
              <span>View Plans</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>
        )}

        {/* Test Details Modal if clicked (modal navigates internally; extra props are ignored) */}
        <TestDetailsModal
          test={selectedTestForModal}
          isOpen={!!selectedTestForModal}
          onClose={() => setSelectedTestForModal(null)}
        />

      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
