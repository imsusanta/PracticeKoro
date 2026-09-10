import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FlaskConical,
  Gavel,
  Globe2,
  Home,
  Languages,
  Layers3,
  Landmark,
  LockKeyhole,
  Map,
  MapPinned,
  Menu,
  Play,
  Search,
  ShieldCheck,
  Siren,
  Target,
  TrainFront,
  UserRound,
  BarChart3,
} from "lucide-react";
import type {
  ExamIconKey,
  SubjectIconKey,
  TestCatalogItem,
  TestSeriesAccent,
} from "@/data/testSeriesCatalog";

const ACCENT_STYLES: Record<
  TestSeriesAccent,
  { surface: string; text: string; border: string }
> = {
  blue: { surface: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  violet: { surface: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
  emerald: { surface: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  rose: { surface: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
  amber: { surface: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  cyan: { surface: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-100" },
};

const examIcons: Record<ExamIconKey, LucideIcon> = {
  shield: ShieldCheck,
  building: Building2,
  badge: BadgeCheck,
  siren: Siren,
  landmark: Landmark,
  briefcase: BriefcaseBusiness,
  train: TrainFront,
  file: FileCheck2,
  layers: Layers3,
};

const subjectIcons: Record<SubjectIconKey, LucideIcon> = {
  globe: Globe2,
  landmark: Landmark,
  map: Map,
  gavel: Gavel,
  flask: FlaskConical,
  calculator: Calculator,
  brain: BrainCircuit,
  languages: Languages,
  book: BookOpen,
};

interface IconTileProps {
  icon: LucideIcon;
  accent?: TestSeriesAccent;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const IconTile = ({
  icon: Icon,
  accent = "blue",
  size = "md",
  className = "",
}: IconTileProps) => {
  const tone = ACCENT_STYLES[accent];
  const sizeClass =
    size === "lg"
      ? "h-16 w-16 rounded-2xl"
      : size === "sm"
        ? "h-10 w-10 rounded-xl"
        : "h-12 w-12 rounded-2xl";
  const iconClass = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div
      className={`${sizeClass} ${tone.surface} ${tone.text} ${tone.border} flex shrink-0 items-center justify-center border ${className}`}
      aria-hidden="true"
    >
      <Icon className={`${iconClass} stroke-[2.1]`} />
    </div>
  );
};

export const ExamIcon = ({
  icon,
  accent,
  size = "md",
}: {
  icon: ExamIconKey;
  accent: TestSeriesAccent;
  size?: "sm" | "md" | "lg";
}) => <IconTile icon={examIcons[icon]} accent={accent} size={size} />;

export const SubjectIcon = ({
  icon,
  accent,
}: {
  icon: SubjectIconKey;
  accent: TestSeriesAccent;
}) => <IconTile icon={subjectIcons[icon]} accent={accent} size="md" />;

export const TestSeriesCanvas = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-3 sm:px-6 md:pb-8 md:pt-0">
    {children}
  </div>
);

export const BrandBar = ({ onSearch }: { onSearch?: () => void }) => {
  const navigate = useNavigate();

  return (
    <header className="flex min-h-14 items-center justify-between gap-4">
      <Link
        to="/student/dashboard"
        className="inline-flex min-h-11 items-center rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="PracticeKoro Home"
      >
        <span className="text-[21px] font-extrabold tracking-[-0.035em] text-slate-950">Practice</span>
        <span className="text-[21px] font-extrabold tracking-[-0.035em] text-[#026BFC]">Koro</span>
      </Link>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Search exams"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/student/notifications")}
          className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
        </button>
      </div>
    </header>
  );
};

export const ScreenHeader = ({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack: () => void;
  trailing?: ReactNode;
}) => (
  <header className="grid min-h-14 grid-cols-[44px_1fr_44px] items-center gap-2">
    <button
      type="button"
      onClick={onBack}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
    </button>
    <h1 className="truncate text-center text-base font-extrabold tracking-[-0.02em] text-slate-950 sm:text-lg">
      {title}
    </h1>
    <div className="flex h-11 w-11 items-center justify-center">{trailing}</div>
  </header>
);

export const SearchField = ({
  value,
  onChange,
  placeholder,
  inputId,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputId?: string;
}) => (
  <label className="relative block">
    <span className="sr-only">{placeholder}</span>
    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input
      id={inputId}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-100/80 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-slate-500 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
    />
  </label>
);

export const FilterChips = ({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
}) => (
  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
    {items.map((item) => {
      const active = item === selected;
      return (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            active
              ? "border border-blue-200 bg-blue-50 text-blue-700"
              : "border border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {item}
        </button>
      );
    })}
  </div>
);

export const TestRow = ({
  test,
  onAction,
  startLabel = "Start Test",
}: {
  test: TestCatalogItem;
  onAction: () => void;
  startLabel?: string;
}) => {
  const isLocked = test.status === "locked";
  const isComplete = test.status === "completed";
  const label = isLocked
    ? "Unlock"
    : isComplete
      ? "Results"
      : test.status === "continue"
        ? "Continue"
        : startLabel;

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-blue-200">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            isLocked
              ? "border-amber-100 bg-amber-50 text-amber-600"
              : isComplete
                ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                : "border-blue-100 bg-blue-50 text-blue-600"
          }`}
          aria-hidden="true"
        >
          {isLocked ? (
            <LockKeyhole className="h-5 w-5" />
          ) : isComplete ? (
            <Check className="h-5 w-5 stroke-[2.8]" />
          ) : (
            <FileCheck2 className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-extrabold text-slate-950 sm:text-base">{test.title}</h2>
            {isLocked && (
              <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                Pro
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {test.questions} Questions <span aria-hidden="true">·</span> {test.duration} Min
          </p>
        </div>

        <button
          type="button"
          onClick={onAction}
          className={`min-h-11 min-w-[86px] shrink-0 rounded-xl px-3 text-xs font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            isLocked
              ? "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-500"
              : isComplete
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-500"
                : test.status === "continue"
                  ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-500"
                  : "bg-[#026BFC] text-white shadow-[0_4px_10px_rgba(2,107,252,0.18)] hover:bg-blue-700 focus-visible:ring-blue-500"
          }`}
        >
          {label}
        </button>
      </div>
    </article>
  );
};

export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      <Search className="h-5 w-5" />
    </div>
    <h2 className="mt-4 text-base font-extrabold text-slate-950">{title}</h2>
    <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
  </div>
);

const bottomNavigation: Array<{ label: string; path: string; icon: LucideIcon }> = [
  { label: "Home", path: "/student/dashboard", icon: Home },
  { label: "Test Series", path: "/student/exam", icon: ClipboardCheck },
  { label: "Practice", path: "/student/practice", icon: Target },
  { label: "Results", path: "/student/results", icon: BarChart3 },
  { label: "Profile", path: "/student/profile", icon: UserRound },
];

export const TestSeriesBottomNav = () => (
  <nav
    className="fixed inset-x-0 bottom-0 z-[110] border-t border-slate-200 bg-white/95 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden"
    aria-label="Primary navigation"
  >
    <div className="mx-auto grid max-w-md grid-cols-5 px-1.5">
      {bottomNavigation.map(({ label, path, icon: Icon }) => {
        const active = label === "Test Series";
        return (
          <Link
            key={label}
            to={path}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              active ? "text-[#026BFC]" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className={`relative flex h-7 w-9 items-center justify-center rounded-xl ${active ? "bg-blue-50" : ""}`}>
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : "stroke-[1.9]"}`} />
              {active && <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#026BFC]" />}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  </nav>
);

export const FlowHint = () => (
  <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-bold text-blue-800">
    <MapPinned className="h-4 w-4 shrink-0" />
    <span>Choose your exam → choose a test type → start the test</span>
  </div>
);

export const SectionCard = ({
  icon,
  title,
  description,
  accent,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: TestSeriesAccent;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex min-h-[92px] w-full items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
  >
    <IconTile icon={icon} accent={accent} size="md" />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-extrabold text-slate-950 sm:text-base">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
    </span>
    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
  </button>
);

export const TestSeriesSkeleton = () => (
  <div className="space-y-3" aria-label="Loading Test Series">
    {[0, 1, 2, 3, 4].map((item) => (
      <div key={item} className="h-[76px] animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
        <div className="h-full rounded-xl bg-slate-100" />
      </div>
    ))}
  </div>
);

export const screenIcons = {
  fullMock: ClipboardCheck,
  previousYear: FileCheck2,
  subjects: Layers3,
  chapters: BookOpen,
  play: Play,
  menu: Menu,
};
