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
  Crown,
  ArrowRight,
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
  } | null;
}

export const TestDetailsModal: React.FC<TestDetailsModalProps> = ({
  isOpen,
  onClose,
  test,
}) => {
  const navigate = useNavigate();

  if (!test) return null;

  const totalQ = test.totalQuestions || 100;
  const duration = test.durationMinutes || 90;
  const marks = test.totalMarks || 100;
  const negative = test.negativeMarking ?? "-0.25";

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header Banner matching Screen 9 */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white p-5 pb-6 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-sm text-white">
              <FileText className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {test.isPaid ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 shadow-xs">
                    <Crown className="w-3 h-3 fill-amber-950" />
                    Pro
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 shadow-xs">
                    Free
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white">
                  Full Syllabus
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white">
                  Most Popular
                </span>
              </div>

              <h3 className="text-lg font-black text-white leading-snug tracking-tight">
                {test.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Scrollable Specs Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* 4 Round KPI Badges matching Screen 9 */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {/* Questions */}
            <div className="bg-amber-50/80 border border-amber-200/70 rounded-2xl p-2.5 flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold mb-1">
                Q
              </div>
              <span className="text-sm font-black text-slate-900 leading-tight">
                {totalQ}
              </span>
              <span className="text-[10px] font-bold text-amber-800/80 uppercase tracking-tight">
                Questions
              </span>
            </div>

            {/* Minutes */}
            <div className="bg-blue-50/80 border border-blue-200/70 rounded-2xl p-2.5 flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold mb-1">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-black text-slate-900 leading-tight">
                {duration}
              </span>
              <span className="text-[10px] font-bold text-blue-800/80 uppercase tracking-tight">
                Minutes
              </span>
            </div>

            {/* Marks */}
            <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-2.5 flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold mb-1">
                <Award className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-black text-slate-900 leading-tight">
                {marks}
              </span>
              <span className="text-[10px] font-bold text-emerald-800/80 uppercase tracking-tight">
                Marks
              </span>
            </div>

            {/* Negative Marking */}
            <div className="bg-rose-50/80 border border-rose-200/70 rounded-2xl p-2.5 flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold mb-1">
                -
              </div>
              <span className="text-sm font-black text-slate-900 leading-tight">
                {negative}
              </span>
              <span className="text-[10px] font-bold text-rose-800/80 uppercase tracking-tight">
                Negative
              </span>
            </div>
          </div>

          {/* Detailed Spec List matching Screen 9 */}
          <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/60 divide-y divide-slate-100 text-xs font-medium text-slate-600 space-y-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Exam</span>
              <span className="font-bold text-slate-900">{test.examName || "Panchayat Exam"}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Language</span>
              <span className="font-bold text-slate-900">{test.language || "Bengali + English"}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Total Questions</span>
              <span className="font-bold text-slate-900">{totalQ} MCQs</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Total Marks</span>
              <span className="font-bold text-slate-900">{marks}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Negative Marking</span>
              <span className="font-bold text-rose-600">{negative} per wrong answer</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Attempts Allowed</span>
              <span className="font-bold text-slate-900">{test.attemptsAllowed || "Unlimited Attempts"}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Test Validity</span>
              <span className="font-bold text-slate-900">{test.validity || "365 Days"}</span>
            </div>
            <div className="flex justify-between items-start py-1.5">
              <span className="text-slate-500">Includes</span>
              <div className="text-right space-y-0.5">
                <div className="text-emerald-700 font-bold flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Detailed Solutions
                </div>
                <div className="text-emerald-700 font-bold flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All West Bengal Rank
                </div>
                <div className="text-emerald-700 font-bold flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Subject-wise Analysis
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 rounded-2xl text-xs font-bold text-slate-600 border-slate-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            className="flex-1 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <span>Start Test</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestDetailsModal;
