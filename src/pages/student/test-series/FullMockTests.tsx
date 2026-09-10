import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";
import { useExams, useMockTests, useUserAttempts } from "@/hooks/useStudentData";
import { useStudentAuth } from "@/contexts/StudentContext";
import { MockTest } from "@/services/examService";
import {
  resolveGroupContext,
  getFullMockTestsForExam,
  resolveTestStatus,
} from "@/services/testSeriesService";
import {
  ScreenHeader,
  StatusPill,
  ProBadge,
  EmptyState,
  SectionTitle,
  FileText,
} from "@/components/student/TestSeriesUI";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";

export default function FullMockTests() {
  const { examId = "others" } = useParams();
  const { user, hasSubscription } = useStudentAuth();
  const { data: exams = [], isLoading: examsLoading } = useExams();
  const { data: mockTests = [], isLoading: testsLoading } = useMockTests();
  const { data: attempts = {} } = useUserAttempts(user?.id);
  const [selected, setSelected] = useState<MockTest | null>(null);

  const { group, dbExams, displayName } = useMemo(
    () => resolveGroupContext(examId, exams),
    [examId, exams]
  );
  const primaryExamId = dbExams[0]?.id || examId;
  const tests = useMemo(
    () => getFullMockTestsForExam(primaryExamId, displayName, mockTests),
    [primaryExamId, displayName, mockTests]
  );

  const loading = examsLoading || testsLoading;

  return (
    <StudentLayout title="Full Mock Tests" subtitle={displayName}>
      <div className="max-w-md mx-auto w-full">
        <ScreenHeader title="Full Mock Tests" subtitle={displayName} />

        <SectionTitle
          icon={<FileText className="w-4 h-4 text-red-500" />}
          title={`${tests.length} Full-Length Tests`}
        />

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[84px] rounded-2xl" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <EmptyState
            title="No mock tests yet"
            desc="Full mock tests for this exam are being prepared. Check back soon."
          />
        ) : (
          <div className="space-y-2.5">
            {tests.map((t, i) => {
              const status = resolveTestStatus(t, attempts as Record<string, { attempt_count: number; passed: boolean }>, hasSubscription);
              return (
                <div
                  key={t.id}
                  className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                          {t.title || `Mock Test ${String(i + 1).padStart(2, "0")}`}
                        </p>
                        {t.is_paid && <ProBadge />}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {t.total_marks || 100} Questions · {t.duration_minutes || 60} Min
                      </p>
                    </div>
                    {status === "pro" && <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-1" />}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400">
                      As per latest pattern
                    </span>
                    <StatusPill status={status} onClick={() => setSelected(t)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <TestDetailsModal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          test={
            selected
              ? {
                  id: selected.id,
                  title: selected.title,
                  examName: displayName,
                  totalQuestions: selected.total_marks,
                  durationMinutes: selected.duration_minutes,
                  totalMarks: selected.total_marks,
                  isPaid: selected.is_paid,
                  testType: "full_mock",
                }
              : null
          }
        />
      </div>
    </StudentLayout>
  );
}
