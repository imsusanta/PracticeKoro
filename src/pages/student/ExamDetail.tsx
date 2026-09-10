import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Heart,
  Layers3,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";
import StudentLayout from "@/components/student/StudentLayout";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";
import {
  EmptyState,
  ExamIcon,
  FilterChips,
  IconTile,
  ScreenHeader,
  SectionCard,
  SubjectIcon,
  TestRow,
  TestSeriesBottomNav,
  TestSeriesCanvas,
  screenIcons,
} from "@/components/student/test-series/TestSeriesUI";
import {
  FULL_MOCK_TESTS,
  PREVIOUS_YEAR_PAPERS,
  SUBJECT_CATALOG,
  TestCatalogItem,
  getChapterTests,
  getChaptersForSubject,
  getExamBySlug,
  getSubjectBySlug,
} from "@/data/testSeriesCatalog";
import { useStudentAuth } from "@/contexts/StudentContext";
import { useExams, useMockTests, useUserAttempts } from "@/hooks/useStudentData";
import { initRazorpayPayment } from "@/utils/payment";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type DetailView =
  | "overview"
  | "full-mocks"
  | "previous-years"
  | "subjects"
  | "chapters"
  | "chapter-tests";

const ExamDetail = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const exam = getExamBySlug(examId);
  const view = (searchParams.get("view") || "overview") as DetailView;
  const subjectSlug = searchParams.get("subject") || "history";
  const chapterSlug = searchParams.get("chapter") || "modern-india";
  const subject = getSubjectBySlug(subjectSlug);
  const chapters = getChaptersForSubject(subject.slug);
  const chapter = chapters.find((item) => item.slug === chapterSlug) || chapters[0];

  const { user, hasSubscription, subscriptionFee, refreshSubscription } = useStudentAuth();
  const { data: liveExams = [] } = useExams();
  const { data: liveTests = [] } = useMockTests();
  const { data: attempts = {} } = useUserAttempts(user?.id);

  const [isSaved, setIsSaved] = useState(false);
  const [testFilter, setTestFilter] = useState("All Tests");
  const [selectedTest, setSelectedTest] = useState<any | null>(null);

  const liveExam = useMemo(
    () =>
      liveExams.find((item) => {
        const liveName = normalize(item.name);
        return exam.aliases.some((alias) => {
          const normalizedAlias = normalize(alias);
          return liveName.includes(normalizedAlias) || normalizedAlias.includes(liveName);
        });
      }),
    [exam.aliases, liveExams],
  );

  const liveFullMocks = useMemo(
    () =>
      liveTests.filter(
        (test) => test.exam_id === liveExam?.id && test.test_type === "full_mock",
      ),
    [liveExam?.id, liveTests],
  );

  const fullMockRows: TestCatalogItem[] = useMemo(() => {
    if (!liveFullMocks.length) return FULL_MOCK_TESTS;

    return liveFullMocks.map((test, index) => {
      const attempt = attempts[test.id];
      return {
        id: test.id,
        title: test.title || `Mock Test ${String(index + 1).padStart(2, "0")}`,
        questions: Number((test as any).total_questions || test.total_marks || 100),
        duration: test.duration_minutes || 60,
        status: attempt
          ? "completed"
          : test.is_paid && !hasSubscription
            ? "locked"
            : "start",
      };
    });
  }, [attempts, hasSubscription, liveFullMocks]);

  const setView = (nextView: DetailView, values?: Record<string, string>) => {
    const params = new URLSearchParams({ view: nextView, ...(values || {}) });
    navigate(`/student/exam/${exam.slug}?${params.toString()}`);
  };

  const handleBack = () => {
    if (view === "overview") {
      navigate("/student/exam");
      return;
    }
    if (view === "chapters") {
      setView("subjects");
      return;
    }
    if (view === "chapter-tests") {
      setView("chapters", { subject: subject.slug });
      return;
    }
    setView("overview");
  };

  const handleUpgrade = async () => {
    if (hasSubscription) {
      toast.success("PracticeKoro Pro is already active.");
      return;
    }

    try {
      await initRazorpayPayment({
        amount: subscriptionFee || 199,
        contentId: "site_yearly_subscription",
        contentType: "subscription",
        title: "PracticeKoro Pro Pass",
        description: "Unlock every Test Series and solution for one year",
      });
      await refreshSubscription();
      toast.success("Pro access activated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to open the upgrade flow.";
      if (message !== "Payment cancelled") toast.info(message);
    }
  };

  const openCatalogTest = (test: TestCatalogItem, examName = exam.subtitle) => {
    if (test.status === "locked") {
      void handleUpgrade();
      return;
    }

    if (test.status === "completed") {
      const attempt = attempts[test.id];
      if (attempt?.attempt_id) {
        navigate(`/student/test-review/${attempt.attempt_id}`);
      } else {
        navigate("/student/results");
      }
      return;
    }

    const liveTest = liveFullMocks.find((item) => item.id === test.id);
    setSelectedTest({
      id: test.id,
      title: test.title,
      examName,
      totalQuestions: test.questions,
      durationMinutes: test.duration,
      totalMarks: liveTest?.total_marks || test.questions,
      negativeMarking: "-0.25",
      isPaid: false,
      isPyq: test.isPreviousYear,
      year: test.year,
      language: "Bengali / English",
    });
  };

  const renderOverview = () => {
    const availableTests = liveTests.filter((test) => test.exam_id === liveExam?.id).length;
    const testCount = availableTests || exam.totalTests;

    return (
      <>
        <ScreenHeader
          title={exam.name}
          onBack={handleBack}
          trailing={
            <button
              type="button"
              onClick={() => setIsSaved((current) => !current)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSaved ? "bg-rose-50 text-rose-600" : "text-slate-700 hover:bg-slate-100"
              }`}
              aria-label={isSaved ? "Remove from saved exams" : "Save exam"}
              aria-pressed={isSaved}
            >
              <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
            </button>
          }
        />

        <section className="mt-4 rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
          <div className="flex items-start gap-4">
            <ExamIcon icon={exam.icon} accent={exam.accent} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">
                {exam.category}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-slate-950">
                {exam.name}
              </h1>
              <p className="text-sm font-semibold text-slate-600">{exam.subtitle}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{exam.description}</p>
          <div className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-blue-200 bg-white px-3 text-xs font-extrabold text-blue-700">
            {testCount} Tests available
          </div>
        </section>

        <section className="mt-7" aria-labelledby="test-type-heading">
          <div className="mb-3">
            <h2 id="test-type-heading" className="text-lg font-black tracking-[-0.025em] text-slate-950">
              Choose a test type
            </h2>
            <p className="mt-1 text-sm text-slate-500">Start with the format that matches your plan.</p>
          </div>

          <div className="space-y-3">
            <SectionCard
              icon={ClipboardCheck}
              title="Full Mock Tests"
              description="Attempt complete tests based on the latest exam pattern."
              accent="rose"
              onClick={() => setView("full-mocks")}
            />
            <SectionCard
              icon={FileCheck2}
              title="Previous Year Papers"
              description="Practice real exam papers converted into test format."
              accent="blue"
              onClick={() => setView("previous-years")}
            />
            <SectionCard
              icon={Layers3}
              title="Subject Tests"
              description="Strengthen one subject at a time with focused tests."
              accent="emerald"
              onClick={() => setView("subjects")}
            />
            <SectionCard
              icon={BookOpen}
              title="Chapter Tests"
              description="Choose a subject, then practice chapter by chapter."
              accent="violet"
              onClick={() => setView("subjects")}
            />
          </div>
        </section>
      </>
    );
  };

  const renderFullMocks = () => (
    <>
      <ScreenHeader title="Full Mock Tests" onBack={handleBack} />
      <section className="mt-4">
        <p className="text-sm leading-6 text-slate-500">
          Full-length tests aligned with the latest {exam.name} exam pattern.
        </p>
        <div className="mt-5 space-y-3">
          {fullMockRows.map((test) => (
            <TestRow key={test.id} test={test} onAction={() => openCatalogTest(test)} />
          ))}
        </div>
      </section>
    </>
  );

  const renderPreviousYears = () => (
    <>
      <ScreenHeader title="Previous Year Papers" onBack={handleBack} />
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <IconTile icon={FileCheck2} accent="blue" size="sm" />
        <div>
          <h2 className="text-sm font-extrabold text-slate-950">Real papers, ready to attempt</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Official previous-year papers converted into timed test format.
          </p>
        </div>
      </div>
      <section className="mt-5 space-y-3">
        {PREVIOUS_YEAR_PAPERS.map((paper) => (
          <TestRow key={paper.id} test={paper} onAction={() => openCatalogTest(paper)} />
        ))}
      </section>
    </>
  );

  const renderSubjects = () => (
    <>
      <ScreenHeader title="Subject Tests" onBack={handleBack} />
      <section className="mt-4">
        <h1 className="text-xl font-black tracking-[-0.03em] text-slate-950">Select a subject to practice</h1>
        <div className="mt-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.11em] text-slate-500">
          <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">Subject</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Chapter</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Test</span>
        </div>

        <div className="mt-5 space-y-3">
          {SUBJECT_CATALOG.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => setView("chapters", { subject: item.slug })}
              className="group flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:border-blue-200 hover:shadow-[0_6px_16px_rgba(15,23,42,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <SubjectIcon icon={item.icon} accent={item.accent} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-slate-950 sm:text-base">
                  {item.name}
                </span>
                <span className="mt-1 block text-xs font-medium text-slate-500">{item.tests} Tests</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </section>
    </>
  );

  const renderChapters = () => (
    <>
      <ScreenHeader title={subject.name} onBack={handleBack} />
      <section className="mt-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4">
          <div className="flex items-center gap-3">
            <SubjectIcon icon={subject.icon} accent={subject.accent} />
            <div>
              <h1 className="text-lg font-black tracking-[-0.025em] text-slate-950">{subject.name}</h1>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">Subject → Chapter → Test</p>
            </div>
          </div>
        </div>

        <div className="mb-3 mt-6">
          <h2 className="text-lg font-black tracking-[-0.025em] text-slate-950">Select a chapter to view tests</h2>
          <p className="mt-1 text-sm text-slate-500">Build confidence one chapter at a time.</p>
        </div>

        <div className="space-y-3">
          {chapters.map((item, index) => (
            <button
              key={item.slug}
              type="button"
              onClick={() =>
                setView("chapter-tests", { subject: subject.slug, chapter: item.slug })
              }
              className="group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-600">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-slate-950 sm:text-base">
                  {item.name}
                </span>
                <span className="mt-1 block text-xs font-medium text-slate-500">
                  {item.tests} Tests <span aria-hidden="true">·</span> {item.questions} Questions
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </section>
    </>
  );

  const renderChapterTests = () => {
    const allTests = getChapterTests(chapter);
    const completedCount = allTests.filter((test) => test.status === "completed").length;
    const progress = Math.round((completedCount / allTests.length) * 100);
    const visibleTests = allTests.filter((test) => {
      if (testFilter === "All Tests") return true;
      if (testFilter === "Not Started") return test.status === "start" || test.status === "locked";
      if (testFilter === "In Progress") return test.status === "continue";
      return test.status === "completed";
    });

    return (
      <>
        <ScreenHeader title={chapter.name} onBack={handleBack} />

        <section className="mt-4 rounded-2xl border border-slate-200/90 bg-white p-4">
          <div className="flex items-center gap-3">
            <IconTile icon={BookOpen} accent="violet" size="md" />
            <div>
              <h1 className="text-lg font-black tracking-[-0.025em] text-slate-950">{chapter.name}</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {chapter.tests} Tests <span aria-hidden="true">·</span> {chapter.questions} Questions
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4" aria-label="Your Progress">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-blue-700">Your Progress</p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                {completedCount} / {allTests.length} Tests
              </p>
            </div>
            <p className="text-2xl font-black tracking-[-0.04em] text-blue-700">{progress}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-[#026BFC] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <div className="mt-4">
          <FilterChips
            items={["All Tests", "Not Started", "In Progress", "Completed"]}
            selected={testFilter}
            onSelect={setTestFilter}
          />
        </div>

        <section className="mt-4 space-y-3">
          {visibleTests.length ? (
            visibleTests.map((test) => (
              <TestRow
                key={test.id}
                test={test}
                startLabel="Start"
                onAction={() => openCatalogTest(test, `${subject.name} · ${chapter.name}`)}
              />
            ))
          ) : (
            <EmptyState title="No tests in this status" description="Choose another status to continue." />
          )}
        </section>
      </>
    );
  };

  const renderCurrentView = () => {
    switch (view) {
      case "full-mocks":
        return renderFullMocks();
      case "previous-years":
        return renderPreviousYears();
      case "subjects":
        return renderSubjects();
      case "chapters":
        return renderChapters();
      case "chapter-tests":
        return renderChapterTests();
      default:
        return renderOverview();
    }
  };

  return (
    <StudentLayout title={exam.name} hideNavbar>
      <TestSeriesCanvas>{renderCurrentView()}</TestSeriesCanvas>
      <TestSeriesBottomNav />
      <TestDetailsModal
        isOpen={!!selectedTest}
        onClose={() => setSelectedTest(null)}
        test={selectedTest}
      />
    </StudentLayout>
  );
};

export default ExamDetail;
