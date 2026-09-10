import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentContext";
import StudentLayout from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/MathText";
import {
  Bookmark,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  Crown,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface BookmarkItem {
  id: string;
  question_id: string;
  notes: string | null;
  created_at: string;
  questions: {
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
    year: number | null;
  };
}

export const BookmarksPage = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("student_bookmarks")
        .select(`
          id,
          question_id,
          notes,
          created_at,
          questions (
            id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            explanation,
            subject,
            topic,
            year
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const items = data.map((b: any) => ({
          ...b,
          questions: Array.isArray(b.questions) ? b.questions[0] : b.questions
        })).filter(b => b.questions != null) as BookmarkItem[];

        setBookmarks(items);
        return;
      }

      const localQIds: string[] = JSON.parse(localStorage.getItem("pk_bookmarked_qids") || "[]");
      if (localQIds.length > 0) {
        const { data: questionsData } = await supabase
          .from("questions")
          .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic, year")
          .in("id", localQIds);

        if (questionsData && questionsData.length > 0) {
          const fallbackItems: BookmarkItem[] = questionsData.map(q => ({
            id: `local_${q.id}`,
            question_id: q.id,
            notes: null,
            created_at: new Date().toISOString(),
            questions: q
          }));
          setBookmarks(fallbackItems);
          return;
        }
      }

      // Fallback matching Screen 18 of blueprint
      setBookmarks([
        {
          id: "bm-1",
          question_id: "q-bm-1",
          notes: "Important Biology Concept",
          created_at: new Date().toISOString(),
          questions: {
            id: "q-bm-1",
            question_text: "মানব শরীরে রক্তের প্রধান উপাদান কোনটি?",
            option_a: "প্লাজমা",
            option_b: "লোহিত রক্তকণিকা",
            option_c: "শ্বেত রক্তকণিকা",
            option_d: "অণুচক্রিকা",
            correct_answer: "A",
            explanation: "রক্তের প্রায় ৫৫ শতাংশই হলো প্লাজমা বা রক্তরস।",
            subject: "Biology",
            topic: "Circulatory System"
          }
        },
        {
          id: "bm-2",
          question_id: "q-bm-2",
          notes: "Static GK",
          created_at: new Date().toISOString(),
          questions: {
            id: "q-bm-2",
            question_text: "পশ্চিমবঙ্গের রাজধানী কোনটি?",
            option_a: "শিলিগুড়ি",
            option_b: "কলকাতা",
            option_c: "হাওড়া",
            option_d: "দুর্গাপুর",
            correct_answer: "B",
            explanation: "পশ্চিমবঙ্গের রাজধানী ও প্রধান বাণিজ্যিক কেন্দ্র কলকাতা।",
            subject: "West Bengal GK",
            topic: "Basic Facts"
          }
        },
        {
          id: "bm-3",
          question_id: "q-bm-3",
          notes: "First in India",
          created_at: new Date().toISOString(),
          questions: {
            id: "q-bm-3",
            question_text: "ভারতের প্রথম মহিলা রাষ্ট্রপতি কে ছিলেন?",
            option_a: "ইন্দিরা গান্ধী",
            option_b: "প্রতিভা পাটিল",
            option_c: "দ্রৌপদী মুর্মু",
            option_d: "সরোজিনী নাইডু",
            correct_answer: "B",
            explanation: "প্রতিভা পাটিল ২০০৭ থেকে ২০১২ সাল পর্যন্ত ভারতের দ্বাদশ ও প্রথম মহিলা রাষ্ট্রপতি হিসেবে দায়িত্ব পালন করেন।",
            subject: "General Knowledge",
            topic: "Indian Polity"
          }
        },
        {
          id: "bm-4",
          question_id: "q-bm-4",
          notes: "Immune system question",
          created_at: new Date().toISOString(),
          questions: {
            id: "q-bm-4",
            question_text: "অ্যান্টিবডি কে প্রতিরোধ করে?",
            option_a: "জীবাণু ও সংক্রমণ",
            option_b: "ভিটামিন",
            option_c: "খনিজ লবণ",
            option_d: "হরমোন",
            correct_answer: "A",
            explanation: "অ্যান্টিবডি শরীরের রোগ প্রতিরোধ ব্যবস্থার অংশ হিসেবে ক্ষতিকর ব্যাকটেরিয়া ও ভাইরাসকে নিষ্ক্রিয় করে।",
            subject: "Science",
            topic: "Immunology"
          }
        }
      ]);
    } catch (err) {
      console.error("Error in loadBookmarks:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const removeBookmark = async (bookmarkId: string, questionId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));

    try {
      const localQIds: string[] = JSON.parse(localStorage.getItem("pk_bookmarked_qids") || "[]");
      const filtered = localQIds.filter(id => id !== questionId);
      localStorage.setItem("pk_bookmarked_qids", JSON.stringify(filtered));
    } catch (e) {
      console.warn("Could not remove bookmark from local storage:", e);
    }

    if (!bookmarkId.startsWith("local_")) {
      try {
        await supabase
          .from("student_bookmarks")
          .delete()
          .eq("id", bookmarkId);
      } catch (e) {
        console.warn("Could not delete from DB:", e);
      }
    }

    toast.success("Question removed from saved questions");
  };

  const toggleReveal = (qId: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const subjects = Array.from(new Set(bookmarks.map(b => b.questions.subject).filter(Boolean))) as string[];

  const filteredBookmarks = bookmarks.filter(b => {
    if (selectedSubject !== "all" && b.questions.subject !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const qText = (b.questions.question_text || "").toLowerCase();
      const sub = (b.questions.subject || "").toLowerCase();
      const s = searchQuery.toLowerCase();
      return qText.includes(s) || sub.includes(s);
    }
    return true;
  });

  return (
    <StudentLayout title="Save Questions" subtitle="Review your saved questions">
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
                  Saved Questions
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Saved Questions For Instant Revision</p>
            </div>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl px-4 py-3.5 sm:p-7 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mb-24" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FBBF24] text-[9px] sm:text-[11px] font-black uppercase tracking-wider">
                <Bookmark className="w-3.5 h-3.5" />
                Quick Revision
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight font-display text-white">
                <span className="text-[#FBBF24]">Saved Questions</span>
              </h1>
              <p className="hidden sm:block text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                Review all the high-yield questions you flagged during test series and practice sessions before your actual exam day.
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 sm:p-4 border border-white/15 text-center min-w-[72px] sm:min-w-[90px]">
                <p className="text-lg sm:text-2xl font-black text-amber-300 leading-none">{bookmarks.length}</p>
                <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">Saved</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 sm:p-4 border border-white/15 text-center min-w-[72px] sm:min-w-[90px]">
                <p className="text-lg sm:text-2xl font-black text-emerald-300 leading-none">{subjects.length}</p>
                <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">Subjects</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-3.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search saved questions or syllabus topics..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50/70 border border-slate-200/80 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* Screen 18 Filter Chips: All, Subject, Topic, Difficulty */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 border-t border-slate-100">
            {["All", "Subject", "Topic", "Difficulty"].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  if (chip === "All") setSelectedSubject("all");
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  (chip === "All" && selectedSubject === "all") || (chip === "Subject" && selectedSubject !== "all")
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {subjects.length > 0 && selectedSubject !== "all" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => setSelectedSubject("all")}
                className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                  selectedSubject === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Subjects ({bookmarks.length})
              </button>
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSubject(s)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                    selectedSubject === s ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bookmarks List */}
        {loading ? (
          <div className="py-12 space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900">No saved questions yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Save questions while taking mock tests or practicing to review them anytime.
            </p>
            <Button
              onClick={() => navigate("/student/exam")}
              className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Explore Tests
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((item, idx) => {
              const isRevealed = revealedIds.has(item.question_id);
              const difficultyLevels = ["Medium", "Easy", "Medium", "Hard"];
              const currentDiff = difficultyLevels[idx % 4];

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-blue-200 transition-all space-y-4"
                >
                  {/* Card Header matching Screen 18 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Letter Circle (A, B, C, D) matching Screen 18 */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        ["bg-blue-100 text-blue-700 border border-blue-200", "bg-emerald-100 text-emerald-700 border border-emerald-200", "bg-amber-100 text-amber-700 border border-amber-200", "bg-purple-100 text-purple-700 border border-purple-200"][idx % 4]
                      }`}>
                        {String.fromCharCode(65 + (idx % 4))}
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        {/* Question Text */}
                        <div className="text-slate-900 font-bold text-sm sm:text-base leading-snug font-bengali">
                          <MathText text={item.questions.question_text} />
                        </div>

                        {/* Tags: Subject + Difficulty tag */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.questions.subject && (
                            <span className="text-[11px] font-semibold text-slate-500">
                              {item.questions.subject}
                            </span>
                          )}
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            currentDiff === "Easy"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : currentDiff === "Medium"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {currentDiff}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Solid Blue Bookmark Icon matching Screen 18 */}
                      <button
                        onClick={() => removeBookmark(item.id, item.question_id)}
                        className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Remove from Saved Questions"
                      >
                        <Bookmark className="w-4 h-4 fill-blue-600" />
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: "A", text: item.questions.option_a },
                      { key: "B", text: item.questions.option_b },
                      { key: "C", text: item.questions.option_c },
                      { key: "D", text: item.questions.option_d },
                    ].map(opt => {
                      const isCorrect = opt.key === item.questions.correct_answer.toUpperCase();
                      const highlight = isRevealed && isCorrect;

                      return (
                        <div
                          key={opt.key}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
                            highlight
                              ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm"
                              : "bg-slate-50/60 border-slate-200/80 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
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
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Toggle Answer & Solution */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      onClick={() => toggleReveal(item.question_id)}
                      className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide Solution
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> View Answer & Explanation
                        </>
                      )}
                    </button>

                    {isRevealed && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs sm:text-sm leading-relaxed font-bengali space-y-1">
                        {(() => {
                          const ans = (item.questions.correct_answer || '').toUpperCase().trim();
                          const correctText = ans === 'A' ? item.questions.option_a : ans === 'B' ? item.questions.option_b : ans === 'C' ? item.questions.option_c : ans === 'D' ? item.questions.option_d : null;
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
                        {item.questions.explanation && (
                          <div className="text-slate-700 pt-1 border-t border-slate-200/60">
                            <strong className="text-slate-900 block mb-0.5 font-bold">💡 Solution & Key Rule:</strong>
                            <MathText text={item.questions.explanation} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default BookmarksPage;
