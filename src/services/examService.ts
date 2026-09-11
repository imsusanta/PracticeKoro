import { supabase } from "@/integrations/supabase/client";

export interface Exam {
  id: string;
  name: string;
  image_url?: string | null;
  is_paid?: boolean;
  price?: number;
  order_index?: number;
  is_active?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  order_index?: number;
  category?: string | null;
}

export interface MockTest {
  id: string;
  title: string;
  description?: string | null;
  test_type: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  exam_id: string | null;
  subject_id: string | null;
  is_paid: boolean;
  price: number;
  order_index?: number;
  subjects?: { id: string; name: string } | null;
  exams?: { id: string; name: string } | null;
}

export interface TestAttemptInfo {
  test_id: string;
  attempt_id: string;
  best_percentage: number;
  passed: boolean;
  attempt_count: number;
}

/**
 * Fetches all active exams ordered by created_at.
 */
export async function fetchActiveExams(): Promise<Exam[]> {
  const { data, error } = await supabase
    .from("exams")
    .select("id, name, is_active, created_at, description, image_url, order_index")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("fetchActiveExams failed:", error.message);
    throw error;
  }
  return ((data || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    image_url: e.image_url || null,
    is_active: e.is_active,
    is_paid: false,
    price: 0,
    order_index: e.order_index ?? 0,
  }))) as Exam[];
}

/**
 * Fetches question subjects (questions category or null) ordered by order_index.
 */
export async function fetchQuestionSubjects(): Promise<Subject[]> {
  // eslint-disable-next-line prefer-const -- reassigned from fallback below
  let { data, error } = await supabase
    .from("subjects")
    .select("id, name, order_index, category")
    .or("category.eq.questions,category.is.null")
    .order("order_index", { ascending: true });

  if (error) {
    console.warn("fetchQuestionSubjects with category failed, falling back to all subjects:", error.message);
    const fallback = await supabase
      .from("subjects")
      .select("id, name, order_index")
      .order("order_index", { ascending: true });
    if (fallback.error) {
      console.error("fetchQuestionSubjects fallback failed:", fallback.error.message);
      throw fallback.error;
    }
    data = fallback.data as any;
  }
  return (data as Subject[]) || [];
}

/**
 * Fetches all published mock tests with joined subject and exam relation data.
 */
export async function fetchPublishedMockTests(): Promise<MockTest[]> {
  const { data, error } = await supabase
    .from("mock_tests")
    .select(`
      id,
      title,
      description,
      test_type,
      duration_minutes,
      total_marks,
      passing_marks,
      exam_id,
      subject_id,
      is_paid,
      price,
      created_at,
      subjects ( id, name ),
      exams:exam_id ( id, name )
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchPublishedMockTests failed:", error.message);
    throw error;
  }
  return (data as any) || [];
}

/**
 * Fetches user test attempts and aggregates best score, pass status, and count by test.
 */
export async function fetchUserAttempts(userId: string): Promise<Record<string, TestAttemptInfo>> {
  const { data, error } = await supabase
    .from("test_attempts")
    .select("id, test_id, percentage, passed")
    .eq("user_id", userId)
    // Completed = server status OR legacy is_active flag (see studentService).
    .or("status.eq.completed,is_active.eq.false");

  if (error) {
    console.error("fetchUserAttempts failed:", error.message);
    throw error;
  }

  const attemptsByTest: Record<string, TestAttemptInfo> = {};
  if (data) {
    data.forEach((a) => {
      if (!attemptsByTest[a.test_id]) {
        attemptsByTest[a.test_id] = {
          test_id: a.test_id,
          attempt_id: a.id,
          best_percentage: a.percentage,
          passed: a.passed,
          attempt_count: 1,
        };
      } else {
        attemptsByTest[a.test_id].attempt_count++;
        if (a.percentage > attemptsByTest[a.test_id].best_percentage) {
          attemptsByTest[a.test_id].best_percentage = a.percentage;
          attemptsByTest[a.test_id].attempt_id = a.id;
        }
      }
      if (a.passed) {
        attemptsByTest[a.test_id].passed = true;
      }
    });
  }

  // Merge any locally cached attempts (for topic-wise chapter tests)
  try {
    const localRaw = localStorage.getItem(`pk_user_attempts_${userId}`);
    if (localRaw) {
      const localAtt = JSON.parse(localRaw);
      Object.entries(localAtt).forEach(([testId, info]: [string, any]) => {
        if (!attemptsByTest[testId]) {
          attemptsByTest[testId] = info;
        } else if (info.best_percentage > attemptsByTest[testId].best_percentage) {
          attemptsByTest[testId].best_percentage = info.best_percentage;
          attemptsByTest[testId].attempt_id = info.attempt_id;
          if (info.passed) attemptsByTest[testId].passed = true;
        }
      });
    }
  } catch (e) {
    // ignore
  }

  return attemptsByTest;
}
