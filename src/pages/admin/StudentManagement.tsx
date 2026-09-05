import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  CheckCircle,
  Search,
  Key,
  Trash2,
  Clock,
  Plus,
  Phone,
  Mail,
  User,
  Calendar,
  Shield,
  MessageSquare,
  Send,
  Edit,
  Sparkles,
  XCircle,
  UserX,
  AlertCircle,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin/AdminLayout";
import StudentRowActions, { type StudentRowAction } from "@/components/admin/StudentRowActions";
import { StudentAvatar, StudentExpiryHint, StudentPlanBadge, StudentStatusBadge } from "@/components/admin/StudentStatusBadges";
import {
  formatJoinedDate,
  getApprovalStatus,
  getDisplayEmail,
  getDisplayWhatsApp,
  getEffectiveStatus,
  getStatusBadgeClass,
  hasActiveSubscription,
  STATUS_LABELS,
  type Student,
} from "@/components/admin/studentManagementShared";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [
  { value: "permanent", label: "Permanent (no expiry)" },
  { value: "30days", label: "30 days" },
  { value: "60days", label: "60 days" },
  { value: "90days", label: "90 days" },
  { value: "custom", label: "Custom date" },
] as const;

const StudentManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>("permanent");
  const [customDate, setCustomDate] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    whatsappNumber: "",
    password: "",
    fullName: "",
  });
  const [addingStudent, setAddingStudent] = useState(false);
  const [paymentReminderOpen, setPaymentReminderOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [editActiveTimeDialogOpen, setEditActiveTimeDialogOpen] = useState(false);
  const [editDuration, setEditDuration] = useState<string>("permanent");
  const [editCustomDate, setEditCustomDate] = useState<string>("");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterStatus, paymentFilter, students]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      navigate("/admin/login");
      return;
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      setLoading(false);
      await supabase.auth.signOut();
      toast({ title: "Access Denied", description: "You do not have admin privileges", variant: "destructive" });
      navigate("/admin/login");
      return;
    }
    await loadStudents();
    setLoading(false);
  };

  const loadStudents = async () => {
    try {
      const { data: studentsData, error: studentError } = await supabase.from("profiles").select(`
        id, email, full_name, whatsapp_number, avatar_url, age, created_at,
        user_roles(role),
        approval_status(status, reviewed_at, expires_at)
      `).order("created_at", { ascending: false });

      if (studentError) {
        setLoadError(studentError.message);
        toast({ title: "Error", description: "Failed to load students: " + studentError.message, variant: "destructive" });
        return;
      }

      const { data: purchasesData, error: purchaseError } = await supabase
        .from("purchases")
        .select("user_id, status, content_type, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (purchaseError) {
        console.error("Error loading purchases:", purchaseError);
      }

      const nextStudents = (studentsData || [])
        .filter((s: any) => {
          const role = Array.isArray(s.user_roles) ? s.user_roles[0]?.role : s.user_roles?.role;
          return role !== "admin";
        })
        .map((s: any) => ({
          id: s.id,
          email: s.email,
          full_name: s.full_name,
          whatsapp_number: s.whatsapp_number,
          avatar_url: s.avatar_url,
          age: s.age,
          created_at: s.created_at,
          approval_status: Array.isArray(s.approval_status) ? s.approval_status[0] : s.approval_status,
          purchases: (purchasesData || []).filter((p) => p.user_id === s.id),
        }));
      setStudents(nextStudents);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || "Failed to load students");
      toast({ title: "Error", description: "Critical error loading students: " + err.message, variant: "destructive" });
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => {
        const extractedWhatsApp = s.email?.includes("@whatsapp.practicekoro.local")
          ? s.email.split("@")[0]
          : null;

        return (
          (s.full_name?.toLowerCase() || "").includes(q) ||
          (s.whatsapp_number || "").includes(q) ||
          (extractedWhatsApp || "").includes(q) ||
          (!s.email?.includes("@whatsapp") && s.email?.toLowerCase().includes(q))
        );
      });
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((s) => {
        const studentStatus = s.approval_status?.status || "pending";
        if (filterStatus === "approved" && hasActiveSubscription(s)) return true;
        return studentStatus === filterStatus;
      });
    }

    if (paymentFilter !== "all") {
      filtered = filtered.filter((s) => {
        const isPremium = hasActiveSubscription(s);
        if (paymentFilter === "premium") return isPremium;
        return !isPremium;
      });
    }

    setFilteredStudents(filtered);
  };

  const handleApprove = async (studentId: string, expiresAt?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("approval_status").update({
      status: "approved",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      expires_at: expiresAt || null,
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to approve student", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student approved" });
    await loadStudents();
  };

  const resolveDurationExpiry = (duration: string, custom: string) => {
    if (duration === "30days") {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString();
    }
    if (duration === "60days") {
      const date = new Date();
      date.setDate(date.getDate() + 60);
      return date.toISOString();
    }
    if (duration === "90days") {
      const date = new Date();
      date.setDate(date.getDate() + 90);
      return date.toISOString();
    }
    if (duration === "custom" && custom) {
      return new Date(custom).toISOString();
    }
    return undefined;
  };

  const handleApproveWithDuration = async () => {
    if (!selectedStudent) return;
    const expiresAt = resolveDurationExpiry(selectedDuration, customDate);
    await handleApprove(selectedStudent.id, expiresAt);
    setDurationDialogOpen(false);
  };

  const handleReject = async (studentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("approval_status").update({
      status: "rejected",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student rejected" });
    setRejectDialogOpen(false);
    await loadStudents();
  };

  const handleDeactivate = async (studentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("approval_status").update({
      status: "deactivated",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to deactivate", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student deactivated" });
    setDeactivateDialogOpen(false);
    await loadStudents();
  };

  const handleManualUpgrade = async () => {
    if (!selectedStudent) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUpgrading(true);
    try {
      const { error } = await supabase.from("purchases").insert({
        user_id: selectedStudent.id,
        content_type: "subscription",
        content_id: "site_yearly_subscription",
        amount: 0,
        status: "completed",
        razorpay_order_id: "manual_upgrade_" + Date.now(),
        razorpay_payment_id: "manual_upgrade_" + Date.now(),
        razorpay_signature: "manual_upgrade",
      });

      if (error) throw error;

      await supabase.from("approval_status").update({
        status: "approved",
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      }).eq("user_id", selectedStudent.id);

      toast({ title: "Success", description: `${selectedStudent.full_name} has been upgraded to PREMIUM.` });
      setUpgradeDialogOpen(false);
      await loadStudents();
    } catch (error: any) {
      console.error("Manual upgrade error:", error);
      toast({ title: "Error", description: error.message || "Failed to upgrade student", variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  };

  const handleActivate = async (studentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("approval_status").update({
      status: "approved",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      expires_at: null,
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to activate", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student activated" });
    await loadStudents();
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-auth-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: selectedStudent.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      toast({ title: "Success", description: "Student deleted completely" });
      setDeleteDialogOpen(false);
      await loadStudents();
    } catch (error: any) {
      console.error("Edge function failed, trying manual deletion:", error);

      if (selectedStudent.whatsapp_number) {
        await supabase.from("profiles").update({ whatsapp_number: null }).eq("id", selectedStudent.id);
      }

      await supabase.from("approval_status").delete().eq("user_id", selectedStudent.id);
      await supabase.from("user_roles").delete().eq("user_id", selectedStudent.id);
      await supabase.from("profiles").delete().eq("id", selectedStudent.id);

      toast({
        title: "Partial Delete",
        description: "Profile deleted. Delete auth user from Supabase Dashboard to free WhatsApp number.",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      await loadStudents();
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentData.whatsappNumber || !newStudentData.password || !newStudentData.fullName) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(newStudentData.whatsappNumber)) {
      toast({ title: "Error", description: "Enter valid 10-digit number", variant: "destructive" });
      return;
    }
    if (newStudentData.password.length < 6) {
      toast({ title: "Error", description: "Password min 6 characters", variant: "destructive" });
      return;
    }
    setAddingStudent(true);
    try {
      const { data: existingActive } = await supabase
        .from("profiles")
        .select("id, user_roles!inner(role)")
        .eq("whatsapp_number", newStudentData.whatsappNumber)
        .maybeSingle();

      if (existingActive) {
        toast({ title: "Error", description: "This WhatsApp number is already registered to an active account.", variant: "destructive" });
        setAddingStudent(false);
        return;
      }

      const { data: orphanedProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("whatsapp_number", newStudentData.whatsappNumber);

      if (orphanedProfiles && orphanedProfiles.length > 0) {
        for (const orphan of orphanedProfiles) {
          await supabase.from("profiles").update({ whatsapp_number: null }).eq("id", orphan.id);
        }
      }

      const pseudoEmail = `${newStudentData.whatsappNumber}@whatsapp.practicekoro.local`;
      const { error: authError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: newStudentData.password,
        options: { data: { full_name: newStudentData.fullName, whatsapp_number: newStudentData.whatsappNumber } },
      });
      if (authError) throw authError;
      toast({ title: "Success", description: "Student created successfully" });
      setAddStudentDialogOpen(false);
      setNewStudentData({ whatsappNumber: "", password: "", fullName: "" });
      setTimeout(() => loadStudents(), 1000);
    } catch (error: any) {
      if (error.message?.includes("duplicate key") || error.message?.includes("unique constraint") || error.message?.includes("already registered")) {
        toast({ title: "Error", description: "This WhatsApp number is already registered. The number may be linked to an existing auth account.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message || "Failed to create student", variant: "destructive" });
      }
    } finally {
      setAddingStudent(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedStudent) return;
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password min 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-student-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: selectedStudent.id, newPassword }),
      });
      if (!response.ok) throw new Error("Failed to reset password");
      toast({ title: "Success", description: "Password reset successfully" });
      setPasswordResetOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSendPaymentReminder = () => {
    if (!selectedStudent) return;

    const whatsappNumber = selectedStudent.whatsapp_number;
    if (!whatsappNumber) {
      toast({ title: "Error", description: "No WhatsApp number found for this student", variant: "destructive" });
      return;
    }

    const message = paymentMessage || `Hi ${selectedStudent.full_name || "there"}, this is a reminder regarding your payment for Practice Koro. Please complete your payment to continue accessing all features. Thank you!`;
    const whatsappUrl = `https://wa.me/91${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    toast({ title: "WhatsApp Opened", description: "Payment reminder message ready to send" });
    setPaymentReminderOpen(false);
    setPaymentMessage("");
  };

  const handleEditActiveTime = async () => {
    if (!selectedStudent) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const expiresAt = resolveDurationExpiry(editDuration, editCustomDate) ?? null;

    const { error } = await supabase.from("approval_status").update({
      expires_at: expiresAt,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("user_id", selectedStudent.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update active time", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Active time updated successfully" });
    setEditActiveTimeDialogOpen(false);
    setEditDuration("permanent");
    setEditCustomDate("");
    await loadStudents();
  };

  const openEditActiveTime = (student: Student) => {
    setSelectedStudent(student);
    if (student.approval_status?.expires_at) {
      setEditDuration("custom");
      setEditCustomDate(student.approval_status.expires_at.split("T")[0]);
    } else {
      setEditDuration("permanent");
      setEditCustomDate("");
    }
    setEditActiveTimeDialogOpen(true);
  };

  const handleRowAction = (action: StudentRowAction, student: Student) => {
    setSelectedStudent(student);
    switch (action) {
      case "view":
        setDetailsOpen(true);
        break;
      case "approve":
        setSelectedDuration("permanent");
        setCustomDate("");
        setDurationDialogOpen(true);
        break;
      case "reject":
        setRejectDialogOpen(true);
        break;
      case "editActiveTime":
        openEditActiveTime(student);
        break;
      case "resetPassword":
        setNewPassword("");
        setConfirmPassword("");
        setPasswordResetOpen(true);
        break;
      case "paymentReminder":
        setPaymentMessage("");
        setPaymentReminderOpen(true);
        break;
      case "upgrade":
        setUpgradeDialogOpen(true);
        break;
      case "deactivate":
        setDeactivateDialogOpen(true);
        break;
      case "activate":
        handleActivate(student.id);
        break;
      case "delete":
        setDeleteDialogOpen(true);
        break;
    }
  };

  const statusCounts = useMemo(() => ({
    all: students.length,
    pending: students.filter((s) => getApprovalStatus(s) === "pending" && !hasActiveSubscription(s)).length,
    approved: students.filter((s) => getApprovalStatus(s) === "approved" || hasActiveSubscription(s)).length,
    rejected: students.filter((s) => getApprovalStatus(s) === "rejected").length,
    deactivated: students.filter((s) => getApprovalStatus(s) === "deactivated").length,
    premium: students.filter((s) => hasActiveSubscription(s)).length,
  }), [students]);

  const filtersActive = Boolean(searchQuery || filterStatus !== "all" || paymentFilter !== "all");

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setPaymentFilter("all");
  };

  const selectStatFilter = (key: string) => {
    if (key === "premium") {
      setPaymentFilter((current) => (current === "premium" ? "all" : "premium"));
      return;
    }
    setFilterStatus(key);
  };

  const statCards = [
    { key: "all", label: "All students", count: statusCounts.all, valueClass: "text-gray-900", activeClass: "border-emerald-500 ring-2 ring-emerald-200" },
    { key: "pending", label: "Pending", count: statusCounts.pending, valueClass: "text-amber-600", activeClass: "border-amber-500 ring-2 ring-amber-200" },
    { key: "approved", label: "Approved", count: statusCounts.approved, valueClass: "text-emerald-600", activeClass: "border-emerald-500 ring-2 ring-emerald-200" },
    { key: "rejected", label: "Rejected", count: statusCounts.rejected, valueClass: "text-red-600", activeClass: "border-red-400 ring-2 ring-red-200" },
    { key: "deactivated", label: "Inactive", count: statusCounts.deactivated, valueClass: "text-slate-600", activeClass: "border-slate-400 ring-2 ring-slate-200" },
    { key: "premium", label: "Premium", count: statusCounts.premium, valueClass: "text-amber-600", activeClass: "border-amber-500 ring-2 ring-amber-200" },
  ];

  const AddButton = (
    <Button
      size="icon"
      onClick={() => setAddStudentDialogOpen(true)}
      className="size-10 rounded-xl border border-white/20 bg-gradient-to-r from-emerald-500 to-teal-600"
      aria-label="Add student"
    >
      <Plus className="size-5" />
    </Button>
  );

  const DurationPicker = ({
    name,
    value,
    onChange,
    customValue,
    onCustomChange,
    accent = "emerald",
  }: {
    name: string;
    value: string;
    onChange: (value: string) => void;
    customValue: string;
    onCustomChange: (value: string) => void;
    accent?: "emerald" | "indigo";
  }) => (
    <RadioGroup value={value} onValueChange={onChange} className="flex flex-col gap-2" aria-label={name}>
      {DURATION_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
            value === opt.value
              ? accent === "indigo"
                ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                : "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200"
              : "border-transparent bg-gray-50 hover:bg-gray-100",
          )}
        >
          <RadioGroupItem value={opt.value} />
          <span className="text-sm font-medium">{opt.label}</span>
        </label>
      ))}
      {value === "custom" && (
        <Input
          type="date"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="ml-7 rounded-xl"
        />
      )}
    </RadioGroup>
  );

  if (loading) {
    return (
      <AdminLayout title="Student Management" subtitle="Manage student accounts">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[88px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-12 rounded-xl" />
          <Card className="overflow-hidden rounded-2xl border-0 bg-white">
            <CardContent className="flex flex-col gap-4 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Student Management" subtitle={`${students.length} students`} headerActions={AddButton}>
      <div className="flex flex-col gap-5">
        {loadError && (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="size-4" />
            <AlertTitle>Couldn’t load students</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button
                variant="outline"
                size="sm"
                className="w-fit rounded-xl"
                onClick={async () => {
                  setLoading(true);
                  await loadStudents();
                  setLoading(false);
                }}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6">
          {statCards.map((item) => {
            const isActive = item.key === "premium" ? paymentFilter === "premium" : filterStatus === item.key;
            return (
              <button
                key={item.key}
                onClick={() => selectStatFilter(item.key)}
                className={cn(
                  "min-w-[120px] shrink-0 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all md:min-w-0",
                  isActive ? item.activeClass : "border-gray-100 hover:border-emerald-200",
                )}
              >
                <p className={cn("text-2xl font-bold", item.valueClass)}>{item.count}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{item.label}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-xl border-gray-200 bg-white pl-11 pr-10 shadow-sm focus-visible:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-12 w-full rounded-xl border-gray-200 bg-white shadow-sm lg:w-[170px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="deactivated">Inactive</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="flex w-fit shrink-0 rounded-xl bg-gray-100 p-1">
            {[
              { key: "all", label: "All plans" },
              { key: "premium", label: "Premium" },
              { key: "free", label: "Free" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setPaymentFilter(option.key)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  paymentFilter === option.key
                    ? option.key === "premium"
                      ? "bg-white text-amber-600 shadow-sm"
                      : "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-800">{filteredStudents.length}</span> of {students.length}
          </p>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-lg text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
              Clear filters
            </Button>
          )}
        </div>

        {filteredStudents.length === 0 ? (
          <Card className="rounded-2xl border-0 bg-white">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-100">
                <Users className="size-8 text-emerald-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {filtersActive ? "No matching students" : "No students yet"}
              </h3>
              <p className="mb-5 text-sm text-gray-500">
                {filtersActive
                  ? "Try a different name, status, or plan filter."
                  : "Create a student account to get started."}
              </p>
              {filtersActive ? (
                <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setAddStudentDialogOpen(true)} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
                  <Plus className="mr-2 size-4" />
                  Add student
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm">
            <div className="hidden gap-4 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid md:grid-cols-[2fr_1.5fr_1.1fr_1fr_72px]">
              <span>Student</span>
              <span>Contact</span>
              <span>Status</span>
              <span>Joined</span>
              <span className="text-center">Actions</span>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredStudents.map((student) => {
                const whatsapp = getDisplayWhatsApp(student);
                const email = getDisplayEmail(student);

                return (
                  <div key={student.id} className="transition-colors hover:bg-gray-50/70">
                    <div className="hidden items-center gap-4 px-4 py-3.5 md:grid md:grid-cols-[2fr_1.5fr_1.1fr_1fr_72px]">
                      <div className="flex min-w-0 items-center gap-3">
                        <StudentAvatar student={student} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{student.full_name || "No name"}</p>
                          {student.age ? <p className="text-xs text-gray-500">{student.age} years old</p> : null}
                        </div>
                      </div>

                      <div className="min-w-0">
                        {whatsapp && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Phone className="size-3.5 shrink-0 text-gray-400" />
                            <span className="truncate">{whatsapp}</span>
                          </div>
                        )}
                        {email && (
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="size-3 shrink-0 text-gray-400" />
                            <span className="truncate">{email}</span>
                          </div>
                        )}
                        {!whatsapp && !email && <span className="text-sm text-gray-400">No contact</span>}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StudentStatusBadge student={student} />
                          <StudentPlanBadge student={student} />
                        </div>
                        <StudentExpiryHint student={student} />
                      </div>

                      <div className="text-sm text-gray-600">{formatJoinedDate(student.created_at)}</div>

                      <div className="flex justify-center">
                        <StudentRowActions student={student} onAction={handleRowAction} />
                      </div>
                    </div>

                    <div className="p-3 md:hidden">
                      <div className="flex items-center gap-3">
                        <StudentAvatar student={student} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-gray-900">{student.full_name || "No name"}</p>
                            <StudentStatusBadge student={student} compact />
                            <StudentPlanBadge student={student} compact />
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {whatsapp && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="size-3" />
                                {whatsapp}
                              </span>
                            )}
                            {student.age ? <span>• {student.age}y</span> : null}
                            <span>• {formatJoinedDate(student.created_at)}</span>
                          </div>
                        </div>
                        <StudentRowActions student={student} onAction={handleRowAction} />
                      </div>
                      {getEffectiveStatus(student) === "approved" && student.approval_status?.expires_at && (
                        <div className="mt-2 pl-[52px]">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-600">
                            <Clock className="size-2.5" />
                            Expires {formatJoinedDate(student.approval_status.expires_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student details</DialogTitle>
            <DialogDescription>Account, access, and subscription information.</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <StudentAvatar student={selectedStudent} className="size-16 rounded-2xl" />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold">{selectedStudent.full_name || "No name"}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge className={getStatusBadgeClass(getEffectiveStatus(selectedStudent))}>
                      {STATUS_LABELS[getEffectiveStatus(selectedStudent)] || getEffectiveStatus(selectedStudent)}
                    </Badge>
                    <StudentPlanBadge student={selectedStudent} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4">
                {getDisplayWhatsApp(selectedStudent) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="size-4 text-gray-400" />
                    <span>{getDisplayWhatsApp(selectedStudent)}</span>
                  </div>
                )}
                {getDisplayEmail(selectedStudent) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="size-4 text-gray-400" />
                    <span className="truncate">{getDisplayEmail(selectedStudent)}</span>
                  </div>
                )}
                {selectedStudent.age && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="size-4 text-gray-400" />
                    <span>{selectedStudent.age} years old</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 text-gray-400" />
                  <span>Joined {formatJoinedDate(selectedStudent.created_at)}</span>
                </div>
                {hasActiveSubscription(selectedStudent) && (() => {
                  const activeSub = selectedStudent.purchases?.find((p) => {
                    if (p.content_type !== "subscription") return false;
                    const expiryDate = new Date(p.created_at || "");
                    expiryDate.setDate(expiryDate.getDate() + 365);
                    return new Date() < expiryDate;
                  });
                  if (!activeSub) return null;
                  const expiryDate = new Date(activeSub.created_at || "");
                  expiryDate.setDate(expiryDate.getDate() + 365);
                  return (
                    <div className="flex items-center gap-3 text-sm font-medium text-amber-600">
                      <Shield className="size-4 text-amber-500" />
                      <span>Premium valid till {expiryDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  );
                })()}
              </div>
              <div className="border-t pt-4">
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Subscription history</h4>
                {selectedStudent.purchases && selectedStudent.purchases.length > 0 ? (
                  <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-2">
                    {selectedStudent.purchases.map((purchase, idx) => (
                      <div key={purchase.id || idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div>
                          <p className="text-xs font-bold capitalize text-slate-900">{purchase.content_type}</p>
                          <p className="text-[10px] text-slate-500">
                            {purchase.created_at ? formatJoinedDate(purchase.created_at) : "—"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="border-0 bg-emerald-100 px-2 py-0 text-[10px] text-emerald-700 hover:bg-emerald-100">
                          {purchase.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-xs font-medium text-slate-400">No purchase history found</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)} className="rounded-xl font-bold">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={durationDialogOpen} onOpenChange={setDurationDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve student</DialogTitle>
            <DialogDescription>
              Grant access to {selectedStudent?.full_name || "this student"} and choose how long it should last.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <DurationPicker
              name="approval-duration"
              value={selectedDuration}
              onChange={setSelectedDuration}
              customValue={customDate}
              onCustomChange={setCustomDate}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDurationDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleApproveWithDuration}
              disabled={selectedDuration === "custom" && !customDate}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              <CheckCircle className="mr-2 size-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-5" />
              Reject student
            </DialogTitle>
            <DialogDescription>
              Reject the access request for {selectedStudent?.full_name || "this student"}? They will stay locked out until you approve or activate them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => selectedStudent && handleReject(selectedStudent.id)} className="rounded-xl">
              <XCircle className="mr-2 size-4" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <UserX className="size-5" />
              Deactivate student
            </DialogTitle>
            <DialogDescription>
              Deactivate {selectedStudent?.full_name || "this student"}? They will lose access until you activate the account again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={() => selectedStudent && handleDeactivate(selectedStudent.id)}
              className="rounded-xl bg-orange-500 text-white hover:bg-orange-600"
            >
              <UserX className="mr-2 size-4" /> Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete student</DialogTitle>
            <DialogDescription>
              This permanently deletes {selectedStudent?.full_name || "this student"} and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl">
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordResetOpen} onOpenChange={setPasswordResetOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {selectedStudent?.full_name || "this student"}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="h-12 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPasswordResetOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handlePasswordReset}
              disabled={resettingPassword || !newPassword || !confirmPassword}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              <Key className="mr-2 size-4" /> {resettingPassword ? "Resetting..." : "Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new student</DialogTitle>
            <DialogDescription>Create a student account with a WhatsApp number and password.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-name">Full name</Label>
              <Input
                id="student-name"
                placeholder="Student's name"
                className="h-12 rounded-xl"
                value={newStudentData.fullName}
                onChange={(e) => setNewStudentData({ ...newStudentData, fullName: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-whatsapp">WhatsApp number</Label>
              <Input
                id="student-whatsapp"
                placeholder="10-digit number"
                className="h-12 rounded-xl"
                maxLength={10}
                value={newStudentData.whatsappNumber}
                onChange={(e) => setNewStudentData({ ...newStudentData, whatsappNumber: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-password">Password</Label>
              <Input
                id="student-password"
                type="password"
                placeholder="Min 6 characters"
                className="h-12 rounded-xl"
                value={newStudentData.password}
                onChange={(e) => setNewStudentData({ ...newStudentData, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddStudentDialogOpen(false)} className="h-12 flex-1 rounded-xl sm:flex-none">Cancel</Button>
            <Button
              onClick={handleAddStudent}
              disabled={addingStudent}
              className="h-12 flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 sm:flex-none"
            >
              {addingStudent ? "Creating..." : "Create student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentReminderOpen} onOpenChange={setPaymentReminderOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-blue-500" />
              Send payment reminder
            </DialogTitle>
            <DialogDescription>
              Open WhatsApp with a reminder for {selectedStudent?.full_name || "this student"}
              {selectedStudent?.whatsapp_number && (
                <span className="mt-1 block text-sm">
                  WhatsApp: <strong>+91 {selectedStudent.whatsapp_number}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="payment-message">Message (optional)</Label>
            <Textarea
              id="payment-message"
              value={paymentMessage}
              onChange={(e) => setPaymentMessage(e.target.value)}
              placeholder={`Hi ${selectedStudent?.full_name || "there"}, this is a reminder regarding your payment for Practice Koro. Please complete your payment to continue accessing all features. Thank you!`}
              className="min-h-[120px] rounded-xl"
              rows={4}
            />
            <p className="text-xs text-gray-500">Leave empty to use the default reminder text.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentReminderOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSendPaymentReminder}
              disabled={!selectedStudent?.whatsapp_number}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Send className="mr-2 size-4" />
              Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editActiveTimeDialogOpen} onOpenChange={setEditActiveTimeDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-5 text-indigo-500" />
              Edit active time
            </DialogTitle>
            <DialogDescription>Change access duration for {selectedStudent?.full_name || "this student"}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {selectedStudent?.approval_status?.expires_at ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-center gap-2 text-sm text-amber-700">
                  <Clock className="size-4" />
                  Current expiry: <strong>{formatJoinedDate(selectedStudent.approval_status.expires_at)}</strong>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <Clock className="size-4" />
                  Current: <strong>Permanent (no expiry)</strong>
                </p>
              </div>
            )}
            <DurationPicker
              name="edit-duration"
              value={editDuration}
              onChange={setEditDuration}
              customValue={editCustomDate}
              onCustomChange={setEditCustomDate}
              accent="indigo"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditActiveTimeDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleEditActiveTime}
              disabled={editDuration === "custom" && !editCustomDate}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              <Edit className="mr-2 size-4" /> Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              Manual premium upgrade
            </DialogTitle>
            <DialogDescription>
              Upgrade {selectedStudent?.full_name || "this student"} to premium access?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="mb-2 flex items-center gap-2 font-bold">
              <Shield className="size-4" /> What happens next?
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 opacity-90">
              <li>A completed subscription record will be created</li>
              <li>The student will get instant access to premium content</li>
              <li>Status will be set to approved</li>
            </ul>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)} className="rounded-xl" disabled={upgrading}>
              Cancel
            </Button>
            <Button
              onClick={handleManualUpgrade}
              disabled={upgrading}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-100"
            >
              {upgrading ? "Upgrading..." : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Confirm upgrade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default StudentManagement;
