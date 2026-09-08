import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/MathText";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  History,
  Globe2,
  Calculator,
  Atom,
  ShieldCheck,
  Languages,
  Brain,
  Zap,
  HelpCircle,
  Eye,
  EyeOff,
  Flame,
  Search,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fetchTopicQuestions } from "@/services/drillService";
import { DrillConfig, DrillQuestion } from "@/types/drills";
import InteractiveDrillRunner from "@/components/student/InteractiveDrillRunner";
import { useStudentAuth } from "@/contexts/StudentContext";

const STANDARD_SUBJECT_PRESETS = [
  { id: "General Knowledge", name: "General Knowledge", bengaliName: "সাধারণ জ্ঞান ও কারেন্ট অ্যাফেয়ার্স", icon: Globe2, color: "bg-amber-500", textCol: "text-amber-700", borderCol: "border-amber-200", bgCol: "bg-amber-50" },
  { id: "Mathematics", name: "Mathematics", bengaliName: "পাটিগণিত ও প্রাথমিক গণিত", icon: Calculator, color: "bg-blue-500", textCol: "text-blue-700", borderCol: "border-blue-200", bgCol: "bg-blue-50" },
  { id: "General Science", name: "General Science", bengaliName: "সাধারণ বিজ্ঞান (পদার্থ, রসায়ন, জীববিজ্ঞান)", icon: Atom, color: "bg-emerald-500", textCol: "text-emerald-700", borderCol: "border-emerald-200", bgCol: "bg-emerald-50" },
  { id: "History", name: "History", bengaliName: "ভারতের ইতিহাস ও জাতীয় আন্দোলন", icon: History, color: "bg-orange-500", textCol: "text-orange-700", borderCol: "border-orange-200", bgCol: "bg-orange-50" },
  { id: "Geography", name: "Geography", bengaliName: "পশ্চিমবঙ্গ ও ভারতের ভূগোল", icon: Globe2, color: "bg-teal-500", textCol: "text-teal-700", borderCol: "border-teal-200", bgCol: "bg-teal-50" },
  { id: "Indian Polity", name: "Indian Polity", bengaliName: "ভারতীয় সংবিধান ও পঞ্চায়েতি রাজ", icon: ShieldCheck, color: "bg-rose-500", textCol: "text-rose-700", borderCol: "border-rose-200", bgCol: "bg-rose-50" },
  { id: "English", name: "English", bengaliName: "General English (Grammar & Vocabulary)", icon: Languages, color: "bg-indigo-500", textCol: "text-indigo-700", borderCol: "border-indigo-200", bgCol: "bg-indigo-50" },
  { id: "Bengali", name: "Bengali", bengaliName: "বাংলা ভাষা, সাহিত্য ও ব্যাকরণ", icon: BookOpen, color: "bg-pink-500", textCol: "text-pink-700", borderCol: "border-pink-200", bgCol: "bg-pink-50" },
  { id: "Reasoning", name: "Reasoning", bengaliName: "লজিক্যাল রিজনিং ও সাধারণ বুদ্ধিমত্তা", icon: Brain, color: "bg-purple-500", textCol: "text-purple-700", borderCol: "border-purple-200", bgCol: "bg-purple-50" },
];

