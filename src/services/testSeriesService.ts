import { supabase } from "@/integrations/supabase/client";
import { Exam, Subject, MockTest } from "@/services/examService";
import { EXAM_CATALOG } from "@/data/examCatalog";

/* ═══════════════════════════════════════════════════════════════════
   Test Series data layer — SUBJECT → CHAPTER → TEST hierarchy.
   "Chapter" is the UI word; the database table stays `topics`
   and chapter drills keep the `topic-<id>` TakeTest convention.
   All reads are RPC-first with direct-query fallback so screens work
   both before and after the RLS exam-answer lockdown migration.
   ═══════════════════════════════════════════════════════════════════ */

export type ExamCategory = "state" | "central" | "others";

export interface ExamGroup {
  id: string;
  name: string;
  fullName: string;
  subtitle: string;
  description: string;
  category: ExamCategory;
  /** pastel tile classes */
  tile: string;
  icon: string;
}

export const EXAM_GROUPS: ExamGroup[] = [
  { id: "wbp", name: "WBP", fullName: "West Bengal Police", subtitle: "Constable & Lady Constable", description: "Full-length mocks, previous year papers and chapter tests for the WBP Constable recruitment exam.", category: "state", tile: "bg-blue-50 text-blue-700 border-blue-200", icon: "shield" },
  { id: "wbssc-c", name: "WBSSC Group C", fullName: "West Bengal SSC", subtitle: "Group C Posts", description: "Targeted test series for WBSSC Group C with Bengali & English medium papers.", category: "state", tile: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "landmark" },
  { id: "wbssc-d", name: "WBSSC Group D", fullName: "West Bengal SSC", subtitle: "Group D Posts", description: "Practice sets, previous year papers and chapter tests for WBSSC Group D.", category: "state", tile: "bg-teal-50 text-teal-700 border-teal-200", icon: "landmark" },
  { id: "kp", name: "KP", fullName: "Kolkata Police", subtitle: "Constable & SI", description: "Complete Kolkata Police preparation with mocks mapped to the latest pattern.", category: "state", tile: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "siren" },
  { id: "wbcs", name: "WBCS", fullName: "West Bengal Civil Service", subtitle: "Executive Prelims", description: "Elite WBCS Prelims series with 200-mark full mocks and standard reference chapters.", category: "state", tile: "bg-violet-50 text-violet-700 border-violet-200", icon: "graduation" },
  { id: "wbpsc", name: "WBPSC", fullName: "West Bengal Public Service Commission", subtitle: "Clerkship & Misc", description: "WBPSC Clerkship and miscellaneous services papers with arithmetic focus.", category: "state", tile: "bg-amber-50 text-amber-700 border-amber-200", icon: "building" },
  { id: "railway", name: "Railway", fullName: "Indian Railways", subtitle: "Group D / NTPC", description: "RRB CBT-pattern mocks with science, maths and reasoning chapters.", category: "central", tile: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: "train" },
  { id: "ssc", name: "SSC", fullName: "Staff Selection Commission", subtitle: "GD / CGL / CHSL", description: "SSC-pattern full mocks and previous year papers with 4-section splits.", category: "central", tile: "bg-rose-50 text-rose-700 border-rose-200", icon: "flag" },
  { id: "others", name: "Others", fullName: "More Exams", subtitle: "Panchayat, TET & More", description: "Test series for WB Panchayat, Primary TET and other state examinations.", category: "others", tile: "bg-slate-100 text-slate-700 border-slate-200", icon: "grid" },
];

export interface ExamPyq {
  id: string;
  title: string;
  year: number;
  questions: number;
  duration: number;
  marks: number;
  subtitle: string;
  isPaid: boolean;
}

