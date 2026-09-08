import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches ALL rows from a Supabase table, bypassing the default 1000-row limit.
 * Uses batched range queries to ensure no data is missed.
 * 
 * @param table - The table name to fetch from
 * @param selectCols - The columns to select (e.g. "id, subject, topic")
 * @param filters - Optional filters to apply (e.g. { subject: "History" })
 * @param orderBy - Optional column to order by
 * @param ascending - Whether to order ascending (default: true)
 * @returns All matching rows from the table
 */
export async function fetchAllRows<T = any>(
  table: string,
  selectCols: string,
  filters?: Record<string, any>,
  orderBy?: string,
  ascending: boolean = true
): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    // Cast to any to support dynamic table names
    let query = (supabase.from as any)(table)
      .select(selectCols)
      .range(from, from + batchSize - 1);

    // Apply filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value === null) {
          query = query.is(key, null);
        } else {
          query = query.eq(key, value);
        }
      }
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`fetchAllRows error (${table}):`, error);
      break;
    }

    allData = [...allData, ...((data as T[]) || [])];
    hasMore = (data?.length || 0) === batchSize;
    from += batchSize;
  }

  return allData;
}

/**
 * Validates that a question has required subject/topic data before saving.
 * Returns an error message if validation fails, null if valid.
 */
export function validateQuestionCategorization(
  subject: string | null | undefined,
  topic: string | null | undefined,
  category: "exam" | "subject" | null
): string | null {
  // If the question is being saved as subject-based (no exam_id)
  if (category === "subject" || category === null) {
    if (!subject || subject.trim() === "") {
      return "Subject is required. Every question must have a subject assigned.";
    }
    if (!topic || topic.trim() === "") {
      return "Topic is required. Every question must have a topic assigned.";
    }
  }
  return null;
}

/**
 * Safely merges question update data, preserving original subject/topic
 * if the new values are empty. Prevents accidental cross-contamination.
 */
export function buildSafeUpdateData(
  formData: {
    subject_name?: string;
    topic_name?: string;
    subject_id?: string;
    topic_id?: string;
  },
  originalQuestion: {
    subject?: string;
    topic?: string;
    subject_id?: string;
    topic_id?: string;
    subjects?: { name: string };
    topics?: { name: string };
  }
): {
  subject: string | null;
  topic: string | null;
  subject_id: string | null;
  topic_id: string | null;
} {
  const originalSubject = originalQuestion.subject || originalQuestion.subjects?.name || null;
  const originalTopic = originalQuestion.topic || originalQuestion.topics?.name || null;

  return {
    subject: formData.subject_name?.trim() || originalSubject,
    topic: formData.topic_name?.trim() || originalTopic,
    subject_id: formData.subject_id || originalQuestion.subject_id || null,
    topic_id: formData.topic_id || originalQuestion.topic_id || null,
  };
}