export const SubjectPractice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useStudentAuth();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<{ [subject: string]: string[] }>({});

  // Configuration States
  const [selectedSubject, setSelectedSubject] = useState<string>("Mathematics");
  const [selectedTopic, setSelectedTopic] = useState<string>("All Topics");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [drillMode, setDrillMode] = useState<"instant_feedback" | "timed_quiz">("instant_feedback");

  // Study / Preview Mode States
  const [previewQuestions, setPreviewQuestions] = useState<DrillQuestion[]>([]);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [searchTopicQuery, setSearchTopicQuery] = useState("");

  // Interactive Drill Modal
  const [activeDrillConfig, setActiveDrillConfig] = useState<DrillConfig | null>(null);

  const loadTaxonomy = useCallback(async () => {
    try {
      setLoading(true);
      const { data: qData } = await supabase
        .from("questions")
        .select("subject, topic")
        .not("subject", "is", null);

      const subMap: { [subject: string]: Set<string> } = {};

      STANDARD_SUBJECT_PRESETS.forEach(p => {
        subMap[p.id] = new Set();
      });

      if (qData) {
        qData.forEach(q => {
          if (q.subject) {
            if (!subMap[q.subject]) subMap[q.subject] = new Set();
            if (q.topic) subMap[q.subject].add(q.topic);
          }
        });
      }

      const formattedTopics: { [sub: string]: string[] } = {};
      Object.keys(subMap).forEach(s => {
        formattedTopics[s] = Array.from(subMap[s]).sort();
      });

      setSubjects(Object.keys(subMap));
      setTopicsBySubject(formattedTopics);

      const urlSub = searchParams.get("subject");
      if (urlSub) {
        const match = Object.keys(subMap).find(s => s.toLowerCase() === urlSub.toLowerCase());
        if (match) setSelectedSubject(match);
      }
    } catch (err) {
      console.error("Error loading subjects/topics:", err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadTaxonomy();
  }, [loadTaxonomy]);

  // Load preview questions for selected subject
  useEffect(() => {
    let isCancelled = false;
    fetchTopicQuestions(selectedSubject, selectedTopic, selectedDifficulty, 20).then(qs => {
      if (!isCancelled) {
        setPreviewQuestions(qs);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [selectedSubject, selectedTopic, selectedDifficulty]);

  // Load bookmarks
  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_bookmarks")
      .select("question_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setBookmarkedIds(new Set(data.map((b: any) => b.question_id)));
      });
  }, [user]);

  const toggleBookmark = async (qId: string) => {
    if (!user) {
      toast.info("বুকমার্ক সংরক্ষণ করতে লগইন করুন");
      return;
    }
    const isBookmarked = bookmarkedIds.has(qId);
    if (isBookmarked) {
      await supabase.from("student_bookmarks").delete().eq("user_id", user.id).eq("question_id", qId);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      toast.info("বুকমার্ক থেকে সরানো হয়েছে");
    } else {
      await supabase.from("student_bookmarks").insert({ user_id: user.id, question_id: qId });
      setBookmarkedIds(prev => new Set(prev).add(qId));
      toast.success("বুকমার্কে সংরক্ষিত হয়েছে ⭐");
    }
  };

  const handleStartDrill = () => {
    const topicLabel = selectedTopic !== "All Topics" ? ` • ${selectedTopic}` : "";
    setActiveDrillConfig({
      title: `${selectedSubject}${topicLabel}`,
      subtitle: `${questionCount} Questions • ${drillMode === "instant_feedback" ? "Instant Solutions" : "Timed Quiz"}`,
      subject: selectedSubject,
      topic: selectedTopic !== "All Topics" ? selectedTopic : undefined,
      difficulty: selectedDifficulty,
      questionCount,
      marksPerQuestion: 1,
      negativeMarks: 0.25,
      timeLimitMinutes: Math.max(5, Math.round(questionCount * 1.2)),
      mode: drillMode
    });
  };

  const currentPreset = STANDARD_SUBJECT_PRESETS.find(p => p.id === selectedSubject) || STANDARD_SUBJECT_PRESETS[0];
  const availableTopics = ["All Topics", ...(topicsBySubject[selectedSubject] || [])];

  const filteredTopics = availableTopics.filter(t => 
    searchTopicQuery.trim() === "" || t.toLowerCase().includes(searchTopicQuery.toLowerCase())
  );

  return (
    <StudentLayout title="Subject Practice" subtitle="Chapter-wise Smart Practice & Speed Drills">
      <div className="w-full max-w-5xl lg:max-w-6xl mx-auto px-3 sm:px-6 py-4 md:py-6 pb-24 md:pb-12 space-y-6">

        {/* Header Ribbon */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/student/practice")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Practice Center-এ ফিরে যান</span>
          </button>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            অধ্যায়ভিত্তিক অনুশীলন
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SUBJECT SELECTION CARDS
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>বিষয় নির্বাচন করুন (Select Subject)</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">৯টি মূল বিষয়</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
            {STANDARD_SUBJECT_PRESETS.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedSubject === item.id;

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedSubject(item.id);
                    setSelectedTopic("All Topics");
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 shadow-2xs ${
                    isSelected
                      ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.bgCol} ${item.textCol} ${item.borderCol}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-bengali">
                      {item.bengaliName}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            DRILL CONFIGURATOR CARD
            ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${currentPreset.color}`} />
                <h3 className="text-lg font-black text-slate-900 font-display">
                  {currentPreset.name} Practice Drill
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-bengali">
                {currentPreset.bengaliName} • ড্রিল কনফিগার করুন এবং পরীক্ষা শুরু করুন
              </p>
            </div>

            <Button
              onClick={handleStartDrill}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm px-6 h-11 shadow-md shadow-blue-500/20 gap-2 shrink-0 self-start sm:self-auto"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>ড্রিল শুরু করুন ({questionCount} MCQs)</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Topic Dropdown / Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                টপিক / অধ্যায়
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
              >
                {availableTopics.map(top => (
                  <option key={top} value={top}>{top}</option>
                ))}
              </select>
            </div>

            {/* 2. Question Count */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                প্রশ্নের সংখ্যা
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[10, 20, 30, 50].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setQuestionCount(cnt)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all ${
                      questionCount === cnt
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Difficulty */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                ডিফিকাল্টি লেভেল
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "easy", label: "সহজ" },
                  { id: "medium", label: "মাঝারি" },
                  { id: "hard", label: "কঠিন" },
                ].map((dif) => (
                  <button
                    key={dif.id}
                    onClick={() => setSelectedDifficulty(dif.id as any)}
                    className={`h-10 rounded-xl text-[11px] font-bold transition-all ${
                      selectedDifficulty === dif.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {dif.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Drill Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                প্র্যাকটিস মোড
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setDrillMode("instant_feedback")}
                  className={`h-10 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    drillMode === "instant_feedback"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  title="তাৎক্ষণিক সমাধান দেখুন"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant</span>
                </button>
                <button
                  onClick={() => setDrillMode("timed_quiz")}
                  className={`h-10 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    drillMode === "timed_quiz"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  title="টাইমার সহ পরীক্ষা দিন"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Timed</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TOPIC CHAPTERS & STUDY PREVIEW
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 font-display">
                {selectedSubject} প্রশ্নব্যাংক ও পূর্বরূপ (Question Bank Preview)
              </h3>
              <p className="text-xs text-slate-500">
                অনুশীলন শুরু করার আগে প্রশ্নগুলি অধ্যয়ন করুন অথবা বুকমার্ক করুন
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (revealedIds.size > 0) setRevealedIds(new Set());
                  else setRevealedIds(new Set(previewQuestions.map(q => q.id)));
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                {revealedIds.size > 0 ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> সব উত্তর লুকান
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" /> সব সমাধান দেখুন
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Question Cards Grid */}
          <div className="space-y-3.5">
            {previewQuestions.map((q, idx) => {
              const isRevealed = revealedIds.has(q.id);
              const isBookmarked = bookmarkedIds.has(q.id);

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl sm:rounded-3xl p-5 border border-slate-100/90 shadow-2xs hover:shadow-xs hover:border-blue-200 transition-all space-y-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {q.topic && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {q.topic}
                        </span>
                      )}
                      {q.difficulty && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium uppercase">
                          {q.difficulty}
                        </span>
                      )}
                      {q.year && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
                          PYQ {q.year}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleBookmark(q.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                      title={isBookmarked ? "Remove Bookmark" : "Save Question"}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="text-slate-900 font-bold text-sm sm:text-base leading-relaxed font-bengali">
                    <MathText text={q.question_text} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: "A", text: q.option_a },
                      { key: "B", text: q.option_b },
                      { key: "C", text: q.option_c },
                      { key: "D", text: q.option_d },
                    ].map((opt) => {
                      const isCorrect = opt.key === q.correct_answer.toUpperCase().trim();
                      const highlight = isRevealed && isCorrect;

                      return (
                        <div
                          key={opt.key}
                          className={`p-2.5 sm:p-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                            highlight
                              ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-2xs"
                              : "bg-slate-50/70 border-slate-200/80 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                              highlight
                                ? "bg-emerald-600 text-white"
                                : "bg-white border border-slate-200 text-slate-600"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="flex-1 font-bengali">
                            <MathText text={opt.text} />
                          </span>
                          {highlight && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        setRevealedIds(prev => {
                          const next = new Set(prev);
                          if (next.has(q.id)) next.delete(q.id);
                          else next.add(q.id);
                          return next;
                        });
                      }}
                      className="self-start inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> সমাধান লুকান
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> সঠিক উত্তর ও সমাধান
                        </>
                      )}
                    </button>

                    {isRevealed && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs font-bengali space-y-1">
                        <div className="font-bold text-emerald-800">
                          ✓ সঠিক অপশন: ({q.correct_answer})
                        </div>
                        {q.explanation && (
                          <div className="text-slate-700 pt-1 border-t border-slate-200/60 leading-relaxed">
                            <strong>ব্যাখ্যা:</strong> <MathText text={q.explanation} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Interactive Drill Modal */}
        {activeDrillConfig && (
          <InteractiveDrillRunner
            config={activeDrillConfig}
            questions={previewQuestions.slice(0, activeDrillConfig.questionCount)}
            onClose={() => setActiveDrillConfig(null)}
          />
        )}

      </div>
    </StudentLayout>
  );
};

export default SubjectPractice;
