import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/student/StudentLayout";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";
import { useStudentAuth } from "@/contexts/StudentContext";
import { useSubjects, useMockTests, useUserAttempts } from "@/hooks/useStudentData";
import { Subject, MockTest } from "@/services/examService";
import { initRazorpayPayment } from "@/utils/payment";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ChevronDown,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Target,
  FileText,
  Search,
  X,
  Lock,
  Flame,
  GraduationCap,
  History,
  Globe2,
  ShieldCheck,
  Atom,
  FlaskConical,
  Calculator,
  Brain,
  Languages,
  Zap,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Calendar,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface TopicItem {
  id: string;
  name: string;
  subject_id: string;
  category?: string | null;
  order_index?: number | null;
}

// Visual metadata for subjects
interface SubjectMeta {
  bengaliName: string;
  icon: any;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  badgeBg: string;
}

const SUBJECT_METAS: Record<string, SubjectMeta> = {
  history: {
    bengaliName: "ভারতের ইতিহাস",
    icon: History,
    accentBg: "bg-amber-500",
    accentText: "text-amber-700",
    accentBorder: "border-amber-200",
    badgeBg: "bg-amber-50",
  },
  geography: {
    bengaliName: "ভূগোল ও পরিবেশ",
    icon: Globe2,
    accentBg: "bg-teal-500",
    accentText: "text-teal-700",
    accentBorder: "border-teal-200",
    badgeBg: "bg-teal-50",
  },
  "indian polity": {
    bengaliName: "সংবিধান ও রাষ্ট্রব্যবস্থা",
    icon: ShieldCheck,
    accentBg: "bg-blue-600",
    accentText: "text-blue-700",
    accentBorder: "border-blue-200",
    badgeBg: "bg-blue-50",
  },
  biology: {
    bengaliName: "জীবনবিজ্ঞান",
    icon: Atom,
    accentBg: "bg-emerald-500",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-200",
    badgeBg: "bg-emerald-50",
  },
  chemistry: {
    bengaliName: "রসায়নবিজ্ঞান",
    icon: FlaskConical,
    accentBg: "bg-purple-500",
    accentText: "text-purple-700",
    accentBorder: "border-purple-200",
    badgeBg: "bg-purple-50",
  },
  physics: {
    bengaliName: "পদার্থবিজ্ঞান",
    icon: Atom,
    accentBg: "bg-cyan-500",
    accentText: "text-cyan-700",
    accentBorder: "border-cyan-200",
    badgeBg: "bg-cyan-50",
  },
  arithmetic: {
    bengaliName: "পাটিগণিত ও অঙ্ক",
    icon: Calculator,
    accentBg: "bg-indigo-500",
    accentText: "text-indigo-700",
    accentBorder: "border-indigo-200",
    badgeBg: "bg-indigo-50",
  },
  mathematics: {
    bengaliName: "পাটিগণিত ও অঙ্ক",
    icon: Calculator,
    accentBg: "bg-indigo-500",
    accentText: "text-indigo-700",
    accentBorder: "border-indigo-200",
    badgeBg: "bg-indigo-50",
  },
  reasoning: {
    bengaliName: "লজিক্যাল রিজনিং",
    icon: Brain,
    accentBg: "bg-violet-500",
    accentText: "text-violet-700",
    accentBorder: "border-violet-200",
    badgeBg: "bg-violet-50",
  },
  "general english": {
    bengaliName: "ইংরেজি ভাষা ও গ্রামার",
    icon: Languages,
    accentBg: "bg-rose-500",
    accentText: "text-rose-700",
    accentBorder: "border-rose-200",
    badgeBg: "bg-rose-50",
  },
  english: {
    bengaliName: "ইংরেজি ভাষা ও গ্রামার",
    icon: Languages,
    accentBg: "bg-rose-500",
    accentText: "text-rose-700",
    accentBorder: "border-rose-200",
    badgeBg: "bg-rose-50",
  },
  "general awareness": {
    bengaliName: "সাধারণ জ্ঞান (Static GK)",
    icon: GraduationCap,
    accentBg: "bg-sky-500",
    accentText: "text-sky-700",
    accentBorder: "border-sky-200",
    badgeBg: "bg-sky-50",
  },
  "current affairs": {
    bengaliName: "সাম্প্রতিক ঘটনা",
    icon: Flame,
    accentBg: "bg-orange-500",
    accentText: "text-orange-700",
    accentBorder: "border-orange-200",
    badgeBg: "bg-orange-50",
  },
  "bangla literature": {
    bengaliName: "বাংলা সাহিত্য ও ব্যাকরণ",
    icon: BookOpen,
    accentBg: "bg-pink-500",
    accentText: "text-pink-700",
    accentBorder: "border-pink-200",
    badgeBg: "bg-pink-50",
  },
  bengali: {
    bengaliName: "বাংলা সাহিত্য ও ব্যাকরণ",
    icon: BookOpen,
    accentBg: "bg-pink-500",
    accentText: "text-pink-700",
    accentBorder: "border-pink-200",
    badgeBg: "bg-pink-50",
  },
};

