import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Crown,
  Play,
  Lock,
  RotateCcw,
  Clock,
  BookOpen,
  Target,
  Award,
  ArrowRight,
  ChevronRight,
  Search,
  FileText,
  X,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import StudentLayout from "@/components/student/StudentLayout";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";
import { initRazorpayPayment } from "@/utils/payment";
import { useStudentAuth } from "@/contexts/StudentContext";
import { useExams, useSubjects, useMockTests, useUserAttempts } from "@/hooks/useStudentData";
import { Exam, Subject, MockTest, TestAttemptInfo } from "@/services/examService";

export interface ExamPYQ {
  id: string;
  title: string;
  year: number;
  questions: number;
  duration: number;
  marks: number;
  negative: string;
  subtitle: string;
  isPaid: boolean;
}

const DEFAULT_EXAM_PYQS: Record<string, ExamPYQ[]> = {
  // WBSSC Group D
  "b6edc506-cceb-45cb-b91d-7d2444ffc85f": [
    { id: "wbssc-gd-2019", title: "WBSSC Group D Official PYQ (2019)", year: 2019, questions: 45, duration: 60, marks: 45, negative: "-0.25", subtitle: "Official Exam Paper with Explanations", isPaid: false },
    { id: "wbssc-gd-2017", title: "WBSSC Group D Solved Paper (2017)", year: 2017, questions: 45, duration: 60, marks: 45, negative: "-0.25", subtitle: "Previous Year Solved Paper", isPaid: false },
    { id: "wbssc-gd-2016", title: "WBSSC Group D Prelims Paper (2016)", year: 2016, questions: 45, duration: 60, marks: 45, negative: "-0.25", subtitle: "Original Question Archive", isPaid: true },
  ],
  // WBSSC Group C
  "22497a19-9a35-4bf0-ba7b-5a44bdd0d5aa": [
    { id: "wbssc-gc-2019", title: "WBSSC Group C Official PYQ (2019)", year: 2019, questions: 60, duration: 60, marks: 60, negative: "-0.25", subtitle: "Official Exam Paper with Explanations", isPaid: false },
    { id: "wbssc-gc-2017", title: "WBSSC Group C Solved Paper (2017)", year: 2017, questions: 60, duration: 60, marks: 60, negative: "-0.25", subtitle: "Previous Year Solved Paper", isPaid: false },
  ],
  // Railway Group D
  "d91dfc2e-a974-43a6-85c1-d601f41ab421": [
    { id: "rrb-gd-2022", title: "RRB Group D Official CBT (2022)", year: 2022, questions: 100, duration: 90, marks: 100, negative: "-0.33", subtitle: "Official Shift 1 Question Paper", isPaid: false },
    { id: "rrb-gd-2018", title: "RRB Group D Official CBT (2018)", year: 2018, questions: 100, duration: 90, marks: 100, negative: "-0.33", subtitle: "Combined Solved Question Paper", isPaid: false },
  ],
};

function getPyqsForExam(examId: string, examName?: string): ExamPYQ[] {
  if (DEFAULT_EXAM_PYQS[examId]) return DEFAULT_EXAM_PYQS[examId];
  const name = (examName || "").toLowerCase();
  if (name.includes("group d") && name.includes("wb")) {
    return DEFAULT_EXAM_PYQS["b6edc506-cceb-45cb-b91d-7d2444ffc85f"] || [];
  }
  if (name.includes("group c") && name.includes("wb")) {
    return DEFAULT_EXAM_PYQS["22497a19-9a35-4bf0-ba7b-5a44bdd0d5aa"] || [];
  }
  if (name.includes("railway") || name.includes("rrb")) {
    return DEFAULT_EXAM_PYQS["d91dfc2e-a974-43a6-85c1-d601f41ab421"] || [];
  }
  return [
    { id: `${examId}-pyq-2024`, title: `${examName || "Exam"} Official PYQ (2024)`, year: 2024, questions: 85, duration: 60, marks: 85, negative: "-0.25", subtitle: "Official Exam Paper", isPaid: false },
    { id: `${examId}-pyq-2023`, title: `${examName || "Exam"} Solved Paper (2023)`, year: 2023, questions: 85, duration: 60, marks: 85, negative: "-0.25", subtitle: "Solved with Detailed Explanations", isPaid: false },
  ];
}

