import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import StudentLayout from "@/components/student/StudentLayout";
import { useExams, useSubjects, useMockTests } from "@/hooks/useStudentData";
import {
  resolveGroupContext,
  getChapterMockTestsForSubject,
} from "@/services/testSeriesService";
import {
  ScreenHeader,
  SubjectIcon,
  EmptyState,
} from "@/components/student/TestSeriesUI";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function SubjectTests() {
  const navigate = useNavigate();
  const { examId = "others" } = useParams();
  const { data: exams = [] } = useExams();
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: mockTests = [] } = useMockTests();

  const { group, displayName } = useMemo(
    () => resolveGroupContext(examId, exams),
    [examId, exams]
  );

  const rows = useMemo(
    () =>
      subjects.map((s) => ({
        subject: s,
        testCount: getChapterMockTestsForSubject(s.id, s.name, mockTests).length,
      })),
    [subjects, mockTests]
  );

  return (
    <StudentLayout title="Subject Tests" subtitle="Select a subject to practice">
      <div className="max-w-md mx-auto w-full">
        <ScreenHeader
          title="Subject Tests"
          subtitle={displayName ? `${displayName} · Select a subject to practice` : "Select a subject to practice"}
        />

        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[68px] rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No subjects yet"
            desc="Subjects for this exam are being prepared. Check back soon."
          />
        ) : (
          <div className="space-y-2.5">
            {rows.map(({ subject, testCount }) => (
              <motion.button
                key={subject.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/student/test-series/${group.id}/subjects/${subject.id}/chapters`)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-left"
              >
                <SubjectIcon name={subject.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                    {subject.name}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {testCount} {testCount === 1 ? "Test" : "Tests"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
