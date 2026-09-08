import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Target,
  FileText,
  Zap,
  BookOpen,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  ChevronRight,
  TrendingUp,
  Bookmark,
  Newspaper
} from "lucide-react";
import { Exam, MockTest } from "@/services/examService";
import { EXAM_CATALOG } from "@/data/examCatalog";

interface DashboardSearchProps {
  exams?: Exam[];
  mockTests?: MockTest[];
  onSelectTest?: (test: MockTest) => void;
}

interface SearchItem {
  id: string;
  category: "exam" | "mock" | "practice" | "subject" | "study";
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ElementType;
  url?: string;
  testData?: MockTest;
}

const STATIC_SUBJECTS = [
  { name: "Mathematics", desc: "Arithmetic, Speed Maths & Geometry", color: "text-blue-600 bg-blue-50" },
  { name: "General Knowledge", desc: "Current Affairs & Static GK", color: "text-amber-600 bg-amber-50" },
  { name: "General Science", desc: "Physics, Chemistry & Biology", color: "text-emerald-600 bg-emerald-50" },
  { name: "History", desc: "Indian Freedom Struggle & Ancient History", color: "text-orange-600 bg-orange-50" },
  { name: "Geography", desc: "West Bengal & Indian Physical Geography", color: "text-teal-600 bg-teal-50" },
  { name: "Indian Polity", desc: "Constitution, Governance & Panchayet Raj", color: "text-rose-600 bg-rose-50" },
  { name: "English", desc: "Grammar, Vocab & Comprehension", color: "text-indigo-600 bg-indigo-50" },
  { name: "Bengali", desc: "Grammar, Literature & Composition", color: "text-pink-600 bg-pink-50" },
  { name: "Reasoning", desc: "Logical & Analytical Reasoning (GI)", color: "text-purple-600 bg-purple-50" },
];

const STATIC_PRACTICE_TOOLS: SearchItem[] = [
  {
    id: "tool-topic-drills",
    category: "practice",
    title: "Chapter-wise & Topic Drills",
    subtitle: "Customize MCQ drills by subject, chapter and difficulty",
    badge: "Drills",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Zap,
    url: "/student/practice/subject",
  },
  {
    id: "tool-pyq-drills",
    category: "practice",
    title: "PYQ Question Vault",
    subtitle: "Previous years questions with instant explanations & speed mode",
    badge: "PYQ",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Sparkles,
    url: "/student/pyq",
  },
  {
    id: "tool-mistakes-book",
    category: "practice",
    title: "Mistakes Notebook",
    subtitle: "Review past mistakes, classify root causes & achieve zero negative marking",
    badge: "Revision",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    icon: RotateCcw,
    url: "/student/mistakes",
  },
  {
    id: "tool-daily-quiz",
    category: "practice",
    title: "Daily Practice Quiz",
    subtitle: "Daily 10 high-yield questions across all target exam subjects",
    badge: "Daily",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Clock,
    url: "/student/daily",
  },
  {
    id: "tool-bookmarks",
    category: "practice",
    title: "Saved Bookmarks",
    subtitle: "Questions you bookmarked for later review",
    badge: "Saved",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Bookmark,
    url: "/student/bookmarks",
  },
  {
    id: "tool-readiness",
    category: "practice",
    title: "Selection Readiness & Cutoff Analytics",
    subtitle: "Predictive cutoff benchmarking and 9-subject diagnostic matrix",
    badge: "Analytics",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: TrendingUp,
    url: "/student/results",
  },
  {
    id: "tool-current-affairs",
    category: "study",
    title: "Daily & Monthly Current Affairs Hub",
    subtitle: "Curated national and West Bengal state exam news",
    badge: "Current Affairs",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    icon: Newspaper,
    url: "/student/current-affairs",
  },
  {
    id: "tool-study-notes",
    category: "study",
    title: "Subject Study Notes & PDFs",
    subtitle: "Concise summary notes and revision cheat sheets",
    badge: "Notes",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    icon: BookOpen,
    url: "/student/notes",
  },
  {
    id: "tool-leaderboard",
    category: "study",
    title: "State Level Aspirant Leaderboard",
    subtitle: "Rank against thousands of fellow government job aspirants",
    badge: "Rank",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Award,
    url: "/student/leaderboard",
  },
];