const StudentExams = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const { user, hasSubscription, subscriptionFee, refreshSubscription } = useStudentAuth();
  const { data: exams = [], isLoading: loadingExams } = useExams();
  const { data: subjects = [], isLoading: loadingSubjects } = useSubjects();
  const { data: mockTests = [], isLoading: loadingTests } = useMockTests();
  const { data: testAttempts = {}, isLoading: loadingAttempts } = useUserAttempts(user?.id);

  const loading = loadingExams || loadingSubjects || loadingTests;

  const urlExam = searchParams.get("exam");
  const [selectedExam, setSelectedExam] = useState<string>(urlExam || "all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedTestForModal, setSelectedTestForModal] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [examTab, setExamTab] = useState<"full_mock" | "pyq">("full_mock");

  const urlType = searchParams.get("type");
  const [filterType, setFilterType] = useState<"all" | "full_mock" | "topic_wise">(
    urlType === "full_mock" || urlType === "topic_wise" ? (urlType as any) : "all"
  );

  useEffect(() => {
    const examParam = searchParams.get("exam");
    if (examParam) {
      setSelectedExam(examParam);
      setExamTab("full_mock");
    }
  }, [searchParams]);

  const handleProPlanClick = async () => {
    if (hasSubscription) {
      toast({
        title: "Pro Plan Active! 👑",
        description: "You have unlimited access to all mock tests.",
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
      toast({ title: "Success!", description: "Pro Plan activated!" });
    } catch (err: any) {
      if (err?.message !== "Payment cancelled") {
        toast({ title: "Pro Plan Upgrade", description: err.message || "Opening upgrade portal..." });
      }
    }
  };

  // Filter tests strictly aligned with DB data
  const getAllTests = () => {
    let list = [...mockTests];

    if (filterType === "full_mock") {
      list = list.filter(t => t.test_type === "full_mock");
      if (selectedExam !== "all") {
        list = list.filter(t => t.exam_id === selectedExam);
      }
    } else if (filterType === "topic_wise") {
      list = list.filter(t => t.test_type === "topic_wise");
      if (selectedSubject !== "all") {
        list = list.filter(t => t.subject_id === selectedSubject);
      }
    } else {
      // "all" tab
      if (selectedExam !== "all") {
        list = list.filter(t => t.exam_id === selectedExam);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.subjects?.name?.toLowerCase().includes(q) ||
        t.exams?.name?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const orderA = a.order_index ?? 999;
      const orderB = b.order_index ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });
  };

  const filteredTests = getAllTests();
  const completedTests = Object.keys(testAttempts).length;
  const avgScore = completedTests > 0
    ? Math.round(Object.values(testAttempts).reduce((acc, curr) => acc + curr.best_percentage, 0) / completedTests)
    : 0;

  const currentExamObj = exams.find(e => e.id === selectedExam) || (
    selectedExam === "b6edc506-cceb-45cb-b91d-7d2444ffc85f" ? { id: selectedExam, name: "WBSSC Group D" } :
    selectedExam === "22497a19-9a35-4bf0-ba7b-5a44bdd0d5aa" ? { id: selectedExam, name: "WBSSC Group C" } :
    selectedExam === "d91dfc2e-a974-43a6-85c1-d601f41ab421" ? { id: selectedExam, name: "Railway Group D" } :
    null
  );
  const examFullMockTests = mockTests.filter(t => t.exam_id === selectedExam && t.test_type === "full_mock");
  const currentExamPyqs = selectedExam !== "all" ? getPyqsForExam(selectedExam, currentExamObj?.name) : [];

  if (loading) {
    return (
      <StudentLayout title="Tests" subtitle="West Bengal Mock Test Series">
        <div className="w-full md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 py-8 space-y-4">
          <div className="h-12 bg-slate-200/60 rounded-2xl animate-pulse" />
          <div className="h-44 bg-slate-200/60 rounded-3xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 bg-slate-200/60 rounded-2xl animate-pulse" />
            <div className="h-28 bg-slate-200/60 rounded-2xl animate-pulse" />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Tests" subtitle="West Bengal Mock Test Series">
      <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 pb-24 md:pb-8 space-y-4 md:space-y-6">

        {/* ═══════════════════════════════════════════════════════════════
            TOP BRAND HEADER BAR
            ═══════════════════════════════════════════════════════════════ */}
        <header className="flex items-center justify-between gap-3 pt-1">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-xs border border-slate-200/80 bg-white">
              <img src="/logo-circle.png" alt="PracticeKoro" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-[#0F172A]">Practice</span>
                <span className="text-lg font-black tracking-tight text-[#0066FF]">Koro</span>
                <span className="hidden sm:inline-block ml-1 px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-black text-blue-700 border border-blue-100">
                  Mock Tests
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                West Bengal Government Exams Mock Test Series
              </p>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search mock tests by name or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Header Actions: Pro Plan + Notification */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowSearchBar(prev => !prev)}
              className={`md:hidden p-2 rounded-full transition-colors ${showSearchBar ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:text-blue-600 hover:bg-slate-100"}`}
              aria-label="Search tests"
            >
              <Search className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={() => navigate("/student/notifications")}
              className="relative p-2 text-slate-700 hover:text-blue-600 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[2.2]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Expandable Search Input (mobile only) */}
        <div className="md:hidden">
          <AnimatePresence>
            {showSearchBar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-1"
              >
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search mock tests by name or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            HERO SECTION — "Master Every Exam" with 3 Real DB Stats
            ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md shadow-blue-900/10 border border-slate-200/60 bg-[#0A2655] select-none"
        >
          <img
            src="/images/exam_hero_banner.png"
            alt="Exam Preparation - Master Every Exam With Precision"
            className="w-full h-auto object-cover block"
          />
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            FIND YOUR EXAM HEADER & CATEGORY CHIPS (Screen 5)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-1 pt-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Find Your Exam
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Choose an exam and start your preparation
          </p>
        </div>

        {/* Search exam input */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search exam (e.g. Panchayat, SSC...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips: All, State Govt., Central Govt., Teaching */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {["All", "State Govt.", "Central Govt.", "Teaching"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs transition-all ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            POPULAR EXAMS (Screen 5 - Target Exams Cards matching blueprint)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Popular Exams</h3>
            <button
              onClick={() => setSelectedCategory("All")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(exams.length > 0 ? exams : [
              { id: "b6edc506-cceb-45cb-b91d-7d2444ffc85f", name: "WBSSC Group D" },
              { id: "22497a19-9a35-4bf0-ba7b-5a44bdd0d5aa", name: "WBSSC Group C" },
              { id: "d91dfc2e-a974-43a6-85c1-d601f41ab421", name: "Railway Group D" },
            ])
              .filter(item => {
                if (selectedCategory === "All") return true;
                const isCentral = item.name.toLowerCase().includes("railway") || item.name.toLowerCase().includes("rrb") || item.name.toLowerCase().includes("ssc");
                if (selectedCategory === "Central Govt.") return isCentral;
                if (selectedCategory === "State Govt.") return !isCentral;
                return true;
              })
              .map((item, idx) => {
                const fullMockCount = mockTests.filter(t => t.exam_id === item.id && t.test_type === "full_mock").length;
                const pyqs = getPyqsForExam(item.id, item.name);
                const pyqCount = pyqs.length;
                const colorSchemes = [
                  { bg: "bg-blue-50 text-blue-700", icon: <Award className="w-5 h-5" /> },
                  { bg: "bg-purple-50 text-purple-700", icon: <BookOpen className="w-5 h-5" /> },
                  { bg: "bg-emerald-50 text-emerald-700", icon: <Layers className="w-5 h-5" /> },
                  { bg: "bg-amber-50 text-amber-700", icon: <Sparkles className="w-5 h-5" /> },
                ];
                const scheme = colorSchemes[idx % colorSchemes.length];

                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedExam(item.id);
                      setExamTab("full_mock");
                      setFilterType("all");
                      const el = document.getElementById("mock-test-series-section");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs hover:shadow-md ${
                      selectedExam === item.id
                        ? "border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10"
                        : "border-slate-200/90 hover:border-blue-400"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 ${scheme.bg}`}>
                        {scheme.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {item.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {item.name.toLowerCase().includes("railway") ? "Central Government" : "West Bengal"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {fullMockCount} Full Mocks • {pyqCount} PYQs
                        </p>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center text-slate-400 transition-colors shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION TITLE FOR MOCK TEST PAPERS
            ═══════════════════════════════════════════════════════════════ */}
        <div id="mock-test-series-section" className="pt-2">
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Mock Test Series</h3>
          <p className="text-xs text-slate-500 font-medium">Practice full simulated mocks and topic quizzes</p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SEGMENTED TABS — All Tests | Full Mock | Topic Test (PYQ Removed)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-100/80 p-1 md:p-1.5 rounded-2xl flex items-center w-full md:max-w-xl overflow-x-auto no-scrollbar gap-1 border border-slate-200/60">
          {[
            { key: "all", label: "All Tests", icon: BookOpen },
            { key: "full_mock", label: "Full Mock", icon: Award },
            { key: "topic_wise", label: "Topic Test", icon: Target },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilterType(tab.key as any);
                if (tab.key === "topic_wise") {
                  setSelectedExam("all");
                }
              }}
              className={`flex-1 py-2 md:py-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 whitespace-nowrap transition-all duration-150 ${
                filterType === tab.key
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${filterType === tab.key ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            DYNAMIC SUB-FILTER CHIPS (Clean without test counts)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          {/* Topic-Wise: Show Subjects in a sleek Dropdown */}
          {filterType === "topic_wise" && (
            <div className="flex items-center gap-2.5 py-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                Subject:
              </span>
              <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
                <div className="w-full">
                  <Select
                    value={selectedSubject}
                    onValueChange={(val) => setSelectedSubject(val)}
                  >
                    <SelectTrigger className="h-9 sm:h-10 rounded-xl bg-white border border-slate-200 hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs sm:text-sm font-medium shadow-2xs transition-all w-full">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-72 shadow-xl border-slate-200 z-[200] bg-white">
                      <SelectItem
                        value="all"
                        className="font-semibold text-purple-700 focus:bg-purple-50 focus:text-purple-800 cursor-pointer"
                      >
                        All Subjects ({subjects.length})
                      </SelectItem>
                      {subjects.map((sub) => (
                        <SelectItem
                          key={sub.id}
                          value={sub.id}
                          className="cursor-pointer font-medium text-slate-700 focus:bg-purple-50 focus:text-purple-700"
                        >
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSubject !== "all" && (
                  <button
                    onClick={() => setSelectedSubject("all")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-2 rounded-xl transition-colors shrink-0"
                    title="Clear subject filter"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* All & Full Mock: Show Exams from DB without test counts */}
          {(filterType === "all" || filterType === "full_mock") && exams.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 md:flex-wrap">
              <button
                onClick={() => {
                  setSelectedExam("all");
                  setExamTab("full_mock");
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedExam === "all"
                    ? "border border-blue-400 text-blue-700 bg-blue-50 shadow-xs font-bold"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
              >
                All Exams
              </button>

              {exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => {
                    setSelectedExam(exam.id);
                    setExamTab("full_mock");
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedExam === exam.id
                      ? "border border-blue-400 text-blue-700 bg-blue-50 shadow-xs font-bold"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {exam.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TARGET EXAM BANNER — Full Mock Test & Previous Year Question Paper
            Visible whenever a specific exam is clicked/selected
            ═══════════════════════════════════════════════════════════════ */}
        {selectedExam !== "all" && currentExamObj && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/90 shadow-2xs space-y-3.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100/90 text-blue-800 border border-blue-200/80">
                      Target Exam
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {currentExamObj.name.toLowerCase().includes("railway") ? "Central Government" : "West Bengal"}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 truncate mt-0.5">
                    {currentExamObj.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedExam("all");
                  setExamTab("full_mock");
                }}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors shadow-2xs shrink-0"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Show All Exams</span>
              </button>
            </div>

            {/* Sub-tabs: Full Mock Test and Previous Year Question Paper */}
            <div className="flex items-center gap-2 p-1 bg-white/90 rounded-2xl border border-slate-200/80 w-full sm:w-auto">
              <button
                onClick={() => setExamTab("full_mock")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  examTab === "full_mock"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-black"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Full Mock Test</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    examTab === "full_mock" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {examFullMockTests.length}
                </span>
              </button>

              <button
                onClick={() => setExamTab("pyq")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  examTab === "pyq"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-black"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Previous Year Question Paper</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    examTab === "pyq" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {currentExamPyqs.length}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Quick Topic Drill Banner when Topic Test tab is active */}
        {filterType === "topic_wise" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Need Instant Chapter-wise Practice?</h4>
                <p className="text-xs text-slate-500">Practice Mathematics, GK, Bengali & English with instant solution reveal</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/student/practice")}
              className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl shrink-0 shadow-sm transition-all"
            >
              Start Topic Practice <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MOCK TEST & PYQ CARDS LIST
            Responsive: 1-col on Mobile, 2-col on Laptop/Desktop
            ═══════════════════════════════════════════════════════════════ */}
        {selectedExam !== "all" && examTab === "pyq" ? (
          /* PREVIOUS YEAR QUESTION PAPERS */
          <div className="space-y-3 pt-1 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 xl:gap-5">
            <AnimatePresence mode="popLayout">
              {currentExamPyqs
                .filter(p =>
                  !searchQuery.trim() ||
                  p.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                  p.subtitle.toLowerCase().includes(searchQuery.toLowerCase().trim())
                )
                .map((pyq, index) => (
                  <motion.div
                    layout
                    key={pyq.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between gap-3 sm:gap-4 group"
                  >
                    {/* Left: Year Badge */}
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-blue-100 bg-blue-50 text-blue-700 shadow-2xs">
                      <Calendar className="w-5 h-5 stroke-[2.2]" />
                      <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">{pyq.year}</span>
                    </div>

                    {/* Middle: Info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setSelectedTestForModal({
                          id: pyq.id,
                          title: pyq.title,
                          examName: currentExamObj?.name || "Official PYQ",
                          totalQuestions: pyq.questions,
                          durationMinutes: pyq.duration,
                          totalMarks: pyq.marks,
                          negativeMarking: pyq.negative,
                          isPaid: pyq.isPaid,
                          language: "Bengali & English",
                          attemptsAllowed: "Unlimited",
                          validity: "1 Year",
                          isPyq: true,
                          year: pyq.year,
                        });
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                          Official PYQ {pyq.year}
                        </span>
                        {pyq.isPaid ? (
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 font-bold ${
                              hasSubscription
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {hasSubscription ? "PRO UNLOCKED" : "PRO"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold bg-slate-50 text-slate-600 border-slate-200">
                            FREE
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-1 group-hover:text-blue-600 transition-colors">
                        {pyq.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium truncate">{pyq.subtitle}</p>

                      <div className="flex items-center gap-3 text-slate-500 text-xs mt-1.5 flex-wrap font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {pyq.duration} Mins
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {pyq.marks} Marks
                        </span>
                        <span>•</span>
                        <span className="text-rose-600 font-bold">
                          {pyq.negative}
                        </span>
                      </div>
                    </div>

                    {/* Right: Action */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={() => {
                          if (pyq.isPaid && !hasSubscription) {
                            handleProPlanClick();
                          } else {
                            setSelectedTestForModal({
                              id: pyq.id,
                              title: pyq.title,
                              examName: currentExamObj?.name || "Official PYQ",
                              totalQuestions: pyq.questions,
                              durationMinutes: pyq.duration,
                              totalMarks: pyq.marks,
                              negativeMarking: pyq.negative,
                              isPaid: pyq.isPaid,
                              language: "Bengali & English",
                              attemptsAllowed: "Unlimited",
                              validity: "1 Year",
                              isPyq: true,
                              year: pyq.year,
                            });
                          }
                        }}
                        className={`h-10 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs ${
                          pyq.isPaid && !hasSubscription
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                        }`}
                      >
                        {pyq.isPaid && !hasSubscription ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start PYQ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>

            {currentExamPyqs.length === 0 && (
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-8 md:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No Previous Year Questions yet</h4>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  Past year question papers for {currentExamObj?.name || "this exam"} will be uploaded shortly.
                </p>
                <button
                  onClick={() => navigate("/student/pyq")}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" /> Open General PYQ Bank
                </button>
              </div>
            )}
          </div>
        ) : (
          /* FULL MOCK & OTHER TESTS */
          <div className="space-y-3 pt-1 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 xl:gap-5">
            <AnimatePresence mode="popLayout">
              {(selectedExam !== "all"
                ? examFullMockTests.filter(t => !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))
                : filteredTests
              ).map((test, index) => {
                const attempt = testAttempts[test.id];
                const isTopic = test.test_type === "topic_wise";
                const tagLabel = isTopic
                  ? (test.subjects?.name || "Topic Practice")
                  : (test.exams?.name || "Full Mock");

                return (
                  <motion.div
                    layout
                    key={test.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between gap-3 sm:gap-4 group"
                  >
                    {/* Left: Score Badge or Type Icon */}
                    <div
                      className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                        attempt
                          ? attempt.passed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                          : isTopic
                          ? "bg-purple-50 text-purple-700 border-purple-100"
                          : "bg-blue-50 text-blue-700 border-blue-100"
                      }`}
                    >
                      {attempt ? (
                        <>
                          <span className="text-sm font-black leading-none">{attempt.best_percentage}%</span>
                          <span className="text-[9px] font-bold uppercase mt-1">
                            {attempt.passed ? "Passed" : "Retry"}
                          </span>
                        </>
                      ) : isTopic ? (
                        <>
                          <Target className="w-5 h-5 stroke-[2.2]" />
                          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Topic</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-5 h-5 stroke-[2.2]" />
                          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Full</span>
                        </>
                      )}
                    </div>

                    {/* Middle: Content with Real DB Attributes - Click opens TestDetailsModal */}
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
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            isTopic
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {tagLabel}
                        </span>

                        {test.is_paid ? (
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 font-bold ${
                              hasSubscription
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {hasSubscription ? "PRO UNLOCKED" : "PRO"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold bg-slate-50 text-slate-600 border-slate-200">
                            FREE
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-1 group-hover:text-blue-600 transition-colors">
                        {test.title}
                      </h3>

                      {/* Metadata line from real database values */}
                      <div className="flex items-center gap-3 text-slate-500 text-xs mt-1.5 flex-wrap font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {test.duration_minutes} Mins
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {test.total_marks} Marks
                        </span>
                        {test.passing_marks && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">
                              Pass: {test.passing_marks}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={() => {
                          if (test.is_paid && !hasSubscription) {
                            handleProPlanClick();
                          } else {
                            navigate(`/student/take-test/${test.id}`);
                          }
                        }}
                        className={`h-10 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs ${
                          attempt
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : test.is_paid && !hasSubscription
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                        }`}
                      >
                        {test.is_paid && !hasSubscription ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock</span>
                          </>
                        ) : attempt ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start</span>
                          </>
                        )}
                      </button>

                      {attempt && (
                        <button
                          onClick={() => navigate(`/student/test-review/${attempt.attempt_id}`)}
                          className="text-[10px] font-bold text-blue-600 hover:underline hidden sm:block pt-0.5"
                        >
                          View Solutions
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty State */}
            {(selectedExam !== "all"
              ? examFullMockTests.filter(t => !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))
              : filteredTests
            ).length === 0 && (
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-8 md:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No mock tests found</h4>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  {selectedExam !== "all"
                    ? `No full mock tests available for ${currentExamObj?.name || "this exam"} yet.`
                    : "No mock tests match the selected filters. Try choosing another category or clearing your search."}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  {filterType === "topic_wise" && (
                    <button
                      onClick={() => navigate("/student/practice")}
                      className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Target className="w-4 h-4" /> Go to Topic Practice
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setFilterType("all");
                      setSelectedExam("all");
                      setSelectedSubject("all");
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Show All Tests
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Screen 9: Test Details Modal */}
      <TestDetailsModal
        isOpen={!!selectedTestForModal}
        onClose={() => setSelectedTestForModal(null)}
        test={selectedTestForModal}
      />
    </StudentLayout>
  );
};

export default StudentExams;
