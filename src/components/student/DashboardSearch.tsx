import React, { useState, useRef, useEffect, useMemo } from "react";
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
  ArrowLeft,
  Flame,
  History,
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

const ROTATING_SEARCH_PROMPTS = [
  "Search 'WBP Constable'...",
  "Search 'Primary TET 2026'...",
  "Search 'WBCS Mock Tests'...",
  "Search 'Panchayat Clerkship'...",
  "Search 'Topic Tests'...",
  "Search 'Math & Reasoning'...",
  "Search 'PYQ Vault'...",
  "Search 'Current Affairs'...",
];

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
    title: "Chapter-wise Topic Tests",
    subtitle: "Customize MCQ tests by subject and chapter",
    badge: "Test",
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
    title: "Mistakes",
    subtitle: "Review past mistakes, classify root causes & achieve zero negative marking",
    badge: "Revision",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    icon: RotateCcw,
    url: "/student/mistakes",
  },
  {
    id: "tool-daily-quiz",
    category: "practice",
    title: "Daily Practice Test",
    subtitle: "Daily 10 high-yield questions across all target exam subjects",
    badge: "Daily",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Clock,
    url: "/student/daily",
  },
  {
    id: "tool-bookmarks",
    category: "practice",
    title: "Save Questions",
    subtitle: "Review your saved questions anytime",
    badge: "Saved",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Zap,
    url: "/student/bookmarks",
  },
  {
    id: "tool-notes",
    category: "study",
    title: "Comprehensive Study Notes",
    subtitle: "Handcrafted chapter-wise PDF revision notes & mindmaps",
    badge: "Notes",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    icon: BookOpen,
    url: "/student/notes",
  },
  {
    id: "tool-leaderboard",
    category: "study",
    title: "Rank - Overall Aspirant Position",
    subtitle: "Your overall position among all mock test participants",
    badge: "Overall Rank",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Award,
    url: "/student/leaderboard",
  },
];

const TRENDING_CHIPS = [
  { label: "WBP Constable", query: "Police", isHot: true },
  { label: "Primary TET 2026", query: "TET", isHot: true },
  { label: "Panchayat", query: "Panchayat", isHot: false },
  { label: "Topic Test", query: "Test", isHot: true },
  { label: "PYQ Vault", query: "PYQ", isHot: false },
  { label: "Mathematics", query: "Math", isHot: false },
  { label: "Mistakes Book", query: "Mistakes", isHot: false },
];

type CategoryFilter = "all" | "exam" | "mock" | "practice" | "subject";

