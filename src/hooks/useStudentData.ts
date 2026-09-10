import { useQuery } from "@tanstack/react-query";
import {
  fetchActiveExams,
  fetchQuestionSubjects,
  fetchPublishedMockTests,
  fetchUserAttempts,
  Exam,
  Subject,
  MockTest,
  TestAttemptInfo,
} from "@/services/examService";
import {
  fetchTodayMetrics,
  fetchUnfinishedPractice,
  fetchWeakestSubjectRecommendation,
  fetchUnreadNotificationsCount,
  fetchRecentAttempts,
  fetchStudentOverallRank,
  TodayMetrics,
  UnfinishedPracticeSession,
  WeakestSubjectRecommendation,
  RecentAttemptItem,
  StudentOverallRankResult,
} from "@/services/studentService";

/**
 * Hook to retrieve active exams with a 10-minute cache window.
 */
export function useExams() {
  return useQuery<Exam[]>({
    queryKey: ["exams", "active"],
    queryFn: fetchActiveExams,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Hook to retrieve question subjects with a 10-minute cache window.
 */
export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ["subjects", "questions"],
    queryFn: fetchQuestionSubjects,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Hook to retrieve published mock tests with a 5-minute cache window.
 */
export function useMockTests() {
  return useQuery<MockTest[]>({
    queryKey: ["mockTests", "published"],
    queryFn: fetchPublishedMockTests,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to retrieve historical user test attempts keyed by user ID.
 */
export function useUserAttempts(userId?: string) {
  return useQuery<Record<string, TestAttemptInfo>>({
    queryKey: ["userAttempts", userId],
    queryFn: () => {
      if (!userId) return Promise.resolve({});
      return fetchUserAttempts(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to retrieve dynamic today progress metrics (Questions, Accuracy, Study Time, Streak).
 */
export function useTodayMetrics(userId?: string) {
  return useQuery<TodayMetrics>({
    queryKey: ["todayMetrics", userId],
    queryFn: () => {
      if (!userId) {
        return Promise.resolve({
          questions: 0,
          accuracy: 0,
          studyTimeMinutes: 0,
          streakDays: 0,
        });
      }
      return fetchTodayMetrics(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

/**
 * Hook to retrieve any in-progress or active test practice session.
 */
export function useUnfinishedPractice(userId?: string) {
  return useQuery<UnfinishedPracticeSession | null>({
    queryKey: ["unfinishedPractice", userId],
    queryFn: () => {
      if (!userId) return Promise.resolve(null);
      return fetchUnfinishedPractice(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to retrieve dynamic AI/performance-driven weakest subject recommendation.
 */
export function useWeakestSubjectRecommendation(userId?: string) {
  return useQuery<WeakestSubjectRecommendation>({
    queryKey: ["weakestSubjectRecommendation", userId],
    queryFn: () => {
      if (!userId) return Promise.resolve({ subjectName: null, accuracy: null, hasSufficientData: false });
      return fetchWeakestSubjectRecommendation(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to retrieve unread notifications count for header badge.
 */
export function useUnreadNotificationsCount(userId?: string) {
  return useQuery<number>({
    queryKey: ["unreadNotificationsCount", userId],
    queryFn: () => {
      if (!userId) return Promise.resolve(0);
      return fetchUnreadNotificationsCount(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to retrieve recent completed test attempts (up to 4 items).
 */
export function useRecentAttempts(userId?: string) {
  return useQuery<RecentAttemptItem[]>({
    queryKey: ["recentAttempts", userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return fetchRecentAttempts(userId, 4);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to retrieve the student's single Overall Rank across all mock test participants.
 */
export function useStudentOverallRank(userId?: string) {
  return useQuery<StudentOverallRankResult>({
    queryKey: ["studentOverallRank", userId],
    queryFn: () => {
      if (!userId) {
        return Promise.resolve({
          rank: null,
          totalParticipants: 500,
          testsCompleted: 0,
          totalScore: 0,
          avgPercentage: 0,
        });
      }
      return fetchStudentOverallRank(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

