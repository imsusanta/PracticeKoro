import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/utils/adminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  FileQuestion,
  Clock,
  TrendingUp,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
  Sparkles,
  BarChart3,
  Zap,
  Shield,
  Eye,
  Plus,
  Download,
  Crown,
  MessageCircle,
  ScrollText,
  AlertTriangle,
  TestTube2,
  Globe,
  NotebookPen,
  Newspaper,
  PhoneCall,
  ExternalLink,
  RefreshCw,
  FolderOpen
} from "lucide-react";
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
    activePassStudents: 0,
    pendingApprovals: 0,
    totalQuestions: 0,
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
    return today.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  });

  // Fast auth check - verify role and load data safely
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          navigate("/admin/login", { replace: true });
          return;
        }

        const isAdmin = await checkIsAdmin(session.user.id);
        if (isAdmin) {
          const { data: isSuper } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "super_admin" });
          if (isSuper === true) setAdminRole("super_admin");
          else setAdminRole("admin");
        }

        if (!isAdmin) {
          console.error("Dashboard: Role check failed - user is not an admin:", session.user.id);
          toast({
            title: "Access Denied",
            description: "No administrative privileges found for this account.",
            variant: "destructive",
          });
          navigate("/admin/login", { replace: true });
          return;
        }

        setAuthChecked(true);

        // Load stats and activity safely
        Promise.all([
          loadStats().catch((err) => console.error("Error loading stats:", err)),
          loadRecentActivity().catch((err) => console.error("Error loading recent activity:", err)),
        ]).finally(() => {
          setLoading(false);
        });
      } catch (error) {
        console.error("Error during admin auth check:", error);
        toast({
          title: "Connection Error",
          description: "Failed to verify admin access. Please try again.",
          variant: "destructive",
        });
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
      activePassResult,
      questionsResult,
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
      (supabase.from("questions") as any).select("id", { count: "exact", head: true }).not("year", "is", null),
      (supabase.from("mock_tests") as any).select("id", { count: "exact", head: true }),
      (supabase.from("exams") as any).select("id", { count: "exact", head: true }),
      (supabase.from("mock_tests") as any).select("id", { count: "exact", head: true }).eq("is_published", true),
      (supabase.from("mock_tests") as any).select("id", { count: "exact", head: true }).eq("is_published", false),
      (supabase.from("test_attempts") as any).select("id", { count: "exact", head: true }).gte("completed_at", today.toISOString()),
      (supabase.from("purchases") as any).select("user_id").eq("content_type", "subscription").eq("status", "completed").gte("created_at", yearAgo.toISOString()),
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
    const { data: attempts, error } = await supabase
      .from("test_attempts")
      .select("id, user_id, test_id, score, total_marks, percentage, passed, completed_at")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(10);

    if (!error && attempts && attempts.length > 0) {
      const userIds = [...new Set(attempts.map((a) => a.user_id))];
      const testIds = [...new Set(attempts.map((a) => a.test_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const { data: tests } = await supabase
        .from("mock_tests")
        .select("id, title")
        .in("id", testIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      const testMap = new Map(tests?.map((t) => [t.id, t.title]) || []);

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

    const { data: attempts, error } = await supabase
      .from("test_attempts")
      .select("id, user_id, test_id, score, total_marks, percentage, passed, completed_at")
      .gte("completed_at", startOfDay.toISOString())
      .lte("completed_at", endOfDay.toISOString())
      .order("completed_at", { ascending: false });

    if (!error && attempts && attempts.length > 0) {
      const userIds = [...new Set(attempts.map((a) => a.user_id))];
      const testIds = [...new Set(attempts.map((a) => a.test_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, whatsapp_number")
        .in("id", userIds);

      const { data: tests } = await supabase
        .from("mock_tests")
        .select("id, title")
        .in("id", testIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, { name: p.full_name, whatsapp: p.whatsapp_number }]) || []);
      const testMap = new Map(tests?.map((t) => [t.id, t.title]) || []);

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

  useEffect(() => {
    if (authChecked) {
      loadTodayActivity(selectedDate);
    }
  }, [selectedDate, authChecked]);

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

  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    if (!clean) return null;
    const number = clean.length === 10 ? `91${clean}` : clean;
    return `https://wa.me/${number}`;
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md p-1 border border-slate-200 overflow-hidden">
            <img src="/logo-circle.png" alt="Practice Koro" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const roleLabel = adminRole === "super_admin" ? "Super Admin" : "Master Admin";

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents.toLocaleString(),
      subLabel: `${stats.activePassStudents} Pro Pass Active`,
      icon: Users,
      trend: "Registered",
      color: "blue",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200/80",
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-500/25",
      path: "/admin/students",
    },
    {
      label: "Question Bank",
      value: stats.totalQuestions.toLocaleString(),
      subLabel: `${stats.pyqQuestions} PYQ Papers Included`,
      icon: FileQuestion,
      trend: "Curated MCQs",
      color: "indigo",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-500/25",
      path: "/admin/questions",
    },
    {
      label: "Mock Tests & Exams",
      value: stats.totalTests.toLocaleString(),
      subLabel: `${stats.totalExams} Target Exams Active`,
      icon: BarChart3,
      trend: `${stats.publishedTests} Live / ${stats.draftTests} Draft`,
      color: "amber",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/80",
      iconBg: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/25",
      path: "/admin/tests",
    },
    {
      label: "Tests Taken Today",
      value: stats.testsToday.toLocaleString(),
      subLabel: "Live evaluations logged",
      icon: Activity,
      trend: "Real-time Live",
      color: "emerald",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/25",
      isLive: true,
      path: "/admin/dashboard",
    },
    {
      label: "30-Day Revenue",
      value: `₹${Math.round(stats.revenue30d).toLocaleString("en-IN")}`,
      subLabel: `${stats.premiumSubscribers} Active Subscriptions`,
      icon: TrendingUp,
      trend: "Completed Orders",
      color: "slate",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
      iconBg: "bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-slate-900/25",
      path: "/admin/students",
    },
  ];

  const attentionItems = [
    stats.pendingApprovals > 0 && {
      label: `${stats.pendingApprovals} student${stats.pendingApprovals === 1 ? "" : "s"} waiting for enrollment approval`,
      href: "/admin/students",
      icon: Clock,
      badgeText: "High Priority",
      badgeColor: "bg-rose-100 text-rose-700",
    },
    stats.draftTests > 0 && {
      label: `${stats.draftTests} mock test${stats.draftTests === 1 ? "" : "s"} currently saved in draft mode`,
      href: "/admin/tests",
      icon: TestTube2,
      badgeText: "Drafts",
      badgeColor: "bg-amber-100 text-amber-800",
    },
    stats.unreadChats > 0 && {
      label: `${stats.unreadChats} unread student support message${stats.unreadChats === 1 ? "" : "s"}`,
      href: "/admin/chat",
      icon: MessageCircle,
      badgeText: "Support",
      badgeColor: "bg-blue-100 text-blue-700",
    },
  ].filter(Boolean) as { label: string; href: string; icon: typeof Clock; badgeText: string; badgeColor: string }[];

  const quickLaunchers = [
    { name: "Question Bank", path: "/admin/questions", icon: FileQuestion, color: "text-blue-600 bg-blue-50 border-blue-100", count: stats.totalQuestions },
    { name: "AI Question Generator", path: "/admin/ai-generator", icon: Sparkles, color: "text-purple-600 bg-purple-50 border-purple-100", badge: "AI" },
    { name: "Mock Test Engine", path: "/admin/tests", icon: TestTube2, color: "text-amber-600 bg-amber-50 border-amber-100", count: stats.totalTests },
    { name: "Bulk MCQ Importer", path: "/admin/bulk-upload", icon: Plus, color: "text-emerald-600 bg-emerald-50 border-emerald-100", badge: "Fast" },
    { name: "Current Affairs CMS", path: "/admin/current-affairs", icon: Globe, color: "text-teal-600 bg-teal-50 border-teal-100", badge: "New" },
    { name: "Study Notes & PDF", path: "/admin/notes", icon: NotebookPen, color: "text-sky-600 bg-sky-50 border-sky-100" },
    { name: "Blog Posts & News", path: "/admin/blogs", icon: Newspaper, color: "text-rose-600 bg-rose-50 border-rose-100" },
    { name: "Curriculum Subjects", path: "/admin/question-subjects", icon: FolderOpen, color: "text-indigo-600 bg-indigo-50 border-indigo-100", count: stats.totalExams },
  ];

  return (
    <AdminLayout
      title="Platform Command Center"
      subtitle="Complete management of test series, questions, syllabus, students, and finances"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportStudents}
            disabled={exporting === "students"}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
            {exporting === "students" ? "Exporting..." : "Students CSV"}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/student/dashboard")}
            variant="outline"
            className="rounded-xl border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100/70 text-xs font-bold h-8"
          >
            <Eye className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Student View
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Executive Hero Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071E42] via-[#0B2E63] to-[#124B9E] p-5 sm:p-7 md:p-8 text-white shadow-xl border border-blue-900/40"
        >
          {/* Subtle Ambient Lighting */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -mb-20" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white p-1 shadow-md shrink-0 border border-white/20 overflow-hidden flex items-center justify-center">
                <img src="/logo-circle.png" alt="Practice Koro" className="w-full h-full object-contain rounded-lg sm:rounded-xl" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white font-display">
                    Practice<span className="text-[#FBBF24]">Koro</span> Admin Studio
                  </h1>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-[#FDE047] border border-amber-400/30">
                    {roleLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Operational
                  </span>
                </div>
                <p className="text-slate-200 text-xs sm:text-sm font-medium max-w-xl leading-relaxed">
                  Real-time exam engine operations, Previous Year Question vaults, mock test publishing, and student enrollment verification.
                </p>
              </div>
            </div>

            {/* Quick CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
              <Button
                onClick={() => navigate("/admin/add-question")}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md shadow-blue-900/30 gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </Button>
              <Button
                onClick={() => navigate("/admin/tests")}
                className="bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-bold text-xs h-9 px-3.5 rounded-xl shadow-md shadow-amber-900/20 gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Mock Test</span>
              </Button>
              <Button
                onClick={() => navigate("/admin/bulk-upload")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-9 px-3 rounded-xl backdrop-blur-sm"
              >
                Bulk MCQ
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Top 5 KPI Metric Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              onClick={() => navigate(stat.path)}
              className="cursor-pointer"
            >
              <Card className="border border-slate-200/90 bg-white hover:border-blue-400/80 hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden shadow-2xs group">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{stat.label}</p>
                      <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">{stat.value}</p>
                      <p className="text-[11px] text-slate-600 font-medium truncate">{stat.subLabel}</p>
                    </div>
                    <div className={`w-11 h-11 rounded-2xl ${stat.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metrics</span>
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.badgeColor}`}>
                      {stat.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1 inline-block" />}
                      {stat.trend}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Question Bank & PYQ Repository Overview */}
        <Card className="border border-slate-200/90 bg-white rounded-2xl shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-blue-600" />
                  Question Bank & PYQ Repository
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-yield practice questions organized for comprehensive competitive exam prep
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/admin/questions")}
                className="self-start sm:self-auto rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 h-8"
              >
                Browse Bank &rarr;
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-2 text-sm text-slate-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Total Questions: <strong className="text-slate-900 font-black">{stats.totalQuestions}</strong>
                </span>
                <span className="flex items-center gap-2 text-sm text-slate-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  Previous Years Questions: <strong className="text-slate-900 font-black">{stats.pyqQuestions}</strong>
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                <Calendar className="w-3 h-3 text-purple-600" />
                PYQ Share: {stats.totalQuestions > 0 ? Math.round((stats.pyqQuestions / stats.totalQuestions) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Two Columns: Needs Attention & Revenue Snapshot */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Needs Attention Card */}
          <Card className="border border-slate-200/90 bg-white rounded-2xl shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Action Queue & Alerts
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {attentionItems.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {attentionItems.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">All Queues Clear!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No pending student approvals or draft mock tests.</p>
                </div>
              ) : (
                attentionItems.map((item) => (
                  <button
                    key={item.href + item.label}
                    onClick={() => navigate(item.href)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-amber-300 hover:bg-amber-50/40 text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <item.icon className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.label}</p>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}>
                      {item.badgeText}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 ml-1 shrink-0" />
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Premium & Revenue Card */}
          <Card className="border border-slate-200/90 bg-white rounded-2xl shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-violet-600" />
                  Revenue & Subscription Breakdown
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold bg-violet-50 text-violet-700 border-violet-200">
                  Last 30 Days
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-100">
                  <span className="text-[11px] text-violet-800 font-semibold block">Active Pro Pass</span>
                  <span className="font-black text-violet-900 text-xl font-display">{stats.premiumSubscribers}</span>
                  <span className="text-[10px] text-violet-600 block mt-0.5">Students enrolled</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-[11px] text-emerald-800 font-semibold block">Completed Payments</span>
                  <span className="font-black text-emerald-900 text-xl font-display">₹{Math.round(stats.revenue30d)}</span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Verified gateway sync</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Revenue reflects completed student subscriptions. Manual scholarship and admin approvals count towards Pro Pass users.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Module Launchers Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Administrative Quick Launcher
            </h3>
            <span className="text-xs text-slate-400 font-medium">8 Core Modules</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {quickLaunchers.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.path}
                  onClick={() => navigate(tool.path)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-xs text-left transition-all group"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${tool.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">{tool.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {tool.badge && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {tool.badge}
                        </span>
                      )}
                      {tool.count !== undefined && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {tool.count} items
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Student Submissions Activity Monitor */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="border border-slate-200/90 bg-white rounded-3xl overflow-hidden shadow-2xs">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100 px-5 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-slate-900 font-display">
                    Daily Student Submissions
                  </CardTitle>
                  <p className="text-xs text-slate-500 font-medium">Live evaluations logged for the chosen day</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Date shortcuts */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className={`rounded-xl text-xs h-8 ${
                    selectedDate === new Date().toISOString().split("T")[0] ? "bg-blue-50 border-blue-200 text-blue-700 font-bold" : "text-slate-600"
                  }`}
                >
                  Today
                </Button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-slate-800 h-8"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDailyActivity}
                  disabled={todayActivity.length === 0}
                  className="rounded-xl h-8 text-xs font-semibold border-slate-200"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  CSV
                </Button>
                <Badge className="bg-blue-600 text-white border-0 rounded-full px-2.5 py-1 text-xs font-bold shadow-xs whitespace-nowrap">
                  {todayActivity.length} Submissions
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {todayActivity.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <p className="text-slate-700 font-bold text-sm">No tests submitted on this date</p>
                  <p className="text-slate-400 text-xs mt-1">Select another date above or check back after students complete tests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-slate-200">
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Test Name</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Score</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {todayActivity.map((activity) => {
                          const waLink = getWhatsAppLink(activity.whatsapp_number);
                          return (
                            <tr key={activity.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    {activity.student_name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{activity.student_name}</p>
                                    {activity.whatsapp_number && (
                                      <p className="text-xs text-slate-500 font-medium">{activity.whatsapp_number}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <p className="text-sm text-slate-700 font-medium truncate max-w-[260px]">{activity.test_title}</p>
                              </td>
                              <td className="py-3">
                                <p className="text-xs text-slate-500">
                                  {new Date(activity.completed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </td>
                              <td className="py-3 text-center">
                                <span className="font-extrabold text-slate-900 text-sm">{activity.score}/{activity.total_marks}</span>
                                <span className="text-[11px] text-slate-500 ml-1">({activity.percentage}%)</span>
                              </td>
                              <td className="py-3 text-center">
                                <Badge
                                  className={`text-[10px] px-2.5 py-0.5 border font-bold rounded-full ${
                                    activity.passed
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}
                                >
                                  {activity.passed ? "PASSED" : "FAILED"}
                                </Badge>
                              </td>
                              <td className="py-3 text-right">
                                {waLink ? (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                    WhatsApp
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden space-y-2.5">
                    {todayActivity.map((activity) => {
                      const waLink = getWhatsAppLink(activity.whatsapp_number);
                      return (
                        <div key={activity.id} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {activity.student_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{activity.student_name}</p>
                                <p className="text-[11px] text-slate-500">{activity.whatsapp_number}</p>
                              </div>
                            </div>
                            <Badge
                              className={`text-[9px] px-2 py-0.5 border font-bold rounded-full ${
                                activity.passed
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {activity.passed ? "PASSED" : "FAILED"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-700 font-medium line-clamp-1">{activity.test_title}</p>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
                            <span className="text-[11px] text-slate-500">
                              {new Date(activity.completed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {activity.score}/{activity.total_marks} ({activity.percentage}%)
                            </span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                              >
                                <PhoneCall className="w-3 h-3" /> WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Two Columns: Recent Submissions Stream & Admin Audit Logs */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
          {/* Recent Activity Stream */}
          <Card className="border border-slate-200/90 bg-white rounded-3xl overflow-hidden shadow-2xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between bg-slate-50/70 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                    Recent Evaluation Stream
                  </CardTitle>
                  <p className="text-[11px] text-slate-500">Last 10 student evaluations across all test series</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportRecentAttempts}
                disabled={recentActivity.length === 0}
                className="h-8 px-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                CSV
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 font-medium text-xs">No recent evaluations found.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/20 transition-all"
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          activity.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {activity.passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 truncate text-xs">{activity.student_name}</p>
                          <Badge
                            className={`text-[9px] px-1.5 py-0 border font-bold rounded-md ${
                              activity.passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {activity.passed ? "PASS" : "FAIL"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{activity.test_title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-slate-900 text-sm">{activity.percentage}%</p>
                        <p className="text-[10px] text-slate-400">{formatTimeAgo(activity.completed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Admin Audit Logs */}
          <Card className="border border-slate-200/90 bg-white rounded-3xl overflow-hidden shadow-2xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between bg-slate-50/70 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-xs">
                  <ScrollText className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                    Admin Action Audit Trail
                  </CardTitle>
                  <p className="text-[11px] text-slate-500">Security & publishing log across administrative accounts</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                {auditLogs.length} logged
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {auditLogs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 font-medium text-xs">
                    No logged actions yet. Changes to tests, questions, or settings will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-200/70"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{log.action}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {log.table_name || "system"}
                          {log.record_id ? ` · ID: ${log.record_id.slice(0, 8)}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {log.created_at ? formatTimeAgo(log.created_at) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
