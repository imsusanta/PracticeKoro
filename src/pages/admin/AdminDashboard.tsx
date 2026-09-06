import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock, ArrowUpRight, CheckCircle, XCircle, Activity, Calendar, Sparkles, BarChart3, Zap, Shield, Download, Crown, MessageCircle, ScrollText, AlertTriangle, TestTube2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { motion } from "framer-motion";
import { downloadCsv, stampFilename } from "@/lib/csv";
import { fetchRecentAuditLogs, type AuditLogRow } from "@/lib/adminAudit";

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
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingApprovals: 0,
    totalQuestions: 0,
    totalTests: 0,
    publishedTests: 0,
    draftTests: 0,
    testsToday: 0,
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

  // Fast auth check - show UI immediately if session exists in localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check session quickly
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          navigate("/admin/login");
          return;
        }

        // Show UI immediately, check role in background
        setAuthChecked(true);

        // Start loading data immediately while checking role using RPC
        const [adminRoleResult, superAdminRoleResult] = await Promise.all([
          supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: session.user.id, _role: 'super_admin' }),
          loadStats(),
          loadRecentActivity()
        ]);

        const isAdmin = adminRoleResult.data === true || superAdminRoleResult.data === true;
        if (superAdminRoleResult.data === true) setAdminRole("super_admin");
        else if (adminRoleResult.data === true) setAdminRole("admin");

        if (!isAdmin) {
          console.error("Dashboard: Role check failed - user is not an admin:", {
            userId: session.user.id,
            hasAdminRole: adminRoleResult.data,
            hasSuperAdminRole: superAdminRoleResult.data
          });
          // Removed signOut() here to prevent accidental logouts
          toast({
            title: "Access Denied",
            description: `No admin privileges found for user ID: ${session.user.id.substring(0, 8)}...`,
            variant: "destructive",
          });
          navigate("/admin/login");
          return;
        }
      } catch (error) {
        console.error("Error during admin auth check:", error);
        toast({
          title: "Connection Error",
          description: "Failed to verify admin access. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate, toast]);

  const loadStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const [
      studentsResult,
      approvalsResult,
      questionsResult,
      testsResult,
      publishedResult,
      draftResult,
      testsTodayResult,
      premiumResult,
      revenueResult,
      unreadChatsResult,
      auditResult,
    ] = await Promise.all([
      supabase.from("profiles").select("id, user_roles!inner(role)", { count: "exact", head: true }).eq("user_roles.role", "student"),
      supabase.from("approval_status").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("mock_tests").select("id", { count: "exact", head: true }),
      supabase.from("mock_tests").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("mock_tests").select("id", { count: "exact", head: true }).eq("is_published", false),
      supabase.from("test_attempts").select("id", { count: "exact", head: true }).gte("completed_at", today.toISOString()),
      supabase.from("purchases").select("user_id").eq("content_type", "subscription").eq("status", "completed").gte("created_at", yearAgo.toISOString()),
      supabase.from("purchases").select("amount").eq("status", "completed").gte("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("sender_role", "student").eq("is_read", false),
      fetchRecentAuditLogs(12),
    ]);

    const premiumIds = new Set((premiumResult.data || []).map((row) => row.user_id));
    const revenue30d = (revenueResult.data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    setStats({
      totalStudents: studentsResult.count || 0,
      pendingApprovals: approvalsResult.count || 0,
      totalQuestions: questionsResult.count || 0,
      totalTests: testsResult.count || 0,
      publishedTests: publishedResult.count || 0,
      draftTests: draftResult.count || 0,
      testsToday: testsTodayResult.count || 0,
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

      const [profilesResult, approvalsResult, purchasesResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, whatsapp_number, created_at").in("id", ids),
        supabase.from("approval_status").select("user_id, status, expires_at").in("user_id", ids),
        supabase.from("purchases").select("user_id, created_at, amount, status").eq("content_type", "subscription").eq("status", "completed"),
      ]);

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
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const roleLabel = adminRole === "super_admin" ? "Super Admin" : adminRole === "admin" ? "Admin" : "Admin";

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      hint: stats.premiumSubscribers > 0 ? `${stats.premiumSubscribers} premium` : "Registered students",
      color: "emerald",
      gradient: "from-emerald-500 to-teal-500",
      href: "/admin/students",
    },
    {
      label: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Clock,
      hint: stats.pendingApprovals > 0 ? "Needs review" : "Queue is clear",
      color: stats.pendingApprovals > 0 ? "amber" : "emerald",
      gradient: stats.pendingApprovals > 0 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500",
      href: "/admin/students",
    },
    {
      label: "Published Tests",
      value: stats.publishedTests,
      icon: TestTube2,
      hint: `${stats.draftTests} draft${stats.draftTests === 1 ? "" : "s"}`,
      color: "blue",
      gradient: "from-blue-500 to-cyan-500",
      href: "/admin/tests",
    },
    {
      label: "Tests Today",
      value: stats.testsToday,
      icon: Activity,
      hint: "Completed attempts",
      color: "purple",
      gradient: "from-purple-500 to-pink-500",
      href: undefined,
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
    <AdminLayout title="Dashboard" subtitle="Welcome back, Admin">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 md:p-8 text-white shadow-xl shadow-emerald-200/50"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform -translate-x-10 translate-y-10" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {roleLabel}</h1>
                  <p className="text-emerald-100 text-sm md:text-base">
                    {stats.pendingApprovals > 0
                      ? `${stats.pendingApprovals} approval${stats.pendingApprovals === 1 ? "" : "s"} waiting`
                      : "No pending student approvals"}
                    {stats.unreadChats > 0 ? ` · ${stats.unreadChats} unread chat${stats.unreadChats === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={handleExportStudents}
                disabled={exporting === "students"}
                className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm rounded-xl font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting === "students" ? "Exporting..." : "Export Students"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/admin/tests")}
                className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm rounded-xl font-medium"
              >
                <Zap className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card
                className={`border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-150 rounded-2xl overflow-hidden group ${stat.href ? "cursor-pointer" : ""}`}
                onClick={() => stat.href && navigate(stat.href)}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-xs md:text-sm text-gray-500 font-medium">{stat.label}</p>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                      <div className={`flex items-center gap-1 text-[10px] md:text-xs font-semibold ${stat.color === "amber" ? "text-amber-600" :
                        stat.color === "blue" ? "text-blue-600" :
                          stat.color === "purple" ? "text-purple-600" :
                            "text-emerald-600"
                        }`}>
                        <span>{stat.hint}</span>
                      </div>
                    </div>
                    <div className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-150`}>
                      <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
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

          <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
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

        {/* Today's Student Tests - NEW SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-purple-100/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg font-bold text-gray-900">
                    Daily Test Activity
                  </CardTitle>
                  <p className="text-xs text-gray-500">Students who gave tests</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full sm:w-auto"
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
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-full px-3 py-1 text-xs font-semibold shadow-md whitespace-nowrap">
                    {todayActivity.length} tests
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {todayActivity.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No tests on this date</p>
                  <p className="text-gray-400 text-sm">Select a different date to view activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-gray-100">
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Name</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Score</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {todayActivity.map((activity, index) => (
                          <motion.tr
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="py-3">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{activity.student_name}</p>
                                {activity.whatsapp_number && (
                                  <p className="text-xs text-gray-400">{activity.whatsapp_number}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <p className="text-sm text-gray-600 truncate max-w-[200px]">{activity.test_title}</p>
                            </td>
                            <td className="py-3">
                              <p className="text-xs text-gray-500">
                                {new Date(activity.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </td>
                            <td className="py-3 text-center">
                              <span className="font-bold text-gray-900 text-sm">{activity.score}/{activity.total_marks}</span>
                              <span className="text-[10px] text-gray-400 ml-1">({activity.percentage}%)</span>
                            </td>
                            <td className="py-3 text-center">
                              <Badge
                                className={`text-[10px] px-2 py-0.5 border-0 rounded-full ${activity.passed
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                                  }`}
                              >
                                {activity.passed ? "PASSED" : "FAILED"}
                              </Badge>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {todayActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{activity.student_name}</p>
                            <p className="text-[10px] text-gray-500">{activity.whatsapp_number}</p>
                          </div>
                          <Badge
                            className={`text-[9px] px-2 py-0 border-0 rounded-full ${activity.passed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                              }`}
                          >
                            {activity.passed ? "PASSED" : "FAILED"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1">{activity.test_title}</p>
                        <div className="flex justify-between items-center pt-1 border-t border-gray-200/50">
                          <span className="text-[10px] text-gray-400">
                            {new Date(activity.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs font-bold text-gray-900">
                            {activity.score}/{activity.total_marks} ({activity.percentage}%)
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
          {/* Recent Student Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border-b border-emerald-100/50">
                <div>
                  <CardTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    Recent Activity
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1 ml-10">Latest test submissions</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportRecentAttempts}
                    disabled={recentActivity.length === 0}
                    className="h-8 px-2 text-xs text-emerald-700"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    CSV
                  </Button>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 rounded-full px-3 py-1 text-xs font-semibold shadow-md">
                    {stats.testsToday} today
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <Activity className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">No test submissions yet</p>
                    <p className="text-gray-400 text-sm">Activity will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200"
                      >
                        {/* Status Icon */}
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${activity.passed
                          ? "bg-gradient-to-br from-emerald-100 to-green-100"
                          : "bg-gradient-to-br from-red-100 to-rose-100"
                          }`}>
                          {activity.passed ? (
                            <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                          ) : (
                            <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-gray-900 truncate text-sm md:text-base">{activity.student_name}</p>
                            <Badge
                              className={`text-[9px] md:text-[10px] px-1.5 py-0 border-0 rounded-full ${activity.passed
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                                }`}
                            >
                              {activity.passed ? "PASSED" : "FAILED"}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{activity.test_title}</p>
                        </div>

                        {/* Score & Time */}
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-900 text-lg md:text-xl">{activity.percentage}%</p>
                          <p className="text-[10px] text-gray-400 flex items-center justify-end gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatTimeAgo(activity.completed_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="space-y-5"
          >
            {/* Quick Stats */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 border-b border-blue-100/50">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                  <span className="text-sm text-gray-600 font-medium">All mock tests</span>
                  <span className="font-bold text-emerald-700 text-lg">{stats.totalTests}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                  <span className="text-sm text-gray-600 font-medium">Question bank</span>
                  <span className="font-bold text-blue-700 text-lg">{stats.totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                  <span className="text-sm text-gray-600 font-medium">Students</span>
                  <span className="font-bold text-purple-700 text-lg">{stats.totalStudents}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="border-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl overflow-hidden relative">
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform translate-x-8 -translate-y-8" />

              <CardContent className="p-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Quick Actions</h3>
                <p className="text-emerald-100 text-sm leading-relaxed mb-4">
                  Access frequently used features
                </p>
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    className="w-full bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur-sm rounded-xl font-medium justify-start"
                    onClick={() => navigate("/admin/students")}
                  >
                    <Users className="w-4 h-4 mr-3" />
                    Manage Students
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur-sm rounded-xl font-medium justify-start"
                    onClick={() => navigate("/admin/notifications")}
                  >
                    <Activity className="w-4 h-4 mr-3" />
                    Send Notification
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur-sm rounded-xl font-medium justify-start"
                    onClick={() => navigate("/admin/ai-generator")}
                  >
                    <Sparkles className="w-4 h-4 mr-3" />
                    AI Generator
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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