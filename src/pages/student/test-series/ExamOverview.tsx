import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentLayout from "@/components/student/StudentLayout";
import { useExams, useMockTests, useSubjects } from "@/hooks/useStudentData";
import {
  resolveGroupContext,
  getFullMockTestsForExam,
  getPyqsForExam,
} from "@/services/testSeriesService";
import {
  ScreenHeader,
  ExamGroupIcon,
  NavCard,
  FileText,
  Layers,
  ClipboardList,
} from "@/components/student/TestSeriesUI";
import { BookOpenCheck, History } from "lucide-react";

export default function ExamOverview() {
  const navigate = useNavigate();
  const { examId = "others" } = useParams();
  const { data: exams = [] } = useExams();
  const { data: mockTests = [] } = useMockTests();
  const { data: subjects = [] } = useSubjects();

  const { group, dbExams, displayName } = useMemo(
    () => resolveGroupContext(examId, exams),
    [examId, exams]
  );

  const primaryExamId = dbExams[0]?.id || examId;
  const mocks = useMemo(
    () => getFullMockTestsForExam(primaryExamId, displayName, mockTests),
    [primaryExamId, displayName, mockTests]
  );
  const pyqs = useMemo(() => getPyqsForExam(primaryExamId, displayName), [primaryExamId, displayName]);
  const totalTests = mocks.length + pyqs.length;

  const base = `/student/test-series/${group.id}`;

  return (
    <StudentLayout title={displayName} subtitle={group.fullName}>
      <div className="max-w-md mx-auto w-full">
        <ScreenHeader title={displayName} subtitle={group.fullName} />

        {/* Compact exam header card */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 mb-3">
          <div className="flex items-center gap-3">
            <ExamGroupIcon icon={group.icon} tile={group.tile} />
            <div className="min-w-0">
              <p className="text-base font-extrabold text-slate-900 tracking-tight">{displayName}</p>
              <p className="text-xs text-slate-500 font-medium">{group.fullName} · {group.subtitle}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-3">{group.description}</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-extrabold text-[#0066FF]">{totalTests} Tests</span>
            <span className="text-slate-200">|</span>
            <span className="text-xs font-semibold text-slate-500">{subjects.length} Subjects</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-2.5">
          <NavCard
            icon={<FileText className="w-6 h-6 text-red-500" />}
            tint="bg-red-50 border-red-200"
            title="Full Mock Tests"
            desc={`Attempt full-length tests as per the latest exam pattern.`}
            onClick={() => navigate(`${base}/full-mocks`)}
          />
          <NavCard
            icon={<History className="w-6 h-6 text-blue-600" />}
            tint="bg-blue-50 border-blue-200"
            title="Previous Year Papers"
            desc="Practice real exam papers and understand the pattern."
            onClick={() => navigate(`${base}/pyq`)}
          />
          <NavCard
            icon={<Layers className="w-6 h-6 text-emerald-600" />}
            tint="bg-emerald-50 border-emerald-200"
            title="Subject Tests"
            desc="Practice subject-wise tests to strengthen your concepts."
            onClick={() => navigate(`${base}/subjects`)}
          />
          <NavCard
            icon={<BookOpenCheck className="w-6 h-6 text-violet-600" />}
            tint="bg-violet-50 border-violet-200"
            title="Chapter Tests"
            desc="Practice chapter-wise tests for focused preparation."
            onClick={() => navigate(`${base}/subjects`)}
          />
          <NavCard
            icon={<ClipboardList className="w-6 h-6 text-[#0066FF]" />}
            tint="bg-[#0066FF]/5 border-[#0066FF]/20"
            title="Practice. Analyze. Improve."
            desc="Stay consistent and achieve your goal."
            onClick={() => navigate("/student/practice")}
          />
        </div>
      </div>
    </StudentLayout>
  );
}
