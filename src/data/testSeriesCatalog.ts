export type TestSeriesAccent =
  | "blue"
  | "violet"
  | "emerald"
  | "rose"
  | "amber"
  | "cyan";

export type ExamIconKey =
  | "shield"
  | "building"
  | "badge"
  | "siren"
  | "landmark"
  | "briefcase"
  | "train"
  | "file"
  | "layers";

export type SubjectIconKey =
  | "globe"
  | "landmark"
  | "map"
  | "gavel"
  | "flask"
  | "calculator"
  | "brain"
  | "languages"
  | "book";

export interface TestSeriesExam {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  totalTests: number;
  category: "State Exams" | "Central Exams" | "Others";
  accent: TestSeriesAccent;
  icon: ExamIconKey;
  aliases: string[];
}

export interface SubjectCatalogItem {
  slug: string;
  name: string;
  tests: number;
  accent: TestSeriesAccent;
  icon: SubjectIconKey;
}

export interface ChapterCatalogItem {
  slug: string;
  name: string;
  tests: number;
  questions: number;
}

export type TestStatus = "start" | "continue" | "completed" | "locked";

export interface TestCatalogItem {
  id: string;
  title: string;
  questions: number;
  duration: number;
  status: TestStatus;
  year?: number;
  isPreviousYear?: boolean;
}

export const TEST_SERIES_EXAMS: TestSeriesExam[] = [
  {
    slug: "wbp",
    name: "WBP",
    subtitle: "West Bengal Police",
    description: "Constable and SI preparation based on the latest exam pattern.",
    totalTests: 25,
    category: "State Exams",
    accent: "blue",
    icon: "shield",
    aliases: ["wbp", "west bengal police", "police constable"],
  },
  {
    slug: "wbssc-group-c",
    name: "WBSSC Group C",
    subtitle: "West Bengal SSC",
    description: "Clerical and support-staff exam preparation.",
    totalTests: 18,
    category: "State Exams",
    accent: "emerald",
    icon: "building",
    aliases: ["wbssc group c", "group c"],
  },
  {
    slug: "wbssc-group-d",
    name: "WBSSC Group D",
    subtitle: "West Bengal SSC",
    description: "Structured preparation for Group D recruitment.",
    totalTests: 20,
    category: "State Exams",
    accent: "violet",
    icon: "badge",
    aliases: ["wbssc group d", "group d"],
  },
  {
    slug: "kp",
    name: "KP",
    subtitle: "Kolkata Police",
    description: "Constable and SI tests for Kolkata Police exams.",
    totalTests: 15,
    category: "State Exams",
    accent: "rose",
    icon: "siren",
    aliases: ["kp", "kolkata police"],
  },
  {
    slug: "wbcs",
    name: "WBCS",
    subtitle: "West Bengal Civil Service",
    description: "Prelims-focused tests for WBCS aspirants.",
    totalTests: 32,
    category: "State Exams",
    accent: "amber",
    icon: "landmark",
    aliases: ["wbcs", "west bengal civil service"],
  },
  {
    slug: "wbpsc",
    name: "WBPSC",
    subtitle: "West Bengal PSC",
    description: "Exam-pattern practice for WBPSC recruitment.",
    totalTests: 24,
    category: "State Exams",
    accent: "cyan",
    icon: "briefcase",
    aliases: ["wbpsc", "west bengal psc"],
  },
  {
    slug: "railway",
    name: "Railway",
    subtitle: "Indian Railways",
    description: "RRB NTPC, Group D and related railway exams.",
    totalTests: 28,
    category: "Central Exams",
    accent: "emerald",
    icon: "train",
    aliases: ["railway", "rrb", "ntpc"],
  },
  {
    slug: "ssc",
    name: "SSC",
    subtitle: "Staff Selection Commission",
    description: "CGL, CHSL, MTS and other SSC exams.",
    totalTests: 36,
    category: "Central Exams",
    accent: "blue",
    icon: "file",
    aliases: ["ssc", "staff selection commission", "cgl", "chsl"],
  },
  {
    slug: "others",
    name: "Others",
    subtitle: "More Government Exams",
    description: "Explore additional state and central exam series.",
    totalTests: 12,
    category: "Others",
    accent: "violet",
    icon: "layers",
    aliases: ["others", "other exams"],
  },
];

export const SUBJECT_CATALOG: SubjectCatalogItem[] = [
  { slug: "general-awareness", name: "General Awareness", tests: 120, accent: "violet", icon: "globe" },
  { slug: "history", name: "History", tests: 45, accent: "rose", icon: "landmark" },
  { slug: "geography", name: "Geography", tests: 38, accent: "emerald", icon: "map" },
  { slug: "indian-polity", name: "Indian Polity", tests: 42, accent: "amber", icon: "gavel" },
  { slug: "general-science", name: "General Science", tests: 50, accent: "violet", icon: "flask" },
  { slug: "mathematics", name: "Mathematics", tests: 60, accent: "blue", icon: "calculator" },
  { slug: "reasoning", name: "Reasoning", tests: 48, accent: "cyan", icon: "brain" },
  { slug: "english", name: "English", tests: 35, accent: "blue", icon: "languages" },
  { slug: "bengali", name: "Bengali", tests: 30, accent: "emerald", icon: "book" },
];

