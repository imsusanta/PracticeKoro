import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/utils/adminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, FileQuestion, Clock, TrendingUp, ArrowUpRight, CheckCircle, XCircle, Activity, Calendar, Sparkles, BarChart3, Zap, Shield, Eye, Plus, Download, Crown, MessageCircle, ScrollText, AlertTriangle, TestTube2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { motion } from "framer-motion";
import { downloadCsv, stampFilename } from "@/lib/csv";
import { fetchRecentAuditLogs, type AuditLogRow } from "@/lib/adminAudit";
import { useAuth } from "@/hooks/useAuth";
import { subscriptionCutoffIso } from "@/lib/subscription";

interface RecentActivity {
  id: string;
  student_name: string;
  test_title: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  completed_at: string;
}

interface TodayActivity extends RecentActivity {
  whatsapp_number?: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, status: authStatus, roles, isAdmin } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activePassStudents: 0,
    pendingApprovals: 0,
    totalQuestions: 0,
    easyQuestions: 0,
    mediumQuestions: 0,
    hardQuestions: 0,
    pyqQuestions: 0,
    totalTests: 0,
    totalExams: 0,
    publishedTests: 0,
    draftTests: 0,
    testsToday: 0,
    totalRevenue: 0,
    premiumSubscribers: 0,
    revenue30d: 0,
    unreadChats: 0,
  });
  const [adminRole, setAdminRole] = useState<"admin" | "super_admin" | "">("");
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [todayActivity, setTodayActivity] = useState<TodayActivity[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });

  // Route guard already verified admin/super_admin. Load dashboard data once the session is ready.
  useEffect(() => {
    if (authStatus === "loading") return;
    if (!user || !isAdmin) return;

    setAuthChecked(true);
    if (roles.includes("super_admin")) setAdminRole("super_admin");
    else if (roles.includes("admin")) setAdminRole("admin");

    Promise.all([loadStats(), loadRecentActivity()]).finally(() => setLoading(false));
  }, [authStatus, user, isAdmin, roles]);

  const loadStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      studentsResult,
      approvalsResult,
      activePassResult,
      questionsResult,
      easyQResult,
      medQResult,
      hardQResult,
      pyqResult,
      testsResult,
      examsResult,
      publishedResult,
      draftResult,
      testsTodayResult,
      premiumResult,
      revenueResult,
      unreadChatsResult,
      auditResult,
    ] = await Promise.all([
      (supabase.from("profiles") as any).select("id, user_roles!inner(role)", { count: "exact", head: true }).eq("user_roles.role", "student"),
      (supabase.from("approval_status") as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
      (supabase.from("approval_status") as any).select("id", { count: "exact", head: true }).eq("status", "approved"),
      (supabase.from("questions") as any).select("id", { count: "exact", head: true }),
      (supabase.from("questions") as any).select("id", { count: "exact", head: true }).eq("difficulty", "easy"),
      (supabase.from("questions") as any).select("id", { count: "exact", head: true }).eq("difficulty", "medium"),
      (supabase.from("questions") as any).select("id", { count: "exact", head: true }).eq("difficulty", "hard"),
      (supabase.from("questions") as any).select("id", { count: "exact", head: true }).not("year", "is", null),
      (supabase.from("mock_tests") as any).select("id", { count: "exact", head: true }),
      (supabase.from("exams") as any).select("id", { count: "exact", head: true }),
      (supabase.from("mock_tests") as any).select("id", { count: "exact", head: true }).eq("is_published", true),
      (supabase.from("mock_tests") as any).select("id", { count: "exact", head: true }).eq("is_published", false),
      (supabase.from("test_attempts") as any).select("id", { count: "exact", head: true }).gte("completed_at", today.toISOString()),
      (supabase.from("purchases") as any).select("user_id").eq("content_type", "subscription").eq("status", "completed").gt("created_at", subscriptionCutoffIso()),
      (supabase.from("purchases") as any).select("amount").eq("status", "completed").gte("created_at", thirtyDaysAgo.toISOString()),
      (supabase.from("chat_messages") as any).select("id", { count: "exact", head: true }).eq("sender_role", "student").eq("is_read", false),
      fetchRecentAuditLogs(12),
    ]);

    const premiumIds = new Set(((premiumResult as any).data || []).map((row: any) => row.user_id));
    const revenue30d = ((revenueResult as any).data || []).reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0);

    setStats({
      totalStudents: studentsResult.count || 0,
      activePassStudents: activePassResult.count || 0,
      pendingApprovals: approvalsResult.count || 0,
      totalQuestions: questionsResult.count || 0,
      easyQuestions: easyQResult.count || 0,
      mediumQuestions: medQResult.count || 0,
      hardQuestions: hardQResult.count || 0,
      pyqQuestions: pyqResult.count || 0,
      totalTests: testsResult.count || 0,
      totalExams: examsResult.count || 0,
      publishedTests: publishedResult.count || 0,
      draftTests: draftResult.count || 0,
      testsToday: testsTodayResult.count || 0,
      totalRevenue: revenue30d,
      premiumSubscribers: premiumIds.size,
      revenue30d,
      unreadChats: unreadChatsResult.count || 0,
    });
    setAuditLogs(auditResult);
  };

  const handleExportDailyActivity = () => {
    const ok = downloadCsv(
      stampFilename(`daily-attempts-${selectedDate}`),
      todayActivity.map((row) => ({
        student: row.student_name,
        whatsapp: row.whatsapp_number || "",
        test: row.test_title,
        score: row.score,
        total_marks: row.total_marks,
        percentage: row.percentage,
        passed: row.passed ? "passed" : "failed",
        completed_at: row.completed_at,
      }))
    );
    toast({
      title: ok ? "Exported" : "Nothing to export",
      description: ok ? `Saved attempts for ${selectedDate}` : "No tests on this date",
    });
  };

  const handleExportStudents = async () => {
    setExporting("students");
    try {
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      if (rolesError) throw rolesError;
      const ids = (roles || []).map((row) => row.user_id);
      if (ids.length === 0) {
        toast({ title: "Nothing to export", description: "No student accounts found" });
        return;
      }

      const chunkSize = 200;
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize));
      }

      const [profileChunks, approvalChunks, purchasesResult] = await Promise.all([
        Promise.all(chunks.map((chunk) =>
          supabase.from("profiles").select("id, full_name, email, whatsapp_number, created_at").in("id", chunk)
        )),
        Promise.all(chunks.map((chunk) =>
          supabase.from("approval_status").select("user_id, status, expires_at").in("user_id", chunk)
        )),
        supabase.from("purchases").select("user_id, created_at, amount, status").eq("content_type", "subscription").eq("status", "completed"),
      ]);

      const profilesResult = { data: profileChunks.flatMap((result) => result.data || []) };
      const approvalsResult = { data: approvalChunks.flatMap((result) => result.data || []) };
      const profileError = profileChunks.find((result) => result.error)?.error;
      const approvalError = approvalChunks.find((result) => result.error)?.error;
      if (profileError) throw profileError;
      if (approvalError) throw approvalError;

      const approvalMap = new Map((approvalsResult.data || []).map((row) => [row.user_id, row]));
      const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const premiumSet = new Set(
        (purchasesResult.data || [])
          .filter((row) => new Date(row.created_at).getTime() >= yearAgo)
          .map((row) => row.user_id)
      );

      const rows = (profilesResult.data || []).map((profile) => {
        const approval = approvalMap.get(profile.id);
        return {
          name: profile.full_name || "",
          email: profile.email || "",
          whatsapp: profile.whatsapp_number || "",
          approval_status: approval?.status || "unknown",
          expires_at: approval?.expires_at || "",
          premium: premiumSet.has(profile.id) ? "yes" : "no",
          registered_at: profile.created_at,
        };
      });

      downloadCsv(stampFilename("students"), rows);
      toast({ title: "Exported", description: `${rows.length} students saved as CSV` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to export students";
      toast({ title: "Export failed", description: message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const handleExportRecentAttempts = () => {
    const ok = downloadCsv(
      stampFilename("recent-attempts"),
      recentActivity.map((row) => ({
        student: row.student_name,
        test: row.test_title,
        score: row.score,
        total_marks: row.total_marks,
        percentage: row.percentage,
        passed: row.passed ? "passed" : "failed",
        completed_at: row.completed_at,
      }))
    );
    toast({
      title: ok ? "Exported" : "Nothing to export",
      description: ok ? "Saved the latest 10 attempts" : "No recent attempts yet",
    });
  };

  const loadRecentActivity = async () => {
    // First get test attempts
    const { data: attempts, error } = await supabase
      .from("test_attempts")
      .select("id, user_id, test_id, score, total_marks, percentage, passed, completed_at")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(10);

    if (!error && attempts && attempts.length > 0) {
      // Get unique user and test IDs
      const userIds = [...new Set(attempts.map(a => a.user_id))];
      const testIds = [...new Set(attempts.map(a => a.test_id))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Fetch tests
      const { data: tests } = await supabase
        .from("mock_tests")
        .select("id, title")
        .in("id", testIds);

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const testMap = new Map(tests?.map(t => [t.id, t.title]) || []);

      const activities = attempts.map((item: any) => ({
        id: item.id,
        student_name: profileMap.get(item.user_id) || "Unknown Student",
        test_title: testMap.get(item.test_id) || "Unknown Test",
        score: item.score,
        total_marks: item.total_marks,
        percentage: item.percentage,
        passed: item.passed,
        completed_at: item.completed_at,
      }));
      setRecentActivity(activities);
    }
  };

  const loadTodayActivity = async (dateStr: string) => {
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    // First get test attempts for the date
    const { data: attempts, error } = await supabase
      .from("test_attempts")
      .select("id, user_id, test_id, score, total_marks, percentage, passed, completed_at")
      .gte("completed_at", startOfDay.toISOString())
      .lte("completed_at", endOfDay.toISOString())
      .order("completed_at", { ascending: false });

    if (!error && attempts && attempts.length > 0) {
      // Get unique user and test IDs
      const userIds = [...new Set(attempts.map(a => a.user_id))];
      const testIds = [...new Set(attempts.map(a => a.test_id))];

      // Fetch profiles with whatsapp_number
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, whatsapp_number")
        .in("id", userIds);

      // Fetch tests
      const { data: tests } = await supabase
        .from("mock_tests")
        .select("id, title")
        .in("id", testIds);

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, whatsapp: p.whatsapp_number }]) || []);
      const testMap = new Map(tests?.map(t => [t.id, t.title]) || []);

      const activities = attempts.map((item: any) => ({
        id: item.id,
        student_name: profileMap.get(item.user_id)?.name || "Unknown Student",
        whatsapp_number: profileMap.get(item.user_id)?.whatsapp || "",
        test_title: testMap.get(item.test_id) || "Unknown Test",
        score: item.score,
        total_marks: item.total_marks,
        percentage: item.percentage,
        passed: item.passed,
        completed_at: item.completed_at,
      }));
      setTodayActivity(activities);
    } else {
      setTodayActivity([]);
    }
  };

  // Load today's activity when date changes
  useEffect(() => {
    if (authChecked) {
      loadTodayActivity(selectedDate);
    }
  }, [selectedDate, authChecked]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Show loading only if auth not checked yet
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg p-2 border border-slate-200">
            <img src="/logo-circle.png" alt="Practice Koro" className="w-full h-full object-contain rounded-full" />
          </div>
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const roleLabel = adminRole === "super_admin" ? "Super Admin" : adminRole === "admin" ? "Admin" : "Admin";

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents.toLocaleString(),
      subLabel: `${stats.activePassStudents} Pro Pass Active`,
      icon: Users,
      trend: "Registered",
      color: "blue",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      iconBg: "bg-blue-600 text-white shadow-blue-500/20"
    },
    {
      label: "Question Bank",
      value: stats.totalQuestions.toLocaleString(),
      subLabel: `${stats.pyqQuestions} PYQ Papers Included`,
      icon: FileQuestion,
      trend: `${stats.easyQuestions}E / ${stats.mediumQuestions}M / ${stats.hardQuestions}H`,
      color: "indigo",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconBg: "bg-indigo-600 text-white shadow-indigo-500/20"
    },
    {
      label: "Mock Tests & Exams",
      value: stats.totalTests.toLocaleString(),
      subLabel: `${stats.totalExams} Target Exams Active`,
      icon: BarChart3,
      trend: "Curated",
      color: "amber",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      iconBg: "bg-amber-500 text-white shadow-amber-500/20"
    },
    {
      label: "Tests Taken Today",
      value: stats.testsToday.toLocaleString(),
      subLabel: "Live submissions",
      icon: Activity,
      trend: "Live",
      color: "emerald",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBg: "bg-emerald-600 text-white shadow-emerald-500/20"
    },
    {
      label: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      subLabel: "Completed student purchases",
      icon: TrendingUp,
      trend: "Real Payments",
      color: "slate",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
      iconBg: "bg-slate-900 text-white shadow-slate-900/20"
    },
  ];

  const attentionItems = [
    stats.pendingApprovals > 0 && {
      label: `${stats.pendingApprovals} student${stats.pendingApprovals === 1 ? "" : "s"} waiting for approval`,
      href: "/admin/students",
      icon: Clock,
    },
    stats.draftTests > 0 && {
      label: `${stats.draftTests} mock test${stats.draftTests === 1 ? "" : "s"} still in draft`,
      href: "/admin/tests",
      icon: TestTube2,
    },
    stats.unreadChats > 0 && {
      label: `${stats.unreadChats} unread student chat message${stats.unreadChats === 1 ? "" : "s"}`,
      href: "/admin/chat",
      icon: MessageCircle,
    },
  ].filter(Boolean) as { label: string; href: string; icon: typeof Clock }[];

  return (
    <AdminLayout title="Platform Command Center" subtitle="Control exam papers, question bank, test series, and student access">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Modern Executive Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl shadow-slate-950/15 border border-slate-800"
        >
          {/* Subtle Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-white/10 p-1 backdrop-blur-md border border-white/20 shadow-lg shrink-0">
                <img src="/logo-circle.png" alt="Practice Koro" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Practice Koro Admin Studio</h1>
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold px-2.5 py-0.5">
                    {roleLabel}
                  </Badge>
                </div>
                <p className="text-slate-300 text-sm md:text-base max-w-xl">
                  Manage WB & National competitive exams, Previous Year Questions, AI-assisted drill tests, and verify student enrollment.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={handleExportStudents}
                disabled={exporting === "students"}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm rounded-xl font-semibold text-sm transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting === "students" ? "Exporting..." : "Export Students"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/student/dashboard")}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm rounded-xl font-semibold text-sm transition-all"
              >
                <Eye className="w-4 h-4 mr-2 text-blue-300" />
                Student Portal View
              </Button>
              <Button
                onClick={() => navigate("/admin/questions/add")}
                className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30 rounded-xl font-semibold text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
              <Button
                onClick={() => navigate("/admin/tests")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 border-0 shadow-lg shadow-amber-500/20 rounded-xl font-bold text-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create Mock Test
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="border border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                      <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
                      <p className="text-xs text-slate-600 font-medium">{stat.subLabel}</p>
                    </div>
                    <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center shadow-md shrink-0`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Status</span>
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${stat.badgeColor}`}>
                      {stat.trend}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Needs attention
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {attentionItems.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">Nothing waiting — queue is clear.</p>
              ) : (
                attentionItems.map((item) => (
                  <button
                    key={item.href + item.label}
                    onClick={() => navigate(item.href)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-left hover:bg-amber-100/70 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium text-amber-900">{item.label}</span>
                    <ArrowUpRight className="w-4 h-4 text-amber-500 ml-auto" />
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Crown className="w-4 h-4 text-violet-600" />
                Premium & revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 border border-violet-100">
                <span className="text-sm text-gray-600 font-medium">Active premium (12 mo)</span>
                <span className="font-bold text-violet-700 text-lg">{stats.premiumSubscribers}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-sm text-gray-600 font-medium">Completed payments (30d)</span>
                <span className="font-bold text-emerald-700 text-lg">₹{Math.round(stats.revenue30d)}</span>
              </div>
              <p className="text-[11px] text-gray-400">Revenue is the sum of completed payments in the last 30 days. Manual ₹0 upgrades count as premium, not revenue.</p>
            </CardContent>
          </Card>
        </div>

        {/* Question Bank & Difficulty Breakdown Bar */}
        <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-blue-600" />
                  Database Question Distribution & Difficulty Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time breakdown of difficulty ratings, PYQ papers, and syllabus coverage
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Easy: {stats.easyQuestions}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium: {stats.mediumQuestions}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Hard: {stats.hardQuestions}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  <Calendar className="w-3 h-3 text-purple-600" />
                  PYQ Papers: {stats.pyqQuestions}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/admin/questions")}
                  className="rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-50 text-slate-700"
                >
                  Manage Questions &rarr;
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Student Tests */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between bg-slate-50/80 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg font-bold text-slate-900">
                    Daily Student Submissions
                  </CardTitle>
                  <p className="text-xs text-slate-500">Live monitor of tests completed by students</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-slate-800"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportDailyActivity}
                    disabled={todayActivity.length === 0}
                    className="rounded-xl h-9"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    CSV
                  </Button>
                  <Badge className="bg-blue-600 text-white border-0 rounded-full px-3 py-1 text-xs font-bold shadow-sm whitespace-nowrap">
                    {todayActivity.length} Submissions
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {todayActivity.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <p className="text-slate-700 font-bold text-sm">No tests submitted on this date</p>
                  <p className="text-slate-400 text-xs mt-1">Select another date to review student attempt history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-slate-200">
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Test Name</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Score</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {todayActivity.map((activity, index) => (
                          <tr
                            key={activity.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3">
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{activity.student_name}</p>
                                {activity.whatsapp_number && (
                                  <p className="text-xs text-slate-500 font-medium">{activity.whatsapp_number}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <p className="text-sm text-slate-700 font-medium truncate max-w-[240px]">{activity.test_title}</p>
                            </td>
                            <td className="py-3">
                              <p className="text-xs text-slate-500">
                                {new Date(activity.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </td>
                            <td className="py-3 text-center">
                              <span className="font-extrabold text-slate-900 text-sm">{activity.score}/{activity.total_marks}</span>
                              <span className="text-[11px] text-slate-500 ml-1">({activity.percentage}%)</span>
                            </td>
                            <td className="py-3 text-center">
                              <Badge
                                className={`text-[10px] px-2.5 py-0.5 border font-bold rounded-full ${activity.passed
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}
                              >
                                {activity.passed ? "PASSED" : "FAILED"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {todayActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{activity.student_name}</p>
                            <p className="text-[11px] text-slate-500">{activity.whatsapp_number}</p>
                          </div>
                          <Badge
                            className={`text-[9px] px-2 py-0.5 border font-bold rounded-full ${activity.passed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                          >
                            {activity.passed ? "PASSED" : "FAILED"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-700 font-medium line-clamp-1">{activity.test_title}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                          <span className="text-[10px] text-slate-500">
                            {new Date(activity.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {activity.score}/{activity.total_marks} ({activity.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions & Recent Submissions Grid */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
          {/* Recent Submissions Feed */}
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between bg-slate-50/80 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Recent Activity Stream
                    </CardTitle>
                    <p className="text-xs text-slate-500">Last 10 student evaluations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportRecentAttempts}
                    disabled={recentActivity.length === 0}
                    className="h-8 px-2 text-xs text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    CSV
                  </Button>
                  <Badge className="bg-slate-200 text-slate-800 border-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {stats.testsToday} today
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 font-medium text-sm">No test submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-150"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activity.passed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                          }`}>
                          {activity.passed ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-slate-900 truncate text-xs sm:text-sm">{activity.student_name}</p>
                            <Badge
                              className={`text-[9px] px-1.5 py-0 border font-bold rounded-md ${activity.passed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                            >
                              {activity.passed ? "PASS" : "FAIL"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{activity.test_title}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-slate-900 text-base">{activity.percentage}%</p>
                          <p className="text-[10px] text-slate-400">
                            {formatTimeAgo(activity.completed_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Direct Platform Quick Actions */}
          <div className="space-y-4">
            <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 bg-slate-50/80 border-b border-slate-200 px-5 py-4">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Management Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-between h-11 rounded-xl border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold text-xs"
                  onClick={() => navigate("/admin/questions")}
                >
                  <span className="flex items-center gap-2.5">
                    <FileQuestion className="w-4 h-4 text-blue-600" />
                    Question Bank & PYQs
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{stats.totalQuestions}</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between h-11 rounded-xl border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold text-xs"
                  onClick={() => navigate("/admin/tests")}
                >
                  <span className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    Mock Test Series
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{stats.totalTests}</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between h-11 rounded-xl border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold text-xs"
                  onClick={() => navigate("/admin/exams")}
                >
                  <span className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Exam Categories & Syllabus
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{stats.totalExams}</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between h-11 rounded-xl border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold text-xs"
                  onClick={() => navigate("/admin/students")}
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Students & Approvals
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{stats.totalStudents}</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between h-11 rounded-xl border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold text-xs"
                  onClick={() => navigate("/admin/notifications")}
                >
                  <span className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-purple-600" />
                    Push Notification Center
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </Button>
              </CardContent>
            </Card>

            {/* Quick Bulk MCQ Add Callout */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 p-5 text-white shadow-md border border-blue-800 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                  FAST UPLOAD
                </Badge>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Bulk Question Import</h4>
                <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                  Paste entire Question Papers with Bengali/English text, difficulty ratings, and answer keys.
                </p>
              </div>
              <Button
                onClick={() => navigate("/admin/questions/bulk")}
                className="w-full bg-white hover:bg-slate-100 text-blue-950 font-bold text-xs h-9 rounded-xl shadow-sm"
              >
                Launch Bulk MCQ Importer &rarr;
              </Button>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
              <CardTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-slate-600" />
                Recent admin actions
              </CardTitle>
              <p className="text-xs text-gray-500 ml-7">Publish, delete, notify, and settings writes from this admin panel</p>
            </CardHeader>
            <CardContent className="p-4">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  No logged actions yet. Destructive and publish actions from this upgrade will appear here.
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{log.action}</p>
                        <p className="text-xs text-gray-500">
                          {log.table_name || "system"}
                          {log.record_id ? ` · ${log.record_id.slice(0, 8)}` : ""}
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {log.created_at ? formatTimeAgo(log.created_at) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;