const DEFAULT_EXAM_PYQS: Record<string, ExamPyq[]> = {
  "b6edc506-cceb-45cb-b91d-7d2444ffc85f": [
    { id: "wbssc-gd-2019", title: "WBSSC Group D Official PYQ (2019)", year: 2019, questions: 45, duration: 60, marks: 45, subtitle: "Official Exam Paper with Explanations", isPaid: false },
    { id: "wbssc-gd-2017", title: "WBSSC Group D Solved Paper (2017)", year: 2017, questions: 45, duration: 60, marks: 45, subtitle: "Previous Year Solved Paper", isPaid: false },
    { id: "wbssc-gd-2016", title: "WBSSC Group D Prelims Paper (2016)", year: 2016, questions: 45, duration: 60, marks: 45, subtitle: "Original Question Archive", isPaid: true },
  ],
  "22497a19-9a35-4bf0-ba7b-5a44bdd0d5aa": [
    { id: "wbssc-gc-2019", title: "WBSSC Group C Official PYQ (2019)", year: 2019, questions: 60, duration: 60, marks: 60, subtitle: "Official Exam Paper with Explanations", isPaid: false },
    { id: "wbssc-gc-2017", title: "WBSSC Group C Solved Paper (2017)", year: 2017, questions: 60, duration: 60, marks: 60, subtitle: "Previous Year Solved Paper", isPaid: false },
  ],
  "d91dfc2e-a974-43a6-85c1-d601f41ab421": [
    { id: "rrb-gd-2022", title: "RRB Group D Official CBT (2022)", year: 2022, questions: 100, duration: 90, marks: 100, subtitle: "Official Shift 1 Question Paper", isPaid: false },
    { id: "rrb-gd-2018", title: "RRB Group D Official CBT (2018)", year: 2018, questions: 100, duration: 90, marks: 100, subtitle: "Combined Solved Question Paper", isPaid: false },
  ],
};

export function matchExamToGroup(examName: string): ExamGroup {
  const n = (examName || "").toLowerCase();
  if (n.includes("wbssc") && n.includes("group c")) return EXAM_GROUPS[1];
  if (n.includes("wbssc") && n.includes("group d")) return EXAM_GROUPS[2];
  if (n.includes("kolkata") || n === "kp" || n.includes(" k p")) return EXAM_GROUPS[3];
  if (n.includes("wbcs")) return EXAM_GROUPS[4];
  if (n.includes("wbpsc") || n.includes("psc") || n.includes("clerkship") || n.includes("misc")) return EXAM_GROUPS[5];
  if (n.includes("railway") || n.includes("rrb") || n.includes("ntpc")) return EXAM_GROUPS[6];
  if (n.includes("ssc") || n.includes("cgl") || n.includes("chsl") || n.includes("gd constable")) return EXAM_GROUPS[7];
  if (n.includes("wbp") || n.includes("police") || n.includes("constable") || n.includes("lady constable")) return EXAM_GROUPS[0];
  if (n.includes("panchayat") || n.includes("tet") || n.includes("primary")) return EXAM_GROUPS[8];
  return EXAM_GROUPS[8];
}

export function groupMatchesCategory(group: ExamGroup, filter: "all" | ExamCategory): boolean {
  return filter === "all" || group.category === filter;
}

export function getPyqsForExam(examId: string, examName?: string): ExamPyq[] {
  if (DEFAULT_EXAM_PYQS[examId]) return DEFAULT_EXAM_PYQS[examId];
  const name = (examName || "").toLowerCase();
  if (name.includes("group d") && name.includes("wb")) return DEFAULT_EXAM_PYQS["b6edc506-cceb-45cb-b91d-7d2444ffc85f"] || [];
  if (name.includes("group c") && name.includes("wb")) return DEFAULT_EXAM_PYQS["22497a19-9a35-4bf0-ba7b-5a44bdd0d5aa"] || [];
  if (name.includes("railway") || name.includes("rrb")) return DEFAULT_EXAM_PYQS["d91dfc2e-a974-43a6-85c1-d601f41ab421"] || [];
  const group = matchExamToGroup(examName || "");
  const catalog = EXAM_CATALOG.find((c) =>
    c.name.toLowerCase().includes(group.name.toLowerCase()) ||
    group.name.toLowerCase().includes(c.conductingBody.toLowerCase())
  );
  const years = catalog?.pyqYears || [2024, 2023, 2022];
  const q = catalog?.defaultQuestions || 100;
  const d = catalog?.defaultDurationMinutes || 60;
  return years.map((year, i) => ({
    id: `${examId}-pyq-${year}`,
    title: `${examName || group.name} Official PYQ (${year})`,
    year,
    questions: q,
    duration: d,
    marks: q,
    subtitle: i === 0 ? "Official Exam Paper" : "Solved with Detailed Explanations",
    isPaid: i >= 2,
  }));
}

