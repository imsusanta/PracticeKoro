import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/MathText";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Trophy,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
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
  Check,
  HelpCircle,
  FileQuestion,
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
  difficulty: string | null;
}

// Icon helper for subjects
const getSubjectIcon = (subjectName: string) => {
  const s = (subjectName || "").toLowerCase();
  if (s.includes("hist") || s.includes("ইতিহাস")) return History;
  if (s.includes("geog") || s.includes("ভূগোল")) return Globe2;
  if (s.includes("math") || s.includes("গণিত")) return Calculator;
  if (s.includes("sci") || s.includes("বিজ্ঞান")) return Atom;
  if (s.includes("polity") || s.includes("সংবিধান")) return ShieldCheck;
  if (s.includes("eng") || s.includes("ইংরেজি")) return Languages;
  if (s.includes("reason") || s.includes("রিজনিং") || s.includes("gi")) return Brain;
  return BookOpen;
};

// Color theme helper for subjects
const getSubjectColor = (subjectName: string) => {
  const s = (subjectName || "").toLowerCase();
  if (s.includes("hist")) return { bg: "bg-amber-50 text-amber-600 border-amber-200", badge: "text-amber-700 bg-amber-50" };
  if (s.includes("geog")) return { bg: "bg-emerald-50 text-emerald-600 border-emerald-200", badge: "text-emerald-700 bg-emerald-50" };
  if (s.includes("math")) return { bg: "bg-blue-50 text-blue-600 border-blue-200", badge: "text-blue-700 bg-blue-50" };
  if (s.includes("sci")) return { bg: "bg-purple-50 text-purple-600 border-purple-200", badge: "text-purple-700 bg-purple-50" };
  if (s.includes("polity")) return { bg: "bg-rose-50 text-rose-600 border-rose-200", badge: "text-rose-700 bg-rose-50" };
  if (s.includes("eng")) return { bg: "bg-indigo-50 text-indigo-600 border-indigo-200", badge: "text-indigo-700 bg-indigo-50" };
  return { bg: "bg-sky-50 text-sky-600 border-sky-200", badge: "text-sky-700 bg-sky-50" };
};

