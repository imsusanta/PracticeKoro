import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, XCircle, Search, UserX, Key, UserCheck, Trash2, Clock, MoreVertical, Plus, Phone, Mail, User, Calendar, Shield, MessageSquare, Send, CreditCard, Edit, Sparkles, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import AdminLayout from "@/components/admin/AdminLayout";
import { StudentPerformanceSummary } from "@/components/admin/StudentPerformanceSummary";
import {
  aggregatePerformanceByUser,
  computeExpiresAt,
  emptyPerformance,
  hasActiveSubscription,
  type StudentPerformance,
} from "@/lib/studentManagement";

interface Student {
  id: string;
  email: string;
  full_name: string | null;
  whatsapp_number: string | null;
  avatar_url: string | null;
  age: number | null;
  created_at: string;
  is_active?: boolean | null;
  deactivation_reason?: string | null;
  deactivated_at?: string | null;
  approval_status?: {
    status: string;
    reviewed_at: string | null;
    expires_at: string | null;
    rejection_reason?: string | null;
    notes?: string | null;
  };
  purchases?: {
    id?: string;
    status: string;
    content_type?: string;
    created_at?: string;
  }[];
  performance?: StudentPerformance;
}

const StudentManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    whatsappNumber: "",
    password: "",
    fullName: ""
  });
  const [addingStudent, setAddingStudent] = useState(false);
  const [paymentReminderOpen, setPaymentReminderOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [editActiveTimeDialogOpen, setEditActiveTimeDialogOpen] = useState(false);
  const [editDuration, setEditDuration] = useState<string>("permanent");
  const [editCustomDate, setEditCustomDate] = useState<string>("");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approveTargetIds, setApproveTargetIds] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deactivationReason, setDeactivationReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [approving, setApproving] = useState(false);

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
      console.log("Loading students...");
      let { data: studentsData, error: studentError } = await supabase.from("profiles").select(`
        id, email, full_name, whatsapp_number, avatar_url, age, created_at,
        is_active, deactivation_reason, deactivated_at,
        user_roles(role),
        approval_status(status, reviewed_at, expires_at, rejection_reason, notes)
      `).order("created_at", { ascending: false });

      if (studentError) {
        const fallback = await supabase.from("profiles").select(`
          id, email, full_name, whatsapp_number, avatar_url, age, created_at,
          user_roles(role),
          approval_status(status, reviewed_at, expires_at)
        `).order("created_at", { ascending: false });
        studentsData = fallback.data;
        studentError = fallback.error;
      }

      if (studentError) {
        console.error("Error loading students profiles:", studentError);
        toast({ title: "Error", description: "Failed to load students: " + studentError.message, variant: "destructive" });
        return;
      }

      console.log("Students loaded:", studentsData?.length);

      // 2. Fetch completed purchases
      const { data: purchasesData, error: purchaseError } = await supabase
        .from("purchases")
        .select("user_id, status, content_type, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (purchaseError) {
        console.error("Error loading purchases:", purchaseError);
      }

      const { data: attemptsData, error: attemptsError } = await supabase
        .from("test_attempts")
        .select("user_id, percentage, passed, is_active");

      if (attemptsError) {
        console.error("Error loading test attempts:", attemptsError);
      }

      const performanceByUser = aggregatePerformanceByUser(attemptsData || []);

      const students = (studentsData || [])
        .filter((s: any) => {
          const role = Array.isArray(s.user_roles) ? s.user_roles[0]?.role : s.user_roles?.role;
          return role !== 'admin'; // Include everyone except admins
        })
        .map((s: any) => ({
          id: s.id,
          email: s.email,
          full_name: s.full_name,
          whatsapp_number: s.whatsapp_number,
          avatar_url: s.avatar_url,
          age: s.age,
          created_at: s.created_at,
          is_active: s.is_active,
          deactivation_reason: s.deactivation_reason,
          deactivated_at: s.deactivated_at,
          approval_status: Array.isArray(s.approval_status) ? s.approval_status[0] : s.approval_status,
          purchases: (purchasesData || []).filter(p => p.user_id === s.id),
          performance: performanceByUser[s.id] || emptyPerformance(),
        }));
      setStudents(students);
      setSelectedIds((prev) => {
        const validIds = new Set(students.map((student) => student.id));
        return new Set([...prev].filter((id) => validIds.has(id)));
      });
    } catch (err: any) {
      console.error("Critical error in loadStudents:", err);
      toast({ title: "Error", description: "Critical error loading students: " + err.message, variant: "destructive" });
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        // Extract WhatsApp number from pseudo-email if applicable
        const extractedWhatsApp = s.email?.includes("@whatsapp.practicekoro.local")
          ? s.email.split("@")[0]
          : null;

        return (
          (s.full_name?.toLowerCase() || "").includes(q) ||
          (s.whatsapp_number || "").includes(q) ||
          (extractedWhatsApp || "").includes(q) ||
          // Only search real emails, not pseudo-emails
          (!s.email?.includes("@whatsapp") && s.email?.toLowerCase().includes(q))
        );
      });
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(s => {
        const studentStatus = s.approval_status?.status || "pending";
        // If they have active subscription, they are treated as approved
        if (filterStatus === "approved" && hasActiveSubscription(s.purchases)) return true;
        return studentStatus === filterStatus;
      });
    }

    if (paymentFilter !== "all") {
      filtered = filtered.filter(s => {
        const isPremium = hasActiveSubscription(s.purchases);
        if (paymentFilter === "premium") return isPremium;
        return !isPremium;
      });
    }

    setFilteredStudents(filtered);
  };

  const activateProfiles = async (studentIds: string[]) => {
    const { error } = await supabase.from("profiles").update({
      is_active: true,
      deactivation_reason: null,
      deactivated_at: null,
      deactivated_by: null,
    }).in("id", studentIds);
    if (error) {
      console.warn("Profile activation fields not persisted:", error);
    }
  };

  const handleApprove = async (studentIds: string[], expiresAt?: string | null) => {
    if (studentIds.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setApproving(true);
    const payload = {
      status: "approved" as const,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      expires_at: expiresAt || null,
      rejection_reason: null,
    };
    let { error } = await supabase.from("approval_status").update(payload).in("user_id", studentIds);
    if (error) {
      const fallback = await supabase.from("approval_status").update({
        status: payload.status,
        reviewed_by: payload.reviewed_by,
        reviewed_at: payload.reviewed_at,
        expires_at: payload.expires_at,
      }).in("user_id", studentIds);
      error = fallback.error;
    }
    if (error) {
      setApproving(false);
      toast({ title: "Error", description: "Failed to approve student", variant: "destructive" });
      return;
    }
    await activateProfiles(studentIds);
    setApproving(false);
    toast({
      title: "Success",
      description: studentIds.length > 1 ? `${studentIds.length} students approved` : "Student approved",
    });
    setSelectedIds(new Set());
    await loadStudents();
  };

  const handleApproveWithDuration = async () => {
    const ids = approveTargetIds.length > 0 ? approveTargetIds : (selectedStudent ? [selectedStudent.id] : []);
    if (ids.length === 0) return;
    const expiresAt = computeExpiresAt(selectedDuration, customDate);
    await handleApprove(ids, expiresAt);
    setDurationDialogOpen(false);
    setApproveTargetIds([]);
  };

  const openApproveDialog = (studentIds: string[], student?: Student) => {
    const pendingIds = studentIds.filter((id) => {
      const match = students.find((item) => item.id === id);
      return (match?.approval_status?.status || "pending") === "pending";
    });
    if (pendingIds.length === 0) {
      toast({ title: "Nothing to approve", description: "Select at least one pending student", variant: "destructive" });
      return;
    }
    setApproveTargetIds(pendingIds);
    setSelectedStudent(student || null);
    setSelectedDuration("permanent");
    setCustomDate("");
    setDurationDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedStudent) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast({ title: "Reason required", description: "Please enter a rejection reason", variant: "destructive" });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setRejecting(true);
    let { error } = await supabase.from("approval_status").update({
      status: "rejected",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    }).eq("user_id", selectedStudent.id);
    if (error) {
      const fallback = await supabase.from("approval_status").update({
        status: "rejected",
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      }).eq("user_id", selectedStudent.id);
      error = fallback.error;
      if (!error) {
        console.warn("rejection_reason column unavailable; status updated without reason");
      }
    }
    setRejecting(false);
    if (error) {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student rejected" });
    setRejectDialogOpen(false);
    setRejectionReason("");
    await loadStudents();
  };

  const handleDeactivate = async () => {
    if (!selectedStudent) return;
    const reason = deactivationReason.trim();
    if (!reason) {
      toast({ title: "Reason required", description: "Please enter a deactivation reason", variant: "destructive" });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setDeactivating(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("approval_status").update({
      status: "deactivated",
      reviewed_by: session.user.id,
      reviewed_at: now,
    }).eq("user_id", selectedStudent.id);
    if (error) {
      setDeactivating(false);
      toast({ title: "Error", description: "Failed to deactivate", variant: "destructive" });
      return;
    }
    const { error: profileError } = await supabase.from("profiles").update({
      is_active: false,
      deactivation_reason: reason,
      deactivated_at: now,
      deactivated_by: session.user.id,
    }).eq("id", selectedStudent.id);
    setDeactivating(false);
    if (profileError) {
      console.warn("Profile deactivation fields not persisted:", profileError);
      toast({ title: "Partial success", description: "Student deactivated, but profile reason fields could not be saved. Apply the latest migration if this persists.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Student deactivated" });
    }
    setDeactivateDialogOpen(false);
    setDeactivationReason("");
    await loadStudents();
  };

  const handleManualUpgrade = async () => {
    if (!selectedStudent) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUpgrading(true);
    try {
      // Insert a completed purchase record for the student
      const { error } = await supabase.from("purchases").insert({
        user_id: selectedStudent.id,
        content_type: 'subscription',
        content_id: 'site_yearly_subscription',
        amount: 0,
        status: 'completed',
        razorpay_order_id: 'manual_upgrade_' + Date.now(),
        razorpay_payment_id: 'manual_upgrade_' + Date.now(),
        razorpay_signature: 'manual_upgrade'
      });

      if (error) throw error;

      // Auto-approve the student if they were pending/rejected
      await supabase.from("approval_status").update({
        status: "approved",
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString()
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
    let { error } = await supabase.from("approval_status").update({
      status: "approved",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      expires_at: null,
      rejection_reason: null,
    }).eq("user_id", studentId);
    if (error) {
      const fallback = await supabase.from("approval_status").update({
        status: "approved",
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
        expires_at: null,
      }).eq("user_id", studentId);
      error = fallback.error;
    }
    if (error) {
      toast({ title: "Error", description: "Failed to activate", variant: "destructive" });
      return;
    }
    await activateProfiles([studentId]);
    toast({ title: "Success", description: "Student activated" });
    await loadStudents();
  };

  const handlePaymentLock = async (studentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("approval_status").update({
      status: "payment_locked",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to lock student for payment", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student locked for payment" });
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

      // Call the edge function to properly delete the user (including auth)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-auth-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: selectedStudent.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      toast({ title: "Success", description: "Student deleted completely" });
      setDeleteDialogOpen(false);
      await loadStudents();
    } catch (error: any) {
      // Fallback: try manual deletion if edge function fails
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
        variant: "destructive"
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
      // Check for active profiles with this WhatsApp number
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

      // Clear any orphaned profiles with this WhatsApp number (profiles without user_roles)
      const { data: orphanedProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("whatsapp_number", newStudentData.whatsappNumber);

      if (orphanedProfiles && orphanedProfiles.length > 0) {
        // These are orphaned records - clear their WhatsApp numbers
        for (const orphan of orphanedProfiles) {
          await supabase.from("profiles").update({ whatsapp_number: null }).eq("id", orphan.id);
        }
      }

      const pseudoEmail = `${newStudentData.whatsappNumber}@whatsapp.practicekoro.local`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: newStudentData.password,
        options: { data: { full_name: newStudentData.fullName, whatsapp_number: newStudentData.whatsappNumber } }
      });
      if (authError) throw authError;
      toast({ title: "Success", description: "Student created successfully" });
      setAddStudentDialogOpen(false);
      setNewStudentData({ whatsappNumber: "", password: "", fullName: "" });
      setTimeout(() => loadStudents(), 1000);
    } catch (error: any) {
      // Handle duplicate key constraint error
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
        body: JSON.stringify({ userId: selectedStudent.id, newPassword })
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

    const message = paymentMessage || `Hi ${selectedStudent.full_name || 'there'}, this is a reminder regarding your payment for Practice Koro. Please complete your payment to continue accessing all features. Thank you!`;

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/91${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    toast({ title: "WhatsApp Opened", description: "Payment reminder message ready to send" });
    setPaymentReminderOpen(false);
    setPaymentMessage("");
  };

  const handleEditActiveTime = async () => {
    if (!selectedStudent) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const expiresAt = computeExpiresAt(editDuration, editCustomDate);

    const { error } = await supabase.from("approval_status").update({
      expires_at: expiresAt,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString()
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      case "deactivated": return "bg-gray-100 text-gray-600 border-gray-200";
      case "payment_locked": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const statusCounts = {
    all: students.length,
    pending: students.filter(s => s.approval_status?.status === "pending" && !hasActiveSubscription(s.purchases)).length,
    approved: students.filter(s => s.approval_status?.status === "approved" || hasActiveSubscription(s.purchases)).length,
    rejected: students.filter(s => s.approval_status?.status === "rejected").length,
    deactivated: students.filter(s => s.approval_status?.status === "deactivated").length,
    payment_locked: students.filter(s => s.approval_status?.status === "payment_locked").length,
    premium: students.filter(s => hasActiveSubscription(s.purchases)).length,
  };

  const pendingFilteredStudents = useMemo(
    () => filteredStudents.filter((student) => (student.approval_status?.status || "pending") === "pending"),
    [filteredStudents],
  );
  const allPendingSelected = pendingFilteredStudents.length > 0 && pendingFilteredStudents.every((student) => selectedIds.has(student.id));
  const somePendingSelected = pendingFilteredStudents.some((student) => selectedIds.has(student.id));

  const toggleStudentSelected = (studentId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  };

  const toggleSelectAllPending = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pendingFilteredStudents.forEach((student) => {
        if (checked) next.add(student.id);
        else next.delete(student.id);
      });
      return next;
    });
  };

  const AddButton = (
    <Button size="icon" onClick={() => setAddStudentDialogOpen(true)} className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 border border-white/20">
      <Plus className="w-5 h-5" />
    </Button>
  );

  if (loading) {
    return (
      <AdminLayout title="Student Management" subtitle="Manage student accounts">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-600 text-sm">Loading students...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Student Management" subtitle={`${students.length} students`} headerActions={AddButton}>
      <div className="space-y-6">
        {/* Filter Tabs - Colored Card Style */}
        <div className="flex overflow-x-auto gap-3 pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-6 md:gap-4 no-scrollbar">
          {[
            { key: "all", label: "All", count: statusCounts.all, bgColor: "bg-emerald-50", textColor: "text-emerald-600", borderColor: "border-emerald-400", ringColor: "ring-emerald-400" },
            { key: "premium", label: "Premium", count: statusCounts.premium, bgColor: "bg-amber-50", textColor: "text-amber-600", borderColor: "border-amber-400", ringColor: "ring-amber-400" },
            { key: "pending", label: "Pending", count: statusCounts.pending, bgColor: "bg-amber-50", textColor: "text-amber-600", borderColor: "border-amber-300", ringColor: "ring-amber-300" },
            { key: "approved", label: "Approved", count: statusCounts.approved, bgColor: "bg-green-50", textColor: "text-green-600", borderColor: "border-green-300", ringColor: "ring-green-300" },
            { key: "rejected", label: "Rejected", count: statusCounts.rejected, bgColor: "bg-red-50", textColor: "text-red-500", borderColor: "border-red-300", ringColor: "ring-red-300" },
            { key: "deactivated", label: "Inactive", count: statusCounts.deactivated, bgColor: "bg-gray-50", textColor: "text-gray-500", borderColor: "border-gray-300", ringColor: "ring-gray-300" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === 'premium') {
                  setPaymentFilter(item.key);
                  setFilterStatus("all");
                } else {
                  setFilterStatus(item.key);
                  setPaymentFilter("all");
                }
              }}
              className={`flex flex-col items-center justify-center min-w-[100px] md:min-w-0 py-4 px-5 rounded-2xl transition-all duration-200 shrink-0 ${item.bgColor} border-2 ${(item.key === 'premium' ? paymentFilter === item.key : filterStatus === item.key)
                ? `${item.borderColor}`
                : "border-transparent hover:border-gray-200"
                }`}
            >
              <span className={`text-2xl md:text-3xl font-bold ${item.textColor}`}>{item.count}</span>
              <span className={`text-xs font-medium ${item.textColor} mt-1`}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Payment Filter */}
        <div className="flex flex-col md:flex-row gap-4 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl bg-white border-gray-200 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit shrink-0">
            <button
              onClick={() => setPaymentFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${paymentFilter === 'all' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All Types
            </button>
            <button
              onClick={() => setPaymentFilter("premium")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${paymentFilter === 'premium' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Premium
            </button>
            <button
              onClick={() => setPaymentFilter("free")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${paymentFilter === 'free' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Free
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">{selectedIds.size} student{selectedIds.size === 1 ? "" : "s"} selected</p>
              <p className="text-xs text-emerald-700">Bulk approve applies only to pending accounts</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl h-10" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
              <Button
                className="rounded-xl h-10 bg-gradient-to-r from-emerald-500 to-teal-600"
                onClick={() => openApproveDialog([...selectedIds])}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve selected
              </Button>
            </div>
          </div>
        )}

        {/* Students List - Row Based */}
        {filteredStudents.length === 0 ? (
          <Card className="border-0 bg-white rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
              <p className="text-gray-500 text-sm">{searchQuery || filterStatus !== "all" ? "Try different filters" : "No students registered yet"}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 bg-white rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[40px_2fr_1.4fr_1fr_1.2fr_0.9fr_80px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide items-center">
              <span className="flex justify-center">
                <Checkbox
                  checked={allPendingSelected ? true : somePendingSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => toggleSelectAllPending(checked === true)}
                  disabled={pendingFilteredStudents.length === 0}
                  aria-label="Select all pending students"
                  className="border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
              </span>
              <span>Student</span>
              <span>Contact</span>
              <span>Status</span>
              <span>Performance</span>
              <span>Joined</span>
              <span className="text-center">Actions</span>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredStudents.map((student) => {
                const status = student.approval_status?.status || "pending";

                return (
                  <div key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Desktop Row */}
                    <div className="hidden md:grid md:grid-cols-[40px_2fr_1.4fr_1fr_1.2fr_0.9fr_80px] gap-4 px-4 py-3 items-center">
                      <div className="flex justify-center">
                        {status === "pending" ? (
                          <Checkbox
                            checked={selectedIds.has(student.id)}
                            onCheckedChange={(checked) => toggleStudentSelected(student.id, checked === true)}
                            aria-label={`Select ${student.full_name || "student"}`}
                            className="border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                        ) : (
                          <span className="w-4 h-4" />
                        )}
                      </div>
                      {/* Student Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${!student.avatar_url ? (status === "approved" ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                          status === "pending" ? "bg-gradient-to-br from-amber-500 to-orange-500" :
                            "bg-gradient-to-br from-gray-400 to-gray-500") : ""
                          }`}>
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-semibold text-sm">{student.full_name?.[0]?.toUpperCase() || "?"}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{student.full_name || "No Name"}</p>
                          {student.age && <p className="text-xs text-gray-500">{student.age} years old</p>}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="min-w-0">
                        {(() => {
                          // Get WhatsApp number - from field or extract from pseudo-email
                          const displayWhatsApp = student.whatsapp_number ||
                            (student.email?.includes("@whatsapp.practicekoro.local")
                              ? student.email.split("@")[0]
                              : null);

                          return displayWhatsApp ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{displayWhatsApp}</span>
                            </div>
                          ) : null;
                        })()}
                        {!student.email?.includes("@whatsapp") && student.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5 truncate">
                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{student.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const activeSub = student.purchases?.find(p => {
                              if (p.content_type !== 'subscription') return false;
                              const expiryDate = new Date(p.created_at || "");
                              expiryDate.setDate(expiryDate.getDate() + 365);
                              return new Date() < expiryDate;
                            });
                            const currentStatus = activeSub ? "approved" : (student.approval_status?.status || "pending");
                            return (
                              <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 w-fit ${getStatusColor(currentStatus)}`}>
                                {currentStatus.toUpperCase()}
                              </Badge>
                            );
                          })()}
                          {(() => {
                            const activeSub = student.purchases?.find(p => {
                              if (p.content_type !== 'subscription') return false;
                              const expiryDate = new Date(p.created_at || "");
                              expiryDate.setDate(expiryDate.getDate() + 365);
                              return new Date() < expiryDate;
                            });
                            if (activeSub) {
                              return <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 border-0 hover:bg-amber-600">PREMIUM</Badge>;
                            }
                            return <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px] px-2 py-0.5">FREE</Badge>;
                          })()}
                        </div>
                        {status === "approved" && student.approval_status?.expires_at && (
                          <span className="text-[10px] text-amber-600 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(student.approval_status.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Performance */}
                      <StudentPerformanceSummary stats={student.performance} compact />

                      {/* Joined Date */}
                      <div className="text-sm text-gray-600">
                        {new Date(student.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl min-w-[180px]">
                            <DropdownMenuItem onClick={() => { setSelectedStudent(student); setDetailsOpen(true); }} className="gap-2">
                              <User className="w-4 h-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => openApproveDialog([student.id], student)} className="gap-2 text-emerald-600">
                                  <CheckCircle className="w-4 h-4" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setRejectionReason(""); setRejectDialogOpen(true); }} className="gap-2 text-red-600">
                                  <XCircle className="w-4 h-4" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {status === "approved" && (
                              <>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedStudent(student);
                                  // Pre-fill with current expiry if exists
                                  if (student.approval_status?.expires_at) {
                                    setEditDuration("custom");
                                    setEditCustomDate(student.approval_status.expires_at.split("T")[0]);
                                  } else {
                                    setEditDuration("permanent");
                                    setEditCustomDate("");
                                  }
                                  setEditActiveTimeDialogOpen(true);
                                }} className="gap-2 text-indigo-600">
                                  <Edit className="w-4 h-4" /> Edit Active Time
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setPasswordResetOpen(true); }} className="gap-2">
                                  <Key className="w-4 h-4" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setPaymentMessage(""); setPaymentReminderOpen(true); }} className="gap-2 text-blue-600">
                                  <MessageSquare className="w-4 h-4" /> Payment Reminder
                                </DropdownMenuItem>
                                {(!student.purchases?.some(p => {
                                  if (p.content_type !== 'subscription') return false;
                                  const expiryDate = new Date(p.created_at || "");
                                  expiryDate.setDate(expiryDate.getDate() + 365);
                                  return new Date() < expiryDate;
                                })) && (
                                    <DropdownMenuItem onClick={() => { setSelectedStudent(student); setUpgradeDialogOpen(true); }} className="gap-2 text-amber-600">
                                      <Sparkles className="w-4 h-4" /> Upgrade to Premium
                                    </DropdownMenuItem>
                                  )}
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setDeactivationReason(""); setDeactivateDialogOpen(true); }} className="gap-2 text-orange-600">
                                  <UserX className="w-4 h-4" /> Deactivate
                                </DropdownMenuItem>
                              </>
                            )}
                            {(status === "rejected" || status === "deactivated" || status === "payment_locked") && (
                              <>
                                <DropdownMenuItem onClick={() => handleActivate(student.id)} className="gap-2 text-emerald-600">
                                  <UserCheck className="w-4 h-4" /> Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setPaymentMessage(""); setPaymentReminderOpen(true); }} className="gap-2 text-blue-600">
                                  <MessageSquare className="w-4 h-4" /> Payment Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setDeleteDialogOpen(true); }} className="gap-2 text-red-600">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            {status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setPaymentMessage(""); setPaymentReminderOpen(true); }} className="gap-2 text-blue-600">
                                  <MessageSquare className="w-4 h-4" /> Payment Reminder
                                </DropdownMenuItem>
                                {(!student.purchases?.some(p => {
                                  if (p.content_type !== 'subscription') return false;
                                  const expiryDate = new Date(p.created_at || "");
                                  expiryDate.setDate(expiryDate.getDate() + 365);
                                  return new Date() < expiryDate;
                                })) && (
                                    <DropdownMenuItem onClick={() => { setSelectedStudent(student); setUpgradeDialogOpen(true); }} className="gap-2 text-amber-600">
                                      <Sparkles className="w-4 h-4" /> Upgrade to Premium
                                    </DropdownMenuItem>
                                  )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Mobile Row */}
                    <div className="md:hidden p-3">
                      <div className="flex items-center gap-3">
                        {status === "pending" && (
                          <Checkbox
                            checked={selectedIds.has(student.id)}
                            onCheckedChange={(checked) => toggleStudentSelected(student.id, checked === true)}
                            aria-label={`Select ${student.full_name || "student"}`}
                            className="border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0"
                          />
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${!student.avatar_url ? (status === "approved" ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                          status === "pending" ? "bg-gradient-to-br from-amber-500 to-orange-500" :
                            "bg-gradient-to-br from-gray-400 to-gray-500") : ""
                          }`}>
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-semibold text-sm">{student.full_name?.[0]?.toUpperCase() || "?"}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate text-sm">{student.full_name || "No Name"}</p>
                            {(() => {
                              const activeSub = student.purchases?.find(p => {
                                if (p.content_type !== 'subscription') return false;
                                const expiryDate = new Date(p.created_at || "");
                                expiryDate.setDate(expiryDate.getDate() + 365);
                                return new Date() < expiryDate;
                              });
                              const currentStatus = activeSub ? "approved" : (student.approval_status?.status || "pending");
                              return (
                                <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 shrink-0 ${getStatusColor(currentStatus)}`}>
                                  {currentStatus.toUpperCase()}
                                </Badge>
                              );
                            })()}
                            {(() => {
                              const activeSub = student.purchases?.find(p => {
                                if (p.content_type !== 'subscription') return false;
                                const expiryDate = new Date(p.created_at || "");
                                expiryDate.setDate(expiryDate.getDate() + 365);
                                return new Date() < expiryDate;
                              });
                              if (activeSub) {
                                return <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 border-0">PREMIUM</Badge>;
                              }
                              return <Badge variant="outline" className="text-gray-400 border-gray-200 text-[9px] px-1.5 py-0">FREE</Badge>;
                            })()}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            {(() => {
                              const displayWhatsApp = student.whatsapp_number ||
                                (student.email?.includes("@whatsapp.practicekoro.local")
                                  ? student.email.split("@")[0]
                                  : null);
                              return displayWhatsApp ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {displayWhatsApp}
                                </span>
                              ) : null;
                            })()}
                            {student.age && <span>• {student.age}y</span>}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50 shrink-0">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl min-w-[180px]">
                            <DropdownMenuItem onClick={() => { setSelectedStudent(student); setDetailsOpen(true); }} className="gap-2">
                              <User className="w-4 h-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => openApproveDialog([student.id], student)} className="gap-2 text-emerald-600">
                                  <CheckCircle className="w-4 h-4" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setRejectionReason(""); setRejectDialogOpen(true); }} className="gap-2 text-red-600">
                                  <XCircle className="w-4 h-4" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {status === "approved" && (
                              <>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedStudent(student);
                                  // Pre-fill with current expiry if exists
                                  if (student.approval_status?.expires_at) {
                                    setEditDuration("custom");
                                    setEditCustomDate(student.approval_status.expires_at.split("T")[0]);
                                  } else {
                                    setEditDuration("permanent");
                                    setEditCustomDate("");
                                  }
                                  setEditActiveTimeDialogOpen(true);
                                }} className="gap-2 text-indigo-600">
                                  <Edit className="w-4 h-4" /> Edit Active Time
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setPasswordResetOpen(true); }} className="gap-2">
                                  <Key className="w-4 h-4" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setPaymentMessage(""); setPaymentReminderOpen(true); }} className="gap-2 text-blue-600">
                                  <MessageSquare className="w-4 h-4" /> Payment Reminder
                                </DropdownMenuItem>
                                {(!student.purchases?.some(p => {
                                  if (p.content_type !== 'subscription') return false;
                                  const expiryDate = new Date(p.created_at || "");
                                  expiryDate.setDate(expiryDate.getDate() + 365);
                                  return new Date() < expiryDate;
                                })) && (
                                    <DropdownMenuItem onClick={() => { setSelectedStudent(student); setUpgradeDialogOpen(true); }} className="gap-2 text-amber-600">
                                      <Sparkles className="w-4 h-4" /> Upgrade to Premium
                                    </DropdownMenuItem>
                                  )}
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setDeactivationReason(""); setDeactivateDialogOpen(true); }} className="gap-2 text-orange-600">
                                  <UserX className="w-4 h-4" /> Deactivate
                                </DropdownMenuItem>
                              </>
                            )}
                            {(status === "rejected" || status === "deactivated" || status === "payment_locked") && (
                              <>
                                <DropdownMenuItem onClick={() => handleActivate(student.id)} className="gap-2 text-emerald-600">
                                  <UserCheck className="w-4 h-4" /> Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setPaymentMessage(""); setPaymentReminderOpen(true); }} className="gap-2 text-blue-600">
                                  <MessageSquare className="w-4 h-4" /> Payment Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setDeleteDialogOpen(true); }} className="gap-2 text-red-600">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            {status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setPaymentMessage(""); setPaymentReminderOpen(true); }} className="gap-2 text-blue-600">
                                  <MessageSquare className="w-4 h-4" /> Payment Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePaymentLock(student.id)} className="gap-2 text-rose-600">
                                  <CreditCard className="w-4 h-4" /> Lock for Payment
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-2 ml-[52px] flex items-center gap-2 text-[11px] text-gray-500">
                        <BarChart3 className="w-3 h-3 text-gray-400" />
                        <StudentPerformanceSummary stats={student.performance} compact />
                      </div>

                      {/* Expiry Warning for Mobile */}
                      {status === "approved" && student.approval_status?.expires_at && (
                        <div className="mt-2 ml-13">
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                            <Clock className="w-2.5 h-2.5" />
                            Expires: {new Date(student.approval_status.expires_at).toLocaleDateString()}
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

      {/* View Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden ${!selectedStudent.avatar_url ? "bg-gradient-to-br from-emerald-500 to-teal-600" : ""}`}>
                  {selectedStudent.avatar_url ? (
                    <img src={selectedStudent.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-2xl">{selectedStudent.full_name?.[0]?.toUpperCase() || "?"}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedStudent.full_name || "No Name"}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(selectedStudent.approval_status?.status)}>
                      {selectedStudent.approval_status?.status || "pending"}
                    </Badge>
                    {(() => {
                      const activeSub = selectedStudent.purchases?.find(p => {
                        if (p.content_type !== 'subscription') return false;
                        const expiryDate = new Date(p.created_at || "");
                        expiryDate.setDate(expiryDate.getDate() + 365);
                        return new Date() < expiryDate;
                      });
                      if (activeSub) {
                        return <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 border-0">PREMIUM</Badge>;
                      }
                      return <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px] px-2 py-0.5">FREE</Badge>;
                    })()}
                  </div>
                </div>
              </div>
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                {(() => {
                  const displayWhatsApp = selectedStudent.whatsapp_number ||
                    (selectedStudent.email?.includes("@whatsapp.practicekoro.local")
                      ? selectedStudent.email.split("@")[0]
                      : null);
                  return displayWhatsApp ? (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{displayWhatsApp}</span>
                    </div>
                  ) : null;
                })()}
                {!selectedStudent.email?.includes("@whatsapp") && selectedStudent.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{selectedStudent.email}</span>
                  </div>
                )}
                {selectedStudent.age && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{selectedStudent.age} years old</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Joined {new Date(selectedStudent.created_at).toLocaleDateString()}</span>
                </div>
                {hasActiveSubscription(selectedStudent.purchases) && (() => {
                  const activeSub = selectedStudent.purchases?.find(p => {
                    if (p.content_type !== 'subscription') return false;
                    const expiryDate = new Date(p.created_at || "");
                    expiryDate.setDate(expiryDate.getDate() + 365);
                    return new Date() < expiryDate;
                  });
                  if (!activeSub) return null;
                  const expiryDate = new Date(activeSub.created_at || "");
                  expiryDate.setDate(expiryDate.getDate() + 365);
                  return (
                    <div className="flex items-center gap-3 text-amber-600 font-medium">
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span>Premium Valid Till: {expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  );
                })()}
              </div>
              {(selectedStudent.approval_status?.rejection_reason || selectedStudent.deactivation_reason) && (
                <div className="space-y-2">
                  {selectedStudent.approval_status?.rejection_reason && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Rejection reason</p>
                      <p className="text-sm text-red-800">{selectedStudent.approval_status.rejection_reason}</p>
                    </div>
                  )}
                  {selectedStudent.deactivation_reason && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Deactivation reason</p>
                      <p className="text-sm text-orange-800">{selectedStudent.deactivation_reason}</p>
                      {selectedStudent.deactivated_at && (
                        <p className="text-[11px] text-orange-600 mt-1">
                          {new Date(selectedStudent.deactivated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="pt-2 border-t">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Performance</h4>
                <StudentPerformanceSummary stats={selectedStudent.performance} />
              </div>
              <div className="pt-2 border-t mt-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Subscription History</h4>
                {selectedStudent.purchases && selectedStudent.purchases.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {selectedStudent.purchases.map((purchase: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-900 capitalize">{purchase.content_type}</p>
                          <p className="text-[10px] text-slate-500">{new Date(purchase.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[9px] px-2 py-0">
                          {purchase.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-400 font-medium">No purchase history found</p>
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

      {/* Approve Duration Dialog */}
      <Dialog open={durationDialogOpen} onOpenChange={setDurationDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{approveTargetIds.length > 1 ? `Approve ${approveTargetIds.length} Students` : "Approve Student"}</DialogTitle>
            <DialogDescription>
              {approveTargetIds.length > 1
                ? `Set the same access duration for ${approveTargetIds.length} pending students. This cannot be undone from this dialog.`
                : `Set access duration for ${selectedStudent?.full_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { value: "permanent", label: "Permanent (No expiry)" },
              { value: "30days", label: "30 Days" },
              { value: "60days", label: "60 Days" },
              { value: "90days", label: "90 Days" },
              { value: "custom", label: "Custom Date" },
            ].map((opt) => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedDuration === opt.value ? "bg-emerald-100 ring-2 ring-emerald-500" : "bg-gray-50 hover:bg-gray-100"
                }`}>
                <input type="radio" name="duration" value={opt.value} checked={selectedDuration === opt.value} onChange={(e) => setSelectedDuration(e.target.value)} className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
            {selectedDuration === "custom" && (
              <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="ml-7 rounded-xl" />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDurationDialogOpen(false)} className="rounded-xl" disabled={approving}>Cancel</Button>
            <Button onClick={handleApproveWithDuration} disabled={approving || (selectedDuration === "custom" && !customDate)} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
              <CheckCircle className="w-4 h-4 mr-2" /> {approving ? "Approving..." : approveTargetIds.length > 1 ? `Approve ${approveTargetIds.length}` : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { setRejectDialogOpen(open); if (!open) setRejectionReason(""); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600">Reject Student</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting <strong>{selectedStudent?.full_name || "this student"}</strong>. They will see this if they contact support.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rejection-reason">Rejection reason</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete registration details, duplicate account..."
              className="rounded-xl min-h-[110px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="rounded-xl" disabled={rejecting}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting || !rejectionReason.trim()} className="rounded-xl">
              <XCircle className="w-4 h-4 mr-2" /> {rejecting ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateDialogOpen} onOpenChange={(open) => { setDeactivateDialogOpen(open); if (!open) setDeactivationReason(""); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-orange-600">Deactivate Student</DialogTitle>
            <DialogDescription>
              Deactivating <strong>{selectedStudent?.full_name || "this student"}</strong> will block login. A reason is required and stored on their profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="deactivation-reason">Deactivation reason</Label>
            <Textarea
              id="deactivation-reason"
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              placeholder="e.g. Payment overdue, policy violation..."
              className="rounded-xl min-h-[110px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)} className="rounded-xl" disabled={deactivating}>Cancel</Button>
            <Button onClick={handleDeactivate} disabled={deactivating || !deactivationReason.trim()} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
              <UserX className="w-4 h-4 mr-2" /> {deactivating ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Student</DialogTitle>
            <DialogDescription>This will permanently delete {selectedStudent?.full_name}. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={passwordResetOpen} onOpenChange={setPasswordResetOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set new password for {selectedStudent?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="h-12 rounded-xl mt-1" />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="h-12 rounded-xl mt-1" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPasswordResetOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handlePasswordReset} disabled={resettingPassword || !newPassword || !confirmPassword} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
              <Key className="w-4 h-4 mr-2" /> {resettingPassword ? "Resetting..." : "Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Create a new student account manually</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Student's name"
                className="h-12 rounded-xl"
                value={newStudentData.fullName}
                onChange={(e) => setNewStudentData({ ...newStudentData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                placeholder="10-digit number"
                className="h-12 rounded-xl"
                maxLength={10}
                value={newStudentData.whatsappNumber}
                onChange={(e) => setNewStudentData({ ...newStudentData, whatsappNumber: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                className="h-12 rounded-xl"
                value={newStudentData.password}
                onChange={(e) => setNewStudentData({ ...newStudentData, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddStudentDialogOpen(false)} className="rounded-xl h-12 flex-1 sm:flex-none">Cancel</Button>
            <Button
              onClick={handleAddStudent}
              disabled={addingStudent}
              className="rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-teal-600 flex-1 sm:flex-none"
            >
              {addingStudent ? "Creating..." : "Create Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Reminder Dialog */}
      <Dialog open={paymentReminderOpen} onOpenChange={setPaymentReminderOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Send Payment Reminder
            </DialogTitle>
            <DialogDescription>
              Send a WhatsApp payment reminder to <strong>{selectedStudent?.full_name || "this student"}</strong>
              {selectedStudent?.whatsapp_number && (
                <span className="block text-sm mt-1">
                  WhatsApp: <strong>+91 {selectedStudent.whatsapp_number}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Message (Optional - leave empty for default)</Label>
              <Textarea
                value={paymentMessage}
                onChange={(e) => setPaymentMessage(e.target.value)}
                placeholder={`Hi ${selectedStudent?.full_name || 'there'}, this is a reminder regarding your payment for Practice Koro. Please complete your payment to continue accessing all features. Thank you!`}
                className="rounded-xl mt-2 min-h-[120px]"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-2">
                Customize the message or leave empty to use the default reminder text
              </p>
            </div>
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
              <Send className="w-4 h-4 mr-2" />
              Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Active Time Dialog */}
      <Dialog open={editActiveTimeDialogOpen} onOpenChange={setEditActiveTimeDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-500" />
              Edit Active Time
            </DialogTitle>
            <DialogDescription>Change access duration for {selectedStudent?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {selectedStudent?.approval_status?.expires_at && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Current expiry: <strong>{new Date(selectedStudent.approval_status.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                </p>
              </div>
            )}
            {!selectedStudent?.approval_status?.expires_at && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Current: <strong>Permanent (No expiry)</strong>
                </p>
              </div>
            )}
            {[
              { value: "permanent", label: "Permanent (No expiry)" },
              { value: "30days", label: "30 Days from today" },
              { value: "60days", label: "60 Days from today" },
              { value: "90days", label: "90 Days from today" },
              { value: "custom", label: "Custom Date" },
            ].map((opt) => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${editDuration === opt.value ? "bg-indigo-100 ring-2 ring-indigo-500" : "bg-gray-50 hover:bg-gray-100"
                }`}>
                <input type="radio" name="editDuration" value={opt.value} checked={editDuration === opt.value} onChange={(e) => setEditDuration(e.target.value)} className="w-4 h-4 text-indigo-600" />
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
            {editDuration === "custom" && (
              <Input type="date" value={editCustomDate} onChange={(e) => setEditCustomDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="ml-7 rounded-xl" />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditActiveTimeDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEditActiveTime} disabled={editDuration === "custom" && !editCustomDate} className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600">
              <Edit className="w-4 h-4 mr-2" /> Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Manual Premium Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Manual Premium Upgrade
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to upgrade <strong>{selectedStudent?.full_name}</strong> to PREMIUM?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-2">
              <p className="font-bold flex items-center gap-2">
                <Shield className="w-4 h-4" /> What happens next?
              </p>
              <ul className="list-disc list-inside space-y-1 opacity-90">
                <li>A permanent subscription record will be created</li>
                <li>Student will gain instant access to all premium content</li>
                <li>Status will be automatically set to "APPROVED"</li>
              </ul>
            </div>
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
              {upgrading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Upgrading...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Confirm Upgrade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout >
  );
};

export default StudentManagement;