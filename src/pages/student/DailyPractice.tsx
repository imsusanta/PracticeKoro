import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentContext";
import StudentLayout from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MathText } from "@/components/ui/MathText";
import {
  Flame,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Crown,
  ChevronRight,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  subject: string | null;
  topic: string | null;
}

const FALLBACK_DAILY_QUESTIONS: Question[] = [
  {
    id: "dp_q1",
    question_text: "পশ্চিমবঙ্গের পঞ্চায়েত ব্যবস্থার ত্রিস্তর কাঠামোর মধ্যবর্তী স্তর কোনটি?",
    option_a: "গ্রাম পঞ্চায়েত",
    option_b: "পঞ্চায়েত সমিতি",
    option_c: "জেলা পরিষদ",
    option_d: "গ্রাম সংসদ",
    correct_answer: "B",
    explanation: "পশ্চিমবঙ্গ পঞ্চায়েত আইন ১৯৭৩ অনুসারে ত্রিস্তর কাঠামোর মধ্যবর্তী স্তর হলো ব্লক পর্যায়ের 'পঞ্চায়েত সমিতি' (গ্রাম পঞ্চায়েত -> পঞ্চায়েত সমিতি -> জেলা পরিষদ)।",
    subject: "Polity",
    topic: "Panchayat System"
  },
  {
    id: "dp_q2",
    question_text: "কোন নদীকে অতীতে 'পশ্চিমবঙ্গের দুঃখ' বলা হতো?",
    option_a: "তিস্তা",
    option_b: "দামোদর",
    option_c: "তোর্সা",
    option_d: "রূপনারায়ণ",
    correct_answer: "B",
    explanation: "দামোদর নদীর নিয়মিত বিধ্বংসী বন্যার কারণে অতীতে এটিকে 'পশ্চিমবঙ্গের দুঃখ' বলা হতো। পরবর্তীকালে DVC বাঁধ নির্মাণের মাধ্যমে এটি নিয়ন্ত্রণ করা হয়।",
    subject: "Geography",
    topic: "Rivers of WB"
  },
  {
    id: "dp_q3",
    question_text: "একটি আয়তক্ষেত্রের দৈর্ঘ্য ২০% বৃদ্ধি এবং প্রস্থ ২০% হ্রাস করা হলে ক্ষেত্রফলের শতকরা পরিবর্তন কত হবে?",
    option_a: "অপরিবর্তিত থাকবে",
    option_b: "৪% বৃদ্ধি",
    option_c: "৪% হ্রাস",
    option_d: "২% হ্রাস",
    correct_answer: "C",
    explanation: "সূত্রানুসারে: Net Change = +20 - 20 - (20 * 20)/100 = -4% অর্থাৎ ৪% হ্রাস পাবে।",
    subject: "Mathematics",
    topic: "Percentage"
  },
  {
    id: "dp_q4",
    question_text: "সুন্দরবনকে কত সালে ইউনেস্কো (UNESCO) ওয়ার্ল্ড হেরিটেজ সাইট হিসেবে ঘোষণা করে?",
    option_a: "১৯৮৫",
    option_b: "১৯৮৭",
    option_c: "১৯৮৯",
    option_d: "১৯৯২",
    correct_answer: "B",
    explanation: "১৯৮৭ সালে ম্যানগ্রোভ অরণ্য এবং রয়েল বেঙ্গল টাইগারের প্রাকৃতিক বাসস্থানের জন্য সুন্দরবনকে ইউনেস্কো বিশ্ব ঐতিহ্যবাহী স্থান হিসেবে স্বীকৃতি দেয়।",
    subject: "General Studies",
    topic: "Environment"
  },
  {
    id: "dp_q5",
    question_text: "ভারতে জাতীয় সংবিধান দিবস কবে পালিত হয়?",
    option_a: "২৬শে জানুয়ারি",
    option_b: "১৫ই আগস্ট",
    option_c: "২৬শে নভেম্বর",
    option_d: "২রা অক্টোবর",
    correct_answer: "C",
    explanation: "১৯৪৯ সালের ২৬শে নভেম্বর গণপরিষদ ভারতের সংবিধান আনুষ্ঠানিকভাবে গ্রহণ করে। তাই প্রতি বছর এই দিনটিকে সংবিধান দিবস হিসেবে পালন করা হয়।",
    subject: "Polity",
    topic: "Indian Constitution"
  },
  {
    id: "dp_q6",
    question_text: "Select the correctly spelled word:",
    option_a: "Accomodation",
    option_b: "Accommodation",
    option_c: "Acommodation",
    option_d: "Accomadation",
    correct_answer: "B",
    explanation: "'Accommodation' has double 'c' and double 'm'.",
    subject: "English",
    topic: "Spelling"
  },
  {
    id: "dp_q7",
    question_text: "যদি CAT = 24 এবং DOG = 26 হয়, তবে PIG = কত?",
    option_a: "32",
    option_b: "34",
    option_c: "36",
    option_d: "38",
    correct_answer: "A",
    explanation: "অক্ষরের স্থানীয় মান: P(16) + I(9) + G(7) = 32।",
    subject: "Reasoning",
    topic: "Coding-Decoding"
  },
  {
    id: "dp_q8",
    question_text: "কোন ভিটামিনের অভাবে মানবদেহে রিকেট রোগ হয়?",
    option_a: "ভিটামিন A",
    option_b: "ভিটামিন C",
    option_c: "ভিটামিন D",
    option_d: "ভিটামিন K",
    correct_answer: "C",
    explanation: "ভিটামিন ডি-এর অভাবে শিশুদের হাড় দুর্বল হয়ে রিকেট রোগ দেখা দেয়। ভিটামিন সি-র অভাবে স্কার্ভি হয়।",
    subject: "Science",
    topic: "Vitamins & Diseases"
  },
  {
    id: "dp_q9",
    question_text: "ভারতীয় সংবিধানের কোন অনুচ্ছেদে রাজ্য নির্বাচন কমিশনের তত্ত্বাবধানে পঞ্চায়েত নির্বাচনের বিধান রয়েছে?",
    option_a: "২৪৩ K",
    option_b: "২৪৩ E",
    option_c: "২৪৩ D",
    option_d: "২৪৩ A",
    correct_answer: "A",
    explanation: "ভারতীয় সংবিধানের অনুচ্ছেদ 243K রাজ্য নির্বাচন কমিশনের তত্ত্বাবধানে পঞ্চায়েত নির্বাচনের বিধান দেয়।",
    subject: "Polity",
    topic: "Panchayat Election"
  },
  {
    id: "dp_q10",
    question_text: "বার্ষিক ৫% সরল সুদে কত বছরে ৫০০ টাকার সুদ ১০০ টাকা হবে?",
    option_a: "৩ বছর",
    option_b: "৪ বছর",
    option_c: "৫ বছর",
    option_d: "৬ বছর",
    correct_answer: "B",
    explanation: "I = (P * R * T) / 100 => 100 = (500 * 5 * T) / 100 => 25 * T = 100 => T = 4 বছর।",
    subject: "Mathematics",
    topic: "Simple Interest"
  }
];

