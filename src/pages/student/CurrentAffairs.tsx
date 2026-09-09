import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/student/StudentLayout";
import {
  Search,
  Sparkles,
  Bookmark,
  Share2,
  Clock,
  ArrowRight,
  CheckCircle2,
  Globe,
  BookOpen,
  Play,
  RotateCcw,
  Zap,
  Target,
  Flame,
  Award,
  Layers,
  FileCheck2,
  ChevronRight,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BengaliText } from "@/components/ui/PracticeKoroDesignSystem";
import InteractiveDrillRunner from "@/components/student/InteractiveDrillRunner";
import {
  CURRENT_AFFAIRS_MOCK_TESTS,
  CurrentAffairsMockTest,
  ALL_CURRENT_AFFAIRS_QUESTIONS,
} from "@/data/currentAffairsTests";
import { DrillConfig, DrillQuestion } from "@/types/drills";
import {
  CurrentAffairsArticle,
  INITIAL_CURRENT_AFFAIRS,
  fetchCurrentAffairs
} from "@/services/currentAffairsService";

const articleCategoryList = [
  "All",
  "West Bengal",
  "National",
  "International",
  "Economy",
  "Science & Tech",
  "Sports"
] as const;

const testCategoryFilters = [
  { id: "all", label: "All Tests (সমস্ত টেস্ট)", icon: Layers },
  { id: "daily", label: "Daily Speed Tests (দৈনিক)", icon: Zap },
  { id: "wb_special", label: "West Bengal Special (পশ্চিমবঙ্গ)", icon: Target },
  { id: "monthly", label: "Monthly Mega (মেগা মক)", icon: Award },
  { id: "science_tech", label: "Science & Space (বিজ্ঞান)", icon: Sparkles },
  { id: "sports", label: "Sports & Awards (খেলাধুলা)", icon: Flame },
  { id: "economy", label: "Economy & Summits (অর্থনীতি)", icon: Globe },
] as const;

