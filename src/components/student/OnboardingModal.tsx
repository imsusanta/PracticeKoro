import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, TrendingUp, Award, ArrowRight, X } from "lucide-react";

interface OnboardingModalProps {
  onComplete?: () => void;
}

const ONBOARDING_KEY = "practicekoro_onboarding_completed_v1";

const slides = [
  {
    title: "Achieve Your Dream Job",
    subtitle: "Practice with mock tests, previous year questions and expert study materials.",
    bengali: "তোমার স্বপ্নের চাকরির পথে এক ধাপ এগিয়ে চলো",
    icon: Award,
    color: "bg-blue-600 text-white",
    bg: "from-blue-50 to-indigo-50",
  },
  {
    title: "Know Your Weakness",
    subtitle: "Analyze your performance and improve weak topics with smart accuracy tracking.",
    bengali: "ভুল উত্তরগুলো শনাক্ত করে নিখুঁত প্রস্তুতি নাও",
    icon: Target,
    color: "bg-purple-600 text-white",
    bg: "from-purple-50 to-violet-50",
  },
  {
    title: "Prepare Smarter",
    subtitle: "Follow a personalized preparation journey designed for West Bengal exams.",
    bengali: "প্রস্তুতি আজ, সফলতা আগামীকাল",
    icon: TrendingUp,
    color: "bg-emerald-600 text-white",
    bg: "from-emerald-50 to-teal-50",
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleFinish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOpen(false);
    if (onComplete) onComplete();
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  if (!isOpen) return null;

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
        >
          {/* Header with Skip button */}
          <div className="flex items-center justify-between p-4 pb-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                PK
              </div>
              <span className="text-xs font-bold text-slate-700 tracking-tight">PracticeKoro</span>
            </div>
            <button
              onClick={handleFinish}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Slide Body */}
          <div className="p-6 text-center flex flex-col items-center">
            {/* Visual Icon Illustration */}
            <div className={`w-20 h-20 rounded-3xl ${slide.color} flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 transition-all duration-300`}>
              <Icon className="w-10 h-10 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
              {slide.title}
            </h3>

            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mb-3">
              {slide.subtitle}
            </p>

            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {slide.bengali}
            </span>

            {/* Carousel Dots */}
            <div className="flex items-center justify-center gap-1.5 mt-6 mb-6">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx ? "w-6 bg-blue-600" : "w-2 bg-slate-200"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleNext}
              className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <span>{currentSlide === slides.length - 1 ? "Get Started" : "Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
