import { supabase } from "@/integrations/supabase/client";

export type CurrentAffairsCategory =
  | "West Bengal"
  | "National"
  | "International"
  | "Economy"
  | "Science & Tech"
  | "Sports";

export interface CurrentAffairsArticle {
  id: string;
  category: CurrentAffairsCategory;
  date: string;
  readTime: string;
  titleBn: string;
  titleEn: string;
  summaryBn: string;
  bulletPoints: string[];
  examRelevance: string;
  isImportant?: boolean;
}

export const CURRENT_AFFAIRS_CATEGORIES: CurrentAffairsCategory[] = [
  "West Bengal",
  "National",
  "International",
  "Economy",
  "Science & Tech",
  "Sports"
];

export const INITIAL_CURRENT_AFFAIRS: CurrentAffairsArticle[] = [
  {
    id: "ca-blueprint-1",
    category: "National",
    date: "16 September 2025",
    readTime: "5 min read",
    titleBn: "ভারতের নতুন শিক্ষা নীতি ২০২৫",
    titleEn: "National Education Policy 2025 Updates",
    summaryBn: "জাতীয় শিক্ষানীতির অধীনে রাজ্য ও কেন্দ্রীয় স্তরে নতুন পাঠ্যক্রম এবং মূল্যায়ন পদ্ধতির সংস্কার ঘোষণা করা হয়েছে।",
    bulletPoints: [
      "স্কুল এবং কলেজ স্তরে ব্যবহারিক ও পেশাগত দক্ষতার উপর বিশেষ গুরুত্ব আরোপ।",
      "মাতৃভাষায় প্রাথমিক শিক্ষা এবং প্রযুক্তি নির্ভর শিক্ষার প্রসার।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: জাতীয় শিক্ষা নীতির মূল স্তম্ভ ও লক্ষ্য।"
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
    summaryBn: "পশ্চিমবঙ্গ সরকারের সাম্প্রতিক মন্ত্রিসভার বৈঠকে গ্রামীণ যুবকদের কর্মসংস্থান ও স্বনির্ভরতার জন্য নতুন আর্থিক উদ্যোগ গৃহীত হয়েছে।",
    bulletPoints: [
      "গ্রামীণ অর্থনৈতিক ক্ষমতায়ন ও স্থানীয় কর্মসংস্থান বৃদ্ধি।",
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
    summaryBn: "আন্তর্জাতিক মঞ্চে ভারতের নেতৃত্বাধীন গ্লোবাল সাউথ উদ্যোগ এবং অর্থনৈতিক সংহতি নিয়ে আলোচনা প্রশংসিত হয়েছে।",
    bulletPoints: [
      "সবুজ শক্তি রূপান্তর এবং বৈশ্বিক জলবায়ু অর্থায়ন নিয়ে জোরদার দাবি।",
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
    summaryBn: "চাঁদের মাটি ও পাথরের নমুনা পৃথিবীতে ফিরিয়ে আনার জন্য ইসরোর চন্দ্রযান-৪ অভিযানের প্রাথমিক নকশা ও পরীক্ষা সফলভাবে সম্পন্ন হয়েছে।",
    bulletPoints: [
      "লুনার স্যাম্পল রিটার্ন মিশনের জন্য স্বয়ংক্রিয় ডকিং প্রযুক্তির সফল পরীক্ষণ।",
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
    summaryBn: "শ্রীহরিকোটার সতীশ ধাওয়ান মহাকাশ কেন্দ্র থেকে GSLV-F12 রকেটের সাহায্যে সফলভাবে উপগ্রহটি প্রতিস্থাপিত হয়েছে।",
    bulletPoints: [
      "NavIC (Navigation with Indian Constellation) সিস্টেমকে আরও নির্ভুল ও সুরক্ষিত করতে এই উৎক্ষেপণ।",
      "এতে ব্যবহৃত হয়েছে স্বদেশীয় রুবিডিয়াম পারমাণবিক ঘড়ি (Rubidium Atomic Clock)।",
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
    summaryBn: "মূল্যস্ফীতি নিয়ন্ত্রণ এবং অর্থনৈতিক প্রবৃদ্ধির মধ্যে ভারসাম্য রক্ষায় কেন্দ্রীয় ব্যাঙ্ক সুদের হার স্থির রাখার সিদ্ধান্ত নিয়েছে।",
    bulletPoints: [
      "রিজার্ভ ব্যাঙ্কের MPC-এর ৬ জন সদস্যের সংখ্যাগরিষ্ঠের মতামতে রেপো রেট অপরিবর্তিত রইল।",
      "স্ট্যান্ডিং ডিপোজিট ফ্যাসিলিটি (SDF) রেট ৬.২৫% এবং মার্জিনাল স্ট্যান্ডিং ফ্যাসিলিটি (MSF) রেট ৬.৭৫% বহাল।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: MPC-এর গঠন, মুদ্রানীতির হাতিয়ার ও রেপো রেটের সংজ্ঞা।"
    ],
    examRelevance: "PSC Clerkship, WBCS, Banking & Insurance",
    isImportant: false
  },
  {
    id: "ca-4",
    category: "Sports",
    date: "3 days ago",
    readTime: "2 min read",
    titleBn: "দাবা অলিম্পিয়াডে ঐতিহাসিক সোনা জয় ভারতীয় পুরুষ ও মহিলা দলের",
    titleEn: "India Wins Historic Double Gold in 45th Chess Olympiad",
    summaryBn: "বুদাপেস্টে আয়োজিত ৪৫তম দাবা অলিম্পিয়াডে ভারতীয় দল অসাধারণ পারফর্ম করে উন্মুক্ত ও মহিলা দুটি বিভাগেই স্বর্ণপদক অর্জন করে।",
    bulletPoints: [
      "ডি. গুকেশ এবং রমেশবাবু প্রজ্ঞানন্দ আন্তর্জাতিক গ্র্যান্ডমাস্টারদের বিরুদ্ধে অপরাজিত রইলেন।",
      "মহিলা বিভাগে তানিয়া সচদেব ও দিব্যা দেশমুখ দুর্দান্ত নেতৃত্ব দেন।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: আয়োজনস্থল, ভারতের স্বর্ণপদক জয়ী খেলোয়াড়দের নাম।"
    ],
    examRelevance: "WBP Constable, KP, Rail Group D, WBCS",
    isImportant: true
  },
  {
    id: "ca-5",
    category: "National",
    date: "4 days ago",
    readTime: "3 min read",
    titleBn: "দেশের নতুন মুখ্য নির্বাচন কমিশনার (CEC) হিসেবে দায়িত্ব গ্রহণ",
    titleEn: "Appointment of New Chief Election Commissioner of India Under Article 324",
    summaryBn: "রাষ্ট্রপতি দ্রৌপদী মুর্মু সংবিধানের ৩২৪ ধারা অনুযায়ী নতুন নির্বাচন কমিশনার নিয়োগ সংক্রান্ত বিজ্ঞপ্তি জারি করেছেন।",
    bulletPoints: [
      "সংবিধানের ৩২৪ ধারা অনুযায়ী প্রধান নির্বাচন কমিশনার ও অন্যান্য নির্বাচন কমিশনাররা নিযুক্ত হন।",
      "কার্যকাল: ৬ বছর অথবা ৬৫ বছর বয়স পর্যন্ত (যেটি আগে হবে)।",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: ভারতীয় সংবিধানের ভাগ ১৫ (Part XV), নির্বাচন কমিশনের ক্ষমতা ও কার্যকারিতা।"
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
      "পরীক্ষার জন্য গুরুত্বপূর্ণ: COP সম্মেলনের সংস্করণ ও পরিবেশ বিষয়ক আন্তর্জাতিক চুক্তি।"
    ],
    examRelevance: "WBCS Mains, SSC, Central Govt Exams",
    isImportant: false
  }
];

const STORAGE_KEY = "admin_current_affairs";
const SETTINGS_KEY = "current_affairs_data";

export async function fetchCurrentAffairs(): Promise<CurrentAffairsArticle[]> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not fetch current affairs from Supabase site_settings:", err);
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read current affairs from localStorage:", err);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CURRENT_AFFAIRS));
  } catch {
    // ignore
  }

  return INITIAL_CURRENT_AFFAIRS;
}

export async function saveCurrentAffairs(articles: CurrentAffairsArticle[]): Promise<boolean> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch (err) {
    console.error("Failed to save to local cache:", err);
  }

  window.dispatchEvent(new CustomEvent("current_affairs_updated", { detail: articles }));

  try {
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        {
          key: SETTINGS_KEY,
          value: JSON.stringify(articles),
          updated_at: new Date().toISOString()
        },
        { onConflict: "key" }
      );

    if (error) {
      console.warn("Could not persist to Supabase site_settings:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error saving current affairs to site_settings:", err);
    return false;
  }
}