/** Full-length mocks for an exam: DB first, catalog-generated fallback. */
export function getFullMockTestsForExam(examId: string, examName?: string, dbTests: MockTest[] = []): MockTest[] {
  const fromDb = dbTests.filter((t) => t.exam_id === examId && t.test_type === "full_mock");
  if (fromDb.length > 0) return fromDb;
  if (examName) {
    const byName = dbTests.filter(
      (t) =>
        t.test_type === "full_mock" &&
        t.exams?.name &&
        (t.exams.name.toLowerCase().includes(examName.toLowerCase()) ||
          examName.toLowerCase().includes(t.exams.name.toLowerCase()))
    );
    if (byName.length > 0) return byName;
  }
  const group = matchExamToGroup(examName || "");
  const catalog = EXAM_CATALOG.find((c) => c.name.toLowerCase().includes(group.name.toLowerCase()));
  const q = catalog?.defaultQuestions || 100;
  const d = catalog?.defaultDurationMinutes || 60;
  return [1, 2, 3].map((i) => ({
    id: `${examId}-mock-${i}`,
    title: `${examName || group.name} Mock Test ${String(i).padStart(2, "0")}`,
    description: `Full-length ${q}-question paper as per the latest exam pattern.`,
    test_type: "full_mock",
    duration_minutes: d,
    total_marks: q,
    passing_marks: Math.round(q * 0.4),
    exam_id: examId,
    subject_id: null,
    is_paid: i > 1,
    price: 0,
  }));
}

/** Chapter-wise (topic_wise) mock tests for a subject. */
export function getChapterMockTestsForSubject(subjectId: string | null, subjectName: string, dbTests: MockTest[] = []): MockTest[] {
  const list = dbTests.filter((t) => t.test_type === "topic_wise");
  if (subjectId) {
    const byId = list.filter((t) => t.subject_id === subjectId);
    if (byId.length > 0) return byId;
  }
  const n = subjectName.toLowerCase();
  return list.filter(
    (t) =>
      (t.subjects?.name && t.subjects.name.toLowerCase() === n) ||
      t.title.toLowerCase().includes(n)
  );
}

export interface ChapterItem {
  id: string;
  name: string;
  subject_id: string;
  order_index?: number;
}

/** Chapters of a subject (reads the `topics` table; UI word is Chapter). */
export async function fetchChapters(subjectId: string): Promise<ChapterItem[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("id, name, subject_id, order_index")
    .eq("subject_id", subjectId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data as ChapterItem[]) || [];
}

/** Fuzzy title match used to group chapter-level tests under a chapter. */
export function matchesChapter(testTitle: string, chapterName: string): boolean {
  const clean = (s: string) => s.toLowerCase().replace(/[\s\-_0-9()]+/gi, "");
  const t = clean(testTitle);
  const c = clean(chapterName);
  if (!t || !c) return false;
  return t.includes(c) || c.includes(t);
}

/** Match a free-text subject name to a DB subject record. */
export function matchDbSubject(name: string, subjects: Subject[]): Subject | null {
  const n = name.toLowerCase().trim();
  return (
    subjects.find((s) => s.name.toLowerCase() === n) ||
    subjects.find((s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())) ||
    null
  );
}

/**
 * Question counts grouped by chapter for a subject.
 * RPC-first (RLS-lockdown safe, capped at 100 rows), direct fallback.
 */