export const DashboardSearch: React.FC<DashboardSearchProps> = ({
  exams = [],
  mockTests = [],
  onSelectTest,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey: Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute all searchable items
  const allItems: SearchItem[] = React.useMemo(() => {
    const items: SearchItem[] = [];

    // 1. Target Exams (uses DB exams or falls back to official EXAM_CATALOG)
    const examList = exams.length > 0
      ? exams.map((e) => {
          const matchedCatalog = EXAM_CATALOG.find((c) => c.id === e.id);
          return {
            id: e.id,
            name: e.name,
            bengaliName: matchedCatalog?.bengaliName,
          };
        })
      : EXAM_CATALOG.map((c) => ({
          id: c.id,
          name: c.name,
          bengaliName: c.bengaliName,
        }));

    examList.forEach((exam) => {
      items.push({
        id: `exam-${exam.id}`,
        category: "exam",
        title: exam.name,
        subtitle: exam.bengaliName ? `${exam.bengaliName} • Full Mocks & Cutoffs` : "Official Target Exam • Full Mocks & Cutoffs",
        badge: "Target Exam",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Target,
        url: `/student/exam?id=${exam.id}`,
      });
    });

    // 2. Practice Tools
    items.push(...STATIC_PRACTICE_TOOLS);

    // 3. Subjects
    STATIC_SUBJECTS.forEach((subj) => {
      items.push({
        id: `subj-${subj.name}`,
        category: "subject",
        title: `${subj.name} Practice`,
        subtitle: subj.desc,
        badge: "Subject",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        icon: BookOpen,
        url: `/student/practice/subject?subject=${encodeURIComponent(subj.name)}`,
      });
    });

    // 4. Mock Tests
    mockTests.forEach((test) => {
      const examName = test.exams?.name ? `${test.exams.name} • ` : "";
      items.push({
        id: `test-${test.id}`,
        category: "mock",
        title: test.title,
        subtitle: `${examName}${test.total_marks} Marks • ${test.duration_minutes} mins`,
        badge: test.is_paid ? "Pro Mock" : "Free Mock",
        badgeColor: test.is_paid
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: FileText,
        testData: test,
      });
    });

    return items;
  }, [exams, mockTests]);

  // Filtered results based on query
  const filteredResults = React.useMemo(() => {
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) {
      // When empty, show top popular tools + top 3 exams
      return allItems.slice(0, 8);
    }

    return allItems
      .filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(cleanQ);
        const subMatch = item.subtitle?.toLowerCase().includes(cleanQ);
        const badgeMatch = item.badge?.toLowerCase().includes(cleanQ);
        return titleMatch || subMatch || badgeMatch;
      })
      .slice(0, 10);
  }, [allItems, query]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  const handleSelectItem = (item: SearchItem) => {
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();

    if (item.testData && onSelectTest) {
      onSelectTest(item.testData);
    } else if (item.testData) {
      navigate(`/student/take-test/${item.testData.id}`);
    } else if (item.url) {
      navigate(item.url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectItem(filteredResults[selectedIndex]);
      } else if (query.trim()) {
        navigate(`/student/exam?search=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    }
  };

  const popularChips = [
    { label: "WB Police", query: "Police" },
    { label: "Panchayat 2026", query: "Panchayat" },
    { label: "Topic Drills", query: "Drills" },
    { label: "PYQ Vault", query: "PYQ" },
    { label: "Mistakes Notebook", query: "Mistakes" },
    { label: "Mathematics", query: "Math" },
  ];

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl mx-2 sm:mx-4"
    >
      {/* Search Input Bar */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`group relative flex items-center h-8.5 sm:h-9 md:h-9.5 px-3 sm:px-3.5 rounded-full border transition-all cursor-text shadow-2xs ${
          isOpen
            ? "bg-white border-[#0066FF] ring-2 ring-[#0066FF]/20"
            : "bg-slate-100/90 hover:bg-slate-100 border-slate-200/90 hover:border-slate-300"
        }`}
      >
        <Search
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
            isOpen ? "text-[#0066FF]" : "text-slate-400 group-hover:text-slate-600"
          }`}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search exams, mock tests, topics..."
          className="w-full bg-transparent outline-none border-none text-[11.5px] sm:text-xs md:text-sm text-slate-900 placeholder:text-slate-400 font-medium px-2 min-w-0"
        />

        {query ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery("");
              inputRef.current?.focus();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden lg:flex items-center gap-1 shrink-0 select-none pointer-events-none pr-1">
            <kbd className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200/90 rounded shadow-3xs">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      {/* Floating Search Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 max-h-[75vh] flex flex-col min-w-[280px] sm:min-w-[340px]"
          >
            {/* Quick Filter Pills (Shown when input is empty) */}
            {!query && (
              <div className="p-2.5 sm:p-3 bg-slate-50/80">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Quick Suggestions
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {popularChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setQuery(chip.query);
                        inputRef.current?.focus();
                      }}
                      className="px-2.5 py-0.5 sm:py-1 rounded-full bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-600 text-[10.5px] sm:text-[11px] font-bold border border-slate-200/80 shadow-3xs transition-all active:scale-95"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results List */}
            <div className="overflow-y-auto p-1.5 sm:p-2 space-y-1">
              {filteredResults.length > 0 ? (
                filteredResults.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = selectedIndex === idx;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50/90 text-blue-900 shadow-2xs"
                          : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-slate-100 text-slate-600 border-slate-200/80"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                  item.badgeColor || "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center text-slate-400">
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5">
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">
                    No results found for "{query}"
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Try searching for keywords like "police", "panchayet", "math", "drills", or "gk".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/student/exam");
                      setIsOpen(false);
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    Browse all mock tests <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer Tip */}
            <div className="p-2 bg-slate-50 text-[10px] font-semibold text-slate-400 flex items-center justify-between px-3">
              <span className="flex items-center gap-1">
                <span>Use</span>
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↑</kbd>
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↓</kbd>
                <span>to navigate</span>
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] ml-1">↵</kbd>
              </span>
              <span className="hidden sm:inline">Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">ESC</kbd> to close</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardSearch;
