import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  ChevronRight,
  Play,
  Lock,
  RotateCcw,
  Clock,
  BookOpen,
  Target,
  CheckCircle,
  Sparkles,
  Award,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import StudentLayout from "@/components/student/StudentLayout";
import { useAuth } from "@/hooks/useAuth";
import { hasActiveSubscription } from "@/lib/subscription";

interface Exam {
  id: string;
  name: string;
  is_paid: boolean;
  price: number;
  order_index?: number;
}

interface Subject {
  id: string;
  name: string;
  order_index?: number;
}

interface MockTest {
  id: string;
  title: string;
  test_type: string;
  duration_minutes: number;
  total_marks: number;
  exam_id: string | null;
  subject_id: string | null;
  is_paid: boolean;
  price: number;
  order_index?: number;
  subjects?: { id: string, name: string, exam_id: string | null, order_index?: number };
}

interface TestAttemptInfo {
  test_id: string;
  best_percentage: number;
  passed: boolean;
  attempt_count: number;
}

const StudentExams = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    hasActiveSubscription(user.id).then((active) => {
      if (!cancelled) setHasSubscription(active);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mockTests, setMockTests] = useState<{ [key: string]: MockTest[] }>({});
  const [testAttempts, setTestAttempts] = useState<{ [key: string]: TestAttemptInfo }>({});
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const urlType = searchParams.get("type");
  const [filterType, setFilterType] = useState<"all" | "full_mock" | "topic_wise">(
    urlType === "full_mock" || urlType === "topic_wise" ? urlType : "all"
  );

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const approvalResult = await supabase.from("approval_status").select("status").eq("user_id", session.user.id).single();
      setApprovalStatus(approvalResult.data?.status || "pending");
      await Promise.all([loadExamsAndTests(), loadTestAttempts(session.user.id)]);
    } catch (error) {
      console.error("Error loading exams:", error);
      toast({
        title: "Error loading tests",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const loadExamsAndTests = async () => {
    // Try fetching with order_index first
    let { data: examsData, error: examsError } = await supabase
      .from("exams")
      .select("id, name, is_paid, price, order_index")
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    // Fallback if column missing (order_index doesn't exist yet)
    if (examsError) {
      console.warn("Exams fetch with order_index failed, falling back to name:", examsError);
      const { data: fallbackExams } = await supabase
        .from("exams")
        .select("id, name, is_paid, price")
        .eq("is_active", true)
        .order("name");
      examsData = fallbackExams;
    }
    setExams((examsData as any) || []);

    // Load subjects for topic-wise filter
    let { data: subjectsData, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, name, order_index")
      .or('category.eq.questions,category.is.null')
      .order("order_index", { ascending: true });

    if (subjectsError) {
      console.warn("Subjects fetch with order_index failed, falling back to name:", subjectsError);
      const { data: fallbackSubjects } = await supabase
        .from("subjects")
        .select("id, name")
        .or('category.eq.questions,category.is.null')
        .order("name");
      subjectsData = fallbackSubjects as any;
    }
    setSubjects((subjectsData as any) || []);

    // Auto-select first exam if search params type is set but no exam is selected
    if (examsData && examsData.length > 0 && selectedExam === "all" && searchParams.get("type")) {
      // Keep "all" but we can use this data for badges
    }

    // Try fetching tests with order_index
    let { data: testsData, error: testsError } = await supabase
      .from("mock_tests")
      .select("id, title, test_type, duration_minutes, total_marks, exam_id, is_paid, price, subject_id, order_index, subjects(id, name, exam_id, order_index)")
      .eq("is_published", true)
      .order("order_index", { ascending: true });

    // Fallback for tests if order_index missing
    if (testsError) {
      console.warn("Tests fetch with order_index failed, falling back to title:", testsError);
      const { data: fallbackTests } = await supabase
        .from("mock_tests")
        .select("id, title, test_type, duration_minutes, total_marks, exam_id, is_paid, price, subject_id, subjects(id, name, exam_id)")
        .eq("is_published", true)
        .order("title");
      testsData = fallbackTests as any;
    }

    const testsByExam: { [key: string]: MockTest[] } = {};
    testsData?.forEach((test: any) => {
      // Use test.exam_id, or if null, use subject's exam_id, or "general"
      const groupingId = test.exam_id || test.subjects?.exam_id || "general";
      if (!testsByExam[groupingId]) testsByExam[groupingId] = [];
      testsByExam[groupingId].push(test as MockTest);
    });
    setMockTests(testsByExam);
  };


  const loadTestAttempts = async (userId: string) => {
    const { data } = await supabase.from("test_attempts").select("test_id, percentage, passed").eq("user_id", userId).eq("is_active", false);
    if (data) {
      const attemptsByTest: { [key: string]: TestAttemptInfo } = {};
      data.forEach((a) => {
        if (!attemptsByTest[a.test_id]) {
          attemptsByTest[a.test_id] = { test_id: a.test_id, best_percentage: a.percentage, passed: a.passed, attempt_count: 1 };
        } else {
          attemptsByTest[a.test_id].attempt_count++;
          if (a.percentage > attemptsByTest[a.test_id].best_percentage) {
            attemptsByTest[a.test_id].best_percentage = a.percentage;
          }
        }
        if (a.passed) attemptsByTest[a.test_id].passed = true;
      });
      setTestAttempts(attemptsByTest);
    }
  };

  const getAllTests = () => {
    let allTests: MockTest[] = [];
    Object.entries(mockTests).forEach(([examId, tests]) => {
      // "general" tests are included in "all" or if specifically selected (though not in exams list)
      if (selectedExam === "all" || selectedExam === examId) allTests = [...allTests, ...tests];
    });

    if (filterType !== "all") {
      allTests = allTests.filter(t => t.test_type === filterType);
    }

    // Filter by subject when in topic_wise mode
    if (filterType === "topic_wise" && selectedSubject !== "all") {
      allTests = allTests.filter(t => t.subject_id === selectedSubject);
    }

    // Final sorting to respect order_index
    return allTests.sort((a, b) => {
      // 1. Priority: Manual test order
      const orderA = a.order_index ?? 999;
      const orderB = b.order_index ?? 999;
      if (orderA !== orderB) return orderA - orderB;

      // 2. Fallback: Subject/Exam order
      if (filterType === "topic_wise") {
        const subA = a.subjects?.order_index ?? 999;
        const subB = b.subjects?.order_index ?? 999;
        if (subA !== subB) return subA - subB;
      } else if (filterType === "full_mock") {
        // Find exam order
        const examA = exams.find(e => e.id === a.exam_id)?.order_index ?? 999;
        const examB = exams.find(e => e.id === b.exam_id)?.order_index ?? 999;
        if (examA !== examB) return examA - examB;
      }

      // 3. Last fallback: Title
      return a.title.localeCompare(b.title);
    });
  };

  const filteredTests = getAllTests();
  const totalPublishedTests = Object.values(mockTests).flat().length;
  const completedTests = Object.keys(testAttempts).length;
  const avgScore = completedTests > 0
    ? Math.round(Object.values(testAttempts).reduce((acc, curr) => acc + curr.best_percentage, 0) / completedTests)
    : 0;
  const passedTests = Object.values(testAttempts).filter(t => t.passed).length;

  if (loading) {
    return (
      <StudentLayout title="Mock Tests" subtitle="Practice & improve">
        <div className="w-full md:max-w-5xl md:mx-auto flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </StudentLayout>
    );
  }


  return (
    <StudentLayout title="Mock Tests" subtitle="Practice & improve">
      <div className="w-full mx-auto space-y-3 pb-12 overflow-x-hidden px-1">

        {/* ═══════════════════════════════════════════════════════════════
            PREMIUM HERO - Matches Dashboard Height
            ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600"
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-400/30 rounded-full blur-3xl -ml-20 -mb-20" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            {/* Header - Matches Dashboard style */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shrink-0">
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">📝 Test Repository</p>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Master Your Exams</h1>
              </div>
            </div>

            {/* Stats Row - 3 columns like Dashboard */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                <p className="text-2xl sm:text-3xl font-bold text-white">{completedTests}</p>
                <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mt-1">Done</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                <p className="text-2xl sm:text-3xl font-bold text-white">{avgScore}%</p>
                <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mt-1">Avg Score</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                <p className="text-2xl sm:text-3xl font-bold text-white">{Object.values(mockTests).flat().length}</p>
                <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mt-1">Available</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            FILTER TABS - Pill Style
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {[
              { key: "all", label: "All", icon: BookOpen },
              { key: "full_mock", label: "Full Mock", icon: Award },
              { key: "topic_wise", label: "Topic", icon: Target }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilterType(tab.key as any);
                  setSelectedExam("all");
                  setSelectedSubject("all");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 tap-highlight ${filterType === tab.key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-100"
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Show Exam tabs for All/Full Mock, Subject tabs for Topic */}
          {filterType === "topic_wise" ? (
            // Subject tabs for topic-wise tests
            subjects.length > 0 && (
              <div
                className="scrollbar-hide pb-1 -mx-1 px-1"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  gap: '0.5rem',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <button
                  onClick={() => setSelectedSubject("all")}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all tap-highlight ${selectedSubject === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                  style={{ flexShrink: 0 }}
                >
                  All
                </button>
                {subjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubject(s.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap tap-highlight flex items-center gap-1.5 ${selectedSubject === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                    style={{ flexShrink: 0 }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )
          ) : (
            // Exam tabs for All/Full Mock
            exams.length > 0 && (
              <div
                className="scrollbar-hide pb-1 -mx-1 px-1"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  gap: '0.5rem',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <button
                  onClick={() => setSelectedExam("all")}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all tap-highlight ${selectedExam === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                  style={{ flexShrink: 0 }}
                >
                  All
                </button>
                {exams.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedExam(e.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap tap-highlight flex items-center gap-1.5 ${selectedExam === e.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                    style={{ flexShrink: 0 }}
                  >
                    {e.name}
                    {e.is_paid && !hasSubscription && <Lock className="w-2.5 h-2.5 opacity-60" />}
                    {e.is_paid && hasSubscription && <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />}
                  </button>
                ))}
              </div>
            )
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TEST LIST - Compact Mobile Cards
              ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredTests.map((test, idx) => {
                const attempt = testAttempts[test.id];
                return (
                  <motion.div
                    layout
                    key={test.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden tap-highlight"
                  >
                    <div className="p-3 flex items-center gap-3">
                      {/* Type Badge & Score */}
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${attempt?.passed ? 'bg-emerald-50' : test.test_type === 'full_mock' ? 'bg-indigo-50' : 'bg-slate-50'
                        }`}>
                        {attempt ? (
                          <>
                            <span className={`text-sm font-bold ${attempt.passed ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {attempt.best_percentage}%
                            </span>
                            {attempt.passed && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                          </>
                        ) : (
                          <span className={`text-[9px] font-bold uppercase ${test.test_type === 'full_mock' ? 'text-indigo-600' : 'text-slate-500'
                            }`}>
                            {test.test_type === 'full_mock' ? 'Full' : 'Topic'}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{test.title}</h3>
                          {test.is_paid && (
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${hasSubscription ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {hasSubscription ? 'PREMIUM UNLOCKED' : 'PREMIUM'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-medium">{test.duration_minutes}m</span>
                          </div>
                          <span className="text-[10px]">•</span>
                          <span className="text-[10px] font-medium">{test.total_marks} marks</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/student/take-test/${test.id}`)}
                        className={`px-3 py-2 rounded-lg font-bold text-xs shrink-0 tap-highlight ${attempt
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-indigo-600 text-white shadow-sm'
                          }`}
                      >
                        {attempt ? (
                          <div className="flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start</span>
                          </div>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredTests.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No tests found</h3>
                <p className="text-slate-500 text-sm">Try changing your filters or choosing another category</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentExams;