export async function fetchChapterQuestionCounts(subjectName: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase.rpc("get_practice_questions", {
      p_subject: subjectName,
      p_topic: null,
      p_difficulty: null,
      p_year: null,
      p_limit: 100,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      const counts: Record<string, number> = {};
      for (const q of data as Array<{ topic?: string | null }>) {
        const key = q.topic || "General";
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    }
  } catch {
    // fall through to direct query (pre-migration DBs / admin sessions)
  }
  try {
    const { data, error } = await supabase
      .from("questions")
      .select("topic")
      .eq("subject", subjectName)
      .limit(500);
    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const q of data as Array<{ topic?: string | null }>) {
      const key = q.topic || "General";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

/** Total available tests for an exam card (mocks + PYQ + chapter drills). */
export function countExamTests(examId: string, examName: string | undefined, mockTests: MockTest[], chapterCount = 0): number {
  const mocks = getFullMockTestsForExam(examId, examName, mockTests).length;
  const pyqs = getPyqsForExam(examId, examName).length;
  return mocks + pyqs + chapterCount;
}

export function getGroupById(groupId: string): ExamGroup {
  return EXAM_GROUPS.find((g) => g.id === groupId) || EXAM_GROUPS[8];
}

export interface ExamCardData {
  group: ExamGroup;
  /** DB exam ids mapped into this group (empty when catalog-only) */
  dbExamIds: string[];
  /** representative DB exam name, if any */
  dbExamName?: string;
  testCount: number;
}

/** Build the 9 exam cards from DB exams (+ catalog fallback when DB is empty). */
export function resolveExamCards(exams: Exam[], mockTests: MockTest[]): ExamCardData[] {
  const byGroup = new Map<string, Exam[]>();
  for (const e of exams) {
    const g = matchExamToGroup(e.name);
    if (!byGroup.has(g.id)) byGroup.set(g.id, []);
    byGroup.get(g.id)!.push(e);
  }
  // Catalog fallback: synthesize one pseudo-exam per group when DB has none
  const groups = EXAM_GROUPS;
  return groups.map((group) => {
    const dbExams = byGroup.get(group.id) || [];
    if (dbExams.length > 0) {
      const primary = dbExams[0];
      let count = 0;
      for (const e of dbExams) {
        count += getFullMockTestsForExam(e.id, e.name, mockTests).length;
        count += getPyqsForExam(e.id, e.name).length;
      }
      return { group, dbExamIds: dbExams.map((e) => e.id), dbExamName: primary.name, testCount: count };
    }
    const catalog = EXAM_CATALOG.find((c) => {
      const n = c.name.toLowerCase();
      if (group.id === "wbp") return n.includes("wbp") || n.includes("constable");
      if (group.id === "wbssc-c") return n.includes("group c") || n.includes("clerkship");
      if (group.id === "wbssc-d") return n.includes("group d");
      if (group.id === "kp") return n.includes("sub-inspector") || n.includes("si)");
      if (group.id === "wbcs") return n.includes("wbcs");
      if (group.id === "wbpsc") return n.includes("clerkship") || n.includes("wbpsc");
      if (group.id === "railway") return n.includes("railway");
      if (group.id === "ssc") return n.includes("ssc");
      return n.includes("panchayat") || n.includes("tet");
    });
    const count = 3 + ((catalog?.pyqYears.length || 3) as number);
    return { group, dbExamIds: [], dbExamName: catalog?.name, testCount: count };
  });
}

/** Resolve a group route param to the DB exams + display name behind it. */
export function resolveGroupContext(groupId: string, exams: Exam[]): { group: ExamGroup; dbExams: Exam[]; displayName: string } {
  const group = getGroupById(groupId);
  const dbExams = exams.filter((e) => matchExamToGroup(e.name).id === group.id);
  const displayName = dbExams[0]?.name || group.name;
  return { group, dbExams, displayName };
}

export type TestStatus = "start" | "continue" | "completed" | "pro";

/** Attempt-aware status for a test row (Pro-gated first, then history). */
export function resolveTestStatus(
  test: { id: string; is_paid?: boolean },
  attempts: Record<string, { attempt_count: number; passed: boolean }>,
  hasSubscription: boolean
): TestStatus {
  if (test.is_paid && !hasSubscription) return "pro";
  const a = attempts[test.id];
  if (!a || a.attempt_count === 0) return "start";
  return a.passed ? "completed" : "continue";
}

export type { Exam, Subject, MockTest };
