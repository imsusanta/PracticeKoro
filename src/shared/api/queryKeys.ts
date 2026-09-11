/**
 * Central TanStack Query key factories. Import keys from here —
 * never inline raw string arrays at call sites.
 */
export const examKeys = {
  all: ["exams"] as const,
  detail: (id: string) => ["exams", id] as const,
  tests: (id: string) => ["exams", id, "tests"] as const,
};

export const attemptKeys = {
  all: ["attempts"] as const,
  detail: (id: string) => ["attempts", id] as const,
  result: (id: string) => ["attempts", id, "result"] as const,
};

export const practiceKeys = {
  all: ["practice"] as const,
  topic: (subject: string, topic?: string) => ["practice", "topic", subject, topic ?? "all"] as const,
  pyq: (filters: string) => ["practice", "pyq", filters] as const,
  daily: (date: string) => ["practice", "daily", date] as const,
};

export const mistakeKeys = {
  all: (userId: string) => ["mistakes", userId] as const,
  bookmarks: (userId: string) => ["mistakes", userId, "bookmarks"] as const,
};

export const profileKeys = {
  detail: (userId: string) => ["profile", userId] as const,
  notifications: (userId: string) => ["profile", userId, "notifications"] as const,
};
