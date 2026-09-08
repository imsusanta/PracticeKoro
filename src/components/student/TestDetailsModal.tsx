import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Crown,
  ChevronLeft,
} from "lucide-react";

export interface TestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: {
    id: string;
    title: string;
    examName?: string;
    totalQuestions?: number;
    durationMinutes?: number;
    totalMarks?: number;
    negativeMarking?: string | number;
    isPaid?: boolean;
    language?: string;
    attemptsAllowed?: number | string;
    validity?: string;
    isPyq?: boolean;
    year?: number;
    sections?: { id: number; name: string; count: string }[];
  } | null;
}

function getTestSections(title: string, examName?: string, totalQuestions: number = 100) {
  const combined = `${title} ${examName || ""}`.toLowerCase();

  if (combined.includes("cgl") || combined.includes("ssc") || combined.includes("chsl")) {
    const qPerSection = Math.round(totalQuestions / 4);
    return [
      { id: 1, name: "General Intelligence & Reasoning", count: `${qPerSection} Qs` },
      { id: 2, name: "General Awareness", count: `${qPerSection} Qs` },
      { id: 3, name: "Quantitative Aptitude", count: `${qPerSection} Qs` },
      { id: 4, name: "English Comprehension", count: `${totalQuestions - qPerSection * 3} Qs` },
    ];
  }

  if (combined.includes("police") || combined.includes("wbp") || combined.includes("constable") || combined.includes("si")) {
    if (totalQuestions === 85) {
      return [
        { id: 1, name: "General Awareness & GK", count: "25 Qs" },
        { id: 2, name: "Elementary Mathematics", count: "20 Qs" },
        { id: 3, name: "Reasoning & Logical Analysis", count: "15 Qs" },
        { id: 4, name: "English Language", count: "25 Qs" },
      ];
    }
    const qPerSection = Math.max(1, Math.round(totalQuestions / 4));
    return [
      { id: 1, name: "General Awareness & Current Affairs", count: `${qPerSection} Qs` },
      { id: 2, name: "Logical & Analytical Reasoning", count: `${qPerSection} Qs` },
      { id: 3, name: "Elementary Mathematics", count: `${qPerSection} Qs` },
      { id: 4, name: "English Comprehension", count: `${totalQuestions - qPerSection * 3} Qs` },
    ];
  }

  if (combined.includes("railway") || combined.includes("rrb") || combined.includes("ntpc")) {
    const s1 = Math.round(totalQuestions * 0.3);
    const s2 = Math.round(totalQuestions * 0.25);
    const s3 = Math.round(totalQuestions * 0.3);
    const s4 = Math.max(0, totalQuestions - s1 - s2 - s3);
    return [
      { id: 1, name: "General Science", count: `${s1} Qs` },
      { id: 2, name: "Mathematics", count: `${s2} Qs` },
      { id: 3, name: "General Intelligence & Reasoning", count: `${s3} Qs` },
      { id: 4, name: "General Awareness & Current Affairs", count: `${s4} Qs` },
    ];
  }

  if (combined.includes("group d") || combined.includes("clerkship") || combined.includes("food si")) {
    const qPerSection = Math.max(1, Math.round(totalQuestions / 3));
    return [
      { id: 1, name: "General Knowledge & Static GK", count: `${qPerSection} Qs` },
      { id: 2, name: "Current Affairs & Science", count: `${qPerSection} Qs` },
      { id: 3, name: "Arithmetic & Mental Ability", count: `${totalQuestions - qPerSection * 2} Qs` },
    ];
  }

  // Default balanced 4 sections matching official SSC / WB exam blueprint
  const qPerSection = Math.max(1, Math.round(totalQuestions / 4));
  return [
    { id: 1, name: "General Intelligence & Reasoning", count: `${qPerSection} Qs` },
    { id: 2, name: "General Awareness", count: `${qPerSection} Qs` },
    { id: 3, name: "Quantitative Aptitude", count: `${qPerSection} Qs` },
    { id: 4, name: "English Comprehension", count: `${totalQuestions - qPerSection * 3} Qs` },
  ];
}

