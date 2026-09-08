import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search, BookOpen, FolderOpen, ChevronRight, Sparkles, Clock, Share2, ArrowLeft, Bookmark,
  CreditCard, Crown, Bell, CheckCircle2, FileText, BookOpenCheck, Calendar, Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudentLayout from "@/components/student/StudentLayout";
import PullToRefresh from "@/components/student/PullToRefresh";
import { Button } from "@/components/ui/button";
import { initRazorpayPayment } from "@/utils/payment";
import { getYearlySubscriptionFee, hasActiveSubscription } from "@/lib/subscription";

// ================= TYPES =================
interface Note {
  id: string;
  title: string;
  content: string;
  subject_id: string | null;
  topic_id: string | null;
  is_paid: boolean;
  price: number;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

interface Topic {
  id: string;
  subject_id: string;
  name: string;
  content?: string;
}

type Screen = "subjects" | "topics" | "article";

interface SubjectTheme {
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconText: string;
  accentBorder: string;
  stepBg: string;
}

// ================= CONSTANTS =================
const subjectThemes: SubjectTheme[] = [
  { badgeBg: "bg-blue-50", badgeText: "text-blue-700", iconBg: "bg-[#EFF6FF]", iconText: "text-[#2563EB]", accentBorder: "hover:border-blue-300", stepBg: "bg-blue-100 text-blue-700" },
  { badgeBg: "bg-emerald-50", badgeText: "text-emerald-700", iconBg: "bg-[#ECFDF5]", iconText: "text-[#059669]", accentBorder: "hover:border-emerald-300", stepBg: "bg-emerald-100 text-emerald-700" },
  { badgeBg: "bg-amber-50", badgeText: "text-amber-700", iconBg: "bg-[#FFFBEB]", iconText: "text-[#D97706]", accentBorder: "hover:border-amber-300", stepBg: "bg-amber-100 text-amber-700" },
  { badgeBg: "bg-purple-50", badgeText: "text-purple-700", iconBg: "bg-[#F5F3FF]", iconText: "text-[#7C3AED]", accentBorder: "hover:border-purple-300", stepBg: "bg-purple-100 text-purple-700" },
  { badgeBg: "bg-rose-50", badgeText: "text-rose-700", iconBg: "bg-[#FFF1F2]", iconText: "text-[#E11D48]", accentBorder: "hover:border-rose-300", stepBg: "bg-rose-100 text-rose-700" },
  { badgeBg: "bg-cyan-50", badgeText: "text-cyan-700", iconBg: "bg-[#ECFEFF]", iconText: "text-[#0891B2]", accentBorder: "hover:border-cyan-300", stepBg: "bg-cyan-100 text-cyan-700" },
];

const calculateReadTime = (content: string | null) => {
  if (!content) return 1;
  const wordsPerMinute = 200;
  const words = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

// ================= SUB-COMPONENTS =================

interface SubjectsViewProps {
  subjects: Subject[];
  notes: Note[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getTheme: (id: string) => SubjectTheme;
  setSelectedSubject: (s: Subject | null) => void;
  setCurrentScreen: (s: Screen) => void;
}

const SubjectsView = ({
  subjects,
  notes,
  searchQuery,
  setSearchQuery,
  getTheme,
  setSelectedSubject,
  setCurrentScreen
}: SubjectsViewProps) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase());
    const subjectNotes = notes.filter(n => n.subject_id === subject.id);
    
    if (filter === 'free') {
      return matchesSearch && subjectNotes.some(n => !n.is_paid);
    }
    if (filter === 'premium') {
      return matchesSearch && subjectNotes.some(n => n.is_paid);
    }
    return matchesSearch;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none -mb-24" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FBBF24] text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Study Hub
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight font-display leading-tight">
              Master Every Topic With <span className="text-[#FBBF24]">Handcrafted Notes</span>
            </h1>
            <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
              Read concise summaries, syllabus breakdowns, and exam-focused revision notes prepared by expert educators for West Bengal competitive exams.
            </p>
          </div>

          <div className="flex gap-3 md:gap-4 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-col items-center justify-center min-w-[96px] text-center shadow-md">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 block leading-none mb-1">
                {subjects.length}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-200">Subjects</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-col items-center justify-center min-w-[96px] text-center shadow-md">
              <span className="text-2xl sm:text-3xl font-black text-emerald-300 block leading-none mb-1">
                {notes.length}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-200">Chapters</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          5 STUDY SECTION CATEGORY CARDS (Screen 14 Hub)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Study Modules</h3>
            <p className="text-xs text-slate-500 font-medium">Curated study materials, current affairs, and revision resources</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {[
            {
              title: "Study Notes",
              desc: `${subjects.length} Subjects • ${notes.length} Chapters`,
              icon: BookOpen,
              color: "text-blue-600",
              bg: "bg-blue-50 border-blue-200/80",
              active: true,
              onClick: () => {},
            },
            {
              title: "Current Affairs",
              desc: "Daily Updates & CA Tests",
              icon: Calendar,
              color: "text-amber-600",
              bg: "bg-amber-50 border-amber-200/80",
              active: false,
              onClick: () => navigate("/student/current-affairs"),
            },
            {
              title: "Important GK",
              desc: "Static GK & WB Special",
              icon: Sparkles,
              color: "text-emerald-600",
              bg: "bg-emerald-50 border-emerald-200/80",
              active: false,
              onClick: () => navigate("/student/practice/subject"),
            },
            {
              title: "Previous Papers",
              desc: "PYQs with Solutions",
              icon: Award,
              color: "text-purple-600",
              bg: "bg-purple-50 border-purple-200/80",
              active: false,
              onClick: () => navigate("/student/pyq"),
            },
            {
              title: "Revision & Saved",
              desc: "Saved Notes & Bookmarks",
              icon: Bookmark,
              color: "text-rose-600",
              bg: "bg-rose-50 border-rose-200/80",
              active: false,
              onClick: () => navigate("/student/bookmarks"),
            },
          ].map((cat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={cat.onClick}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                cat.active
                  ? "bg-white border-blue-500 shadow-xs ring-2 ring-blue-500/15"
                  : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cat.bg}`}>
                  <cat.icon className={`w-4 h-4 ${cat.color}`} />
                </div>
                {cat.active && (
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight leading-snug">
                  {cat.title}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                  {cat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search subjects, chapters, or syllabus topics..."
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border border-slate-200/90 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            All Subjects ({subjects.length})
          </button>
          <button
            onClick={() => setFilter('free')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'free'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Free Notes
          </button>
          <button
            onClick={() => setFilter('premium')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'premium'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Premium Notes
          </button>
        </div>
      </div>

      {/* Subject Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
        {filteredSubjects.map((subject) => {
          const theme = getTheme(subject.id);
          const subjectNotes = notes.filter(n => n.subject_id === subject.id);
          const articleCount = subjectNotes.length;
          const premiumCount = subjectNotes.filter(n => n.is_paid).length;

          return (
            <motion.div
              key={subject.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => { setSelectedSubject(subject); setCurrentScreen("topics"); }}
              className={`rounded-2xl border border-slate-100/90 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] ${theme.accentBorder} transition-all cursor-pointer flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${theme.iconBg} ${theme.iconText} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1.5">
                    {premiumCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                        Pro
                      </span>
                    )}
                    {articleCount - premiumCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Free
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-1.5 group-hover:text-blue-600 transition-colors">
                  {subject.name}
                </h3>
                {subject.description ? (
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed mb-4">
                    {subject.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 font-medium italic mb-4">
                    Complete syllabus revision notes and topic breakdowns.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  {articleCount} {articleCount === 1 ? 'Chapter' : 'Chapters'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  Read Notes
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          );
        })}

        {filteredSubjects.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">No subjects found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No study notes match your query. Try searching for a different keyword or check back soon!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ================= TOPICS VIEW =================

interface TopicsViewProps {
  selectedSubject: Subject | null;
  getTheme: (id: string) => SubjectTheme;
  getTopicsForSubject: (id: string) => Topic[];
  getNotesForTopic: (id: string) => Note[];
  handleBack: () => void;
  setSelectedNote: (n: Note | null) => void;
  setSelectedTopic: (t: Topic | null) => void;
  setCurrentScreen: (s: Screen) => void;
}

const TopicsView = ({
  selectedSubject,
  getTheme,
  getTopicsForSubject,
  getNotesForTopic,
  handleBack,
  setSelectedNote,
  setSelectedTopic,
  setCurrentScreen
}: TopicsViewProps) => {
  if (!selectedSubject) return null;
  const theme = getTheme(selectedSubject.id);
  const subjectTopics = getTopicsForSubject(selectedSubject.id);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      {/* Back Button */}
      <button 
        onClick={handleBack} 
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors font-bold text-xs shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" /> 
        Back to Subjects
      </button>

      {/* Header Banner */}
      <div className="relative overflow-hidden p-5 sm:p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex items-center gap-4 sm:gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
            <FolderOpen className="w-7 h-7 text-[#FBBF24]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#FBBF24] text-[10px] font-black uppercase tracking-wider">
                Curriculum Syllabus
              </span>
              <span className="text-white/60 text-xs">•</span>
              <span className="text-white/80 text-xs font-semibold">
                {subjectTopics.length} Chapters Available
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white">
              {selectedSubject.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Chapters / Topics List */}
      <div className="space-y-3 pt-1">
        {subjectTopics.map((topic, index) => {
          const topicNotes = getNotesForTopic(topic.id);
          if (topicNotes.length === 0) return null;
          const topicNote = topicNotes[0];
          const stepNumber = String(index + 1).padStart(2, '0');

          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => {
                setSelectedNote(topicNote);
                setSelectedTopic(topic);
                setCurrentScreen("article");
              }}
              className="rounded-2xl border border-slate-100/90 bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-blue-200 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                {/* Number Badge */}
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-blue-100">
                  {stepNumber}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Chapter {index + 1}
                    </span>
                    {topicNote.is_paid ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                        Pro Only
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Free Access
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {topic.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {calculateReadTime(topicNote.content)} min read
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  size="sm"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 group-hover:translate-x-0.5 transition-transform"
                >
                  Read Chapter
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          );
        })}

        {subjectTopics.length === 0 && (
          <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No chapters uploaded yet</p>
            <p className="text-xs text-slate-500 mt-1">Our educators are adding study material for this subject shortly.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ================= ARTICLE READER =================

interface ArticleReaderProps {
  selectedNote: Note | null;
  selectedSubject: Subject | null;
  selectedTopic: Topic | null;
  readingProgress: number;
  subscriptionFee: number;
  isPurchased: boolean;
  setIsPurchased: (value: boolean) => void;
  handleBack: () => void;
}

const ArticleReader = ({
  selectedNote,
  selectedSubject,
  selectedTopic,
  readingProgress,
  subscriptionFee,
  isPurchased,
  setIsPurchased,
  handleBack
}: ArticleReaderProps) => {
  const { toast } = useToast();

  const checkPurchase = useCallback(async () => {
    if (!selectedNote || !selectedNote.is_paid) {
      setIsPurchased(true);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setIsPurchased(await hasActiveSubscription(session.user.id));
  }, [selectedNote, setIsPurchased]);

  useEffect(() => {
    checkPurchase();
  }, [checkPurchase]);

  if (!selectedNote || !selectedSubject || !selectedTopic) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
      {/* Sticky Reader Bar */}
      <div className="sticky top-2 z-40 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200/90 shadow-sm flex items-center justify-between">
        <button 
          onClick={handleBack} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast({ title: "Link Copied", description: "Article link copied to clipboard." });
            }}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200/60"
            title="Share Note"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100 rounded-b-2xl overflow-hidden">
          <motion.div
            className="h-full bg-blue-600"
            style={{ width: `${readingProgress}%` }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
          />
        </div>
      </div>

      {/* Paywall Locked Screen */}
      {!isPurchased && selectedNote.is_paid && (
        <div className="max-w-xl mx-auto py-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 text-center"
          >
            <div className="bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] p-8 text-white relative">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Crown className="w-8 h-8 text-[#FBBF24] fill-[#FBBF24]" />
              </div>
              <span className="bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full inline-block mb-3">
                Pro Member Exclusive
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display mb-2">
                Unlock Complete Study Notes
              </h2>
              <p className="text-slate-200 text-xs sm:text-sm max-w-sm mx-auto">
                Get unlimited access to all chapters, revision summaries, and exam guides.
              </p>
            </div>
            
            <div className="p-6 sm:p-8 space-y-6">
              <div className="inline-flex flex-col items-center gap-1 py-3 px-6 bg-amber-50 rounded-2xl border border-amber-200/80">
                <span className="text-3xl font-black text-amber-950">₹{subscriptionFee || 299}</span>
                <span className="text-[10px] text-amber-800 uppercase tracking-wider font-bold">1 Year Unlimited Pass</span>
              </div>
              
              <Button
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-blue-500/20"
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  try {
                    await initRazorpayPayment({
                      amount: subscriptionFee || 299,
                      contentId: "site_yearly_subscription",
                      contentType: "subscription" as any,
                      title: "Yearly Premium Subscription",
                      description: "Unlock all premium notes and mock tests for 1 year"
                    });
                    toast({ title: "Subscription Active", description: "You now have full access to all notes!" });
                    setIsPurchased(true);
                  } catch (err: any) {
                    toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
                  }
                }}
              >
                Upgrade to Pro Plan
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Unlocked Article Content */}
      {(isPurchased || !selectedNote.is_paid) && (
        <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-5 sm:p-8 md:p-10 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold">
                {selectedSubject.name}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                {selectedTopic.name}
              </span>
              {selectedNote.is_paid && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                  Pro Article
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-display leading-tight">
              {selectedNote.title}
            </h1>

            <div className="flex items-center gap-3 pt-2 text-xs text-slate-500 border-b border-slate-100 pb-4">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {calculateReadTime(selectedNote.content)} min read
              </span>
              <span>•</span>
              <span className="text-slate-400">
                Published {new Date(selectedNote.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div 
            className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-sans text-sm sm:text-base selection:bg-blue-100 selection:text-blue-900"
            dangerouslySetInnerHTML={{ __html: selectedNote.content || "<p>This note has no written text yet. Check back soon!</p>" }}
          />

          {/* Mastered Footer Card */}
          <div className="mt-12 pt-8 border-t border-slate-100">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <BookOpenCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                You've completed this chapter!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Great job studying "{selectedTopic.name}". Put your knowledge to the test with practice drills or proceed to the next chapter.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Button
                  onClick={() => {
                    toast({ title: "Completed!", description: "Chapter marked as completed." });
                    handleBack();
                  }}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Mark as Completed
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ================= MAIN COMPONENT =================

const StudentNotes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentScreen, setCurrentScreen] = useState<Screen>("subjects");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isPurchased, setIsPurchased] = useState<boolean>(false);
  const [subscriptionFee, setSubscriptionFee] = useState<number>(0);

  useEffect(() => {
    getYearlySubscriptionFee().then(setSubscriptionFee);
  }, []);

  useEffect(() => {
    if (currentScreen !== "article") {
      setReadingProgress(0);
      return;
    }

    const handleScroll = () => {
      const scrollable = document.querySelector('main')?.parentElement || document.documentElement;
      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setReadingProgress(isNaN(progress) ? 0 : progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const inset = document.querySelector('main')?.parentElement;
    if (inset) inset.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (inset) inset.removeEventListener("scroll", handleScroll);
    };
  }, [currentScreen]);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const [notesRes, subjectsRes, topicsRes] = await Promise.all([
      supabase.from("pdfs").select("*").order("created_at", { ascending: false }),
      supabase.from("subjects").select("id, name, description").eq("category", "notes").order("order_index", { ascending: true }),
      supabase.from("topics").select("id, subject_id, name, content").eq("category", "notes").order("order_index", { ascending: true })
    ]);

    if (notesRes.data) {
      const mappedNotes = (notesRes.data || []).map(note => ({
        ...note,
        is_paid: note.is_paid ?? false,
        price: note.price ?? 0
      })) as Note[];
      setNotes(mappedNotes);
    }
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (topicsRes.data) setTopics(topicsRes.data);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const getTheme = useCallback((id: string) => {
    const index = subjects.findIndex(s => s.id === id);
    return subjectThemes[index % subjectThemes.length] || subjectThemes[0];
  }, [subjects]);

  const getTopicsForSubject = (subjectId: string) => topics.filter(t => t.subject_id === subjectId);
  const getNotesForTopic = (topicId: string) => notes.filter(n => n.topic_id === topicId);

  const handleBack = useCallback(() => {
    if (currentScreen === "article") {
      setSelectedNote(null);
      setCurrentScreen("topics");
    } else if (currentScreen === "topics") {
      setSelectedSubject(null);
      setCurrentScreen("subjects");
    }
  }, [currentScreen]);

  return (
    <StudentLayout title="Notes" subtitle="Study Material">
      <PullToRefresh onRefresh={loadData}>
        <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 pb-24 md:pb-8 space-y-4 md:space-y-6">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/80 bg-white">
                <img src="/logo-circle.png" alt="PracticeKoro" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 font-display">
                    Practice<span className="text-blue-600">Koro</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Notes
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Smart Study Notes & Syllabus Hub</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(isPurchased ? "/student/profile" : "/student/exams")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors shadow-2xs ${
                  isPurchased
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-[#FEF3C7] text-amber-900 border-amber-200 hover:bg-amber-100"
                }`}
                title={isPurchased ? "Pro Member" : "Upgrade to Pro"}
              >
                <Crown className={`w-3.5 h-3.5 shrink-0 ${isPurchased ? "text-emerald-600 fill-emerald-500" : "text-amber-600 fill-amber-500"}`} />
                <span>{isPurchased ? "Pro Member" : "Upgrade to Pro"}</span>
              </button>
              <button
                onClick={() => navigate("/student/notifications")}
                className="relative w-9 h-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-6 space-y-6 animate-pulse">
              <div className="h-44 rounded-3xl bg-slate-100" />
              <div className="h-12 rounded-2xl bg-slate-100 w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="p-5 rounded-2xl bg-white border border-slate-100 h-44" />
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {currentScreen === "subjects" && (
                <SubjectsView
                  key="subjects"
                  subjects={subjects}
                  notes={notes}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  getTheme={getTheme}
                  setSelectedSubject={setSelectedSubject}
                  setCurrentScreen={setCurrentScreen}
                />
              )}
              {currentScreen === "topics" && (
                <TopicsView
                  key="topics"
                  selectedSubject={selectedSubject}
                  getTheme={getTheme}
                  getTopicsForSubject={getTopicsForSubject}
                  getNotesForTopic={getNotesForTopic}
                  handleBack={handleBack}
                  setSelectedNote={setSelectedNote}
                  setSelectedTopic={setSelectedTopic}
                  setCurrentScreen={setCurrentScreen}
                />
              )}
              {currentScreen === "article" && (
                <ArticleReader
                  key="article"
                  selectedNote={selectedNote}
                  selectedSubject={selectedSubject}
                  selectedTopic={selectedTopic}
                  readingProgress={readingProgress}
                  subscriptionFee={subscriptionFee}
                  isPurchased={isPurchased}
                  setIsPurchased={setIsPurchased}
                  handleBack={handleBack}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </PullToRefresh>
    </StudentLayout>
  );
};

export default StudentNotes;