export const SubjectPractice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<{ [subject: string]: string[] }>({});

  // Selection states
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Practice state
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: string }>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const loadTaxonomy = useCallback(async () => {
    try {
      setLoading(true);
      const { data: qData, error } = await supabase
        .from("questions")
        .select("subject, topic")
        .not("subject", "is", null);

      if (error) throw error;

      if (qData) {
        const subMap: { [subject: string]: Set<string> } = {};
        qData.forEach(q => {
          if (q.subject) {
            if (!subMap[q.subject]) subMap[q.subject] = new Set();
            if (q.topic) subMap[q.subject].add(q.topic);
          }
        });

        const subList = Object.keys(subMap).sort();
        const formattedTopics: { [sub: string]: string[] } = {};
        subList.forEach(s => {
          formattedTopics[s] = Array.from(subMap[s]).sort();
        });

        setSubjects(subList);
        setTopicsBySubject(formattedTopics);

        if (subList.length > 0) {
          const urlSub = searchParams.get("subject");
          const matched = urlSub ? subList.find(s => s.toLowerCase() === urlSub.toLowerCase()) : null;
          const chosen = matched || subList[0];
          setSelectedSubject(chosen);
          setSelectedTopic("All Topics");
        }
      }
    } catch (err) {
      console.error("Error loading subjects/topics:", err);
      toast.error("Failed to load practice subjects");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadTaxonomy();
  }, [loadTaxonomy]);

  const handleSubjectChange = (subj: string) => {
    setSelectedSubject(subj);
    setSelectedTopic("All Topics");
  };

  const startPractice = async () => {
    if (!selectedSubject) return;
    try {
      setLoading(true);
      let query = supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic, difficulty")
        .eq("subject", selectedSubject);

      if (selectedTopic && selectedTopic !== "All Topics") {
        query = query.eq("topic", selectedTopic);
      }

      const { data, error } = await query.limit(questionCount * 2);

      if (error || !data || data.length === 0) {
        toast.error("No questions found for this topic yet.");
        setLoading(false);
        return;
      }

      const shuffled = (data as Question[]).sort(() => 0.5 - Math.random()).slice(0, questionCount);
      setPracticeQuestions(shuffled);
      setCurrentIndex(0);
      setUserAnswers({});
      setShowAnswer(false);
      setPracticeFinished(false);
      setStartTime(Date.now());
      setIsPracticing(true);
    } catch (err) {
      console.error("Error starting practice:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (ans: string) => {
    if (showAnswer) return;
    const currentQ = practiceQuestions[currentIndex];
    setUserAnswers(prev => ({ ...prev, [currentQ.id]: ans }));
    setShowAnswer(true);

    if (ans.toUpperCase() !== currentQ.correct_answer.toUpperCase()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.from("student_mistakes").upsert({
            user_id: session.user.id,
            question_id: currentQ.id,
            selected_answer: ans,
            correct_answer: currentQ.correct_answer,
            is_mastered: false,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,question_id" }).then();
        }
      });
    }
  };

  const nextQuestion = () => {
    if (currentIndex < practiceQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      setPracticeFinished(true);
    }
  };

  const toggleBookmark = async (qId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const isBookmarked = bookmarkedIds.has(qId);
    if (isBookmarked) {
      await supabase.from("student_bookmarks").delete().eq("user_id", session.user.id).eq("question_id", qId);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      toast.info("Removed from Bookmarks");
    } else {
      await supabase.from("student_bookmarks").insert({ user_id: session.user.id, question_id: qId });
      setBookmarkedIds(prev => new Set(prev).add(qId));
      toast.success("Saved to Bookmarks");
    }
  };

  const total = practiceQuestions.length;
  let correct = 0;
  practiceQuestions.forEach(q => {
    if (userAnswers[q.id]?.toUpperCase() === q.correct_answer.toUpperCase()) {
      correct++;
    }
  });
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const availableTopics = topicsBySubject[selectedSubject] || [];

  return (
    <StudentLayout title="Subject Practice" subtitle="Chapter-wise question practice">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 md:py-6 pb-24 md:pb-12 space-y-6">

        {!isPracticing ? (
          /* ═══════════════════════════════════════════════════════════════
              SUBJECT & TOPIC SELECTION (Clean, modern, easy-to-understand)
              ═══════════════════════════════════════════════════════════════ */
          <div className="space-y-6">
            {/* Header & Navigation */}
            <div>
              <button
                onClick={() => navigate("/student/practice")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Practice</span>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Subject & Topic Practice
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Select a subject and chapter to start targeted question practice with instant solutions.
                  </p>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Instant Solutions
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                    <Sparkles className="w-3.5 h-3.5" />
                    Untimed Practice
                  </span>
                </div>
              </div>
            </div>

            {/* Selection Container */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6">
              {/* STEP 1: Select Subject */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                      1
                    </span>
                    <span>Select Subject</span>
                  </label>
                  <span className="text-xs text-slate-400 font-medium">
                    {subjects.length} {subjects.length === 1 ? "Subject available" : "Subjects available"}
                  </span>
                </div>

                {subjects.length === 0 && !loading ? (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <FileQuestion className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No subjects found</p>
                    <p className="text-xs text-slate-500 mt-0.5">Please check back later or try another practice mode.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subjects.map((sub) => {
                      const Icon = getSubjectIcon(sub);
                      const isSelected = selectedSubject === sub;
                      const colors = getSubjectColor(sub);
                      const topicCount = topicsBySubject[sub]?.length || 0;

                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleSubjectChange(sub)}
                          className={`p-4 rounded-2xl border text-left transition-all relative flex items-center justify-between gap-3 cursor-pointer group ${
                            isSelected
                              ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                              : "bg-white border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${colors.bg}`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 truncate">
                                {sub}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {topicCount} {topicCount === 1 ? "Chapter" : "Chapters"}
                              </p>
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-slate-300 group-hover:border-blue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 2: Select Topic / Chapter */}
              {selectedSubject && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                        2
                      </span>
                      <span>Select Chapter or Topic</span>
                    </label>
                    <span className="text-xs text-slate-400 font-medium">
                      {selectedTopic === "All Topics" ? "Mixed Practice" : "Single Chapter"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* All Topics option */}
                    <button
                      type="button"
                      onClick={() => setSelectedTopic("All Topics")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedTopic === "All Topics" || !selectedTopic
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>All Topics (Combined)</span>
                    </button>

                    {/* Individual Topics */}
                    {availableTopics.map((top) => {
                      const isSelected = selectedTopic === top;
                      return (
                        <button
                          key={top}
                          type="button"
                          onClick={() => setSelectedTopic(top)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all font-bengali cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                          }`}
                        >
                          {top}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Question Count */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                    3
                  </span>
                  <span>Number of Questions</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { count: 5, label: "5 Questions", time: "~3 mins" },
                    { count: 10, label: "10 Questions", time: "~5 mins", recommended: true },
                    { count: 20, label: "20 Questions", time: "~10 mins" },
                    { count: 30, label: "30 Questions", time: "~15 mins" },
                  ].map((item) => {
                    const isSelected = questionCount === item.count;
                    return (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => setQuestionCount(item.count)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer relative ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {item.recommended && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-2xs">
                            Recommended
                          </span>
                        )}
                        <div className="font-bold text-xs sm:text-sm">{item.label}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isSelected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {item.time}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Button & Summary */}
              <div className="pt-2">
                <Button
                  onClick={startPractice}
                  disabled={loading || !selectedSubject}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <span>Start Practice ({questionCount} Questions)</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Button>

                <p className="text-center text-xs text-slate-400 mt-3">
                  Targeting: <span className="font-semibold text-slate-700">{selectedSubject}</span>
                  {selectedTopic && selectedTopic !== "All Topics" && (
                    <span> • <span className="font-semibold text-slate-700">{selectedTopic}</span></span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : !practiceFinished ? (
          /* ═══════════════════════════════════════════════════════════════
              ACTIVE PRACTICE QUESTION FLOW (Clean, focused, distraction-free)
              ═══════════════════════════════════════════════════════════════ */
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Top Bar with Progress */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-bold">
                  {selectedSubject}
                </span>
                {selectedTopic && selectedTopic !== "All Topics" && (
                  <span className="text-xs font-medium text-slate-500 font-bengali">
                    • {selectedTopic}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-slate-600">
                  Question <span className="text-blue-600 font-black">{currentIndex + 1}</span> of {practiceQuestions.length}
                </span>
                <button
                  onClick={() => {
                    if (window.confirm("Do you want to exit this practice session?")) {
                      setIsPracticing(false);
                    }
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Exit
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / practiceQuestions.length) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            {practiceQuestions[currentIndex] && (
              <motion.div
                key={practiceQuestions[currentIndex].id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-mono font-black text-xs flex items-center justify-center border border-blue-100">
                    {String(currentIndex + 1).padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => toggleBookmark(practiceQuestions[currentIndex].id)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                    aria-label="Bookmark Question"
                  >
                    {bookmarkedIds.has(practiceQuestions[currentIndex].id) ? (
                      <BookmarkCheck className="w-5 h-5 text-amber-500 fill-amber-500" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="text-slate-900 font-bold text-base sm:text-lg leading-relaxed font-bengali">
                  <MathText text={practiceQuestions[currentIndex].question_text} />
                </div>

                {/* Option Buttons */}
                <div className="space-y-2.5">
                  {[
                    { key: "A", text: practiceQuestions[currentIndex].option_a },
                    { key: "B", text: practiceQuestions[currentIndex].option_b },
                    { key: "C", text: practiceQuestions[currentIndex].option_c },
                    { key: "D", text: practiceQuestions[currentIndex].option_d },
                  ].map((opt) => {
                    const selected = userAnswers[practiceQuestions[currentIndex].id] === opt.key;
                    const isCorrect = opt.key === practiceQuestions[currentIndex].correct_answer.toUpperCase();

                    let optionStyle = "bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-100/70 hover:border-slate-300";
                    if (showAnswer) {
                      if (isCorrect) {
                        optionStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm";
                      } else if (selected && !isCorrect) {
                        optionStyle = "bg-rose-50 border-rose-400 text-rose-950 font-bold";
                      }
                    } else if (selected) {
                      optionStyle = "bg-blue-50/80 border-blue-500 text-blue-950 font-bold";
                    }

                    return (
                      <button
                        key={opt.key}
                        disabled={showAnswer}
                        onClick={() => selectAnswer(opt.key)}
                        className={`w-full flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all cursor-pointer ${optionStyle}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                            showAnswer && isCorrect
                              ? "bg-emerald-600 text-white"
                              : showAnswer && selected && !isCorrect
                              ? "bg-rose-600 text-white"
                              : "bg-white border border-slate-200 text-slate-700"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1 font-bengali">
                          <MathText text={opt.text} />
                        </span>
                        {showAnswer && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                        {showAnswer && selected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Explanation Card */}
                <AnimatePresence>
                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-4 border-t border-slate-100 space-y-3"
                    >
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs sm:text-sm leading-relaxed font-bengali">
                        <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                          💡 Explanation:
                        </p>
                        {(() => {
                          const currQ = practiceQuestions[currentIndex];
                          const ans = (currQ.correct_answer || '').toUpperCase().trim();
                          const correctText = ans === 'A' ? currQ.option_a : ans === 'B' ? currQ.option_b : ans === 'C' ? currQ.option_c : ans === 'D' ? currQ.option_d : null;
                          return (
                            <div className="text-emerald-700 font-bold mb-2 flex items-center flex-wrap gap-1.5">
                              <span>✓ Correct Answer: ({ans})</span>
                              {correctText && (
                                <span className="font-semibold text-emerald-950">
                                  <MathText text={correctText} formatBullets={false} />
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {practiceQuestions[currentIndex].explanation ? (
                          <MathText text={practiceQuestions[currentIndex].explanation!} />
                        ) : (
                          <p className="text-slate-500 text-xs font-sans">Standard textbook solution applies for this topic.</p>
                        )}
                      </div>

                      <Button
                        onClick={nextQuestion}
                        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm cursor-pointer"
                      >
                        <span>{currentIndex < practiceQuestions.length - 1 ? "Next Question" : "Complete Practice"}</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
              FINISHED / SCORE SCREEN
              ═══════════════════════════════════════════════════════════════ */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900">Practice Completed!</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Topic: <span className="font-semibold text-slate-800 font-bengali">{selectedTopic || selectedSubject}</span>
                </p>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                  <p className="text-2xl font-black text-slate-900">{correct}/{total}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Score</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                  <p className="text-2xl font-black text-blue-600">{accuracy}%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Accuracy</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                  <p className="text-2xl font-black text-emerald-600">{elapsedSeconds}s</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Time Spent</p>
                </div>
              </div>

              {/* Action Recommendation */}
              <div className="bg-blue-50/70 rounded-2xl p-4 sm:p-5 border border-blue-100 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Recommendation:</span>
                </div>
                <p className="text-xs text-blue-950 leading-relaxed">
                  {accuracy >= 80
                    ? "Great job! You have strong command over this topic. Try practicing another chapter or take a full mock test."
                    : `You scored ${accuracy}%. Missed questions are saved to your Mistakes Notebook so you can review and improve.`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                <Button
                  onClick={startPractice}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-4 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Practice Again</span>
                </Button>
                <Button
                  onClick={() => setIsPracticing(false)}
                  variant="outline"
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold h-10 px-4 cursor-pointer"
                >
                  Change Topic
                </Button>
                <Button
                  onClick={() => navigate("/student/mistakes")}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 cursor-pointer"
                >
                  View Mistakes
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </StudentLayout>
  );
};

export default SubjectPractice;