export default function CurrentAffairs() {
  const navigate = useNavigate();

  // Primary Tab: "tests" (Mock Tests) or "digest" (Articles)
  const [activeTab, setActiveTab] = useState<"tests" | "digest">("tests");

  // Test Runner State
  const [activeDrillConfig, setActiveDrillConfig] = useState<DrillConfig | null>(null);
  const [activeDrillQuestions, setActiveDrillQuestions] = useState<DrillQuestion[]>([]);
  const [selectedTestFilter, setSelectedTestFilter] = useState<string>("all");

  // Saved Attempts state (stores completed scores for tests)
  const [completedScores, setCompletedScores] = useState<Record<string, { score: number; total: number; date: string }>>(() => {
    try {
      const saved = localStorage.getItem("ca_completed_tests");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Articles state
  const [timeFilter, setTimeFilter] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<CurrentAffairsArticle[]>(INITIAL_CURRENT_AFFAIRS);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("ca_bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    fetchCurrentAffairs().then(data => {
      if (data && data.length > 0) {
        setArticles(data);
      }
    });

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CurrentAffairsArticle[]>;
      if (customEvent.detail) {
        setArticles(customEvent.detail);
      }
    };
    window.addEventListener("current_affairs_updated", handleUpdate);
    return () => {
      window.removeEventListener("current_affairs_updated", handleUpdate);
    };
  }, []);

  // Filtered Mock Tests
  const filteredMockTests = useMemo(() => {
    if (selectedTestFilter === "all") return CURRENT_AFFAIRS_MOCK_TESTS;
    return CURRENT_AFFAIRS_MOCK_TESTS.filter(t => t.category === selectedTestFilter);
  }, [selectedTestFilter]);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter(item => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        item.titleBn.toLowerCase().includes(query) ||
        item.titleEn.toLowerCase().includes(query) ||
        item.summaryBn.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  // Start a specific Current Affairs Mock Test
  const handleStartTest = (test: CurrentAffairsMockTest) => {
    const config: DrillConfig = {
      title: test.titleBn,
      subtitle: `${test.questionCount}টি প্রশ্ন • ${test.durationMinutes} মিনিট • নেগেটিভ মার্কিং ০.২৫`,
      examName: test.targetExams,
      subject: "Current Affairs",
      questionCount: test.questions.length,
      timeLimitMinutes: test.durationMinutes,
      negativeMarks: test.negativeMarks,
      marksPerQuestion: 1,
      mode: "timed_quiz",
    };
    setActiveDrillQuestions(test.questions);
    setActiveDrillConfig(config);
  };

  // Launch a 5-MCQ Quick Booster Drill
  const handleStartQuickBooster = () => {
    const shuffled = [...ALL_CURRENT_AFFAIRS_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 5);
    const config: DrillConfig = {
      title: "কারেন্ট অ্যাফেয়ার্স কুইক বুস্টার টেস্ট",
      subtitle: "৫টি দ্রুত প্রশ্ন • ৫ মিনিট • তাৎক্ষণিক সমাধান",
      examName: "WBCS • WBP • Clerkship",
      subject: "Current Affairs",
      questionCount: 5,
      timeLimitMinutes: 5,
      negativeMarks: 0.25,
      marksPerQuestion: 1,
      mode: "timed_quiz",
    };
    setActiveDrillQuestions(shuffled);
    setActiveDrillConfig(config);
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info("Removed from saved current affairs");
      } else {
        next.add(id);
        toast.success("Saved to your reading list!");
      }
      localStorage.setItem("ca_bookmarks", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleShare = async (article: CurrentAffairsArticle) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.titleEn,
          text: `${article.titleBn} - PracticeKoro Current Affairs`,
          url: window.location.href,
        });
      } catch (err) {
        // Ignored share cancel
      }
    } else {
      navigator.clipboard.writeText(`${article.titleBn} - ${window.location.href}`);
      toast.success("Link copied to clipboard!");
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "West Bengal":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "National":
        return "bg-blue-50 text-blue-700 border-blue-200/60";
      case "International":
        return "bg-purple-50 text-purple-700 border-purple-200/60";
      case "Economy":
        return "bg-amber-50 text-amber-700 border-amber-200/60";
      case "Science & Tech":
        return "bg-cyan-50 text-cyan-700 border-cyan-200/60";
      case "Sports":
        return "bg-rose-50 text-rose-700 border-rose-200/60";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-5 sm:space-y-6 pb-20 max-w-4xl mx-auto px-1 sm:px-2">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2.5 rounded-2xl bg-blue-500/10 text-[#0066FF] border border-blue-100 shadow-2xs">
                <Globe className="w-5 h-5 text-[#0066FF]" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight font-display flex items-center gap-2">
                  <span>Current Affairs</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#0066FF] border border-blue-200/80 font-bold uppercase tracking-wider">
                    Mock Tests
                  </span>
                </h1>
                <BengaliText className="text-xs text-slate-500 font-medium">
                  পশ্চিমবঙ্গ ও সর্বভারতীয় চাকরির পরীক্ষার জন্য দৈনিক ও বিষয়ভিত্তিক স্পিড টেস্ট
                </BengaliText>
              </div>
            </div>

            {/* Study Navigation Switcher: Study Notes | Current Affairs */}
            <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/60 shadow-2xs mt-2">
              <button
                onClick={() => navigate("/student/notes")}
                className="px-3.5 py-1 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Study Notes
              </button>
              <button
                className="px-3.5 py-1 rounded-xl text-xs font-bold bg-white text-[#0066FF] shadow-2xs"
              >
                Current Affairs & GK
              </button>
            </div>
          </div>

          {/* Tab Switcher: Mock Tests vs Study Digest */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start sm:self-auto shadow-2xs">
            <button
              onClick={() => setActiveTab("tests")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "tests"
                  ? "bg-[#0066FF] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>মক টেস্ট ({CURRENT_AFFAIRS_MOCK_TESTS.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("digest")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "digest"
                  ? "bg-[#0066FF] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>স্টাডি ডাইজেস্ট ({articles.length})</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: MOCK TESTS (DEFAULT & USER REQUESTED FOCUS) */}
        {/* ---------------------------------------------------- */}
        {activeTab === "tests" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Featured Live Daily CA Speed Test Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] text-white p-5 sm:p-6 shadow-xl border border-slate-800">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-black uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Live Today
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold">
                      ১০টি প্রশ্ন • ১০ মিনিট
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                      নেগেটিভ মার্কিং -০.২৫
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl md:text-2xl font-black font-display text-white tracking-tight leading-snug">
                    Daily Current Affairs Speed Test
                  </h2>

                  <BengaliText className="text-xs sm:text-sm text-slate-300 leading-relaxed block">
                    পশ্চিমবঙ্গ সরকারের নতুন প্রকল্প, জাতীয় নিয়োগ, মহাকাশ অভিযান ও সাম্প্রতিক আলোচিত বিষয় থেকে বাছাই করা ১০টি এমসিকিউ দিয়ে নিজের স্কোর যাচাই করুন।
                  </BengaliText>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>বাংলা ও ইংরেজি দ্বিভাষিক প্রশ্ন • বিস্তারিত সমাধান ও শর্টকাট নোট</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                  <button
                    onClick={() => handleStartTest(CURRENT_AFFAIRS_MOCK_TESTS[0])}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>লাইভ টেস্ট শুরু করুন</span>
                  </button>

                  <button
                    onClick={handleStartQuickBooster}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 active:scale-95 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>কুইক ৫-MCQ বুস্টার</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test Category Filter Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                <span>ফিল্টার অনুযায়ী মক টেস্ট বেছে নিন:</span>
                <span>{filteredMockTests.length}টি টেস্ট উপলব্ধ</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {testCategoryFilters.map(filter => {
                  const active = selectedTestFilter === filter.id;
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedTestFilter(filter.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                        active
                          ? "bg-[#0066FF] text-white border-[#0066FF] shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{filter.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mock Tests Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMockTests.map((test, index) => {
                const pastScore = completedScores[test.id];

                return (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* Top Badge & Duration */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg ${test.badgeColor} shadow-2xs`}>
                          {test.badge}
                        </span>

                        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {test.durationMinutes} মিনিট
                          </span>
                          <span>•</span>
                          <span className="text-slate-600">
                            {test.questionCount}টি প্রশ্ন
                          </span>
                        </div>
                      </div>

                      {/* Titles */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 font-display group-hover:text-[#0066FF] transition-colors">
                          {test.titleBn}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {test.title}
                        </p>
                      </div>

                      {/* Subtitle / Key topics */}
                      <p className="text-xs text-slate-600 font-bengali leading-relaxed bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                        {test.subtitleBn}
                      </p>

                      {/* Stats Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          মোট নম্বর: {test.totalMarks}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                          নেগেটিভ: ০.২৫
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {test.categoryLabelBn}
                        </span>
                      </div>
                    </div>

                    {/* Footer: Target Exams & Action Button */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-[170px] sm:max-w-[200px]" title={test.targetExams}>
                        🎯 {test.targetExams}
                      </div>

                      <button
                        onClick={() => handleStartTest(test)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Test</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick Practice Bottom Banner */}
            <div className="p-4 sm:p-5 rounded-3xl bg-blue-50/80 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-white text-[#0066FF] shadow-2xs shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    ভুল উত্তরগুলো পুনরায় রিভিশন দিন
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    টেস্টে ভুল হওয়া সমস্ত প্রশ্ন স্বয়ংক্রিয়ভাবে আপনার ভুল খাতায় (Mistakes Notebook) সংরক্ষিত হয়।
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/student/mistakes")}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs shadow-2xs whitespace-nowrap active:scale-95 transition-all"
              >
                ভুল খাতা খুলুন
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: STUDY DIGEST / ARTICLES (PRESERVED READING)  */}
        {/* ---------------------------------------------------- */}
        {activeTab === "digest" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search & Category Filter Section */}
            <div className="space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by topic, state, exam or keyword (e.g. ISRO, WBCS, WB Govt)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {articleCategoryList.map(cat => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                        active
                          ? "bg-[#0066FF] text-white border-[#0066FF] shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Affairs Articles Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                <span>Showing {filteredArticles.length} updates</span>
                <span>WB & National Exam Focused</span>
              </div>

              {filteredArticles.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No articles found</p>
                  <p className="text-xs text-slate-400 mt-1">Try changing your category or search keyword</p>
                </div>
              ) : (
                filteredArticles.map(article => {
                  const isSaved = bookmarkedIds.has(article.id);
                  return (
                    <motion.article
                      key={article.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-4"
                    >
                      {/* Card Meta Top */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${getCategoryBadgeColor(
                              article.category
                            )}`}
                          >
                            {article.category}
                          </span>
                          {article.isImportant && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              High Yield
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{article.date}</span>
                          <span>•</span>
                          <span>{article.readTime}</span>
                        </div>
                      </div>

                      {/* Headlines */}
                      <div className="space-y-1.5">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug font-display">
                          {article.titleBn}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {article.titleEn}
                        </p>
                      </div>

                      {/* Bullet Points / Exam Takeaways */}
                      <div className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-100 space-y-2">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0066FF]" />
                          পরীক্ষার জন্য মূল তথ্য (Exam Key Points)
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {article.bulletPoints.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Card Bottom: Exam Relevance & Actions */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">Target Exams:</span>
                          <span className="text-[#0066FF] font-semibold">{article.examRelevance}</span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => toggleBookmark(article.id)}
                            className={`p-2 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 ${
                              isSaved
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                            title="Save to reading list"
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-500 text-amber-500" : ""}`} />
                            <span className="text-[11px]">{isSaved ? "Saved" : "Save"}</span>
                          </button>

                          <button
                            onClick={() => handleShare(article)}
                            className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all text-xs font-semibold flex items-center gap-1.5"
                            title="Share article"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Share</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab("tests");
                              handleStartTest(CURRENT_AFFAIRS_MOCK_TESTS[0]);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#0066FF] border border-blue-200/80 hover:bg-blue-100/70 transition-all text-[11px] font-bold flex items-center gap-1"
                          >
                            Practice Mock Test
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* INTERACTIVE DRILL RUNNER MODAL                       */}
        {/* ---------------------------------------------------- */}
        {activeDrillConfig && (
          <InteractiveDrillRunner
            config={activeDrillConfig}
            questions={activeDrillQuestions}
            onClose={() => {
              setActiveDrillConfig(null);
              setActiveDrillQuestions([]);
            }}
          />
        )}
      </div>
    </StudentLayout>
  );
}
