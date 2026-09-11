import { useNavigate } from "react-router-dom";
import { Target, ChevronRight, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/** Daily question goal shared by Today's Mission (config, not hardcoded per user). */
export const DAILY_QUESTION_GOAL = 20;

/** localStorage key for the student's selected target exam (catalog id). */
export const TARGET_EXAM_STORAGE_KEY = "pk_target_exam_id";

/** Fallback target exam until the student picks one. */
export const DEFAULT_TARGET_EXAM_ID = "wb-panchayat";

/** XP awarded per completed mission question (computed live from activity). */
const XP_PER_QUESTION = 1;

interface TodaysMissionProps {
  /** Questions solved today (from useTodayMetrics — real activity). */
  questions: number;
  loading: boolean;
}

export const TodaysMission = ({ questions, loading }: TodaysMissionProps) => {
  const navigate = useNavigate();
  const solved = Math.max(0, questions);
  const pct = Math.min(100, Math.round((solved / DAILY_QUESTION_GOAL) * 100));
  const complete = solved >= DAILY_QUESTION_GOAL;
  const earnedXp = Math.min(solved, DAILY_QUESTION_GOAL) * XP_PER_QUESTION;
  const remainingMin = Math.max(1, Math.ceil(((DAILY_QUESTION_GOAL - solved) * 0.5)));

  if (loading) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-sm animate-pulse">
        <div className="h-4 w-32 bg-slate-100 rounded-full" />
        <div className="h-7 w-40 bg-slate-100 rounded-lg mt-3" />
        <div className="h-2.5 bg-slate-100 rounded-full mt-3" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Target className="w-4 h-4 text-emerald-700" />
          </span>
          <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
            Today&apos;s Mission
          </h3>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center gap-1">
          <Flame className="w-3 h-3" /> +{earnedXp} XP
        </span>
      </div>

      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
        Complete {DAILY_QUESTION_GOAL} Questions —{" "}
        <span className="font-black text-slate-900">
          {solved} / {DAILY_QUESTION_GOAL} completed
        </span>
      </p>
      <Progress value={pct} className="h-2.5 mt-2" />

      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] font-semibold text-slate-500">
          {complete ? "Mission complete. Come back tomorrow." : `Estimated time: ~${remainingMin} min`}
        </span>
        {!complete && (
          <button
            onClick={() => navigate("/student/practice")}
            className="flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            {solved === 0 ? "Start Today's Practice" : "Continue Practice"}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TodaysMission;
