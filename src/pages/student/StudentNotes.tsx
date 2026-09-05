import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search, BookOpen, FolderOpen,
  ChevronRight, BookOpenCheck, Sparkles, Clock, Share2, ArrowLeft,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudentLayout from "@/components/student/StudentLayout";
import { LoadError } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { initRazorpayPayment } from "@/utils/payment";

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

interface ColorTheme {
  bg: string;
  light: string;
  text: string;
  icon: string;
}

// ================= CONSTANTS =================
const subjectColors: ColorTheme[] = [
  { bg: "from-indigo-600 to-violet-700", light: "bg-indigo-50", text: "text-indigo-600", icon: "bg-indigo-600/10" },
  { bg: "from-emerald-600 to-teal-700", light: "bg-emerald-50", text: "text-emerald-600", icon: "bg-emerald-600/10" },
  { bg: "from-amber-500 to-orange-600", light: "bg-amber-50", text: "text-amber-600", icon: "bg-amber-500/10" },
  { bg: "from-rose-500 to-pink-600", light: "bg-rose-50", text: "text-rose-600", icon: "bg-rose-500/10" },
  { bg: "from-blue-600 to-cyan-700", light: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-600/10" },
  { bg: "from-purple-600 to-fuchsia-700", light: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-600/10" },
];

// ================= SUB-COMPONENTS =================

interface SubjectsViewProps {
  subjects: Subject[];
  notes: Note[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getColor: (id: string) => ColorTheme;
  setSelectedSubject: (s: Subject | null) => void;
  setCurrentScreen: (s: Screen) => void;
}

const SubjectsView = ({
  subjects,
  notes,
  searchQuery,
  setSearchQuery,
  getColor,
  setSelectedSubject,
  setCurrentScreen
}: SubjectsViewProps) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="relative z-10">
        <h2 className="text-3xl font-black mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-yellow-300" />
          Study Notes
        </h2>
        <p className="text-indigo-100 font-medium max-w-md">Study notes and articles organized by subject.</p>
        <div className="flex gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20">
            <span className="text-2xl font-bold block">{subjects.length}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Subjects</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20">
            <span className="text-2xl font-bold block">{notes.filter(n => subjects.some(s => s.id === n.subject_id)).length}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Articles</span>
          </div>
        </div>
      </div>
    </div>

    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        placeholder="Search subjects..."
        aria-label="Search subjects"
        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border-0 shadow-sm focus:ring-2 focus:ring-violet-500/20 transition-all font-medium"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
        <div className="col-span-full rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <h3 className="font-bold text-slate-900">
            {subjects.length === 0 ? "No study notes yet" : `No subjects match “${searchQuery}”`}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {subjects.length === 0 ? "Notes will appear here when they are published." : "Try a different search."}
          </p>
        </div>
      )}
      {subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((subject) => {
        const color = getColor(subject.id);
        const articleCount = notes.filter(n => n.subject_id === subject.id).length;
        return (
          <motion.button
            key={subject.id}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSelectedSubject(subject); setCurrentScreen("topics"); }}
            className={`p-5 rounded-3xl text-left transition-all ${color.light} border border-transparent hover:border-white hover:shadow-xl group`}
          >
            <div className={`w-12 h-12 rounded-2xl ${color.icon} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              <BookOpen className={`w-6 h-6 ${color.text}`} />
            </div>
            <h3 className="font-bold text-gray-900 leading-tight mb-1">{subject.name}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{articleCount} Articles</p>
          </motion.button>
        );
      })}
    </div>
  </motion.div>
);

interface TopicsViewProps {
  selectedSubject: Subject | null;
  getColor: (id: string) => ColorTheme;
  getTopicsForSubject: (id: string) => Topic[];
  getNotesForTopic: (id: string) => Note[];
  handleBack: () => void;
  setSelectedNote: (n: Note | null) => void;
  setSelectedTopic: (t: Topic | null) => void;
  setCurrentScreen: (s: Screen) => void;
}

const TopicsView = ({
  selectedSubject,
  getColor,
  getTopicsForSubject,
  getNotesForTopic,
  handleBack,
  setSelectedNote,
  setSelectedTopic,
  setCurrentScreen
}: TopicsViewProps) => {
  if (!selectedSubject) return null;
  const color = getColor(selectedSubject.id);
  const subjectTopics = getTopicsForSubject(selectedSubject.id);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold text-sm mb-2 group">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Subjects
      </button>

      <div className={`relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br ${color.bg} text-white shadow-2xl shadow-indigo-500/20 group`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-inner group-hover:rotate-3 transition-transform">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div>
            <p className="text-white/70 text-xs font-black uppercase tracking-widest leading-none mb-2">Subject Collection</p>
            <h2 className="text-3xl font-black tracking-tight">{selectedSubject.name}</h2>
          </div>
        </div>
      </div>

      <div className="grid gap-4 pt-2">
        {subjectTopics.filter(t => getNotesForTopic(t.id).length > 0).length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
            <h3 className="font-bold text-slate-900">No chapters in this subject yet</h3>
            <p className="text-sm text-slate-500 mt-1">Check back soon for new notes.</p>
          </div>
        )}
        {subjectTopics.map(topic => {
          const topicNotes = getNotesForTopic(topic.id);
          if (topicNotes.length === 0) return null;
          const topicNote = topicNotes[0];

          return (
            <motion.button
              key={topic.id}
              whileHover={{ scale: 1.01, x: 5 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setSelectedNote(topicNote);
                setSelectedTopic(topic);
                setCurrentScreen("article");
              }}
              className="flex items-center gap-6 p-6 bg-white rounded-[2.5rem] border border-gray-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group text-left relative overflow-hidden"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b ${color.bg} opacity-80`} />

              <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-gradient-to-br ${color.bg} transition-all duration-500 shadow-inner`}>
                <BookOpen className="w-7 h-7 text-gray-400 group-hover:text-white transition-colors" />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 opacity-70">Chapter Headline</p>
                <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-700 transition-colors truncate tracking-tight">{topic.name}</h3>
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" /> Ready to read
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <BookOpenCheck className="w-3.5 h-3.5" /> READY TO READ
                  </span>
                  {topicNote.is_paid ? (
                    <Badge className="bg-amber-500 text-white border-0 text-[10px] font-bold">PREMIUM</Badge>
                  ) : (
                    <Badge className="bg-emerald-500 text-white border-0 text-[10px] font-bold">FREE</Badge>
                  )}
                </div>
              </div>

              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors shrink-0">
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

interface ArticleReaderProps {
  selectedNote: Note | null;
  selectedSubject: Subject | null;
  selectedTopic: Topic | null;
  color: ColorTheme;
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
  color,
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

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const { data: purchaseData } = await (supabase
      .from("purchases" as any)
      .select("id")
      .eq("user_id", session.user.id)
      .eq("content_type", "subscription")
      .eq("status", "completed")
      .gt("created_at", oneYearAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as any);

    setIsPurchased(!!purchaseData);
  }, [selectedNote, setIsPurchased]);

  useEffect(() => {
    checkPurchase();
  }, [checkPurchase]);

  if (!selectedNote || !selectedSubject || !selectedTopic) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pb-32">
      <div className="sticky top-0 z-50 -mx-4 px-4 py-3 bg-white/70 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between transition-all duration-300">
        <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-gray-900 hover:bg-gray-100 transition-all font-bold text-sm group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Share note"
            className="p-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
            onClick={async () => {
              const shareData = { title: selectedNote.title, url: window.location.href };
              try {
                if (navigator.share) {
                  await navigator.share(shareData);
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied", description: "Share it with a classmate." });
                }
              } catch {
                /* user cancelled share */
              }
            }}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100/50">
          <motion.div
            className={`h-full bg-gradient-to-r ${color.bg} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
            style={{ width: `${readingProgress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {!isPurchased && selectedNote.is_paid && (
        <div className="max-w-md mx-auto mt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/30">
                <CreditCard className="w-10 h-10 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-0 text-[10px] font-black tracking-widest uppercase px-3 py-1 mb-3">Premium Content</Badge>
              <h2 className="text-2xl font-black text-white mb-2 font-display">Unlock All Premium Content</h2>
              <p className="text-indigo-100 font-medium">{selectedNote.title}</p>
            </div>
            <div className="p-8 flex flex-col gap-6">
              <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Unlock every premium note and mock test on the platform with a single yearly subscription.</p>
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">₹{subscriptionFee}</span>
                <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Per Year</span>
              </div>
              <Button
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 font-black text-lg group transition-all"
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  try {
                    await initRazorpayPayment({
                      amount: subscriptionFee,
                      contentId: "site_yearly_subscription",
                      contentType: "subscription" as any,
                      title: "Yearly Premium Subscription",
                      description: "Unlock all premium notes and mock tests for 1 year"
                    });
                    toast({ title: "Subscription Active", description: "You now have full access to all premium content!" });
                    setIsPurchased(true);
                  } catch (err: any) {
                    toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
                  }
                }}
              >
                Subscribe — ₹{subscriptionFee}/year
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {(isPurchased || !selectedNote.is_paid) && (
        <div className="max-w-3xl mx-auto mt-12 px-2">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-[1.1] selection:bg-indigo-100">
            {selectedNote.title}
            {selectedNote.is_paid && <Badge className="ml-4 align-middle bg-amber-500 text-white border-0 text-sm font-bold">PREMIUM</Badge>}
          </motion.h1>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-4 pt-6 border-t border-gray-100 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100/50 flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 leading-none mb-1">PracticeKoro Edu</p>
                <p className="text-xs font-bold text-gray-400">Published {new Date(selectedNote.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <Clock className="w-3.5 h-3.5" /> Study note
            </div>
          </motion.div>

          <article className="relative">
            <div className="article-content" dangerouslySetInnerHTML={{ __html: selectedNote.content || "<p>This article has no content yet. Stay tuned for updates!</p>" }} />
          </article>

          <footer className="mt-24 pt-12 border-t border-gray-100">
            <motion.div whileInView={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.95 }} viewport={{ once: true }} className="relative overflow-hidden bg-white rounded-[2.5rem] p-10 text-center border border-gray-100 shadow-2xl shadow-indigo-500/10 group">
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br ${color.bg} opacity-[0.03] blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700`} />
              <div className="relative z-10">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color.bg} flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform`} style={{ boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2)' }}>
                  <BookOpenCheck className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Knowledge Mastered!</h3>
                <p className="text-gray-500 mb-8 font-medium max-w-sm mx-auto">You've reached the end of this <span className="text-emerald-600 font-bold">"{selectedTopic.name}"</span> chapter. Great job!</p>
                <Button
                  onClick={handleBack}
                  className={`h-16 px-12 rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 bg-gradient-to-r ${color.bg} text-white hover:scale-105 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group/btn`}
                >
                  <span className="relative z-10 flex items-center gap-2">Back to chapters</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                </Button>
              </div>
            </motion.div>
          </footer>
        </div>
      )}
    </motion.div>
  );
};

// ================= MAIN COMPONENT =================

const StudentNotes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
    const fetchSubscriptionFee = async () => {
      const { data } = await (supabase
        .from("site_settings" as any)
        .select("value")
        .eq("key", "yearly_subscription_fee")
        .maybeSingle() as any);
      if (data) setSubscriptionFee(parseFloat(data.value) || 0);
    };
    fetchSubscriptionFee();
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
    if (!session) { navigate("/login"); setLoading(false); return; }

    const [notesRes, subjectsRes, topicsRes] = await Promise.all([
      supabase.from("pdfs").select("*").order("created_at", { ascending: false }),
      supabase.from("subjects").select("id, name, description").eq("category", "notes").order("order_index", { ascending: true }),
      supabase.from("topics").select("id, subject_id, name, content").eq("category", "notes").order("order_index", { ascending: true })
    ]);

    if (notesRes.error || subjectsRes.error || topicsRes.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
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

  const getColor = useCallback((id: string) => {
    const index = subjects.findIndex(s => s.id === id);
    return subjectColors[index % subjectColors.length] || subjectColors[0];
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

  if (loading) {
    return (
      <StudentLayout title="Notes" subtitle="Loading your library...">
        <div className="p-4 space-y-4 max-w-5xl mx-auto">
          <div className="h-48 rounded-3xl skeleton-premium" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-2xl skeleton-premium" />)}
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Notes" subtitle="University of Knowledge">
      <div className="w-full max-w-5xl mx-auto py-2 px-1">
        {loadError && (
          <LoadError
            title="Couldn't load notes"
            description="Study notes didn't load. Try again."
            onRetry={loadData}
          />
        )}
        <AnimatePresence mode="wait">
          {currentScreen === "subjects" && (
            <SubjectsView
              key="subjects"
              subjects={subjects}
              notes={notes}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              getColor={getColor}
              setSelectedSubject={setSelectedSubject}
              setCurrentScreen={setCurrentScreen}
            />
          )}
          {currentScreen === "topics" && (
            <TopicsView
              key="topics"
              selectedSubject={selectedSubject}
              getColor={getColor}
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
              color={selectedSubject ? getColor(selectedSubject.id) : subjectColors[0]}
              readingProgress={readingProgress}
              subscriptionFee={subscriptionFee}
              isPurchased={isPurchased}
              setIsPurchased={setIsPurchased}
              handleBack={handleBack}
            />
          )}
        </AnimatePresence>
      </div>
    </StudentLayout>
  );
};

export default StudentNotes;