export const DailyPractice = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [streak, setStreak] = useState(0);
  const [alreadyCompletedToday, setAlreadyCompletedToday] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Exam flow states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [id: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes = 300 seconds
  const [timerActive, setTimerActive] = useState(false);

  const initDaily = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const todayStr = new Date().toISOString().split("T")[0];

      // Check local storage streak first
      const localStreak = parseInt(localStorage.getItem("pk_daily_streak") || "0", 10);
      const localLastDate = localStorage.getItem("pk_daily_last_date");
      if (localLastDate === todayStr) {
        setAlreadyCompletedToday(true);
      }
      setStreak(localStreak);

      // Check DB streak safely
      try {
        const { data: streakData } = await supabase
          .from("student_streaks")
          .select("current_streak, last_activity_date")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (streakData && streakData.current_streak !== undefined) {
          const dbStreak = streakData.current_streak || 0;
          const finalStreak = Math.max(localStreak, dbStreak);
          setStreak(finalStreak);
          localStorage.setItem("pk_daily_streak", finalStreak.toString());

          if (streakData.last_activity_date === todayStr) {
            setAlreadyCompletedToday(true);
          }
        }
      } catch (e) {
        console.warn("Streak query fallback:", e);
      }

      // Check daily attempt in DB safely
      try {
        const { data: todayAttempt } = await supabase
          .from("daily_practice_attempts")
          .select("id, score, total_questions")
          .eq("user_id", session.user.id)
          .eq("practice_date", todayStr)
          .maybeSingle();

        if (todayAttempt) {
          setAlreadyCompletedToday(true);
        }
      } catch (e) {
        console.warn("Daily attempt query fallback:", e);
      }

      // Fetch 10 questions from DB or use fallback
      try {
        const { data: qData } = await supabase
          .from("questions")
          .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic")
          .order("created_at", { ascending: false })
          .limit(30);

        if (qData && qData.length >= 8) {
          const shuffled = (qData as Question[]).sort(() => 0.5 - Math.random()).slice(0, 10);
          setQuestions(shuffled);
        } else {
          setQuestions(FALLBACK_DAILY_QUESTIONS);
        }
      } catch (e) {
        console.warn("Using fallback daily questions:", e);
        setQuestions(FALLBACK_DAILY_QUESTIONS);
      }
    } catch (err) {
      console.error("Error loading daily practice:", err);
      setQuestions(FALLBACK_DAILY_QUESTIONS);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    initDaily();
  }, [initDaily]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || isFinished) return;
    if (timeLeft <= 0) {
      finishDailyPractice();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, isFinished]);

  const startDailyChallenge = () => {
    setIsStarted(true);
    setTimerActive(true);
    setTimeLeft(300);
    setCurrentIndex(0);
    setAnswers({});
    setIsFinished(false);
  };

  const selectOption = (opt: string) => {
    const currentQ = questions[currentIndex];
    setAnswers(prev => ({ ...prev, [currentQ.id]: opt }));
  };

  const finishDailyPractice = async () => {
    setTimerActive(false);
    setIsFinished(true);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    let correct = 0;
    const mistakesToLog: any[] = [];

    questions.forEach(q => {
      const isCorrect = answers[q.id]?.toUpperCase() === q.correct_answer.toUpperCase();
      if (isCorrect) {
        correct++;
      } else {
        mistakesToLog.push({
          id: `mistake_${q.id}`,
          question_id: q.id,
          selected_answer: answers[q.id] || null,
          correct_answer: q.correct_answer,
          is_mastered: false,
          updated_at: new Date().toISOString(),
          questions: q
        });
      }
    });

    const timeSpent = 300 - Math.max(0, timeLeft);
    const todayStr = new Date().toISOString().split("T")[0];

    // Local streak update
    const newStreak = alreadyCompletedToday ? streak : streak + 1;
    setStreak(newStreak);
    localStorage.setItem("pk_daily_streak", newStreak.toString());
    localStorage.setItem("pk_daily_last_date", todayStr);

    // Save mistakes to local persistence (for MistakesNotebook)
    if (mistakesToLog.length > 0) {
      try {
        const storedMistakes = JSON.parse(localStorage.getItem("pk_local_mistakes") || "[]");
        const merged = [...mistakesToLog, ...storedMistakes.filter((m: any) => !mistakesToLog.some(n => n.question_id === m.question_id))];
        localStorage.setItem("pk_local_mistakes", JSON.stringify(merged.slice(0, 100)));
      } catch (e) {
        console.warn("Could not save to pk_local_mistakes:", e);
      }
    }

    // Remote sync
    if (userId) {
      mistakesToLog.forEach(m => {
        try {
          supabase.from("student_mistakes").upsert({
            user_id: userId,
            question_id: m.question_id,
            selected_answer: m.selected_answer,
            correct_answer: m.correct_answer,
            is_mastered: false,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,question_id" }).then();
        } catch (e) {
          // ignore
        }
      });

      try {
        supabase.from("daily_practice_attempts").insert({
          user_id: userId,
          practice_date: todayStr,
          score: correct,
          total_questions: questions.length,
          correct_count: correct,
          time_taken_seconds: timeSpent
        }).then();
      } catch (e) {
        // ignore
      }

      try {
        supabase.from("student_streaks").upsert({
          user_id: userId,
          current_streak: newStreak,
          last_activity_date: todayStr,
          updated_at: new Date().toISOString()
        }).then();
      } catch (e) {
        // ignore
      }
    }

    toast.success("Daily Practice Submitted! 🔥 Streak Updated!");
  };

  let correctCount = 0;
  questions.forEach(q => {
    if (answers[q.id]?.toUpperCase() === q.correct_answer.toUpperCase()) {
      correctCount++;
    }
  });
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <StudentLayout title="Daily Challenge" subtitle="Daily Practice Test">
      <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 pb-24 md:pb-8 space-y-4 md:space-y-6">
        {/* Top Brand Header */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/80 bg-white">
              <img src="/logo-circle.png" alt="PracticeKoro" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 font-display">
                  Practice<span className="text-blue-600">Koro</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Daily 10
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">10 Questions • 5 Mins Speed Challenge</p>
            </div>
          </div>
        </div>

        {!isStarted && !isFinished ? (
          /* Intro Screen */
          <div className="space-y-4 sm:space-y-6">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-3xl px-4 py-3.5 sm:p-7 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mb-24" />
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#FEF3C7] text-amber-900 text-[9px] sm:text-[11px] font-black uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-600 animate-pulse" />
                    {streak} Days Active Streak
                  </div>
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight font-display text-white">
                    Daily 10 <span className="text-[#FBBF24]">Speed Test</span>
                  </h1>
                  <p className="hidden sm:block text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                    10 hand-curated questions covering West Bengal competitive exams. Boost quick problem solving and keep your learning streak burning!
                  </p>
                </div>

                <div className="flex gap-2 sm:gap-3 shrink-0">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 sm:p-4 border border-white/15 text-center min-w-[68px] sm:min-w-[85px]">
                    <p className="text-lg sm:text-2xl font-black text-white">10</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">MCQs</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 sm:p-4 border border-white/15 text-center min-w-[68px] sm:min-w-[85px]">
                    <p className="text-lg sm:text-2xl font-black text-[#FBBF24]">5m</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">Duration</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 sm:p-4 border border-white/15 text-center min-w-[68px] sm:min-w-[85px]">
                    <p className="text-lg sm:text-2xl font-black text-emerald-300">+{alreadyCompletedToday ? "0" : "1"}</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">🔥 Streak</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-3xl border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-7 space-y-6">
              {alreadyCompletedToday && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>You've already claimed today's streak! You can practice again to sharpen your accuracy.</span>
                </div>
              )}

              {/* Milestone Streak Badges */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Streak Milestones</p>
                  <span className="text-xs font-bold text-blue-600">Current: {streak} Days</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { days: 3, label: "Starter", icon: "🌱" },
                    { days: 7, label: "Dedicated", icon: "⚡" },
                    { days: 14, label: "Unstoppable", icon: "🔥" },
                    { days: 30, label: "Topper Legend", icon: "👑" },
                  ].map(badge => (
                    <div
                      key={badge.days}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        streak >= badge.days
                          ? "bg-amber-50/80 border-amber-300 text-amber-950 font-bold shadow-sm"
                          : "bg-slate-50 border-slate-100 text-slate-400"
                      }`}
                    >
                      <span className="text-lg">{badge.icon}</span>
                      <p className="font-black text-sm text-slate-900 mt-1">{badge.days} Days</p>
                      <p className="text-[10px] text-slate-500 font-medium">{badge.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <Button
                onClick={startDailyChallenge}
                disabled={loading || questions.length === 0}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <span>Start Daily 10 Challenge</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        ) : !isFinished ? (
          /* Live Challenge Question Screen */
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Timer & Question Progress Bar */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100/90 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-slate-800">
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {formatTimer(timeLeft)}
                </div>
                <Button
                  size="sm"
                  onClick={finishDailyPractice}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 font-bold rounded-xl shadow-sm"
                >
                  Submit
                </Button>
              </div>
            </div>

            {/* Question Card */}
            {questions[currentIndex] && (
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                    Question {currentIndex + 1}
                  </span>
                  {questions[currentIndex].subject && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {questions[currentIndex].subject}
                    </span>
                  )}
                </div>

                <div className="text-slate-900 font-bold text-lg sm:text-xl md:text-2xl leading-relaxed font-bengali">
                  <MathText text={questions[currentIndex].question_text} />
                </div>

                {/* Option Choices */}
                <div className="space-y-2.5 pt-1">
                  {[
                    { key: "A", text: questions[currentIndex].option_a },
                    { key: "B", text: questions[currentIndex].option_b },
                    { key: "C", text: questions[currentIndex].option_c },
                    { key: "D", text: questions[currentIndex].option_d },
                  ].map(opt => {
                    const isSelected = answers[questions[currentIndex].id] === opt.key;

                    return (
                      <button
                        key={opt.key}
                        onClick={() => selectOption(opt.key)}
                        className={`w-full flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border text-left text-base sm:text-lg transition-all group ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-500 text-blue-950 font-bold shadow-sm"
                            : "bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-100/70 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`w-9 h-9 rounded-xl text-sm sm:text-base font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-white border border-slate-200 text-slate-600 group-hover:border-slate-400"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1 font-bengali font-medium">
                          <MathText text={opt.text} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="rounded-xl text-xs font-bold h-10 px-4"
                  >
                    Previous
                  </Button>
                  {currentIndex < questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentIndex(prev => prev + 1)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-sm shadow-blue-500/20"
                    >
                      Next Question
                    </Button>
                  ) : (
                    <Button
                      onClick={finishDailyPractice}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-sm"
                    >
                      Submit Challenge
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Finished Screen with Solutions Review */
          <div className="space-y-5 max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Flame className="w-8 h-8 fill-amber-500 text-amber-500 animate-bounce" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-amber-900 text-xs font-black uppercase mb-2">
                  🔥 Streak: {streak} Days Active!
                </div>
                <h2 className="text-2xl font-black text-slate-900 font-display">Challenge Completed!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Mistakes have been saved to your Mistakes Notebook for focused revision.
                </p>
              </div>

              {/* Scorecard */}
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-2xl font-black text-slate-900">{correctCount}/{questions.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Score</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-2xl font-black text-blue-600">{accuracy}%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Accuracy</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-2xl font-black text-amber-600">{streak} 🔥</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Streak</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                <Button
                  onClick={() => navigate("/student/mistakes")}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Review Mistakes Notebook
                </Button>
                <Button
                  onClick={() => navigate("/student/leaderboard")}
                  className="rounded-xl bg-[#FBBF24] hover:bg-amber-400 text-slate-950 font-black text-xs h-10 px-4 flex items-center gap-1.5 shadow-sm"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  View Leaderboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/student/exam")}
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold h-10 px-4"
                >
                  Full Mock Tests
                </Button>
              </div>
            </div>

            {/* Detailed Explanations */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-900 px-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Solutions & Explanations
              </h3>

              {questions.map((q, idx) => {
                const userAns = answers[q.id];
                const isCorrect = userAns?.toUpperCase() === q.correct_answer.toUpperCase();

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
                      isCorrect ? "border-emerald-200 bg-emerald-50/20" : "border-rose-200 bg-rose-50/20"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-slate-500">Q{idx + 1}.</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isCorrect ? "Correct (+1)" : userAns ? "Incorrect (0)" : "Unanswered (0)"}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-bold text-slate-900 font-bengali leading-relaxed">
                      <MathText text={q.question_text} />
                    </div>

                    <div className="mt-3 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="font-semibold text-slate-400">Your Answer:</span>
                        <strong className={isCorrect ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                          Option {userAns || "None"}
                        </strong>
                      </div>
                      {(() => {
                        const ans = (q.correct_answer || '').toUpperCase().trim();
                        const correctText = ans === 'A' ? q.option_a : ans === 'B' ? q.option_b : ans === 'C' ? q.option_c : ans === 'D' ? q.option_d : null;
                        return (
                          <div className="font-bold text-emerald-800 flex items-center flex-wrap gap-1.5">
                            <span>✓ Correct Answer: ({ans})</span>
                            {correctText && (
                              <span className="font-semibold text-emerald-950">
                                <MathText text={correctText} formatBullets={false} />
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {q.explanation && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100 font-bengali">
                        <strong className="text-slate-900 block mb-0.5 font-bold">💡 Solution & Key Rule:</strong>
                        <MathText text={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default DailyPractice;