export const TestDetailsModal: React.FC<TestDetailsModalProps> = ({
  isOpen,
  onClose,
  test,
}) => {
  const navigate = useNavigate();

  if (!test) return null;

  const totalQ = test.totalQuestions || 100;
  const duration = test.durationMinutes || 60;
  const marks = test.totalMarks || 200;

  // Calculate positive mark per question
  const marksPerQ =
    marks && totalQ
      ? marks / totalQ % 1 === 0
        ? `+${marks / totalQ}`
        : `+${(marks / totalQ).toFixed(2)}`
      : "+2";

  // Calculate negative mark display
  const rawNeg = test.negativeMarking ?? "-0.5";
  const negative = String(rawNeg).startsWith("-") ? String(rawNeg) : `-${rawNeg}`;

  const sections = test.sections || getTestSections(test.title, test.examName, totalQ);

  const handleStart = () => {
    onClose();
    if ((test as any).isPyq || test.id.includes("pyq") || test.id.startsWith("wbssc-") || test.id.startsWith("rrb-")) {
      navigate(`/student/pyq${(test as any).year ? `?year=${(test as any).year}` : ""}`);
    } else {
      navigate(`/student/take-test/${test.id}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl bg-[#F8FAFC] border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col [&>button]:hidden">
        {/* Top Bar matching Screen: "< Test Instructions" */}
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.4]" />
          </button>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Test Instructions
          </h2>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Card 1: Test Overview Header Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/90 shadow-2xs space-y-3.5">
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug tracking-tight">
              {test.title}
            </h3>

            {/* Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200/80">
                {test.isPyq ? "Previous Year" : "Full Mock"}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                Bilingual (EN/BN)
              </span>
              {test.isPaid ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-amber-600 text-amber-700" />
                  Premium
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  Free Test
                </span>
              )}
            </div>

            {/* 3 Metrics: Questions | Minutes | Marks */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
              {/* Questions */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                  <FileText className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-slate-900 leading-none truncate">
                    {totalQ}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium whitespace-nowrap mt-0.5">
                    Questions
                  </p>
                </div>
              </div>

              {/* Minutes */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-slate-900 leading-none truncate">
                    {duration}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium whitespace-nowrap mt-0.5">
                    Minutes
                  </p>
                </div>
              </div>

              {/* Marks */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                  <Award className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-slate-900 leading-none truncate">
                    {marks}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium whitespace-nowrap mt-0.5">
                    Marks
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Sections */}
          <div className="space-y-2">
            <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Sections
            </h4>
            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden divide-y divide-slate-100 shadow-2xs">
              {sections.map((sec) => (
                <div key={sec.id} className="flex items-center justify-between px-3.5 py-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center font-black text-slate-800 text-xs shrink-0">
                      {sec.id}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                      {sec.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-700 shrink-0 pl-2 text-xs sm:text-sm">
                    {sec.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Marking Scheme */}
          <div className="space-y-2">
            <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Marking Scheme
            </h4>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.8]" />
                </div>
                <span className="font-semibold text-slate-800">
                  <strong className="text-emerald-700 font-bold">{marksPerQ}</strong> for each correct answer
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <XCircle className="w-3.5 h-3.5 stroke-[2.8]" />
                </div>
                <span className="font-semibold text-slate-800">
                  <strong className="text-rose-700 font-bold">{negative}</strong> for each wrong answer
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <div className="w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <MinusCircle className="w-3.5 h-3.5 stroke-[2.8]" />
                </div>
                <span className="font-medium text-slate-600">
                  <strong className="text-slate-800 font-bold">0</strong> for unattempted questions
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Other Details */}
          <div className="space-y-2">
            <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Other Details
            </h4>
            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden divide-y divide-slate-100 shadow-2xs text-xs sm:text-sm">
              <div className="flex items-center px-4 py-3">
                <span className="w-1/3 font-semibold text-slate-500">Language</span>
                <span className="font-bold text-slate-900">{test.language || "English / বাংলা"}</span>
              </div>
              <div className="flex items-center px-4 py-3">
                <span className="w-1/3 font-semibold text-slate-500">Attempt Mode</span>
                <span className="font-bold text-slate-900">Online (Live Test)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Sticky Action Footer with Vibrant Blue "Start Test" Button */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 shrink-0">
          <Button
            onClick={handleStart}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer"
          >
            Start Test
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestDetailsModal;
