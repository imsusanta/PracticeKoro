import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import {
  BrandBar,
  EmptyState,
  ExamIcon,
  FilterChips,
  FlowHint,
  SearchField,
  TestSeriesBottomNav,
  TestSeriesCanvas,
  TestSeriesSkeleton,
} from "@/components/student/test-series/TestSeriesUI";
import { TEST_SERIES_EXAMS } from "@/data/testSeriesCatalog";
import { useExams, useMockTests } from "@/hooks/useStudentData";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const StudentExams = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const { data: liveExams = [], isLoading: loadingExams } = useExams();
  const { data: liveTests = [], isLoading: loadingTests } = useMockTests();

  const visibleExams = useMemo(() => {
    const normalizedQuery = normalize(query);

    return TEST_SERIES_EXAMS.filter((exam) => {
      const matchesCategory = category === "All" || exam.category === category;
      const searchText = normalize(
        [exam.name, exam.subtitle, ...exam.aliases].join(" "),
      );
      const matchesQuery =
        !normalizedQuery || searchText.includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const getAvailableTests = (aliases: string[], fallback: number) => {
    const liveExam = liveExams.find((item) => {
      const liveName = normalize(item.name);
      return aliases.some((alias) => {
        const normalizedAlias = normalize(alias);
        return (
          liveName.includes(normalizedAlias) ||
          normalizedAlias.includes(liveName)
        );
      });
    });

    if (!liveExam) return fallback;
    const publishedCount = liveTests.filter(
      (test) => test.exam_id === liveExam.id,
    ).length;
    return publishedCount || fallback;
  };

  const focusSearch = () => {
    document.getElementById("test-series-search")?.focus();
  };

  return (
    <StudentLayout title="Test Series" hideNavbar>
      <TestSeriesCanvas>
        <BrandBar onSearch={focusSearch} />

        <section className="pt-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Exam preparation
          </p>
          <h1 className="mt-1 text-[28px] font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
            Test Series
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Choose an exam to start your preparation
          </p>
        </section>

        <div className="mt-5">
          <SearchField
            inputId="test-series-search"
            value={query}
            onChange={setQuery}
            placeholder="Search exams..."
          />
        </div>

        <div className="mt-3">
          <FilterChips
            items={["All", "State Exams", "Central Exams", "Others"]}
            selected={category}
            onSelect={setCategory}
          />
        </div>

        <div className="mt-4">
          <FlowHint />
        </div>

        <section className="mt-6" aria-labelledby="available-exams-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="available-exams-heading"
              className="text-sm font-extrabold text-slate-950"
            >
              Available exams
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {visibleExams.length} exams
            </span>
          </div>

          {loadingExams && loadingTests ? (
            <TestSeriesSkeleton />
          ) : visibleExams.length ? (
            <div className="space-y-3">
              {visibleExams.map((exam) => {
                const testCount = getAvailableTests(
                  exam.aliases,
                  exam.totalTests,
                );

                return (
                  <button
                    key={exam.slug}
                    type="button"
                    onClick={() => navigate(`/student/exam/${exam.slug}`)}
                    className="group flex min-h-[78px] w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <ExamIcon icon={exam.icon} accent={exam.accent} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-slate-950 sm:text-base">
                        {exam.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                        {exam.subtitle}
                      </span>
                      <span className="mt-1 block text-[11px] font-bold text-blue-600">
                        {testCount} Tests
                      </span>
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                      <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No exams found"
              description="Try another exam name or select a different category."
            />
          )}
        </section>
      </TestSeriesCanvas>
      <TestSeriesBottomNav />
    </StudentLayout>
  );
};

export default StudentExams;
