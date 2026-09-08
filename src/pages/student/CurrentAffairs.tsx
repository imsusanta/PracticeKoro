import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/student/StudentLayout";
import {
  Search,
  Calendar,
  Sparkles,
  Bookmark,
  Share2,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Globe,
  Landmark,
  Cpu,
  Trophy,
  MapPin,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BengaliText } from "@/components/ui/PracticeKoroDesignSystem";

interface CurrentAffairsArticle {
  id: string;
  category: "West Bengal" | "National" | "International" | "Economy" | "Science & Tech" | "Sports";
  date: string;
  readTime: string;
  titleBn: string;
  titleEn: string;
  summaryBn: string;
  bulletPoints: string[];
  examRelevance: string;
  isImportant?: boolean;
}

const SAMPLE_ARTICLES: CurrentAffairsArticle[] = [
  {
    id: "ca-blueprint-1",
    category: "National",
    date: "16 September 2025",
    readTime: "5 min read",
    titleBn: "ভারতের নতুন শিক্ষা নীতি ২০২৫",
    titleEn: "National Education Policy 2025 Updates",
    summaryBn: "জাতীয় শিক্ষানীতির অধীনে রাজ্য ও কেন্দ্রীয় স্তরে নতুন পাঠ্যক্রম এবং মূল্যায়ন পদ্ধতির সংস্কার ঘোষণা করা হয়েছে।",
    bulletPoints: [
      "স্কুল এবং কলেজ স্তরে ব্যবহারিক ও পেশাগত দক্ষতার উপর বিশেষ গুরুত্ব আরোপ।",
      "মাতৃভাষায় প্রাথমিক শিক্ষা এবং প্রযুক্তি নির্ভর শিক্ষার প্রসার।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: জাতীয় শিক্ষা নীতির মূল স্তম্ভ ও লক্ষ্য।"
    ],
    examRelevance: "WBCS, Primary TET, SSC, State Govt",
    isImportant: true
  },
  {
    id: "ca-blueprint-2",
    category: "West Bengal",
    date: "16 September 2025",
    readTime: "4 min read",
    titleBn: "পশ্চিমবঙ্গে নতুন প্রকল্প ঘোষণা",
    titleEn: "New Welfare Schemes Announced in West Bengal",
    summaryBn: "পশ্চিমবঙ্গ সরকারের সাম্প্রতিক মন্ত্রিসভার বৈঠকে গ্রামীণ যুবকদের কর্মসংস্থান ও স্বনির্ভরতার জন্য নতুন আর্থিক উদ্যোগ গৃহীত হয়েছে।",
    bulletPoints: [
      "গ্রামীণ অর্থনৈতিক ক্ষমতায়ন ও স্থানীয় কর্মসংস্থান বৃদ্ধি।",
      "স্বনির্ভর গোষ্ঠীর জন্য বিশেষ আর্থিক ঋণ সুবিধা।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: পশ্চিমবঙ্গ সরকারের প্রধান জনকল্যাণমূলক প্রকল্প।"
    ],
    examRelevance: "Panchayat Exam, WBP, Group C & D, WBCS",
    isImportant: true
  },
  {
    id: "ca-blueprint-3",
    category: "International",
    date: "16 September 2025",
    readTime: "6 min read",
    titleBn: "G20 সম্মেলনে ভারতের অবস্থান",
    titleEn: "India's Strategic Stance at G20 Summit",
    summaryBn: "আন্তর্জাতিক মঞ্চে ভারতের নেতৃত্বাধীন গ্লোবাল সাউথ উদ্যোগ এবং অর্থনৈতিক সংহতি নিয়ে আলোচনা প্রশংসিত হয়েছে।",
    bulletPoints: [
      "সবুজ শক্তি রূপান্তর এবং বৈশ্বিক জলবায়ু অর্থায়ন নিয়ে জোরদার দাবি।",
      "ডিজিটাল পাবলিক ইনফ্রাস্ট্রাকচার (DPI) মডেলের বিশ্বব্যাপী স্বীকৃতি।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: G20 সদস্য দেশ ও শীর্ষ সম্মেলনের ঘোষণাপত্র।"
    ],
    examRelevance: "WBCS Mains & Prelims, UPSC, Banking",
    isImportant: true
  },
  {
    id: "ca-blueprint-4",
    category: "Science & Tech",
    date: "16 September 2025",
    readTime: "4 min read",
    titleBn: "চন্দ্রযান-৪ এর নতুন সাফল্য",
    titleEn: "ISRO Chandrayaan-4 Lunar Mission Milestones",
    summaryBn: "চাঁদের মাটি ও পাথরের নমুনা পৃথিবীতে ফিরিয়ে আনার জন্য ইসরোর চন্দ্রযান-৪ অভিযানের প্রাথমিক নকশা ও পরীক্ষা সফলভাবে সম্পন্ন হয়েছে।",
    bulletPoints: [
      "লুনার স্যাম্পল রিটার্ন মিশনের জন্য স্বয়ংক্রিয় ডকিং প্রযুক্তির সফল পরীক্ষণ।",
      "ভারতের স্পেস ভিশন ২০৪৭-এর অংশ হিসেবে চাঁদে মানব অবতরণের প্রস্তুতি।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: ইসরোর সাম্প্রতিক মহাকাশ অভিযান ও রকেট মডেল।"
    ],
    examRelevance: "WBCS, Railway NTPC, SSC CGL",
    isImportant: true
  },
  {
    id: "ca-2",
    category: "Science & Tech",
    date: "Yesterday",
    readTime: "4 min read",
    titleBn: "ISRO সফলভাবে মহাকাশে উৎক্ষেপণ করল উন্নত নেভিগেশন স্যাটেলাইট NVS-02",
    titleEn: "ISRO Successfully Launches Next-Gen Navigation Satellite NVS-02 into Orbit",
    summaryBn: "শ্রীহরিকোটার সতীশ ধাওয়ান মহাকাশ কেন্দ্র থেকে GSLV-F12 রকেটের সাহায্যে সফলভাবে উপগ্রহটি প্রতিস্থাপিত হয়েছে।",
    bulletPoints: [
      "NavIC (Navigation with Indian Constellation) সিস্টেমকে আরও নির্ভুল ও সুরক্ষিত করতে এই উৎক্ষেপণ।",
      "এতে ব্যবহৃত হয়েছে স্বদেশীয় রুবিডিয়াম পারমাণবিক ঘড়ি (Rubidium Atomic Clock)।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: NavIC-এর পুরো নাম, উৎক্ষেপণকারী যান ও স্যাটেলাইটের শ্রেণি।"
    ],
    examRelevance: "WBCS Prelims & Mains, Railway NTPC, SSC CGL",
    isImportant: true
  },
  {
    id: "ca-3",
    category: "Economy",
    date: "2 days ago",
    readTime: "3 min read",
    titleBn: "RBI মুদ্রা নীতি কমিটির সিদ্ধান্ত: রেপো রেট অপরিবর্তিত রাখা হল ৬.৫% হারে",
    titleEn: "RBI Monetary Policy Committee Keeps Repo Rate Unchanged at 6.5%",
    summaryBn: "মূল্যস্ফীতি নিয়ন্ত্রণ এবং অর্থনৈতিক প্রবৃদ্ধির মধ্যে ভারসাম্য রক্ষায় কেন্দ্রীয় ব্যাঙ্ক সুদের হার স্থির রাখার সিদ্ধান্ত নিয়েছে।",
    bulletPoints: [
      "রিজার্ভ ব্যাঙ্কের MPC-এর ৬ জন সদস্যের সংখ্যাগরিষ্ঠের মতামতে রেপো রেট অপরিবর্তিত রইল।",
      "স্ট্যান্ডিং ডিপোজিট ফ্যাসিলিটি (SDF) রেট ৬.২৫% এবং মার্জিনাল স্ট্যান্ডিং ফ্যাসিলিটি (MSF) রেট ৬.৭৫% বহাল।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: MPC-এর গঠন, মুদ্রানীতির হাতিয়ার ও রেপো রেটের সংজ্ঞা।"
    ],
    examRelevance: "PSC Clerkship, WBCS, Banking & Insurance",
    isImportant: false
  },
  {
    id: "ca-4",
    category: "Sports",
    date: "3 days ago",
    readTime: "2 min read",
    titleBn: "দাবা অলিম্পিয়াডে ঐতিহাসিক সোনা জয় ভারতীয় পুরুষ ও মহিলা দলের",
    titleEn: "India Wins Historic Double Gold in 45th Chess Olympiad",
    summaryBn: "বুদাপেস্টে আয়োজিত ৪৫তম দাবা অলিম্পিয়াডে ভারতীয় দল অসাধারণ পারফর্ম করে উন্মুক্ত ও মহিলা দুটি বিভাগেই স্বর্ণপদক অর্জন করে।",
    bulletPoints: [
      "ডি. গুকেশ এবং রমেশবাবু প্রজ্ঞানন্দ আন্তর্জাতিক গ্র্যান্ডমাস্টারদের বিরুদ্ধে অপরাজিত রইলেন।",
      "মহিলা বিভাগে তানিয়া সচদেব ও দিব্যা দেশমুখ দুর্দান্ত নেতৃত্ব দেন।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: আয়োজনস্থল, ভারতের স্বর্ণপদক জয়ী খেলোয়াড়দের নাম।"
    ],
    examRelevance: "WBP Constable, KP, Rail Group D, WBCS",
    isImportant: true
  },
  {
    id: "ca-5",
    category: "National",
    date: "4 days ago",
    readTime: "3 min read",
    titleBn: "দেশের নতুন মুখ্য নির্বাচন কমিশনার (CEC) হিসেবে দায়িত্ব গ্রহণ",
    titleEn: "Appointment of New Chief Election Commissioner of India Under Article 324",
    summaryBn: "রাষ্ট্রপতি দ্রৌপদী মুর্মু সংবিধানের ৩২৪ ধারা অনুযায়ী নতুন নির্বাচন কমিশনার নিয়োগ সংক্রান্ত বিজ্ঞপ্তি জারি করেছেন।",
    bulletPoints: [
      "সংবিধানের ৩২৪ ধারা অনুযায়ী প্রধান নির্বাচন কমিশনার ও অন্যান্য নির্বাচন কমিশনাররা নিযুক্ত হন।",
      "কার্যকাল: ৬ বছর অথবা ৬৫ বছর বয়স পর্যন্ত (যেটি আগে হবে)।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: ভারতীয় সংবিধানের ভাগ ১৫ (Part XV), নির্বাচন কমিশনের ক্ষমতা ও কার্যকারিতা।"
    ],
    examRelevance: "WBCS Polity, PSC Miscellaneous, KP SI",
    isImportant: true
  },
  {
    id: "ca-6",
    category: "International",
    date: "5 days ago",
    readTime: "3 min read",
    titleBn: "জাতিসংঘের পরিবেশ সম্মেলন (COP) ২০২৪-এ জলবায়ু অর্থায়ন লক্ষ্যমাত্রা নির্ধারণ",
    titleEn: "UN Climate Change Conference Sets New Global Climate Finance Goals",
    summaryBn: "উন্নয়নশীল দেশগুলির পরিবেশ সুরক্ষা ও কার্বন নিঃসরণ হ্রাসের জন্য আন্তর্জাতিক তহবিল সহায়তার চুক্তি স্বাক্ষরিত হয়েছে।",
    bulletPoints: [
      "প্যারিস চুক্তির প্রতিশ্রুতি বাস্তবায়নের অংশ হিসেবে এই সম্মেলন অনুষ্ঠিত হয়।",
      "লস অ্যান্ড ড্যামেজ ফান্ড (Loss and Damage Fund)-এর কার্যক্রমকে কার্যকর রূপ দেওয়া হয়।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: COP সম্মেলনের সংস্করণ ও পরিবেশ বিষয়ক আন্তর্জাতিক চুক্তি।"
    ],
    examRelevance: "WBCS Mains, SSC, Central Govt Exams",
    isImportant: false
  }
];

