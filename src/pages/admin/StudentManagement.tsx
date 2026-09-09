import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, CheckCircle, XCircle, Search, UserX, Key, UserCheck, Trash2, Clock, 
  MoreVertical, Plus, Phone, Mail, User, Calendar, Shield, MessageSquare, 
  Send, CreditCard, Edit, Sparkles, DollarSign, Copy, Check, FileText, 
  ExternalLink, ArrowUpRight, CheckCheck, AlertCircle 
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";

interface Student {
  id: string;
  email: string;
  full_name: string | null;
  whatsapp_number: string | null;
  avatar_url: string | null;
  age: number | null;
  created_at: string;
  approval_status?: {
    status: string;
    reviewed_at: string | null;
    expires_at: string | null;
  };
  purchases?: {
    id?: string;
    status: string;
    content_type?: string;
    created_at?: string;
  }[];
}

interface TransactionRecord {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  student?: {
    full_name: string | null;
    whatsapp_number: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

const StudentManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"students" | "transactions">("students");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);

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
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["admin", "super_admin"]).maybeSingle();
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
      console.log("Loading students & transactions...");
      const { data: studentsData, error: studentError } = await supabase.from("profiles").select(`
        id, email, full_name, whatsapp_number, avatar_url, age, created_at,
        user_roles(role),
        approval_status(status, reviewed_at, expires_at)
      `).order("created_at", { ascending: false });

      if (studentError) {
        console.error("Error loading students profiles:", studentError);
        toast({ title: "Error", description: "Failed to load students: " + studentError.message, variant: "destructive" });
        return;
      }

      // 2. Fetch all purchases (completed, pending, failed) for transactions tracking
      const { data: purchasesData, error: purchaseError } = await supabase
        .from("purchases")
        .select("id, user_id, content_type, content_id, razorpay_order_id, razorpay_payment_id, amount, status, created_at")
        .order("created_at", { ascending: false });

      if (purchaseError) {
        console.error("Error loading purchases:", purchaseError);
      }

      // Build student profile lookup map
      const studentMap = new Map((studentsData || []).map((s: any) => [s.id, {
        full_name: s.full_name,
        whatsapp_number: s.whatsapp_number,
        email: s.email,
        avatar_url: s.avatar_url,
      }]));

      // Build mapped transactions
      const mappedTransactions: TransactionRecord[] = (purchasesData || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        content_type: p.content_type,
        content_id: p.content_id,
        razorpay_order_id: p.razorpay_order_id,
        razorpay_payment_id: p.razorpay_payment_id,
        amount: Number(p.amount) || 0,
        status: p.status || 'pending',
        created_at: p.created_at,
        student: studentMap.get(p.user_id)
      }));
      setTransactions(mappedTransactions);

      const students = (studentsData || [])
        .filter((s: any) => {
          const role = Array.isArray(s.user_roles) ? s.user_roles[0]?.role : s.user_roles?.role;
          return role !== 'admin' && role !== 'super_admin'; // Include everyone except admins
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
          purchases: (purchasesData || []).filter((p: any) => p.user_id === s.id && p.status === 'completed')
        }));
      setStudents(students);
    } catch (err: any) {
      console.error("Critical error in loadStudents:", err);
      toast({ title: "Error", description: "Critical error loading data: " + err.message, variant: "destructive" });
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    // Helper to check for active subscription
    const hasActiveSubscription = (s: any) => {
      return s.purchases?.some(p => {
        if (p.content_type !== 'subscription') return false;
        const expiryDate = new Date(p.created_at || "");
        expiryDate.setDate(expiryDate.getDate() + 365);
        return new Date() < expiryDate;
      });
    };

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
        if (filterStatus === "approved" && hasActiveSubscription(s)) return true;
        return studentStatus === filterStatus;
      });
    }

    if (paymentFilter !== "all") {
      filtered = filtered.filter(s => {
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
      expires_at: expiresAt || null
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to approve student", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student approved" });
    await loadStudents();
  };

  const handleApproveWithDuration = async () => {
    if (!selectedStudent) return;
    let expiresAt: string | undefined;
    if (selectedDuration === "30days") {
      const date = new Date(); date.setDate(date.getDate() + 30);
      expiresAt = date.toISOString();
    } else if (selectedDuration === "60days") {
      const date = new Date(); date.setDate(date.getDate() + 60);
      expiresAt = date.toISOString();
    } else if (selectedDuration === "90days") {
      const date = new Date(); date.setDate(date.getDate() + 90);
      expiresAt = date.toISOString();
    } else if (selectedDuration === "custom" && customDate) {
      expiresAt = new Date(customDate).toISOString();
    }
    await handleApprove(selectedStudent.id, expiresAt);
    setDurationDialogOpen(false);
  };

  const handleReject = async (studentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("approval_status").update({
      status: "rejected",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString()
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student rejected" });
    await loadStudents();
  };

  const handleDeactivate = async (studentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("approval_status").update({
      status: "deactivated",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString()
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to deactivate", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student deactivated" });
    await loadStudents();
  };

  const handlePaymentLock = async (studentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("approval_status").update({
      status: "payment_locked" as any,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString()
    }).eq("user_id", studentId);
    if (error) {
      toast({ title: "Error", description: "Failed to lock for payment", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Student locked for payment" });
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
    const { error } = await supabase.from("approval_status").update({
      status: "approved",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      expires_at: null
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

    let expiresAt: string | null = null;
    if (editDuration === "30days") {
      const date = new Date(); date.setDate(date.getDate() + 30);
      expiresAt = date.toISOString();
    } else if (editDuration === "60days") {
      const date = new Date(); date.setDate(date.getDate() + 60);
      expiresAt = date.toISOString();
    } else if (editDuration === "90days") {
      const date = new Date(); date.setDate(date.getDate() + 90);
      expiresAt = date.toISOString();
    } else if (editDuration === "custom" && editCustomDate) {
      expiresAt = new Date(editCustomDate).toISOString();
    }
    // permanent means null (no expiry)

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
    pending: students.filter(s => {
      const isPremium = s.purchases?.some(p => {
        if (p.content_type !== 'subscription') return false;
        const expiryDate = new Date(p.created_at || "");
        expiryDate.setDate(expiryDate.getDate() + 365);
        return new Date() < expiryDate;
      });
      return s.approval_status?.status === "pending" && !isPremium;
    }).length,
    approved: students.filter(s => {
      const isPremium = s.purchases?.some(p => {
        if (p.content_type !== 'subscription') return false;
        const expiryDate = new Date(p.created_at || "");
        expiryDate.setDate(expiryDate.getDate() + 365);
        return new Date() < expiryDate;
      });
      return s.approval_status?.status === "approved" || isPremium;
    }).length,
    rejected: students.filter(s => s.approval_status?.status === "rejected").length,
    deactivated: students.filter(s => s.approval_status?.status === "deactivated").length,
    payment_locked: students.filter(s => s.approval_status?.status === "payment_locked").length,
    premium: students.filter(s => s.purchases?.some(p => {
      if (p.content_type !== 'subscription') return false;
      const expiryDate = new Date(p.created_at || "");
      expiryDate.setDate(expiryDate.getDate() + 365);
      return new Date() < expiryDate;
    })).length,
  };

  const totalRevenue = transactions
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const failedCount = transactions.filter(t => t.status === 'failed').length;

  const filteredTransactions = transactions.filter(t => {
    if (transactionSearch) {
      const q = transactionSearch.toLowerCase();
      const studentName = t.student?.full_name?.toLowerCase() || "";
      const studentPhone = t.student?.whatsapp_number || "";
      const payId = t.razorpay_payment_id?.toLowerCase() || "";
      const orderId = t.razorpay_order_id?.toLowerCase() || "";
      const matches = studentName.includes(q) || studentPhone.includes(q) || payId.includes(q) || orderId.includes(q);
      if (!matches) return false;
    }
    if (transactionStatusFilter !== "all" && t.status !== transactionStatusFilter) {
      return false;
    }
    if (transactionTypeFilter !== "all" && t.content_type !== transactionTypeFilter) {
      return false;
    }
    return true;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPaymentId(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
    setTimeout(() => setCopiedPaymentId(null), 2000);
  };

  const HeaderActions = (
    <div className="flex items-center gap-2">
      {activeTab === "students" && (
        <Button 
          size="sm" 
          onClick={() => setAddStudentDialogOpen(true)} 
          className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 font-bold text-xs px-4 h-10"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Student
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <AdminLayout title="Student & Payments" subtitle="Manage student accounts and transactions">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-600 text-sm font-medium">Loading students & transactions...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Students & Payments" 
      subtitle={activeTab === "students" ? `${students.length} registered students` : `₹${totalRevenue.toLocaleString('en-IN')} total revenue (${transactions.length} orders)`} 
      headerActions={HeaderActions}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Modern Executive Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Student & Payments Hub</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {activeTab === "students" ? `${students.length} enrolled candidates across all batches` : `₹${totalRevenue.toLocaleString('en-IN')} gross revenue across ${transactions.length} orders`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {HeaderActions}
          </div>
        </div>

        {/* Navigation View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-fit">
            <button
              onClick={() => setActiveTab("students")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "students"
                  ? "bg-white text-blue-600 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Students Directory</span>
              <Badge variant="secondary" className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeTab === "students" ? "bg-blue-50 text-blue-700" : "bg-slate-200/70 text-slate-600"}`}>
                {students.length}
              </Badge>
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "transactions"
                  ? "bg-white text-blue-600 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Purchases & Transactions</span>
              <Badge variant="secondary" className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === "transactions" ? "bg-emerald-50 text-emerald-700 font-bold" : "bg-slate-200/70 text-slate-600"}`}>
                ₹{totalRevenue.toLocaleString('en-IN')}
              </Badge>
            </button>
          </div>
        </div>

        {/* STUDENTS VIEW */}
        {activeTab === "students" && (
          <div className="space-y-6">
            {/* Filter Tabs - Soft Gradient Student Dashboard Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: "all", label: "All Students", count: statusCounts.all, gradient: "from-blue-50/80 to-indigo-50/40", border: "border-blue-200/90", text: "text-blue-700", ring: "ring-2 ring-blue-500 shadow-sm", icon: Users },
                { key: "premium", label: "PRO PASS", count: statusCounts.premium, gradient: "from-amber-50/80 to-yellow-50/40", border: "border-amber-200/90", text: "text-amber-700", ring: "ring-2 ring-amber-500 shadow-sm", icon: Sparkles },
                { key: "pending", label: "Pending", count: statusCounts.pending, gradient: "from-orange-50/80 to-amber-50/40", border: "border-orange-200/90", text: "text-orange-700", ring: "ring-2 ring-orange-500 shadow-sm", icon: Clock },
                { key: "approved", label: "Approved", count: statusCounts.approved, gradient: "from-emerald-50/80 to-teal-50/40", border: "border-emerald-200/90", text: "text-emerald-700", ring: "ring-2 ring-emerald-500 shadow-sm", icon: CheckCircle },
                { key: "rejected", label: "Rejected", count: statusCounts.rejected, gradient: "from-rose-50/80 to-red-50/40", border: "border-rose-200/90", text: "text-rose-700", ring: "ring-2 ring-rose-500 shadow-sm", icon: XCircle },
                { key: "deactivated", label: "Inactive", count: statusCounts.deactivated, gradient: "from-slate-50 to-gray-100/60", border: "border-slate-200/90", text: "text-slate-700", ring: "ring-2 ring-slate-400 shadow-sm", icon: UserX },
              ].map((item) => {
                const isSelected = item.key === 'premium' ? paymentFilter === item.key : filterStatus === item.key;
                const IconComponent = item.icon;
                return (
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
                    className={`flex flex-col text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border bg-gradient-to-b ${item.gradient} ${item.border} transition-all duration-200 ${
                      isSelected ? `${item.ring} scale-[1.02]` : "hover:shadow-xs hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`w-8 h-8 rounded-xl bg-white/80 backdrop-blur-xs flex items-center justify-center ${item.text} shadow-2xs`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.text} border-current/20 bg-white/60`}>
                        {isSelected ? "Active" : "Filter"}
                      </Badge>
                    </div>
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{item.count}</span>
                    <span className="text-xs font-semibold text-slate-600 mt-0.5">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Payment Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search student by name, phone or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 rounded-2xl bg-white border-slate-200/90 text-sm shadow-2xs focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs w-fit shrink-0">
                <button
                  onClick={() => setPaymentFilter("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${paymentFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setPaymentFilter("premium")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${paymentFilter === 'premium' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  PRO Pass
                </button>
                <button
                  onClick={() => setPaymentFilter("free")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${paymentFilter === 'free' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Free Access
                </button>
              </div>
            </div>

            {/* Students List - Row Based */}
            {filteredStudents.length === 0 ? (
              <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs">
                <CardContent className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No Students Found</h3>
                  <p className="text-slate-500 text-xs">{searchQuery || filterStatus !== "all" ? "Try adjusting your search query or filter tags" : "No students registered yet in this category"}</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_80px] gap-4 px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Student Details</span>
                  <span>Contact Info</span>
                  <span>Approval & Pass</span>
                  <span>Enrollment Date</span>
                  <span className="text-center">Action</span>
                </div>

                <div className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const status = student.approval_status?.status || "pending";

                return (
                  <div key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Desktop Row */}
                    <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_80px] gap-4 px-4 py-3 items-center">
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
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setDurationDialogOpen(true); }} className="gap-2 text-emerald-600">
                                  <CheckCircle className="w-4 h-4" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(student.id)} className="gap-2 text-red-600">
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
                                <DropdownMenuItem onClick={() => handleDeactivate(student.id)} className="gap-2 text-orange-600">
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
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setDurationDialogOpen(true); }} className="gap-2 text-emerald-600">
                                  <CheckCircle className="w-4 h-4" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(student.id)} className="gap-2 text-red-600">
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
                                <DropdownMenuItem onClick={() => handleDeactivate(student.id)} className="gap-2 text-orange-600">
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
    )}

    {/* TRANSACTIONS VIEW */}
    {activeTab === "transactions" && (
      <div className="space-y-6">
        {/* Modern Soft Gradient KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-gradient-to-b from-amber-50/80 to-amber-100/30 border-amber-200/90 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/90 text-amber-600 flex items-center justify-center shadow-2xs shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Gross Revenue</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">₹{totalRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-gradient-to-b from-emerald-50/80 to-emerald-100/30 border-emerald-200/90 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/90 text-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Paid / Active Orders</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{completedCount}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-gradient-to-b from-blue-50/80 to-indigo-50/30 border-blue-200/90 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/90 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Pending Orders</p>
                <p className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-gradient-to-b from-rose-50/80 to-red-100/30 border-rose-200/90 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/90 text-rose-600 flex items-center justify-center shadow-2xs shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Failed / Unpaid</p>
                <p className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">{failedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search student, WhatsApp, Razorpay payment ID or order ID..."
              value={transactionSearch}
              onChange={(e) => setTransactionSearch(e.target.value)}
              className="pl-11 h-11 rounded-2xl bg-white border-slate-200/90 shadow-2xs focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0 overflow-x-auto">
            {[
              { key: "all", label: "All Status" },
              { key: "completed", label: "Completed" },
              { key: "pending", label: "Pending" },
              { key: "failed", label: "Failed" },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setTransactionStatusFilter(item.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  transactionStatusFilter === item.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0 overflow-x-auto">
            {[
              { key: "all", label: "All Items" },
              { key: "subscription", label: "PRO PASS" },
              { key: "test", label: "Mock Test" },
              { key: "note", label: "Notes" },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setTransactionTypeFilter(item.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  transactionTypeFilter === item.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs">
            <CardContent className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 text-blue-600">
                <CreditCard className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No Transactions Found</h3>
              <p className="text-slate-500 text-xs">
                {transactionSearch || transactionStatusFilter !== "all" || transactionTypeFilter !== "all"
                  ? "Try adjusting your search query or filter chips"
                  : "No payment transactions recorded in the system yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
            {/* Table Header for Desktop */}
            <div className="hidden lg:grid lg:grid-cols-[1.8fr_1.2fr_1fr_1.8fr_1fr_80px] gap-4 px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Student Details</span>
              <span>Purchased Item</span>
              <span>Amount Paid</span>
              <span>Payment / Order ID</span>
              <span>Date & Status</span>
              <span className="text-center">Action</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const student = tx.student;
                const phone = student?.whatsapp_number || (student?.email?.includes("@whatsapp") ? student.email.split("@")[0] : null);

                return (
                  <div key={tx.id} className="p-4 lg:p-0 hover:bg-blue-50/30 transition-colors">
                    {/* Desktop Row */}
                    <div className="hidden lg:grid lg:grid-cols-[1.8fr_1.2fr_1fr_1.8fr_1fr_80px] gap-4 px-5 py-3.5 items-center">
                      {/* Student Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          {student?.avatar_url ? (
                            <img src={student.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            student?.full_name?.[0]?.toUpperCase() || "?"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{student?.full_name || "Unknown Student"}</p>
                          {phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{phone}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Purchased Item */}
                      <div>
                        {tx.content_type === 'subscription' ? (
                          <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Sparkles className="w-3 h-3 mr-1" /> PRO PASS (Yearly)
                          </Badge>
                        ) : tx.content_type === 'test' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            <FileText className="w-3 h-3 mr-1" /> Mock Test
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            <FileText className="w-3 h-3 mr-1" /> Study Note
                          </Badge>
                        )}
                      </div>

                      {/* Amount */}
                      <div>
                        <span className="font-black text-slate-900 text-base">₹{tx.amount}</span>
                      </div>

                      {/* Razorpay IDs */}
                      <div className="space-y-1 min-w-0">
                        {tx.razorpay_payment_id ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[140px]" title={tx.razorpay_payment_id}>
                              {tx.razorpay_payment_id}
                            </span>
                            <button
                              onClick={() => copyToClipboard(tx.razorpay_payment_id!)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                              title="Copy Payment ID"
                            >
                              {copiedPaymentId === tx.razorpay_payment_id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Payment ID</span>
                        )}

                        {tx.razorpay_order_id && (
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]" title={tx.razorpay_order_id}>
                            Ord: {tx.razorpay_order_id}
                          </p>
                        )}
                      </div>

                      {/* Date & Status */}
                      <div className="space-y-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            tx.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : tx.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {tx.status}
                        </Badge>
                        <p className="text-[11px] text-slate-400">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Action */}
                      <div className="flex justify-center">
                        {phone && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              const msg = `Hi ${student?.full_name || 'there'}, regards from Practice Koro. Payment status for order #${tx.razorpay_order_id || tx.id.slice(0, 8)} of ₹${tx.amount}: ${tx.status.toUpperCase()}.`;
                              window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Contact on WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {student?.avatar_url ? (
                              <img src={student.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              student?.full_name?.[0]?.toUpperCase() || "?"
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{student?.full_name || "Unknown Student"}</p>
                            {phone && <p className="text-xs text-slate-500">{phone}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900 text-base">₹{tx.amount}</p>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 ${
                              tx.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {tx.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <div>
                          {tx.content_type === 'subscription' ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> PRO PASS
                            </span>
                          ) : (
                            <span className="capitalize font-medium">{tx.content_type}</span>
                          )}
                        </div>
                        <span>{new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>

                      {phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const msg = `Hi ${student?.full_name || 'there'}, regards from Practice Koro. Payment status for order #${tx.razorpay_order_id || tx.id.slice(0, 8)} of ₹${tx.amount}: ${tx.status.toUpperCase()}.`;
                            window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="w-full h-8 text-xs font-semibold text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Send WhatsApp Update
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    )}
  </div>

      {/* View Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
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
                {(() => {
                  const activeSub = selectedStudent.purchases?.find(p => {
                    if (p.content_type !== 'subscription') return false;
                    const expiryDate = new Date(p.created_at || "");
                    expiryDate.setDate(expiryDate.getDate() + 365);
                    return new Date() < expiryDate;
                  });
                  if (activeSub) {
                    const expiryDate = new Date(activeSub.created_at || "");
                    expiryDate.setDate(expiryDate.getDate() + 365);
                    return (
                      <div className="flex items-center gap-3 text-amber-600 font-medium">
                        <Shield className="w-4 h-4 text-amber-500" />
                        <span>Premium Valid Till: {expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
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
            <DialogTitle>Approve Student</DialogTitle>
            <DialogDescription>Set access duration for {selectedStudent?.full_name}</DialogDescription>
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
            <Button variant="outline" onClick={() => setDurationDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleApproveWithDuration} disabled={selectedDuration === "custom" && !customDate} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
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