export const DashboardSearch: React.FC<DashboardSearchProps> = ({
  exams = [],
  mockTests = [],
  onSelectTest,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pk_recent_searches");
      return saved ? JSON.parse(saved) : ["WBP Constable", "Mock Test", "Mathematics"];
    } catch {
      return ["WBP Constable", "Mock Test", "Mathematics"];
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Rotating placeholder interval
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_SEARCH_PROMPTS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Global hotkey: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside listener for desktop
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save recent search
  const saveSearchTerm = (term: string) => {
    if (!term.trim()) return;
    setRecentSearches((prev) => {
      const updated = [term.trim(), ...prev.filter((t) => t.toLowerCase() !== term.trim().toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem("pk_recent_searches", JSON.stringify(updated));
      } catch {
        // Private-mode storage may throw; in-memory state still updates.
      return updated;
    });
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((t) => t !== term);
      try {
        localStorage.setItem("pk_recent_searches", JSON.stringify(updated));
      } catch {
        // Private-mode storage may throw; in-memory state still updates.
      return updated;
    });
  };

  // Compute all searchable items
  const allItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [];

    // 1. Target Exams
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

  // Filtered items based on query & category filter
  const filteredResults = useMemo(() => {
    const cleanQ = query.trim().toLowerCase();
    let list = allItems;

    if (activeCategory !== "all") {
      list = list.filter((item) => item.category === activeCategory);
    }

    if (!cleanQ) {
      return list.slice(0, 8);
    }

    return list
      .filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(cleanQ);
        const subMatch = item.subtitle?.toLowerCase().includes(cleanQ);
        const badgeMatch = item.badge?.toLowerCase().includes(cleanQ);
        return titleMatch || subMatch || badgeMatch;
      })
      .slice(0, 12);
  }, [allItems, query, activeCategory]);

  // Reset selectedIndex
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults, activeCategory]);

  const handleSelectItem = (item: SearchItem) => {
    saveSearchTerm(item.title);
    setIsOpen(false);
    setQuery("");

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
        saveSearchTerm(query.trim());
        navigate(`/student/exam?search=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    }
  };

  const categories: { id: CategoryFilter; label: string; icon: React.ElementType }[] = [
    { id: "all", label: "All", icon: Sparkles },
    { id: "exam", label: "Exams", icon: Target },
    { id: "mock", label: "Mocks", icon: FileText },
    { id: "practice", label: "Tests", icon: Zap },
    { id: "subject", label: "Subjects", icon: BookOpen },
  ];

  // Highlight matched query text
  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <span key={i} className="text-[#0066FF] font-black underline decoration-blue-300">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* Search Trigger Bar in Header */}
      <div
        ref={containerRef}
        className="relative flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl mx-1.5 sm:mx-3.5"
      >
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => {
              if (window.innerWidth < 640) {
                mobileInputRef.current?.focus();
              } else {
                inputRef.current?.focus();
              }
            }, 80);
          }}
          className={`group relative flex items-center h-8 sm:h-9 md:h-9.5 px-2.5 sm:px-3.5 rounded-full border transition-all cursor-pointer shadow-2xs ${
            isOpen
              ? "bg-white border-[#0066FF] ring-2 ring-[#0066FF]/20"
              : "bg-slate-100/90 hover:bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-xs"
          }`}
        >
          {/* Animated Search Icon */}
          <div className="w-5 h-5 rounded-full bg-blue-50/80 text-[#0066FF] flex items-center justify-center shrink-0 mr-1.5 sm:mr-2">
            <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
          </div>

          {/* Desktop Real Input */}
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
            placeholder={query ? "" : ROTATING_SEARCH_PROMPTS[placeholderIndex]}
            className="hidden sm:block w-full bg-transparent outline-none border-none text-xs md:text-sm text-slate-900 placeholder:text-slate-400 font-medium px-1 min-w-0"
          />

          {/* Mobile Animated Dynamic Placeholder View */}
          <div className="sm:hidden flex-1 min-w-0 overflow-hidden text-left pointer-events-none">
            {query ? (
              <span className="text-xs font-bold text-slate-900 truncate block">{query}</span>
            ) : (
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIndex}
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -6, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] text-slate-500 font-medium truncate block"
                >
                  {ROTATING_SEARCH_PROMPTS[placeholderIndex]}
                </motion.span>
              </AnimatePresence>
            )}
          </div>

          {/* Right Action / Shortcut */}
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
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          ) : (
            <div className="hidden lg:flex items-center gap-1 shrink-0 select-none pointer-events-none pr-0.5">
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200/90 rounded shadow-3xs">
                ⌘K
              </kbd>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            DESKTOP FLOATING DROPDOWN (sm+ screens)
            ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="hidden sm:flex absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 max-h-[75vh] flex-col min-w-[320px] md:min-w-[420px]"
            >
              {/* Category Filter Tabs */}
              <div className="p-2 bg-slate-50/90 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-100">
                {categories.map((cat) => {
                  const CatIcon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-[#0066FF] text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/70"
                      }`}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Trending / Recent Chips */}
              {!query && (
                <div className="p-3 bg-white space-y-2 border-b border-slate-100">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5 px-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <History className="w-3 h-3" />
                          Recent Searches
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRecentSearches([]);
                            localStorage.removeItem("pk_recent_searches");
                          }}
                          className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((term) => (
                          <span
                            key={term}
                            onClick={() => {
                              setQuery(term);
                              inputRef.current?.focus();
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10.5px] font-medium border border-slate-200/80 transition-all cursor-pointer group"
                          >
                            <span>{term}</span>
                            <button
                              type="button"
                              onClick={(e) => removeRecentSearch(term, e)}
                              className="text-slate-400 hover:text-rose-500 rounded-full"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5 px-0.5">
                      <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                      Trending Searches
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {TRENDING_CHIPS.map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            setQuery(chip.query);
                            inputRef.current?.focus();
                          }}
                          className="px-2.5 py-1 rounded-full bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 text-[11px] font-bold border border-slate-200/80 shadow-3xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          {chip.isHot && <span className="text-[10px]">🔥</span>}
                          <span>{chip.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Results List */}
              <div className="overflow-y-auto p-2 space-y-1 max-h-[380px]">
                {filteredResults.length > 0 ? (
                  filteredResults.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = selectedIndex === idx;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50/90 text-blue-900 shadow-2xs"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-slate-100 text-slate-600 border-slate-200/80"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm truncate">
                                {highlightMatch(item.title, query)}
                              </span>
                              {item.badge && (
                                <span
                                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                    item.badgeColor || "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center text-slate-400">
                          {isSelected ? (
                            <span className="text-[10.5px] font-bold text-blue-600 flex items-center gap-0.5">
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
                    <h4 className="text-xs font-bold text-slate-700">No results found for "{query}"</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Try searching for keywords like "police", "tet", "math", "test", or "panchayat".
                    </p>
                  </div>
                )}
              </div>

              {/* Footer navigation guide */}
              <div className="p-2 bg-slate-50 text-[10px] font-semibold text-slate-400 flex items-center justify-between px-3">
                <span className="flex items-center gap-1">
                  <span>Use</span>
                  <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↓</kbd>
                  <span>to navigate</span>
                  <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] ml-1">↵</kbd>
                </span>
                <span>Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">ESC</kbd> to close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE FULLSCREEN SEARCH MODAL (< sm screens)
          ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="sm:hidden fixed inset-0 z-[120] bg-white flex flex-col"
          >
            {/* Top Search Input Bar */}
            <div className="p-3 border-b border-slate-200 flex items-center gap-2 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                }}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 active:scale-95 cursor-pointer"
                aria-label="Close search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 flex items-center h-10 px-3 rounded-full bg-slate-100 border border-slate-200">
                <Search className="w-4 h-4 text-[#0066FF] mr-2 shrink-0" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={ROTATING_SEARCH_PROMPTS[placeholderIndex]}
                  className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400 font-medium"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      mobileInputRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {categories.map((cat) => {
                const CatIcon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 ${
                      isActive
                        ? "bg-[#0066FF] text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200/90"
                    }`}
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Recent & Trending (when query is empty) */}
              {!query && (
                <>
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          Recent Searches
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRecentSearches([]);
                            localStorage.removeItem("pk_recent_searches");
                          }}
                          className="text-[11px] font-bold text-slate-400 hover:text-rose-600"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                          <span
                            key={term}
                            onClick={() => setQuery(term)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200 active:scale-95 cursor-pointer"
                          >
                            <span>{term}</span>
                            <button
                              type="button"
                              onClick={(e) => removeRecentSearch(term, e)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-2">
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Trending Searches
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_CHIPS.map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setQuery(chip.query)}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-800 text-xs font-bold border border-slate-200 active:scale-95 flex items-center gap-1"
                        >
                          {chip.isHot && <span>🔥</span>}
                          <span>{chip.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Filtered Search Results */}
              <div className="space-y-1.5 pt-1">
                {filteredResults.length > 0 ? (
                  filteredResults.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs active:bg-blue-50/60 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0066FF] border border-blue-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900">
                                {highlightMatch(item.title, query)}
                              </span>
                              {item.badge && (
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                    item.badgeColor || "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No results found for "{query}"</h4>
                    <p className="text-xs text-slate-500">
                      Try searching for keywords like "police", "tet", "math", or "test".
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardSearch;