const categoryList = [
  "All",
  "West Bengal",
  "National",
  "International",
  "Economy",
  "Science & Tech",
  "Sports"
] as const;

export default function CurrentAffairs() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("ca_bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info("Removed from saved current affairs");
      } else {
        next.add(id);
        toast.success("Saved to your reading list!");
      }
      localStorage.setItem("ca_bookmarks", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleShare = async (article: CurrentAffairsArticle) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.titleEn,
          text: `${article.titleBn} - PracticeKoro Current Affairs`,
          url: window.location.href,
        });
      } catch (err) {
        // Ignored share cancel
      }
    } else {
      navigator.clipboard.writeText(`${article.titleBn} - ${window.location.href}`);
      toast.success("Link copied to clipboard!");
    }
  };

  const filteredArticles = useMemo(() => {
    return SAMPLE_ARTICLES.filter(item => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        item.titleBn.toLowerCase().includes(query) ||
        item.titleEn.toLowerCase().includes(query) ||
        item.summaryBn.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "West Bengal":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "National":
        return "bg-blue-50 text-blue-700 border-blue-200/60";
      case "International":
        return "bg-purple-50 text-purple-700 border-purple-200/60";
      case "Economy":
        return "bg-amber-50 text-amber-700 border-amber-200/60";
      case "Science & Tech":
        return "bg-cyan-50 text-cyan-700 border-cyan-200/60";
      case "Sports":
        return "bg-rose-50 text-rose-700 border-rose-200/60";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-5 sm:space-y-6 pb-20 max-w-4xl mx-auto px-1 sm:px-2">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
                <Globe className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight font-display">
                  Current Affairs Hub
                </h1>
                <BengaliText className="text-xs text-slate-500 font-medium">
                  দৈনিক ও মাসিক গুরুত্বপূর্ণ কারেন্ট অ্যাফেয়ার্স
                </BengaliText>
              </div>
            </div>

            {/* Study Navigation Switcher: Study Notes | Current Affairs */}
            <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/60 shadow-2xs">
              <button
                onClick={() => navigate("/student/notes")}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Study Notes
              </button>
              <button
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-700 shadow-2xs"
              >
                Current Affairs & GK
              </button>
            </div>
          </div>

          {/* Time Selector Pills: Daily | Weekly | Monthly */}
          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70 self-start sm:self-auto">
            {(["daily", "weekly", "monthly"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTimeFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  timeFilter === tab
                    ? "bg-white text-[#2563EB] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Daily MCQ Challenge CTA Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-5 sm:p-6 shadow-md border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Live 10-Question Quiz
              </div>
              <h2 className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
                Daily Current Affairs MCQ Practice
              </h2>
              <BengaliText className="text-xs text-slate-300 block">
                আজকের আলোচিত ঘটনাবলীর উপর ১০টি MCQ অনুশীলন করে নিজের স্কোর যাচাই করুন।
              </BengaliText>
            </div>
            <button
              onClick={() => navigate("/student/daily")}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#2563EB] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all shrink-0 active:scale-95"
            >
              Start Quiz
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Section */}
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by topic, state, exam or keyword (e.g. ISRO, WBCS, WB Govt)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categoryList.map(cat => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    active
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Affairs Articles Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Showing {filteredArticles.length} updates</span>
            <span>WB & National Exam Focused</span>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No articles found</p>
              <p className="text-xs text-slate-400 mt-1">Try changing your category or search keyword</p>
            </div>
          ) : (
            filteredArticles.map(article => {
              const isSaved = bookmarkedIds.has(article.id);
              return (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-4"
                >
                  {/* Card Meta Top */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${getCategoryBadgeColor(
                          article.category
                        )}`}
                      >
                        {article.category}
                      </span>
                      {article.isImportant && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          High Yield
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{article.date}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                    </div>
                  </div>

                  {/* Headlines */}
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug font-display">
                      {article.titleBn}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {article.titleEn}
                    </p>
                  </div>

                  {/* Bullet Points / Exam Takeaways */}
                  <div className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-100 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      পরীক্ষার জন্য মূল তথ্য (Exam Key Points)
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {article.bulletPoints.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Bottom: Exam Relevance & Actions */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">Target Exams:</span>
                      <span className="text-blue-600 font-semibold">{article.examRelevance}</span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => toggleBookmark(article.id)}
                        className={`p-2 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 ${
                          isSaved
                            ? "bg-amber-50 text-amber-600 border-amber-200"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                        title="Save to reading list"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-500 text-amber-500" : ""}`} />
                        <span className="text-[11px]">{isSaved ? "Saved" : "Save"}</span>
                      </button>

                      <button
                        onClick={() => handleShare(article)}
                        className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all text-xs font-semibold flex items-center gap-1.5"
                        title="Share article"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Share</span>
                      </button>

                      <button
                        onClick={() => navigate("/student/daily")}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-200/80 hover:bg-blue-100/70 transition-all text-[11px] font-bold flex items-center gap-1"
                      >
                        Practice MCQs
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
