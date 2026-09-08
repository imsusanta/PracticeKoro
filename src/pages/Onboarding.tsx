import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, BookOpen, Target, Sparkles, CheckCircle2 } from "lucide-react";

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: any;
  color: string;
}

const slides: Slide[] = [
  {
    id: 1,
    title: "Achieve Your Dream Job",
    subtitle: "Practice with mock tests, previous year questions and expert study materials for West Bengal govt exams.",
    badge: "West Bengal Exam Prep",
    icon: Trophy,
    color: "from-blue-600 to-indigo-600",
  },
  {
    id: 2,
    title: "Real Exam Experience",
    subtitle: "Timed full mock tests with exact syllabus mapping, negative marking, and state-wide percentile rank.",
    badge: "100+ Mock Tests",
    icon: Target,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: 3,
    title: "Handcrafted Study Notes",
    subtitle: "Subject-wise crisp summaries, Daily Current Affairs, and important General Knowledge in Bengali & English.",
    badge: "Quality Study Notes",
    icon: BookOpen,
    color: "from-purple-600 to-pink-600",
  },
  {
    id: 4,
    title: "Mistakes & Revision Hub",
    subtitle: "Smart mistake notebook automatically captures wrong questions so you never repeat an error in the actual exam.",
    badge: "Zero-Mistake Guarantee",
    icon: Sparkles,
    color: "from-amber-500 to-orange-500",
  },
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      navigate("/register");
    }
  };

  const handleSkip = () => {
    navigate("/student/dashboard");
  };

  const activeSlide = slides[currentSlide];

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col justify-between max-w-md mx-auto relative px-6 py-8 overflow-hidden font-sans">
      {/* Top Bar with Brand & Skip */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-blue-500/30">
            P
          </div>
          <span className="font-black text-slate-900 tracking-tight text-base">
            Practice<span className="text-blue-600">Koro</span>
          </span>
        </div>

        <button
          onClick={handleSkip}
          className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors py-1 px-2.5 rounded-lg"
        >
          Skip
        </button>
      </div>

      {/* Center Illustration matching Screen 2 */}
      <div className="my-auto py-6 flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center"
          >
            {/* Visual Graphic Representation */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-6">
              {/* Soft background aura */}
              <div className="absolute inset-0 bg-blue-50 rounded-full blur-2xl opacity-70 pointer-events-none" />

              {/* Graphic Staircase / Podium Hero */}
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                {/* SVG Illustration resembling the student climbing steps to flag */}
                <svg viewBox="0 0 240 240" className="w-56 h-56">
                  {/* Stairs */}
                  <rect x="30" y="160" width="45" height="50" rx="6" fill="#BFDBFE" />
                  <rect x="75" y="125" width="45" height="85" rx="6" fill="#93C5FD" />
                  <rect x="120" y="90" width="45" height="120" rx="6" fill="#60A5FA" />
                  <rect x="165" y="55" width="45" height="155" rx="6" fill="#2563EB" />

                  {/* Flagpole on top step */}
                  <line x1="195" y1="55" x2="195" y2="15" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
                  {/* Red Victory Flag */}
                  <polygon points="195,18 165,30 195,42" fill="#EF4444" />

                  {/* Climbing Aspirant Character Silhouette */}
                  <circle cx="95" cy="85" r="9" fill="#0F172A" />
                  <path d="M 95 95 L 98 120 L 88 135 M 98 120 L 115 125 M 95 102 L 80 115 M 95 102 L 112 110" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            </div>

            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 mb-3 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              {activeSlide.badge}
            </span>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2.5">
              {currentSlide === 0 ? (
                <>
                  Achieve <br />
                  Your <span className="text-blue-600">Dream Job</span>
                </>
              ) : (
                activeSlide.title
              )}
            </h1>

            {/* Subtext */}
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xs sm:max-w-sm">
              {currentSlide === 0 ? "Practice with mock tests, previous year questions and expert study materials." : activeSlide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls: Dots & CTA matching Screen 2 */}
      <div className="space-y-6 z-10">
        {/* 4 Pagination Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx
                  ? "w-8 bg-blue-600"
                  : "w-2 bg-slate-200 hover:bg-slate-300"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2.5">
          <Button
            onClick={handleNext}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full h-10 text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
