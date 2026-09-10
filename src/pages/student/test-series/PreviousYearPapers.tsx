import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";
import { useExams, useUserAttempts } from "@/hooks/useStudentData";
import { useStudentAuth } from "@/contexts/StudentContext";
import {
  resolveGroupContext,
  getPyqsForExam,
  resolveTestStatus,
  ExamPyq,
} from "@/services/testSeriesService";
import {
  ScreenHeader,
  StatusPill,
  ProBadge,
  EmptyState,
  SectionTitle,
} from "@/components/student/TestSeriesUI";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Lock, BadgeCheck } from "lucide-react";

export default function PreviousYearPapers() {
  const { examId = "others" } = useParams();
  const { user, hasSubscription } = useStudentAuth();
  const { data: exams = [], isLoading } = useExams();
  const { data: attempts = {} } = useUserAttempts(user?.id);
  const [selected, setSelected] = useState<ExamPyq | null>(null);

  const { dbExams, displayName } = useMemo(
    () => resolveGroupContext(examId, exams),
    [examId, exams]
  );
  const primaryExamId = dbExams[0]?.id || examId;
  const papers = useMemo(
    () => getPyqsForExam(primaryExamId, displayName).sort((a, b) => b.year - a.year),
    [primaryExamId, displayName]
  );

  return (
    <StudentLayout title="Previous Year Papers" subtitle={displayName}>
      <div className="max-w-md mx-auto w-full">
        <ScreenHeader title="Previous Year Papers" subtitle={displayName} />

        <div className="flex items-center gap-2 mb-3 px-1 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-3">
          <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 font-medium leading-snug">
            Real previous-year papers converted into test format with solutions.
          </p>
        </div>

        <SectionTitle
          icon={<History className="w-4 h-4 text-blue-600" />}
          title={`${papers.length} Papers`}
        />

        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[84px] rounded-2xl" />
            ))}
          </div>
        ) : papers.length === 0 ? (
          <EmptyState
            title="No papers yet"
            desc="Previous year papers for this exam are being added. Check back soon."
          />
        ) : (
          <div className="space-y-2.5">
            {papers.map((p) => {
              const status = resolveTestStatus(
                { id: p.id, is_paid: p.isPaid },
                attempts as Record<string, { attempt_count: number; passed: boolean }>,
                hasSubscription
              );
              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                          {p.title}
                        </p>
                        {p.isPaid && <ProBadge />}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {p.questions} Questions · {p.duration} Min
                      </p>
                    </div>
                    {status === "pro" && <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-1" />}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400">{p.subtitle}</span>
                    <StatusPill status={status} onClick={() => setSelected(p)} />
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
                  totalQuestions: selected.questions,
                  durationMinutes: selected.duration,
                  totalMarks: selected.marks,
                  isPaid: selected.isPaid,
                  isPyq: true,
                  year: selected.year,
                  testType: "full_mock",
                }
              : null
          }
        />
      </div>
    </StudentLayout>
  );
}
