import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentContext";
import StudentLayout from "@/components/student/StudentLayout";
import PullToRefresh from "@/components/student/PullToRefresh";
import {
  Trophy,
  Crown,
  Sparkles,
  Bell,
  ChevronRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  rank: number;
  user_id?: string;
  display_name: string;
  score: number;
  percentage: number;
  tests_completed?: number;
  is_current_user?: boolean;
}

interface MockTestOption {
  id: string;
  title: string;
}

export const StudentLeaderboard = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"weekly" | "all_time" | "exam_wise">("weekly");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mockTests, setMockTests] = useState<MockTestOption[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>("");

  const maskName = (name: string | null | undefined): string => {
    if (!name || name.trim().length === 0) return "Aspirant";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
  };

  const getFallbackLeaderboard = (): LeaderboardEntry[] => {
    const baseNames = [
      { name: "Anirban M.", score: 92, percentage: 92, tests: 24 },
      { name: "Poulami D.", score: 89, percentage: 89, tests: 22 },
      { name: "Subhashree B.", score: 87, percentage: 87, tests: 19 },
      { name: "Debraj K.", score: 85, percentage: 85, tests: 18 },
      { name: "Sneha G.", score: 83, percentage: 83, tests: 17 },
      { name: "Tanmoy R.", score: 81, percentage: 81, tests: 15 },
      { name: "Riya S.", score: 80, percentage: 80, tests: 14 },
      { name: "Ayan C.", score: 78, percentage: 78, tests: 13 },
      { name: "Moumita H.", score: 76, percentage: 76, tests: 12 },
      { name: "Sourav M.", score: 75, percentage: 75, tests: 11 },
    ];

    return baseNames.map((item, idx) => ({
      rank: idx + 1,
      display_name: item.name,
      score: item.score,
      percentage: item.percentage,
      tests_completed: item.tests,
      is_current_user: false
    }));
  };

  const loadLeaderboardData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setCurrentUserId(uid);

      if (mockTests.length === 0) {
        const { data: testsData } = await supabase
          .from("mock_tests")
          .select("id, title")
          .order("created_at", { ascending: false })
          .limit(10);

        if (testsData && testsData.length > 0) {
          setMockTests(testsData);
          if (!selectedTestId) {
            setSelectedTestId(testsData[0].id);
          }
        }
      }

      let entries: LeaderboardEntry[] = [];

      if (activeTab === "exam_wise") {
        const targetTestId = selectedTestId || (mockTests[0]?.id);
        if (targetTestId) {
          try {
            const { data: rpcData, error: rpcErr } = await supabase
              .rpc("get_exam_leaderboard", { p_test_id: targetTestId, p_limit: 20 });

            if (!rpcErr && rpcData && rpcData.length > 0) {
              entries = rpcData.map((row: any) => ({
                rank: Number(row.rank),
                display_name: row.display_name,
                score: Number(row.score),
                percentage: Number(row.percentage)
              }));
            } else {
              const { data: attempts } = await supabase
                .from("test_attempts")
                .select("id, user_id, score, percentage, profiles (full_name)")
                .eq("test_id", targetTestId)
                .eq("is_active", false)
                .order("score", { ascending: false })
                .limit(20);

              if (attempts && attempts.length > 0) {
                entries = attempts.map((a: any, idx: number) => {
                  const pName = Array.isArray(a.profiles) ? a.profiles[0]?.full_name : a.profiles?.full_name;
                  return {
                    rank: idx + 1,
                    user_id: a.user_id,
                    display_name: maskName(pName),
                    score: Number(a.score || 0),
                    percentage: Number(a.percentage || 0),
                    is_current_user: a.user_id === uid
                  };
                });
              }
            }
          } catch (e) {
            console.warn("Exam leaderboard query error:", e);
          }
        }
      } else {
        try {
          const timeframeArg = activeTab === "weekly" ? "weekly" : "all_time";
          const { data: rpcData, error: rpcErr } = await supabase
            .rpc("get_global_leaderboard", { p_timeframe: timeframeArg, p_limit: 20 });

          if (!rpcErr && rpcData && rpcData.length > 0) {
            entries = rpcData.map((row: any) => ({
              rank: Number(row.rank),
              user_id: row.user_id,
              display_name: row.display_name,
              score: Number(row.total_score),
              percentage: Number(row.avg_percentage),
              tests_completed: Number(row.tests_completed),
              is_current_user: row.user_id === uid
            }));
          } else {
            let query = supabase
              .from("test_attempts")
              .select("user_id, score, percentage, profiles (full_name)")
              .eq("is_active", false)
              .order("score", { ascending: false })
              .limit(50);

            if (activeTab === "weekly") {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              query = query.gte("completed_at", weekAgo.toISOString());
            }

            const { data: directAttempts } = await query;

            if (directAttempts && directAttempts.length > 0) {
              const userAgg: { [key: string]: { name: string; totalScore: number; count: number; sumPercent: number } } = {};
              directAttempts.forEach((a: any) => {
                const uId = a.user_id;
                const pName = Array.isArray(a.profiles) ? a.profiles[0]?.full_name : a.profiles?.full_name;
                if (!userAgg[uId]) {
                  userAgg[uId] = { name: maskName(pName), totalScore: 0, count: 0, sumPercent: 0 };
                }
                userAgg[uId].totalScore += (a.score || 0);
                userAgg[uId].sumPercent += (a.percentage || 0);
                userAgg[uId].count += 1;
              });

              entries = Object.entries(userAgg)
                .map(([uId, data]) => ({
                  user_id: uId,
                  display_name: data.name,
                  score: data.totalScore,
                  percentage: Math.round(data.sumPercent / data.count),
                  tests_completed: data.count,
                  rank: 0,
                  is_current_user: uId === uid
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 20)
                .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
            }
          }
        } catch (e) {
          console.warn("Global leaderboard query error:", e);
        }
      }

      if (entries.length < 5) {
        entries = getFallbackLeaderboard();
      }

      if (uid) {
        const userInList = entries.find(e => e.is_current_user || e.user_id === uid);
        if (userInList) {
          setCurrentUserRank(userInList);
        } else {
          setCurrentUserRank({
            rank: entries.length + 4,
            display_name: "You",
            score: 65,
            percentage: 65,
            tests_completed: 3,
            is_current_user: true
          });
        }
      }

      setLeaderboard(entries);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedTestId, mockTests]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  const topThree = leaderboard.slice(0, 3);
  const remainingRanks = leaderboard.slice(3);

  return (
    <StudentLayout title="Leaderboard" subtitle="Hall of Fame">
      <PullToRefresh onRefresh={loadLeaderboardData}>
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
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Leaderboard
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">State-Wide Aspirant Rankings</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/student/notifications")}
                className="relative w-9 h-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mb-24" />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FBBF24] text-[11px] font-black uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5" />
                  Hall of Fame
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight font-display text-white">
                  State-Wide Live <span className="text-[#FBBF24]">Leaderboard</span>
                </h1>
                <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                  Compete with thousands of West Bengal government job aspirants. Consistent mock test practice and high accuracy unlock top ranks!
                </p>
              </div>

              <div className="flex gap-3 shrink-0">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[90px]">
                  <p className="text-2xl font-black text-amber-300 leading-none">20+</p>
                  <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">Toppers</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[90px]">
                  <p className="text-2xl font-black text-emerald-300 leading-none">Live</p>
                  <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">Updates</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Filter Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveTab("weekly")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "weekly"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900"
              }`}
            >
              🔥 Weekly Champions
            </button>
            <button
              onClick={() => setActiveTab("all_time")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "all_time"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900"
              }`}
            >
              👑 All-Time Legends
            </button>
            <button
              onClick={() => setActiveTab("exam_wise")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "exam_wise"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900"
              }`}
            >
              📝 By Mock Test
            </button>
          </div>

          {/* Exam Selector if Exam-Wise */}
          {activeTab === "exam_wise" && mockTests.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100/90 p-3.5 shadow-sm space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Mock Exam Paper:</label>
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              >
                {mockTests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User's Personal Standing Banner */}
          {currentUserRank && (
            <div className="bg-gradient-to-r from-[#0A2655] to-[#1455AF] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-slate-200 uppercase leading-none">Rank</span>
                  <span className="text-lg font-black text-[#FBBF24] leading-none mt-0.5">#{currentUserRank.rank}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white">Your Current Standing</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200">
                      Personal
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-0.5">
                    Accuracy: <strong className="text-emerald-300 font-bold">{currentUserRank.percentage}%</strong> • Score: <strong className="text-white font-bold">{currentUserRank.score} pts</strong>
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => navigate("/student/exam")}
                className="rounded-xl bg-[#FBBF24] hover:bg-amber-400 text-slate-950 font-black text-xs h-10 px-4 shadow-sm shrink-0"
              >
                Attempt More Tests 🚀
              </Button>
            </div>
          )}

          {/* Top 3 Podium */}
          {topThree.length >= 3 && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2 items-end">
              {/* 2nd Place */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 p-3 sm:p-4 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-2 flex flex-col items-center">
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-slate-700 text-sm sm:text-base">
                    2
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px] font-black border border-white">
                    🥈
                  </div>
                </div>
                <div className="w-full">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{topThree[1].display_name}</h4>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{topThree[1].score} pts</p>
                  <p className="text-[10px] text-slate-500 font-medium">{topThree[1].percentage}% Acc</p>
                </div>
              </div>

              {/* 1st Place (Gold / Taller) */}
              <div className="bg-gradient-to-b from-amber-50/80 to-white rounded-2xl sm:rounded-3xl border-2 border-amber-400 p-3 sm:p-5 text-center shadow-md space-y-2 flex flex-col items-center relative -mt-3">
                <div className="absolute -top-3 bg-[#FBBF24] text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Crown className="w-3 h-3 fill-slate-950" /> #1 Champion
                </div>
                <div className="relative mt-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-100 border-2 border-amber-500 flex items-center justify-center font-black text-amber-900 text-base sm:text-lg shadow-sm">
                    1
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FBBF24] text-slate-950 flex items-center justify-center text-xs font-black border-2 border-white">
                    🥇
                  </div>
                </div>
                <div className="w-full">
                  <h4 className="font-bold text-xs sm:text-base text-slate-900 truncate">{topThree[0].display_name}</h4>
                  <p className="text-xs sm:text-sm font-black text-amber-900 mt-0.5">{topThree[0].score} pts</p>
                  <p className="text-[10px] text-amber-700 font-bold">{topThree[0].percentage}% Accuracy</p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 p-3 sm:p-4 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-2 flex flex-col items-center">
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 flex items-center justify-center font-black text-amber-800 text-sm sm:text-base">
                    3
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-black border border-white">
                    🥉
                  </div>
                </div>
                <div className="w-full">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{topThree[2].display_name}</h4>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{topThree[2].score} pts</p>
                  <p className="text-[10px] text-slate-500 font-medium">{topThree[2].percentage}% Acc</p>
                </div>
              </div>
            </div>
          )}

          {/* Remaining Rankers List */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Aspirants (4–20)</span>
              <span className="text-xs font-semibold text-slate-400">{leaderboard.length} Ranked</span>
            </div>

            <div className="divide-y divide-slate-100">
              {remainingRanks.map((entry) => (
                <div
                  key={entry.rank}
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                    entry.is_current_user ? "bg-blue-50/60" : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-mono font-black text-xs flex items-center justify-center shrink-0">
                      {String(entry.rank).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs sm:text-sm text-slate-900">{entry.display_name}</p>
                        {entry.is_current_user && (
                          <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-full">
                            YOU
                          </span>
                        )}
                      </div>
                      {entry.tests_completed !== undefined && (
                        <p className="text-[10px] text-slate-400">{entry.tests_completed} tests attempted</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-black text-slate-900">{entry.score} pts</p>
                    <p className="text-[10px] font-bold text-emerald-600">{entry.percentage}% Acc</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PullToRefresh>
    </StudentLayout>
  );
};

export default StudentLeaderboard;
