import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, CheckCircle2, PlayCircle } from "lucide-react";
import StudentLayout from "@/components/student/StudentLayout";
import { useExams, useSubjects, useMockTests, useUserAttempts } from "@/hooks/useStudentData";
import { useStudentAuth } from "@/contexts/StudentContext";
import {
  resolveGroupContext,
  matchDbSubject,
  fetchChapters,
  fetchChapterQuestionCounts,
  getChapterMockTestsForSubject,
  matchesChapter,
  ChapterItem,
} from "@/services/testSeriesService";
import {
  ScreenHeader,
  EmptyState,
  SectionTitle,
} from "@/components/student/TestSeriesUI";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Chapters() {
  const navigate = useNavigate();
  const { examId = "others", subjectId = "" } = useParams();
  const { user } = useStudentAuth();
  const { data: exams = [] } = useExams();
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();
  const { data: mockTests = [] } = useMockTests();
  const { data: attempts = {} } = useUserAttempts(user?.id);

  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const { group } = useMemo(() => resolveGroupContext(examId, exams), [examId, exams]);

  const subject = useMemo(() => {
    const byId = subjects.find((s) => s.id === subjectId);
    if (byId) return byId;
    return matchDbSubject(decodeURIComponent(subjectId), subjects);
  }, [subjects, subjectId]);

  const subjectMocks = useMemo(
    () => (subject ? getChapterMockTestsForSubject(subject.id, subject.name, mockTests) : []),
    [subject, mockTests]
  );

  useEffect(() => {
    if (subjectsLoading || !subject) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ch, qc] = await Promise.all([
          fetchChapters(subject.id),
          fetchChapterQuestionCounts(subject.name),
        ]);
        if (!cancelled) {
          setChapters(ch);
          setCounts(qc);
        }
      } catch {
        if (!cancelled) {
          setChapters([]);
          setCounts({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectsLoading, subject]);

  if (!subjectsLoading && !subject) {
    return (
      <StudentLayout title="Chapters" subtitle="Select a chapter to view tests">
        <div className="max-w-md mx-auto w-full">
          <ScreenHeader title="Chapters" subtitle="Select a chapter to view tests" />
          <EmptyState title="Subject not found" desc="This subject is not available right now." />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={subject?.name || "Chapters"} subtitle="Select a chapter to view tests">
      <div className="max-w-md mx-auto w-full">
        <ScreenHeader
          title={subject?.name || "Chapters"}
          subtitle={`${chapters.length} Chapters · ${subjectMocks.length} Chapter Tests`}
        />

        <SectionTitle title="History → Chapter → Tests" />

        {loading || subjectsLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[68px] rounded-2xl" />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <EmptyState
            title="No chapters yet"
            desc={`Chapters for ${subject?.name} are being prepared. Check back soon.`}
          />
        ) : (
          <div className="space-y-2.5">
            {chapters.map((ch, i) => {
              const qCount = counts[ch.name] ?? counts["General"] ?? 0;
              const matched = subjectMocks.filter((t) => matchesChapter(t.title, ch.name)).length;
              const testCount = matched + 1; // + chapter drill
              const att = (attempts as Record<string, { attempt_count: number; passed: boolean }>)[
                `topic-${ch.id}`
              ];
              const done = !!att && att.attempt_count > 0;
              return (
                <motion.button
                  key={ch.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    navigate(`/student/test-series/${group.id}/subjects/${subject!.id}/chapters/${ch.id}`)
                  }
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-left"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 border ${
                      done
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                      {ch.name}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {testCount} {testCount === 1 ? "Test" : "Tests"} · {qCount}{" "}
                      {qCount === 1 ? "Question" : "Questions"}
                    </p>
                  </div>
                  {done ? (
                    <PlayCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
