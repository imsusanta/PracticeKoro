import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Brain,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  Languages,
  Search,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import StudentLayout from "@/components/student/StudentLayout";
import { useSubjects } from "@/hooks/useStudentData";

const subjectIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  mathematics: Calculator,
  arithmetic: Calculator,
  reasoning: Brain,
  english: Languages,
  "general english": Languages,
  "general awareness": Sparkles,
  "current affairs": Flame,
  bengali: Languages,
  history: FileText,
  geography: Target,
};

const accentStyles = [
  "from-blue-50 to-indigo-50 border-blue-100 text-blue-600",
  "from-violet-50 to-fuchsia-50 border-violet-100 text-violet-600",
  "from-emerald-50 to-teal-50 border-emerald-100 text-emerald-600",
  "from-amber-50 to-orange-50 border-amber-100 text-amber-600",
  "from-rose-50 to-pink-50 border-rose-100 text-rose-600",
  "from-cyan-50 to-sky-50 border-cyan-100 text-cyan-600",
];

function titleCase(value: string) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PracticeHubRedesign() {
  const navigate = useNavigate();
  const { data: subjects = [], isLoading } = useSubjects();
  const [query, setQuery] = useState("");
  const [activeView, setActiveView] = useState<"subjects" | "topics">("subjects");

  const visibleSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (subjects || []).filter((s) => (s.name || "").trim() && !s.name.toLowerCase().includes("sample"));
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, query]);

  return (
    <StudentLayout>
      <div className="min-h-screen bg-slate-50/60">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-blue-600">PracticeKoro</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Practice</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
                Choose a subject or topic and start solving questions at your own pace.
              </p>
            </div>
            <button
              onClick={() => navigate("/student/pyq-practice")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
            >
              Previous Year Questions <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" /> Focused practice
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to practice?</h2>
              <p className="mt-2 text-sm leading-6 text-blue-100 sm:text-base">
                Start with a subject, pick a topic, and solve questions without the clutter.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveView("subjects")}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
                >
                  Start Practice <ArrowRight className="ml-1 inline h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/student/bookmarks")}
                  className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
                >
                  Saved Questions
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Daily Practice", meta: "10 quick questions", icon: Flame, action: () => navigate("/student/daily-practice") },
              { label: "Mock Practice", meta: "Full-length practice", icon: Target, action: () => navigate("/student/exams") },
              { label: "Previous Year", meta: "Practice PYQs", icon: FileText, action: () => navigate("/student/pyq-practice") },
              { label: "Saved Questions", meta: "Review bookmarks", icon: Bookmark, action: () => navigate("/student/bookmarks") },
            ].map(({ label, meta, icon: Icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="group rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-slate-900">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{meta}</p>
              </button>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Practice by {activeView === "subjects" ? "Subject" : "Topic"}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeView === "subjects" ? "Choose a subject to explore its topics." : "Search and choose a topic to start."}
                </p>
              </div>
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setActiveView("subjects")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeView === "subjects" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                >
                  Subjects
                </button>
                <button
                  onClick={() => setActiveView("topics")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeView === "topics" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                >
                  Topics
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeView === "subjects" ? "Search subjects..." : "Search topics..."}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            {activeView === "subjects" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)
                  : visibleSubjects.map((subject, index) => {
                      const name = subject.name || "Subject";
                      const Icon = subjectIcons[name.trim().toLowerCase()] || BookIcon;
                      const style = accentStyles[index % accentStyles.length];
                      return (
                        <button
                          key={subject.id}
                          onClick={() => navigate(`/student/practice?subject=${encodeURIComponent(subject.id)}`)}
                          className={`group flex items-center justify-between rounded-2xl border bg-gradient-to-br p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${style}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{titleCase(name)}</p>
                              <p className="mt-1 text-xs text-slate-500">Practice by topic</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5" />
                        </button>
                      );
                    })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                <Target className="mx-auto h-8 w-8 text-blue-500" />
                <h4 className="mt-3 text-sm font-bold text-slate-900">Choose a subject to explore topics</h4>
                <p className="mt-1 text-sm text-slate-500">Topics will appear here from your active exam curriculum.</p>
                <button
                  onClick={() => setActiveView("subjects")}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Browse Subjects
                </button>
              </div>
            )}
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <button onClick={() => navigate("/student/mistakes-notebook")} className="group rounded-3xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 p-5 text-left shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><XCircle className="h-5 w-5" /></div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-950">Incorrect Questions</h3>
              <p className="mt-1 text-sm text-slate-500">Practice the questions you got wrong and improve step by step.</p>
            </button>

            <button onClick={() => navigate("/student/leaderboard")} className="group rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-5 text-left shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Trophy className="h-5 w-5" /></div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-950">Practice with a Goal</h3>
              <p className="mt-1 text-sm text-slate-500">Build consistency, improve your score, and keep moving forward.</p>
            </button>
          </section>

          <div className="mt-8 flex items-center justify-center gap-2 pb-4 text-xs text-slate-400">
            <CheckCircle2 className="h-4 w-4" /> Simple practice. Better preparation.
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

function BookIcon({ className }: { className?: string }) {
  return <FileText className={className} />;
}
