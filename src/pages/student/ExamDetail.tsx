import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import {
  ArrowLeft,
  Share2,
  Heart,
  Star,
  Users,
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Layers,
  Award,
  Crown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";
import { toast } from "sonner";

// Mock Exam Database for Screen 6 & Screen 7
const EXAM_PRESETS: Record<string, any> = {
  panchayat: {
    id: "panchayat",
    name: "Panchayat Exam",
    state: "West Bengal",
    category: "State Govt",
    image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&auto=format&fit=crop&q=80",
    rating: 4.7,
    studentsCount: "50K+",
    testsCount: "120+",
    topicsCount: "250+",
    progressPercent: 62,
    completedCount: 12,
    inProgressCount: 5,
    notStartedCount: 8,
    subjects: [
      { name: "General Knowledge", iconColor: "text-amber-600", bg: "bg-amber-50", percent: 80, topics: 12 },
      { name: "Bengali", iconColor: "text-emerald-600", bg: "bg-emerald-50", percent: 65, topics: 10 },
      { name: "English", iconColor: "text-blue-600", bg: "bg-blue-50", percent: 58, topics: 15 },
      { name: "Mathematics", iconColor: "text-indigo-600", bg: "bg-indigo-50", percent: 42, topics: 20 },
      { name: "Reasoning", iconColor: "text-purple-600", bg: "bg-purple-50", percent: 55, topics: 8 },
    ],
    tests: [
      {
        id: "panchayat-mock-1",
        title: "Panchayat Full Mock Test 1",
        badge: "New",
        badgeType: "new",
        questions: 100,
        duration: 90,
        marks: 100,
        negative: "-0.25",
        attempts: "12K Attempts",
        passRate: "76% Pass Rate",
        type: "full_mock",
        isPaid: false,
      },
      {
        id: "panchayat-mock-2",
        title: "Panchayat Full Mock Test 2",
        badge: "Pro",
        badgeType: "pro",
        questions: 100,
        duration: 90,
        marks: 100,
        negative: "-0.25",
        attempts: "8.5K Attempts",
        passRate: "72% Pass Rate",
        type: "full_mock",
        isPaid: true,
      },
      {
        id: "panchayat-topic-1",
        title: "General Awareness - Topic Test",
        badge: "Free",
        badgeType: "free",
        questions: 25,
        duration: 20,
        marks: 25,
        negative: "No Negative",
        attempts: "18K Attempts",
        passRate: "65% Pass Rate",
        type: "topic_wise",
        isPaid: false,
      },
      {
        id: "panchayat-topic-2",
        title: "West Bengal GK - Topic Test",
        badge: "Free",
        badgeType: "free",
        questions: 25,
        duration: 20,
        marks: 25,
        negative: "No Negative",
        attempts: "12K Attempts",
        passRate: "60% Pass Rate",
        type: "topic_wise",
        isPaid: false,
      },
    ],
    pyqs: [
      { id: "pyq-2024", title: "Panchayat PYQ 2024", questions: 100, subtitle: "Real Exam Paper" },
      { id: "pyq-2023", title: "Panchayat PYQ 2023", questions: 100, subtitle: "Solved Paper" },
      { id: "pyq-2022", title: "Panchayat PYQ 2022", questions: 100, subtitle: "Solved Paper" },
      { id: "pyq-2021", title: "Panchayat PYQ 2021", questions: 100, subtitle: "Solved Paper" },
    ]
  },
  "wb-group-cd": {
    id: "wb-group-cd",
    name: "WB Group C & D",
    state: "West Bengal",
    category: "State Govt",
    image: "https://images.unsplash.com/photo-1542314831-c6a4d273a5a7?w=1200&auto=format&fit=crop&q=80",
    rating: 4.6,
    studentsCount: "30K+",
    testsCount: "100+",
    topicsCount: "180+",
    progressPercent: 45,
    completedCount: 8,
    inProgressCount: 4,
    notStartedCount: 14,
    subjects: [
      { name: "General Knowledge", iconColor: "text-amber-600", bg: "bg-amber-50", percent: 60, topics: 12 },
      { name: "Arithmetic", iconColor: "text-indigo-600", bg: "bg-indigo-50", percent: 40, topics: 18 },
      { name: "General English", iconColor: "text-blue-600", bg: "bg-blue-50", percent: 35, topics: 10 },
    ],
    tests: [
      {
        id: "wb-group-1",
        title: "WB Group D Full Mock Test 1",
        badge: "New",
        badgeType: "new",
        questions: 85,
        duration: 90,
        marks: 85,
        negative: "-0.25",
        attempts: "9K Attempts",
        passRate: "70% Pass Rate",
        type: "full_mock",
        isPaid: false,
      }
    ],
    pyqs: [
      { id: "wb-pyq-2017", title: "WB Group D Official PYQ", questions: 85, subtitle: "Official Paper" }
    ]
  },
  "wbp-constable": {
    id: "wbp-constable",
    name: "WB Police Constable",
    state: "West Bengal",
    category: "Police",
    image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&auto=format&fit=crop&q=80",
    rating: 4.8,
    studentsCount: "42K+",
    testsCount: "95+",
    topicsCount: "210+",
    progressPercent: 55,
    completedCount: 14,
    inProgressCount: 6,
    notStartedCount: 10,
    subjects: [
      { name: "General Awareness & GK", iconColor: "text-amber-600", bg: "bg-amber-50", percent: 75, topics: 16 },
      { name: "Elementary Mathematics", iconColor: "text-indigo-600", bg: "bg-indigo-50", percent: 60, topics: 14 },
      { name: "Reasoning & Logical Analysis", iconColor: "text-purple-600", bg: "bg-purple-50", percent: 50, topics: 12 },
      { name: "English Language", iconColor: "text-blue-600", bg: "bg-blue-50", percent: 45, topics: 10 },
    ],
    tests: [
      {
        id: "wbp-mock-1",
        title: "WBP Constable Full Mock 1 (Prelims)",
        badge: "New",
        badgeType: "new",
        questions: 85,
        duration: 60,
        marks: 85,
        negative: "-0.25",
        attempts: "15K Attempts",
        passRate: "68% Pass Rate",
        type: "full_mock",
        isPaid: false,
      },
      {
        id: "wbp-mock-2",
        title: "WBP Constable Pro Mock 2",
        badge: "Pro",
        badgeType: "pro",
        questions: 85,
        duration: 60,
        marks: 85,
        negative: "-0.25",
        attempts: "11K Attempts",
        passRate: "64% Pass Rate",
        type: "full_mock",
        isPaid: true,
      }
    ],
    pyqs: [
      { id: "wbp-pyq-2023", title: "WBP Constable Prelims 2023", questions: 85, subtitle: "Official Exam Paper" },
      { id: "wbp-pyq-2021", title: "WBP Constable Prelims 2021", questions: 100, subtitle: "Solved Paper" }
    ]
  },
  "kp-si": {
    id: "kp-si",
    name: "Kolkata Police SI",
    state: "West Bengal",
    category: "Police",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
    rating: 4.9,
    studentsCount: "28K+",
    testsCount: "70+",
    topicsCount: "160+",
    progressPercent: 40,
    completedCount: 6,
    inProgressCount: 3,
    notStartedCount: 15,
    subjects: [
      { name: "General Studies", iconColor: "text-amber-600", bg: "bg-amber-50", percent: 65, topics: 18 },
      { name: "Logical & Analytical Reasoning", iconColor: "text-purple-600", bg: "bg-purple-50", percent: 55, topics: 10 },
      { name: "Arithmetic", iconColor: "text-indigo-600", bg: "bg-indigo-50", percent: 45, topics: 14 },
    ],
    tests: [
      {
        id: "kp-si-mock-1",
        title: "KP SI Prelims Full Mock 1",
        badge: "New",
        badgeType: "new",
        questions: 100,
        duration: 90,
        marks: 200,
        negative: "-0.50",
        attempts: "8K Attempts",
        passRate: "58% Pass Rate",
        type: "full_mock",
        isPaid: false,
      }
    ],
    pyqs: [
      { id: "kp-pyq-2023", title: "KP SI Prelims 2023", questions: 100, subtitle: "Official Exam Paper" }
    ]
  }
};

export const ExamDetail = () => {
  const { examId = "panchayat" } = useParams();
  const navigate = useNavigate();

  const exam = EXAM_PRESETS[examId] || EXAM_PRESETS.panchayat;

  // Tabs: Overview | Syllabus | Mock Tests | PYQ
  const [activeTab, setActiveTab] = useState<"overview" | "syllabus" | "mock_tests" | "pyq">("overview");
  const [syllabusSubTab, setSyllabusSubTab] = useState<"subjects" | "topics" | "pattern">("subjects");
  const [testFilter, setTestFilter] = useState<"all" | "full_mock" | "topic_wise" | "pyq">("all");
  const [isFollowing, setIsFollowing] = useState(false);

  // Modal state for Screen 9
  const [selectedModalTest, setSelectedModalTest] = useState<any | null>(null);

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? `Unfollowed ${exam.name}` : `Following ${exam.name}! You will get exam updates.`);
  };

  const filteredTests = exam.tests.filter((t: any) => {
    if (testFilter === "all") return true;
    return t.type === testFilter;
  });

  return (
    <StudentLayout title={exam.name} subtitle={exam.state}>
      <div className="w-full max-w-4xl lg:max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-2 pb-24 md:pb-8 space-y-4 sm:space-y-6 font-sans">
        
        {/* ═══════════════════════════════════════════════════════════════
            HERO LANDMARK PHOTO BANNER (Screen 6)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-900 min-h-[190px] sm:min-h-[220px]">
          {/* Background image */}
          <img
            src={exam.image}
            alt={exam.name}
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

          {/* Top Actions: Back, Title, Heart */}
          <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between">
            <button
              onClick={() => navigate("/student/exam")}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors flex items-center justify-center shadow-xs"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFollow}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                  isFollowing
                    ? "bg-emerald-500 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button
                onClick={() => toast.success("Exam link copied to clipboard")}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title and State Badge */}
          <div className="relative z-10 p-4 sm:p-6 pt-6 text-white space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                {exam.state}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                {exam.category}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display drop-shadow-sm">
              {exam.name}
            </h1>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            4 PILL NAVIGATION TABS: Overview | Syllabus | Mock Tests | PYQ
            ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/70 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview" },
            { id: "syllabus", label: "Syllabus" },
            { id: "mock_tests", label: "Full Mock Test" },
            { id: "pyq", label: "Previous Year Question Paper" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-xs shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TAB CONTENT
            ═══════════════════════════════════════════════════════════════ */}
        
        {/* TAB 1: OVERVIEW (Screen 6) */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
            {/* 4 Stats Cards */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
              <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <p className="text-base sm:text-lg font-black text-slate-900">{exam.testsCount}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Mock Tests</p>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <p className="text-base sm:text-lg font-black text-slate-900">{exam.topicsCount}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Topics</p>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <p className="text-base sm:text-lg font-black text-slate-900">{exam.studentsCount}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Students</p>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col items-center justify-center">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-base sm:text-lg font-black text-slate-900">{exam.rating}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Rating</p>
              </div>
            </div>

            {/* Preparation Progress Card (Circular ring matching Screen 6) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Your Preparation Progress</h3>

              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-1">
                {/* Gauge */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-blue-600 transition-all duration-1000 ease-out"
                      strokeDasharray={`${exam.progressPercent}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-slate-900">{exam.progressPercent}%</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Completed</span>
                  </div>
                </div>

                {/* Progress legend breakdown */}
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <span>{exam.completedCount} Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{exam.inProgressCount} In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
                    <span>{exam.notStartedCount} Not Started</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subjects Progress matching Screen 6 */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Subjects Progress</h3>
                <button
                  onClick={() => setActiveTab("syllabus")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>View Syllabus</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 pt-1">
                {exam.subjects.map((sub: any) => (
                  <div key={sub.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800">{sub.name}</span>
                      <span className="text-slate-500">{sub.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-700"
                        style={{ width: `${sub.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky Continue Preparation CTA */}
            <div className="pt-2">
              <Button
                onClick={() => setActiveTab("mock_tests")}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <span>Continue Preparation</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SYLLABUS (Screen 7) */}
        {activeTab === "syllabus" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* 3 Sub-tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/60">
              <button
                onClick={() => setSyllabusSubTab("subjects")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  syllabusSubTab === "subjects"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Subjects
              </button>
              <button
                onClick={() => setSyllabusSubTab("topics")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  syllabusSubTab === "topics"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Topics
              </button>
              <button
                onClick={() => setSyllabusSubTab("pattern")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  syllabusSubTab === "pattern"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Exam Pattern
              </button>
            </div>

            {/* Subject Breakdown List matching Screen 7 */}
            <div className="space-y-3">
              {exam.subjects.map((sub: any) => (
                <div
                  key={sub.name}
                  className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-200 transition-all cursor-pointer"
                  onClick={() => navigate("/student/practice/subject")}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${sub.bg} ${sub.iconColor} flex items-center justify-center shrink-0`}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{sub.name}</h4>
                      <p className="text-xs text-slate-400">{sub.topics} Topics Covered</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-800">{sub.percent}%</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 3: MOCK TESTS (Screen 8) */}
        {activeTab === "mock_tests" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Filter Chips matching Screen 8 */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "full_mock", label: "Full Mock Test" },
                { id: "pyq", label: "Previous Year Question Paper" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    if (f.id === "pyq") {
                      setActiveTab("pyq");
                    } else {
                      setTestFilter(f.id as any);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    testFilter === f.id || (f.id === "full_mock" && testFilter === "all")
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Mock Test Cards matching Screen 8 */}
            <div className="space-y-3">
              {filteredTests.map((test: any) => (
                <div
                  key={test.id}
                  onClick={() => setSelectedModalTest({
                    ...test,
                    examName: exam.name,
                  })}
                  className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:shadow-sm hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {test.title}
                        </h4>
                        {test.badgeType === "new" && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            New
                          </span>
                        )}
                        {test.badgeType === "pro" && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                            <Crown className="w-2.5 h-2.5 fill-amber-500" />
                            Pro
                          </span>
                        )}
                        {test.badgeType === "free" && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            Free
                          </span>
                        )}
                      </div>

                      {/* Specs Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                        <span>{test.questions} Questions</span>
                        <span>•</span>
                        <span>{test.duration} Minutes</span>
                        <span>•</span>
                        <span className="text-rose-600 font-bold">{test.negative}</span>
                      </div>

                      {/* Social stats */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                        <span>{test.attempts}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">{test.passRate}</span>
                      </div>
                    </div>

                    <button className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all shrink-0 mt-1">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 4: PYQ (Screen 16) */}
        {activeTab === "pyq" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {exam.pyqs.map((pyq: any) => (
              <div
                key={pyq.id}
                onClick={() => navigate("/student/pyq")}
                className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{pyq.title}</h4>
                    <p className="text-xs text-slate-400">{pyq.questions} Questions • {pyq.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </motion.div>
        )}

        {/* Screen 9 Test Details Modal */}
        <TestDetailsModal
          isOpen={!!selectedModalTest}
          onClose={() => setSelectedModalTest(null)}
          test={selectedModalTest}
        />

      </div>
    </StudentLayout>
  );
};

export default ExamDetail;
