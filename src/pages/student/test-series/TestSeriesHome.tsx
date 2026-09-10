import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import { useExams, useMockTests } from "@/hooks/useStudentData";
import {
  resolveExamCards,
  groupMatchesCategory,
  ExamCategory,
} from "@/services/testSeriesService";
import {
  ScreenHeader,
  SearchInput,
  FilterChips,
  ExamCard,
  EmptyState,
} from "@/components/student/TestSeriesUI";
import { Skeleton } from "@/components/ui/skeleton";

const FILTERS: Array<{ id: "all" | ExamCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "state", label: "State Exams" },
  { id: "central", label: "Central Exams" },
  { id: "others", label: "Others" },
];

export default function TestSeriesHome() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ExamCategory>("all");
  const { data: exams = [], isLoading } = useExams();
  const { data: mockTests = [] } = useMockTests();

  const cards = useMemo(() => resolveExamCards(exams, mockTests), [exams, mockTests]);

  const visible = cards.filter((c) => {
    if (!groupMatchesCategory(c.group, filter)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.group.name.toLowerCase().includes(q) ||
      c.group.fullName.toLowerCase().includes(q) ||
      (c.dbExamName || "").toLowerCase().includes(q)
    );
  });

  return (
    <StudentLayout title="Test Series" subtitle="Choose an exam to start your preparation" hideNavbar={false}>
      <div className="max-w-md mx-auto w-full">
        <ScreenHeader title="Test Series" subtitle="Choose an exam to start your preparation" />

        <SearchInput value={query} onChange={setQuery} placeholder="Search exams..." />
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[76px] rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="No exams found"
            desc="Try a different search term or category filter."
          />
        ) : (
          <div className="space-y-2.5">
            {visible.map(({ group, dbExamName, testCount }) => (
              <ExamCard
                key={group.id}
                icon={group.icon}
                tile={group.tile}
                name={dbExamName || group.name}
                subtitle={group.fullName}
                testsLabel={`${testCount} Tests`}
                onClick={() => navigate(`/student/test-series/${group.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
