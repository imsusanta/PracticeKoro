import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import { TestDetailsModal } from "@/components/student/TestDetailsModal";
import { useExams, useSubjects, useMockTests, useUserAttempts } from "@/hooks/useStudentData";
import { useStudentAuth } from "@/contexts/StudentContext";
import { supabase } from "@/integrations/supabase/client";
import { MockTest } from "@/services/examService";
import {
  resolveGroupContext,
  matchDbSubject,
  getChapterMockTestsForSubject,
  matchesChapter,
  fetchChapterQuestionCounts,
  resolveTestStatus,
} from "@/services/testSeriesService";
import {
  ScreenHeader,
  CompactStatusButton,
  TestStatus,
  ProgressBar,
  EmptyState,
  ProBadge,
} from "@/components/student/TestSeriesUI";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";

interface ChapterTestEntry {
  key: string;
  label: string;
  meta: string;
  status: TestStatus;
  isPaid: boolean;
  mock?: MockTest;
  drillChapterId?: string;
}

export default function ChapterTests() {
  const navigate = useNavigate();
  const { examId = "others", subjectId = "", chapterId = "" } = useParams();
  const { user, hasSubscription } = useStudentAuth();
  const { data: exams = [] } = useExams();
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();
  const { data: mockTests = [] } = useMockTests();
  const { data: attempts = {} } = useUserAttempts(user?.id);
  const [chapterName, setChapterName] = useState("");
  const [qCount, setQCount] = useState(0);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [selected, setSelected] = useState<MockTest | null>(null);

  const { group } = useMemo(() => resolveGroupContext(examId, exams), [examId, exams]);

  const subject = useMemo(() => {
    const byId = subjects.find((s) => s.id === subjectId);
    if (byId) return byId;
    return matchDbSubject(decodeURIComponent(subjectId), subjects);
  }, [subjects, subjectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      try {
        const { data } = await supabase
          .from("topics")
          .select("id, name, subject_id")
          .eq("id", chapterId)
          .maybeSingle();
        if (!cancelled && data) setChapterName((data as { name: string }).name);
      } catch {
        /* offline-safe: name stays empty */
      }
      try {
        if (subject) {
          const qc = await fetchChapterQuestionCounts(subject.name);
          if (!cancelled) {
            const name = chapterName;
            setQCount(qc[name] ?? 0);
          }
        }
      } catch {
        /* counts stay zero */
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, subject?.id]);

  const entries: ChapterTestEntry[] = useMemo(() => {
    if (!subject) return [];
    const mocks = getChapterMockTestsForSubject(subject.id, subject.name, mockTests).filter((t) =>
      chapterName ? matchesChapter(t.title, chapterName) : true
    );
    const list: ChapterTestEntry[] = mocks.map((m, i) => ({
      key: m.id,
      label: mocks.length > 1 ? `Test ${i + 1} · ${m.title}` : m.title,
      meta: `${m.duration_minutes || 20} Min`,
      status: resolveTestStatus(
        m,
        attempts as Record<string, { attempt_count: number; passed: boolean }>,
        hasSubscription
      ),
      isPaid: !!m.is_paid,
      mock: m,
    }));
    const drillAtt = (attempts as Record<string, { attempt_count: number; passed: boolean }>)[
      `topic-${chapterId}`
    ];
    const drillStatus: TestStatus = drillAtt
      ? drillAtt.attempt_count === 0
        ? "start"
        : drillAtt.passed
          ? "completed"
          : "continue"
      : "start";
    list.push({
      key: `topic-${chapterId}`,
      label: chapterName ? `${chapterName} Practice Test` : "Chapter Practice Test",
      meta: "15 Questions · 20 Min",
      status: drillStatus,
      isPaid: false,
      drillChapterId: chapterId,
    });
    return list;
  }, [subject, mockTests, chapterName, chapterId, attempts, hasSubscription]);

  const completed = entries.filter((e) => e.status === "completed").length;
  const progressPct = entries.length > 0 ? (completed / entries.length) * 100 : 0;

  const openEntry = (e: ChapterTestEntry) => {
    if (e.status === "pro" && e.mock) {
      setSelected(e.mock);
      return;
    }
    if (e.mock) {
      setSelected(e.mock);
      return;
    }
    if (e.drillChapterId) navigate(`/student/take-test/topic-${e.drillChapterId}`);
  };

  return (
    <StudentLayout title={chapterName || "Chapter Tests"} subtitle={subject?.name}>
      <div className="max-w-md mx-auto w-full">
        <ScreenHeader title={chapterName || "Chapter Tests"} subtitle={subject?.name} />

        {/* Compact header */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 mb-3">
          <p className="text-sm font-extrabold text-slate-900 tracking-tight">
            {chapterName || "Chapter"}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {entries.length} {entries.length === 1 ? "Test" : "Tests"}
            {qCount > 0 ? ` · ${qCount} Questions` : ""}
          </p>
          <div className="mt-3">
            <ProgressBar
              value={progressPct}
              label={`${completed} / ${entries.length} Tests · ${Math.round(progressPct)}%`}
            />
          </div>
        </div>

        {subjectsLoading || loadingMeta ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[68px] rounded-2xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState title="No tests yet" desc="Tests for this chapter are being prepared." />
        ) : (
          <div className="space-y-2.5">
            {entries.map((e, i) => (
              <div
                key={e.key}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                      {entries.length > 1 && e.mock ? `Test ${i + 1}` : e.label}
                    </p>
                    {e.isPaid && <ProBadge />}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {e.mock ? e.mock.title : e.meta}
                    {e.mock ? ` · ${e.mock.duration_minutes || 20} Min` : ""}
                  </p>
                </div>
                {e.status === "pro" && <Lock className="w-4 h-4 text-amber-500 shrink-0" />}
                <CompactStatusButton status={e.status} onClick={() => openEntry(e)} />
              </div>
            ))}
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
                  examName: subject?.name,
                  totalQuestions: selected.total_marks,
                  durationMinutes: selected.duration_minutes,
                  totalMarks: selected.total_marks,
                  isPaid: selected.is_paid,
                  testType: "topic_wise",
                  subjectName: subject?.name,
                }
              : null
          }
        />
      </div>
    </StudentLayout>
  );
}