function getSubjectMeta(subjectName: string): SubjectMeta {
  const key = (subjectName || "").trim().toLowerCase();
  if (SUBJECT_METAS[key]) return SUBJECT_METAS[key];
  for (const [k, meta] of Object.entries(SUBJECT_METAS)) {
    if (key.includes(k) || k.includes(key)) return meta;
  }
  return {
    bengaliName: subjectName,
    icon: BookOpen,
    accentBg: "bg-blue-600",
    accentText: "text-blue-700",
    accentBorder: "border-blue-200",
    badgeBg: "bg-blue-50",
  };
}

// Check if test matches a topic name
function matchesTopic(testTitle: string, topicName: string): boolean {
  if (!testTitle || !topicName) return false;
  const cleanTitle = testTitle.toLowerCase().replace(/[\s\-_0-9()part]+/gi, "");
  const cleanTopic = topicName.toLowerCase().replace(/[\s\-_0-9()]+/gi, "");
  if (!cleanTitle || !cleanTopic) return false;
  return cleanTitle.includes(cleanTopic) || cleanTopic.includes(cleanTitle);
}

export const PracticeHub = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasSubscription, subscriptionFee, refreshSubscription } = useStudentAuth();

  // Queries from React Query / Supabase
  const { data: subjects = [], isLoading: loadingSubjects } = useSubjects();
  const { data: mockTests = [], isLoading: loadingTests } = useMockTests();
  const { data: testAttempts = {}, isLoading: loadingAttempts } = useUserAttempts(user?.id);

  // Local state for topics
  const [allTopics, setAllTopics] = useState<TopicItem[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Selected subject & search filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Modal states
  const [selectedTestForModal, setSelectedTestForModal] = useState<any | null>(null);

  // Fetch topics from database
  useEffect(() => {
    async function loadTopics() {
      try {
        setLoadingTopics(true);
        const { data, error } = await supabase
          .from("topics")
          .select("id, name, subject_id, category, order_index")
          .order("order_index", { ascending: true });

        if (!error && data) {
          setAllTopics(data);
        }
      } catch (err) {
        console.error("Error loading topics:", err);
      } finally {
        setLoadingTopics(false);
      }
    }
    loadTopics();
  }, []);

  // Filter valid question subjects
  const validSubjects = useMemo(() => {
    return (subjects || []).filter((s) => {
      const name = (s.name || "").trim();
      return name.length > 0 && !name.toLowerCase().includes("sample");
    });
  }, [subjects]);

  // Set default active subject based on URL or first available subject
  useEffect(() => {
    if (validSubjects.length === 0) return;

    const urlSubject = searchParams.get("subject");
    if (urlSubject) {
      const matched = validSubjects.find(
        (s) =>
          s.id === urlSubject ||
          s.name.toLowerCase() === urlSubject.toLowerCase() ||
          s.name.toLowerCase().includes(urlSubject.toLowerCase())
      );
      if (matched) {
        setSelectedSubjectId(matched.id);
        return;
      }
    }

    if (!selectedSubjectId && validSubjects.length > 0) {
      setSelectedSubjectId(validSubjects[0].id);
    }
  }, [validSubjects, searchParams, selectedSubjectId]);

  // Current active subject object
  const activeSubject = useMemo(() => {
    return validSubjects.find((s) => s.id === selectedSubjectId) || validSubjects[0] || null;
  }, [validSubjects, selectedSubjectId]);

  // Topics for active subject
  const currentSubjectTopics = useMemo(() => {
    if (!activeSubject) return [];
    return allTopics
      .filter((t) => t.subject_id === activeSubject.id)
      .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
  }, [allTopics, activeSubject]);

  // Chapter-wise mock tests in the database
  const topicWiseTests = useMemo(() => {
    return mockTests.filter((t) => t.test_type === "topic_wise");
  }, [mockTests]);

  // Auto-expand first 3 topics by default
  useEffect(() => {
    if (currentSubjectTopics.length > 0 && expandedTopics.size === 0) {
      const initialSet = new Set<string>();
      currentSubjectTopics.slice(0, 3).forEach((t) => initialSet.add(t.id));
      setExpandedTopics(initialSet);
    }
  }, [currentSubjectTopics, expandedTopics.size]);

  // Map tests to topics for current subject
  const topicTestMap = useMemo(() => {
    const map: Record<string, MockTest[]> = {};
    if (!activeSubject) return map;

    // Tests belonging to this subject
    const subjectTests = topicWiseTests.filter(
      (t) => t.subject_id === activeSubject.id || !t.subject_id
    );

    currentSubjectTopics.forEach((topic) => {
      map[topic.id] = subjectTests.filter((test) =>
        matchesTopic(test.title, topic.name)
      );
    });

    return map;
  }, [activeSubject, topicWiseTests, currentSubjectTopics]);

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return currentSubjectTopics;
    const query = searchQuery.toLowerCase().trim();

    return currentSubjectTopics.filter((topic) => {
      const nameMatch = topic.name.toLowerCase().includes(query);
      const tests = topicTestMap[topic.id] || [];
      const testMatch = tests.some((t) => t.title.toLowerCase().includes(query));
      return nameMatch || testMatch;
    });
  }, [currentSubjectTopics, searchQuery, topicTestMap]);

  // Pagination State (5 topics per page)
  const TOPICS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page to 1 when active subject or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubjectId, searchQuery]);

  const totalPages = Math.ceil(filteredTopics.length / TOPICS_PER_PAGE);

  const paginatedTopics = useMemo(() => {
    const startIndex = (currentPage - 1) * TOPICS_PER_PAGE;
    return filteredTopics.slice(startIndex, startIndex + TOPICS_PER_PAGE);
  }, [filteredTopics, currentPage]);

  const getVisiblePageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  // Handle accordion toggle
  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  // Subject Question Count: from DB questions table, mock_tests, or chapter drills
  const [dbQuestionCount, setDbQuestionCount] = useState<number | null>(null);

  useEffect(() => {
    if (!activeSubject) return;
    let isMounted = true;

    async function loadSubjectQuestions() {
      try {
        const { count, error } = await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .or(`subject_id.eq.${activeSubject.id},subject.ilike.%${activeSubject.name}%`);

        if (!error && typeof count === "number" && count > 0) {
          if (isMounted) setDbQuestionCount(count);
          return;
        }
      } catch (err) {
        // Ignore RLS or network errors
      }
      if (isMounted) setDbQuestionCount(null);
    }

    loadSubjectQuestions();
    return () => {
      isMounted = false;
    };
  }, [activeSubject]);

  const subjectTotalQuestions = useMemo(() => {
    if (!activeSubject) return 0;

    // 1. If DB questions table has count for this subject, prioritize it
    if (dbQuestionCount && dbQuestionCount > 0) {
      return dbQuestionCount;
    }

    // 2. Calculate from mock_tests for this subject
    const uniqueTestIds = new Set<string>();
    let testMarksSum = 0;

    // From topic-mapped tests
    Object.values(topicTestMap).forEach((tests) => {
      tests.forEach((t) => {
        if (!uniqueTestIds.has(t.id)) {
          uniqueTestIds.add(t.id);
          testMarksSum += (t.total_marks || 10);
        }
      });
    });

    // From all topic_wise tests matching active subject ID
    topicWiseTests
      .filter((t) => t.subject_id === activeSubject.id)
      .forEach((t) => {
        if (!uniqueTestIds.has(t.id)) {
          uniqueTestIds.add(t.id);
          testMarksSum += (t.total_marks || 10);
        }
      });

    if (testMarksSum > 0) {
      return testMarksSum;
    }

    // 3. Fallback: each available chapter has 10 practice questions
    if (currentSubjectTopics.length > 0) {
      return currentSubjectTopics.length * 10;
    }

    return 0;
  }, [activeSubject, dbQuestionCount, topicTestMap, topicWiseTests, currentSubjectTopics]);


  // Pro plan upgrade handler
  const handleProPlanClick = async () => {
    if (hasSubscription) {
      toast.success("Pro Plan Active! 👑", {
        description: "You have full unlimited access to all tests.",
      });
      return;
    }

    try {
      await initRazorpayPayment({
        amount: subscriptionFee,
        contentId: "site_yearly_subscription",
        contentType: "subscription" as any,
        title: "Yearly Pro Plan",
      });
      await refreshSubscription();
      toast.success("Pro Plan Activated!");
    } catch (err: any) {
      if (err?.message !== "Payment cancelled") {
        toast.info("Pro Plan Upgrade", {
          description: err.message || "Opening upgrade portal...",
        });
      }
    }
  };

  // Open TestDetailsModal for chapter mock test
  const handleOpenChapterTestModal = (topic: TopicItem) => {
    if (!activeSubject) return;
    setSelectedTestForModal({
      id: `topic-${topic.id}`,
      title: `${topic.name} অধ্যায় মক টেস্ট 01`,
      examName: activeSubject.name,
      totalQuestions: 15,
      durationMinutes: 15,
      totalMarks: 15,
      negativeMarking: "-0.25",
      isPaid: false,
      language: "Bengali & English",
      attemptsAllowed: "Unlimited",
      validity: "1 Year",
    });
  };

  // Summary counts
  const totalChaptersCount = allTopics.length;
  const attemptedCount = Object.keys(testAttempts).length;
  const currentSubjectMeta = activeSubject ? getSubjectMeta(activeSubject.name) : null;
  const ActiveIcon = currentSubjectMeta?.icon || BookOpen;

  const loading = loadingSubjects || loadingTopics || loadingTests;

  if (loading) {
    return (
      <StudentLayout title="Practice" subtitle="Chapter-wise Mock Tests">
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4">
          <div className="h-14 bg-slate-200/60 rounded-2xl animate-pulse" />
          <div className="h-16 bg-slate-200/60 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200/60 rounded-3xl animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Practice" subtitle="Subject & Chapter-wise Mock Tests">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-5 pb-20 md:pb-10 space-y-4 sm:space-y-5">

        {/* ═══════════════════════════════════════════════════════════════
            1. PAGE HERO HEADER & SEARCH
            ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-slate-900 via-[#0F172A] to-[#1E293B] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 text-white shadow-xl shadow-slate-900/15 relative overflow-hidden">
          {/* Subtle Ambient Background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -mb-20" />

          <div className="relative z-10 space-y-3 sm:space-y-4">
            {/* Top row: Badges + Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] sm:text-[11px] font-bold max-w-full">
                  <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">অধ্যায়ভিত্তিক মক টেস্ট সিরিজ</span>
                  <span className="hidden sm:inline text-blue-300/80">• Chapter-wise Mock Tests</span>
                </div>
                <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-white mt-1 sm:mt-1.5 leading-snug">
                  বিষয় ও অধ্যায়ভিত্তিক মক টেস্ট
                </h1>
                <p className="text-[11px] sm:text-sm text-slate-300/90 mt-0.5 sm:mt-1 max-w-xl leading-relaxed">
                  প্রতিটি বিষয়ের সিলেবাস অনুযায়ী অধ্যায়ভিত্তিক মক টেস্ট দিয়ে নিজের প্রস্তুতি ঝালিয়ে নিন।
                </p>
              </div>

              {/* Quick Stat Counter Pills - 3-col grid on mobile, flex on desktop */}
              <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 pt-0.5 sm:pt-0">
                <div className="px-2 sm:px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs text-center">
                  <span className="text-xs sm:text-sm font-black text-white">{validSubjects.length}</span>
                  <span className="text-[10px] text-slate-300 font-medium ml-1">বিষয়</span>
                </div>
                <div className="px-2 sm:px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs text-center">
                  <span className="text-xs sm:text-sm font-black text-emerald-400">{totalChaptersCount}</span>
                  <span className="text-[10px] text-slate-300 font-medium ml-1">অধ্যায়</span>
                </div>
                <div className="px-2 sm:px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs text-center">
                  <span className="text-xs sm:text-sm font-black text-blue-400">{attemptedCount}</span>
                  <span className="text-[10px] text-slate-300 font-medium ml-1">সম্পন্ন</span>
                </div>
              </div>
            </div>

            {/* Live Chapter Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="অধ্যায় বা টপিক খুঁজুন (যেমন: বৈদিক যুগ, সিন্ধু সভ্যতা)..."
                className="w-full pl-9 sm:pl-10 pr-9 py-2 sm:py-2.5 bg-white/95 text-slate-900 placeholder:text-slate-400 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            2. SUBJECT SELECTION PILLS (Horizontal Scrollable on Mobile)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500">
              বিষয় নির্বাচন করুন (Select Subject)
            </h2>
            <span className="text-[11px] font-bold text-blue-600">
              {validSubjects.length} টি বিষয় উপলব্ধ
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {validSubjects.map((subj) => {
              const meta = getSubjectMeta(subj.name);
              const SubjIcon = meta.icon;
              const isSelected = subj.id === selectedSubjectId;
              const topicCount = allTopics.filter((t) => t.subject_id === subj.id).length;

              return (
                <button
                  key={subj.id}
                  onClick={() => {
                    setSelectedSubjectId(subj.id);
                    setSearchParams({ subject: subj.name });
                  }}
                  className={`shrink-0 flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-[#0066FF] text-white border-[#0066FF] shadow-md shadow-blue-500/25 active:scale-98"
                      : "bg-white text-slate-700 border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-white/20 text-white" : `${meta.badgeBg} ${meta.accentText}`
                    }`}
                  >
                    <SubjIcon className="w-3.5 h-3.5 stroke-[2.4]" />
                  </div>

                  <div className="text-left min-w-0">
                    <span className="block leading-tight truncate">{subj.name}</span>
                    <span
                      className={`block text-[10px] font-medium leading-none mt-0.5 truncate ${
                        isSelected ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {meta.bengaliName}
                    </span>
                  </div>

                  {topicCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {topicCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            3. ACTIVE SUBJECT BANNER & CHAPTER COUNT
            ═══════════════════════════════════════════════════════════════ */}
        {activeSubject && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-2xs flex items-center gap-3.5">
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                currentSubjectMeta?.accentBorder || "border-blue-200"
              } ${currentSubjectMeta?.badgeBg || "bg-blue-50"} ${
                currentSubjectMeta?.accentText || "text-blue-700"
              } shadow-2xs`}
            >
              <ActiveIcon className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {activeSubject.name}
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  ({currentSubjectMeta?.bengaliName})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>মোট {currentSubjectTopics.length} টি অধ্যায়</span>
                <span>•</span>
                <span className="font-bold text-slate-700">
                  {subjectTotalQuestions} টি প্রশ্ন
                </span>
                <span>•</span>
                <span>অধ্যায় নির্বাচন করে মক টেস্ট দিন</span>
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            4. CHAPTERS LIST (Subject ➔ Chapters ➔ Mock Tests)
            ═══════════════════════════════════════════════════════════════ */}
        <div id="practice-topics-container" className="space-y-3">
          {filteredTopics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">কোনো অধ্যায় পাওয়া যায়নি</h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? `"${searchQuery}" এর সাথে মিলে এমন কোনো অধ্যায় নেই। অনুসন্ধান পরিবর্তন করুন।`
                  : "এই বিষয়ের অধীনে কোনো অধ্যায় পাওয়া যায়নি।"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  ফিল্টার মুছুন
                </button>
              )}
            </div>
          ) : (
            paginatedTopics.map((topic, index) => {
              const tests = topicTestMap[topic.id] || [];
              const isExpanded = expandedTopics.has(topic.id);
              const globalIndex = (currentPage - 1) * TOPICS_PER_PAGE + index;
              const chapterNum = String(globalIndex + 1).padStart(2, "0");

              // Count user attempts in this chapter
              const completedInChapter = tests.filter((t) => testAttempts[t.id]).length;
              const hasCompleted = completedInChapter > 0;
              const bestScore = hasCompleted
                ? Math.max(
                    ...tests
                      .filter((t) => testAttempts[t.id])
                      .map((t) => testAttempts[t.id].best_percentage)
                  )
                : null;

              return (
                <div
                  key={topic.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all overflow-hidden group"
                >
                  {/* CHAPTER HEADER ROW (Click to toggle accordion) */}
                  <div
                    onClick={() => toggleTopic(topic.id)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Chapter Number Badge */}
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                          hasCompleted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-700 border-slate-200/90 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200"
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider leading-none text-slate-400">
                          Ch
                        </span>
                        <span className="text-xs sm:text-sm font-black leading-tight">
                          {chapterNum}
                        </span>
                      </div>

                      {/* Chapter Title & Test Meta */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-base text-slate-900 leading-snug group-hover:text-blue-600 transition-colors truncate">
                            {topic.name}
                          </h4>

                          {hasCompleted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{bestScore}% Best</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-medium flex-wrap">
                          <span>
                            {tests.length > 0
                              ? `${tests.length} টি মক টেস্ট উপলব্ধ`
                              : "চ্যাপ্টার টেস্ট উপলব্ধ"}
                          </span>
                          {completedInChapter > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">
                                {completedInChapter}/{tests.length} সম্পন্ন
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Expand indicator & Quick Launch */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (tests.length > 0) {
                            toggleTopic(topic.id);
                          } else {
                            handleOpenChapterTestModal(topic);
                          }
                        }}
                        className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer"
                      >
                        {tests.length > 0 ? (
                          <>
                            <span>টেস্ট তালিকা ({tests.length})</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>মক টেস্ট দিন</span>
                          </>
                        )}
                      </button>

                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-blue-600" : ""
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* CHAPTER TESTS CONTAINER (EXPANDED) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4 space-y-2.5"
                      >
                        {tests.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                            {tests.map((test) => {
                              const attempt = testAttempts[test.id];

                              return (
                                <div
                                  key={test.id}
                                  className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-3 group/test"
                                >
                                  {/* Left: Test Icon or Attempt Badge */}
                                  <div
                                    className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                                      attempt
                                        ? attempt.passed
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-blue-50 text-blue-700 border-blue-100 group-hover/test:bg-blue-100"
                                    }`}
                                  >
                                    {attempt ? (
                                      <>
                                        <span className="text-xs font-black leading-none">
                                          {attempt.best_percentage}%
                                        </span>
                                        <span className="text-[8px] font-bold uppercase mt-0.5">
                                          {attempt.passed ? "Pass" : "Retry"}
                                        </span>
                                      </>
                                    ) : (
                                      <Target className="w-5 h-5 stroke-[2.2]" />
                                    )}
                                  </div>

                                  {/* Middle: Test Info */}
                                  <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => {
                                      setSelectedTestForModal({
                                        id: test.id,
                                        title: test.title,
                                        examName: activeSubject.name,
                                        totalQuestions: test.total_marks || 10,
                                        durationMinutes: test.duration_minutes || 15,
                                        totalMarks: test.total_marks || 10,
                                        negativeMarking: "-0.25",
                                        isPaid: test.is_paid,
                                        language: "Bengali & English",
                                        attemptsAllowed: "Unlimited",
                                        validity: "1 Year",
                                      });
                                    }}
                                  >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 group-hover/test:text-blue-600 transition-colors truncate">
                                        {test.title}
                                      </h5>
                                      {test.is_paid ? (
                                        <Badge
                                          variant="outline"
                                          className={`text-[8px] px-1 py-0 font-bold ${
                                            hasSubscription
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-800 border-amber-200"
                                          }`}
                                        >
                                          {hasSubscription ? "PRO" : "PRO"}
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-[8px] px-1 py-0 font-bold bg-slate-50 text-slate-600 border-slate-200"
                                        >
                                          FREE
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Test Metrics Row */}
                                    <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-1 font-medium flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        {test.duration_minutes} মিনিট
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        {test.total_marks} নম্বর
                                      </span>
                                      {test.passing_marks && (
                                        <>
                                          <span>•</span>
                                          <span className="text-slate-400">
                                            পাস: {test.passing_marks}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Action Button */}
                                  <div className="shrink-0">
                                    <button
                                      onClick={() => {
                                        if (test.is_paid && !hasSubscription) {
                                          handleProPlanClick();
                                        } else {
                                          setSelectedTestForModal({
                                            id: test.id,
                                            title: test.title,
                                            examName: activeSubject.name,
                                            totalQuestions: test.total_marks || 10,
                                            durationMinutes: test.duration_minutes || 15,
                                            totalMarks: test.total_marks || 10,
                                            negativeMarking: "-0.25",
                                            isPaid: test.is_paid,
                                            language: "Bengali & English",
                                            attemptsAllowed: "Unlimited",
                                            validity: "1 Year",
                                          });
                                        }
                                      }}
                                      className={`h-9 px-3 sm:px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                        test.is_paid && !hasSubscription
                                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                                          : attempt
                                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-98"
                                      }`}
                                    >
                                      {test.is_paid && !hasSubscription ? (
                                        <>
                                          <Lock className="w-3 h-3" />
                                          <span>Unlock</span>
                                        </>
                                      ) : attempt ? (
                                        <>
                                          <RotateCcw className="w-3 h-3" />
                                          <span>Retry</span>
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-3 h-3 fill-current" />
                                          <span>মক টেস্ট দিন</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* STANDARD CHAPTER MOCK TEST CARD */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                            {(() => {
                              const attempt = testAttempts[`topic-${topic.id}`] || testAttempts[topic.id];

                              return (
                                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-3 group/test">
                                  {/* Left: Test Icon or Attempt Badge */}
                                  <div
                                    className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                                      attempt
                                        ? attempt.passed
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-blue-50 text-blue-700 border-blue-100 group-hover/test:bg-blue-100"
                                    }`}
                                  >
                                    {attempt ? (
                                      <>
                                        <span className="text-xs font-black leading-none">
                                          {attempt.best_percentage}%
                                        </span>
                                        <span className="text-[8px] font-bold uppercase mt-0.5">
                                          {attempt.passed ? "Pass" : "Retry"}
                                        </span>
                                      </>
                                    ) : (
                                      <Target className="w-5 h-5 stroke-[2.2]" />
                                    )}
                                  </div>

                                  {/* Middle: Test Info */}
                                  <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleOpenChapterTestModal(topic)}
                                  >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 group-hover/test:text-blue-600 transition-colors truncate">
                                        {topic.name} অধ্যায় মক টেস্ট 01
                                      </h5>
                                      <Badge
                                        variant="outline"
                                        className="text-[8px] px-1 py-0 font-bold bg-slate-50 text-slate-600 border-slate-200"
                                      >
                                        FREE
                                      </Badge>
                                    </div>

                                    {/* Test Metrics Row */}
                                    <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-1 font-medium flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        ১৫ মিনিট
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        ১৫ নম্বর
                                      </span>
                                      <span>•</span>
                                      <span className="text-slate-400">
                                        পাস: ৬
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right: Action Button */}
                                  <div className="shrink-0">
                                    <button
                                      onClick={() => handleOpenChapterTestModal(topic)}
                                      className={`h-9 px-3 sm:px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                        attempt
                                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-98"
                                      }`}
                                    >
                                      {attempt ? (
                                        <>
                                          <RotateCcw className="w-3 h-3" />
                                          <span>Retry</span>
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-3 h-3 fill-current" />
                                          <span>মক টেস্ট দিন</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 select-none mt-4">
              {/* Left: Info Text */}
              <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                অধ্যায়{" "}
                <span className="font-bold text-slate-800">
                  {(currentPage - 1) * TOPICS_PER_PAGE + 1} -{" "}
                  {Math.min(currentPage * TOPICS_PER_PAGE, filteredTopics.length)}
                </span>{" "}
                (মোট <span className="font-bold text-slate-800">{filteredTopics.length}</span> টি অধ্যায়)
              </div>

              {/* Right: Page Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    document.getElementById("practice-topics-container")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    currentPage === 1
                      ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400"
                      : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 hover:text-slate-900 cursor-pointer shadow-2xs active:scale-95"
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>আগের পৃষ্ঠা</span>
                </button>

                {/* Page Number Pills */}
                {getVisiblePageNumbers(currentPage, totalPages).map((item, i) => {
                  if (item === "...") {
                    return (
                      <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs font-bold">
                        ...
                      </span>
                    );
                  }
                  const pageNum = Number(item);
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        setCurrentPage(pageNum);
                        document.getElementById("practice-topics-container")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center border cursor-pointer ${
                        isCurrent
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/25 scale-105"
                          : "bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/90"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    document.getElementById("practice-topics-container")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    currentPage === totalPages
                      ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400"
                      : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 hover:text-slate-900 cursor-pointer shadow-2xs active:scale-95"
                  }`}
                >
                  <span>পরের পৃষ্ঠা</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            5. PRACTICE MENU (Practice → By Subject / Saved / Current Affairs / Mistakes)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
              Practice Menu
            </h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {[
              {
                label: "Practice by Subject",
                icon: Target,
                style: "bg-blue-50/80 hover:bg-blue-100/80 border-blue-200 text-blue-700 hover:border-blue-300",
                iconColor: "text-blue-600",
                path: "/student/practice/subject",
              },
              {
                label: "Saved Questions",
                icon: Bookmark,
                style: "bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-emerald-700 hover:border-emerald-300",
                iconColor: "text-emerald-600",
                path: "/student/bookmarks",
              },
              {
                label: "Current Affairs",
                icon: Newspaper,
                style: "bg-purple-50/80 hover:bg-purple-100/80 border-purple-200 text-purple-700 hover:border-purple-300",
                iconColor: "text-purple-600",
                path: "/student/current-affairs",
              },
              {
                label: "Mistakes",
                icon: RotateCcw,
                style: "bg-rose-50/80 hover:bg-rose-100/80 border-rose-200 text-rose-700 hover:border-rose-300",
                iconColor: "text-rose-600",
                path: "/student/mistakes",
              },
            ].map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <motion.button
                  key={idx}
                  whileHover={{ y: -2.5, scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  onClick={() => navigate(action.path)}
                  className={`shrink-0 h-10 sm:h-11 px-3.5 sm:px-4 rounded-full border flex items-center gap-2 font-bold text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap ${action.style}`}
                >
                  <ActionIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${action.iconColor}`} />
                  <span>{action.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            6. TEST DETAILS INSTRUCTION MODAL
            ═══════════════════════════════════════════════════════════════ */}
        <TestDetailsModal
          isOpen={!!selectedTestForModal}
          onClose={() => setSelectedTestForModal(null)}
          test={selectedTestForModal}
        />



      </div>
    </StudentLayout>
  );
};

export default PracticeHub;
