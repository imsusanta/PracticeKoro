import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Zap,
  Clock,
  Dices,
  HelpCircle,
  Check,
  Tag,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { ErrorType } from "@/types/mistakes";
import { ERROR_TYPE_DEFINITIONS } from "@/types/mistakes";

interface MistakeClassificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  initialErrorType?: ErrorType;
  initialNotes?: string | null;
  onSave: (errorType: ErrorType, notes: string) => Promise<void>;
  questionSnippet?: string;
}

const ERROR_OPTIONS: Array<{
  type: ErrorType;
  labelEn: string;
  labelBn: string;
  icon: React.ElementType;
  colorClass: string;
  bgSelected: string;
  description: string;
}> = [
  {
    type: "conceptual",
    labelEn: "Concept Gap",
    labelBn: "কনসেপ্ট ক্লিয়ার ছিল না",
    icon: Brain,
    colorClass: "text-indigo-600 border-indigo-200 hover:bg-indigo-50",
    bgSelected: "bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20",
    description: "থিওরি, ফর্মুলা বা নিয়ম না জানার কারণে ভুল হয়েছে।",
  },
  {
    type: "careless",
    labelEn: "Silly Mistake",
    labelBn: "জানা প্রশ্ন তাড়াহুড়োয় ভুল",
    icon: Zap,
    colorClass: "text-amber-600 border-amber-200 hover:bg-amber-50",
    bgSelected: "bg-amber-50 border-amber-600 text-amber-950 ring-2 ring-amber-500/20",
    description: "জানা প্রশ্ন ছিল, কিন্তু তাড়াহুড়ো বা সহজ ক্যালকুলেশনে ভুল দাগিয়েছি।",
  },
  {
    type: "time_pressure",
    labelEn: "Time Panic",
    labelBn: "সময়ের টান ও নার্ভাসনেস",
    icon: Clock,
    colorClass: "text-rose-600 border-rose-200 hover:bg-rose-50",
    bgSelected: "bg-rose-50 border-rose-600 text-rose-950 ring-2 ring-rose-500/20",
    description: "টাইমার দেখে নার্ভাস হয়ে বা শেষ মুহূর্তে না ভেবে দাগিয়ে ভুল।",
  },
  {
    type: "guess",
    labelEn: "Blind Guess",
    labelBn: "আন্দাজে তুকা মেরেছি",
    icon: Dices,
    colorClass: "text-purple-600 border-purple-200 hover:bg-purple-50",
    bgSelected: "bg-purple-50 border-purple-600 text-purple-950 ring-2 ring-purple-500/20",
    description: "সঠিক উত্তর না জেনেও আন্দাজে দাগিয়ে নেগেটিভ মার্কস খেয়েছি।",
  },
];

export const MistakeClassificationModal: React.FC<MistakeClassificationModalProps> = ({
  isOpen,
  onClose,
  initialErrorType = "unclassified",
  initialNotes = "",
  onSave,
  questionSnippet,
}) => {
  const [selectedType, setSelectedType] = useState<ErrorType>(initialErrorType);
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setSelectedType(initialErrorType || "unclassified");
    setNotes(initialNotes || "");
  }, [initialErrorType, initialNotes, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedType, notes.trim());
      toast.success("Mistake Tagged Successfully!", {
        description: `Classified as ${ERROR_TYPE_DEFINITIONS[selectedType]?.labelEn || "classified"} with reflection notes.`,
      });
      onClose();
    } catch (err: any) {
      toast.error("Failed to save classification", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 self-start font-bengali">
            <Tag className="w-3.5 h-3.5" />
            <span>ভুলের খাতা — ভুলের কারণ ও নোট</span>
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 tracking-tight font-bengali">
            এই প্রশ্নে মার্কস কেন কাটল?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium font-bengali">
            ভুলের কারণ চিহ্নিত করে রাখলে আসল পরীক্ষায় নেগেটিভ মার্কিং এড়ানো যায়।
          </DialogDescription>
        </DialogHeader>

        {questionSnippet && (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium line-clamp-2 font-bengali">
            <span className="font-bold text-slate-900">প্রশ্ন: </span>
            {questionSnippet}
          </div>
        )}

        {/* Error Type Options */}
        <div className="space-y-2 py-1">
          <label className="text-xs font-bold text-slate-700 font-bengali">ভুলের কারণ বেছে নিন:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ERROR_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedType === opt.type;

              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedType(opt.type)}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? opt.bgSelected
                      : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-white/80 shadow-xs" : "bg-slate-100"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold block leading-tight">
                          {opt.labelEn}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium font-bengali">
                          {opt.labelBn}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug pt-0.5">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Student Learning Note / Reflection */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between font-bengali">
            <span>আমার নোট / কী শিখলাম (Key Takeaway):</span>
            <span className="text-[10px] text-slate-400 font-normal">ঐচ্ছিক (Optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="যেমন: মনে রাখবে চব্বিশ পরগণা সবচেয়ে বড় জেলা, মেদিনীপুর নয়... অথবা এই সূত্রের শর্টকাট ট্রিক হলো..."
            rows={3}
            className="w-full p-3 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none font-bengali"
          />
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs h-9 font-bold font-bengali"
          >
            বাতিল
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl text-xs h-9 font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-bengali"
          >
            {saving ? "সেভ হচ্ছে..." : "সংরক্ষণ করুন (Save Note)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MistakeClassificationModal;