export const HISTORY_CHAPTERS: ChapterCatalogItem[] = [
  { slug: "ancient-india", name: "Ancient India", tests: 12, questions: 180 },
  { slug: "medieval-india", name: "Medieval India", tests: 10, questions: 150 },
  { slug: "modern-india", name: "Modern India", tests: 15, questions: 225 },
  { slug: "indian-national-movement", name: "Indian National Movement", tests: 10, questions: 160 },
  { slug: "bengal-history", name: "Bengal History", tests: 8, questions: 120 },
  { slug: "art-and-culture", name: "Art & Culture", tests: 6, questions: 90 },
  { slug: "post-independence", name: "Post Independence", tests: 8, questions: 120 },
];

export const FULL_MOCK_TESTS: TestCatalogItem[] = [
  { id: "wbp-mock-01", title: "Mock Test 01", questions: 100, duration: 60, status: "start" },
  { id: "wbp-mock-02", title: "Mock Test 02", questions: 100, duration: 60, status: "continue" },
  { id: "wbp-mock-03", title: "Mock Test 03", questions: 100, duration: 60, status: "completed" },
  { id: "wbp-mock-04", title: "Mock Test 04", questions: 100, duration: 60, status: "locked" },
  { id: "wbp-mock-05", title: "Mock Test 05", questions: 100, duration: 60, status: "locked" },
  { id: "wbp-mock-06", title: "Mock Test 06", questions: 100, duration: 60, status: "locked" },
];

export const PREVIOUS_YEAR_PAPERS: TestCatalogItem[] = [
  { id: "wbp-paper-2024", title: "WBP Constable 2024", year: 2024, questions: 100, duration: 60, status: "start", isPreviousYear: true },
  { id: "wbp-paper-2023", title: "WBP Constable 2023", year: 2023, questions: 100, duration: 60, status: "start", isPreviousYear: true },
  { id: "wbp-paper-2022", title: "WBP Constable 2022", year: 2022, questions: 100, duration: 60, status: "completed", isPreviousYear: true },
  { id: "wbp-paper-2021", title: "WBP Constable 2021", year: 2021, questions: 100, duration: 60, status: "locked", isPreviousYear: true },
  { id: "wbp-paper-2020", title: "WBP Constable 2020", year: 2020, questions: 100, duration: 60, status: "locked", isPreviousYear: true },
];

const COMMON_CHAPTERS: Record<string, string[]> = {
  "general-awareness": ["Current Events", "Static General Knowledge", "Indian Economy", "Government Schemes", "Sports & Awards"],
  geography: ["Physical Geography", "Indian Geography", "West Bengal Geography", "World Geography", "Environment & Ecology"],
  "indian-polity": ["Constitution of India", "Fundamental Rights", "Parliament", "Judiciary", "Local Government"],
  "general-science": ["Physics", "Chemistry", "Biology", "Everyday Science", "Environment"],
  mathematics: ["Number System", "Arithmetic", "Algebra", "Geometry", "Data Interpretation"],
  reasoning: ["Analogy", "Series", "Coding & Decoding", "Logical Reasoning", "Data Sufficiency"],
  english: ["Grammar", "Vocabulary", "Reading Comprehension", "Sentence Correction", "Usage"],
  bengali: ["Grammar", "Vocabulary", "Comprehension", "Literature", "Usage"],
};

export const slugifyCatalogLabel = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const getExamBySlug = (slug?: string) =>
  TEST_SERIES_EXAMS.find((exam) => exam.slug === slug) || TEST_SERIES_EXAMS[0];

export const getSubjectBySlug = (slug?: string) =>
  SUBJECT_CATALOG.find((subject) => subject.slug === slug) || SUBJECT_CATALOG[1];

export const getChaptersForSubject = (subjectSlug?: string): ChapterCatalogItem[] => {
  if (!subjectSlug || subjectSlug === "history") return HISTORY_CHAPTERS;

  const names = COMMON_CHAPTERS[subjectSlug] || [
    "Foundations",
    "Core Concepts",
    "Applied Practice",
    "Exam Essentials",
    "Revision Set",
  ];

  return names.map((name, index) => ({
    slug: slugifyCatalogLabel(name),
    name,
    tests: 6 + index * 2,
    questions: 90 + index * 30,
  }));
};

export const getChapterTests = (chapter: ChapterCatalogItem): TestCatalogItem[] =>
  Array.from({ length: chapter.tests }, (_, index) => {
    const testNumber = index + 1;
    const status: TestStatus =
      index === 0 || index === 5 || index === 8
        ? "completed"
        : index === 2
          ? "continue"
          : index >= 4 && index % 2 === 0
            ? "locked"
            : "start";

    return {
      id: `${chapter.slug}-test-${testNumber}`,
      title: `Test ${testNumber}`,
      questions: 15,
      duration: 20,
      status,
    };
  });
