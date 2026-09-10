import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  TrendingUp,
  Phone,
  ChevronRight,
  BookOpen,
  LogOut,
  MessageSquare,
  CheckCircle,
  Clock,
  Camera,
  Sparkles,
  Mail,
  Crown,
  Bookmark,
  ShieldCheck,
  Award,
  Settings,
  HelpCircle,
  Receipt,
  BarChart2,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  ExternalLink,
  Target,
  RefreshCw,
  FileText,
  Lock,
  Copy,
  Calendar,
  Zap,
  CheckCheck
} from "lucide-react";
import StudentLayout from "@/components/student/StudentLayout";
import PullToRefresh from "@/components/student/PullToRefresh";
import { differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import StudentChat from "@/components/StudentChat";
import { getStudentUnreadCount } from "@/config/chat";
import { initRazorpayPayment } from "@/utils/payment";

interface ProfileStatistics {
  totalTests: number;
  passRate: number;
  passedCount: number;
  failedCount: number;
}

interface PurchaseItem {
  id: string;
  content_type: string;
  content_id: string;
  amount: number;
  status: string;
  razorpay_payment_id?: string | null;
  created_at: string;
}

const targetExamsList = [
  "WBP Constable / Lady Constable",
  "WB Police SI",
  "WB Food SI",
  "WB PSC Clerkship",
  "WB Primary TET",
  "WBCS (Exe)",
  "Railway RRB Group D / NTPC",
  "SSC GD / CGL / CHSL",
  "Other Competitive Exam"
];

const faqs = [
  {
    q: "How does the PracticeKoro Yearly VIP Subscription work?",
    a: "With a Yearly VIP Pass, you get unlimited access to all full-length mock tests, chapter-wise topic tests, solved question series, and high-yield PDF notes for 365 days with no hidden fees."
  },
  {
    q: "Can I retake tests to improve my score and ranking?",
    a: "Yes! You can re-attempt any test multiple times. We keep track of your highest score and historical test attempts in your Results tab."
  },
  {
    q: "What should I do if money was deducted but subscription is not unlocked?",
    a: "Payments are verified automatically via Razorpay webhook. If network issues occur, wait 2 minutes and refresh this page. You can also click 'Open Support Chat' or message us on WhatsApp with your payment ID."
  },
  {
    q: "Are the questions based on the latest exam syllabus?",
    a: "All mock tests and notes are curated by subject mentors based on the latest West Bengal and National government exam patterns, negative marking rules, and previous year trends."
  }
];

const StudentProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [statistics, setStatistics] = useState<ProfileStatistics>({
    totalTests: 0,
    passRate: 0,
    passedCount: 0,
    failedCount: 0
  });
  const [formData, setFormData] = useState({
    full_name: "",
    whatsapp_number: "",
    target_exam: "WBP Constable / Lady Constable"
  });
  const [accountDays, setAccountDays] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionFee, setSubscriptionFee] = useState<number>(499);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Active navigation tab inside Settings
  const [activeTab, setActiveTab] = useState<"personal" | "membership" | "billing" | "security" | "performance" | "support">("personal");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Expanded FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file (PNG, JPG, WebP)", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size must be less than 2MB", variant: "destructive" });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      toast({ title: "Photo Updated! 📸", description: "Your profile picture has been updated." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message || "Failed to upload image.", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const loadChatCount = useCallback(async (studentId: string) => {
    try {
      const count = await getStudentUnreadCount(studentId);
      setChatUnreadCount(count);
    } catch (_) {}
  }, []);

  const loadPurchases = useCallback(async (userId: string) => {
    setLoadingPurchases(true);
    try {
      const { data, error } = await supabase
        .from("purchases" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPurchases(data as any[]);
      }
    } catch (_) {}
    setLoadingPurchases(false);
  }, []);

  const loadStatistics = useCallback(async (userId: string) => {
    const { data: attempts } = await supabase
      .from("test_attempts")
      .select("id, passed, percentage, score")
      .eq("user_id", userId);

    if (attempts && attempts.length > 0) {
      const passed = attempts.filter((a) => a.passed).length;
      setStatistics({
        totalTests: attempts.length,
        passRate: Math.round((passed / attempts.length) * 100),
        passedCount: passed,
        failedCount: attempts.length - passed
      });
    }
  }, []);

  const checkAuthAndLoadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setUserEmail(session.user.email || null);

    const [profileResult, approvalResult, subscriptionResult, settingsResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("approval_status").select("status").eq("user_id", session.user.id).single(),
      supabase
        .from("purchases" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .eq("content_type", "subscription")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("site_settings").select("*")
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data);
      setFormData({
        full_name: profileResult.data.full_name || "",
        whatsapp_number: profileResult.data.whatsapp_number || "",
        target_exam: profileResult.data.target_exam || "WBP Constable / Lady Constable"
      });
      if (profileResult.data.created_at) {
        setAccountDays(differenceInDays(new Date(), new Date(profileResult.data.created_at)));
      }
    }

    setApprovalStatus(approvalResult.data?.status || "pending");

    // Check site settings for subscription fee
    if (settingsResult.data) {
      const feeSetting = (settingsResult.data as any[]).find((s) => s.key === "yearly_subscription_fee");
      if (feeSetting?.value) {
        setSubscriptionFee(parseFloat(feeSetting.value) || 499);
      }
    }

    const subscriptionData = (subscriptionResult as any).data;
    if (subscriptionData) {
      const createdAt = new Date(subscriptionData.created_at);
      const expiryDate = new Date(createdAt);
      expiryDate.setDate(expiryDate.getDate() + 365);

      if (new Date() < expiryDate) {
        setSubscription({
          ...subscriptionData,
          expiryDate: expiryDate
        });
      }
    }

    await Promise.all([
      loadStatistics(session.user.id),
      loadPurchases(session.user.id),
      loadChatCount(session.user.id)
    ]);

    setLoading(false);
  }, [navigate, loadStatistics, loadPurchases, loadChatCount]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const handleProPlanUpgrade = async () => {
    if (subscription) {
      toast({
        title: "VIP Plan Active! 👑",
        description: "You already have unlimited access to all mock tests & study notes."
      });
      return;
    }

    try {
      await initRazorpayPayment({
        amount: subscriptionFee,
        contentId: "site_yearly_subscription",
        contentType: "subscription",
        title: "PracticeKoro Yearly VIP Pass",
        description: "1-Year Unlimited Access to All Mock Tests & Notes"
      });
      toast({ title: "Success! 🎉", description: "VIP Subscription activated!" });
      await checkAuthAndLoadData();
    } catch (err: any) {
      if (err?.message && err.message !== "Payment cancelled") {
        toast({ title: "Payment Issue", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.clear();
    navigate("/login");
  };

  const handleUpdateProfile = async () => {
    if (formData.whatsapp_number && !/^\d{10}$/.test(formData.whatsapp_number)) {
      toast({ title: "Invalid Number", description: "Please enter a valid 10-digit WhatsApp number.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: formData.full_name,
      whatsapp_number: formData.whatsapp_number,
      target_exam: formData.target_exam,
    }).eq("id", profile.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved! ✅", description: "Profile information updated successfully." });
      setProfile({
        ...profile,
        full_name: formData.full_name,
        whatsapp_number: formData.whatsapp_number,
        target_exam: formData.target_exam
      });
    }
    setSaving(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Success! 🔒", description: "Your password has been changed successfully." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message || "Failed to update password.", variant: "destructive" });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!userEmail || userEmail.includes("@whatsapp.practicekoro.local")) {
      toast({
        title: "No Email Linked",
        description: "Your account is registered via WhatsApp number. Please use the password change form above.",
        variant: "destructive"
      });
      return;
    }

    setSendingResetEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      toast({
        title: "Email Sent! 📬",
        description: `A password reset link has been sent to ${userEmail}. Check your inbox.`
      });
    } catch (err: any) {
      toast({ title: "Request Failed", description: err.message, variant: "destructive" });
    } finally {
      setSendingResetEmail(false);
    }
  };

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "PK";

  const tabsConfig = [
    { id: "personal", label: "Profile Info", shortLabel: "Profile", icon: User },
    { id: "membership", label: "VIP Plan", shortLabel: "VIP Plan", icon: Crown, badge: subscription ? "ACTIVE" : "PRO" },
    { id: "billing", label: "Orders & Receipts", shortLabel: "Orders", icon: Receipt },
    { id: "security", label: "Security & Login", shortLabel: "Security", icon: KeyRound },
    { id: "performance", label: "Analytics", shortLabel: "Analytics", icon: BarChart2 },
    { id: "support", label: "Help & Support", shortLabel: "Support", icon: HelpCircle, unread: chatUnreadCount > 0 },
  ] as const;

  return (
    <StudentLayout title="Student Settings" subtitle="Account, VIP Membership & Preferences" hideNavbar={chatOpen}>
      <PullToRefresh onRefresh={checkAuthAndLoadData}>
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 py-2 sm:py-4 pb-3 sm:pb-6 space-y-3.5 sm:space-y-6">

          {/* ═══════════════════════════════════════════════════════════
              TOP HEADER BAR (Brand + Pro Plan Button — Mobile-Friendly Compact Row)
              ═══════════════════════════════════════════════════════════ */}
          <div className="flex items-center justify-between gap-2 pb-0.5 sm:pb-1 flex-nowrap w-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap truncate">
                    <span className="hidden sm:inline">Account </span>Settings
                  </h1>
                  {subscription ? (
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0">
                      ★ VIP
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-xs text-slate-500 font-medium truncate">
                  Manage your learning account, VIP pass & preferences
                </p>
              </div>
            </div>

            {/* Right: Pro Plan pill button (Exclusively shown on Home & Settings) */}
            <button
              onClick={handleProPlanUpgrade}
              className={`h-7.5 sm:h-9 px-2 sm:px-4 rounded-full flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition-all shadow-2xs cursor-pointer border shrink-0 ${
                subscription
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-[#FEF3C7] text-amber-900 border-amber-200 hover:bg-amber-200/80"
              }`}
              title={subscription ? "VIP Membership Active" : "Upgrade to VIP"}
            >
              <Crown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${subscription ? "text-emerald-600 fill-emerald-500" : "text-amber-600 fill-amber-500"}`} />
              <span className="text-[10.5px] sm:text-xs font-bold whitespace-nowrap">
                {subscription ? (
                  <>
                    <span className="sm:hidden">VIP</span>
                    <span className="hidden sm:inline">VIP Active</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Upgrade</span>
                    <span className="hidden sm:inline">Upgrade to Pro</span>
                  </>
                )}
              </span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 space-y-4 animate-pulse">
              <div className="h-52 rounded-3xl bg-slate-200/70" />
              <div className="h-12 rounded-2xl bg-slate-200/70" />
              <div className="h-80 rounded-3xl bg-slate-200/70" />
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════
                  ULTRA-PREMIUM HERO PROFILE SHOWCASE CARD
                  ═══════════════════════════════════════════════════════════ */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-7 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl select-none"
              >
                {/* Glow Orbs & Subtle Radial Dot Grid */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/15 rounded-full blur-2xl pointer-events-none -mb-24" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                <div className="relative z-10 space-y-3.5 sm:space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Avatar with Camera Uploader */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <div className="relative shrink-0">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/25 overflow-hidden group shadow-md transition-transform hover:scale-105 cursor-pointer"
                          title="Click to update photo"
                        >
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm sm:text-lg font-black text-white">{userInitials}</span>
                          )}
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {uploadingImage ? (
                              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-spin" />
                            ) : (
                              <>
                                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                <span className="text-[7px] sm:text-[8px] font-bold text-white mt-0.5">Change</span>
                              </>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-blue-600 border-2 border-[#0A2655] flex items-center justify-center text-white shadow-xs hover:bg-blue-500 transition-colors cursor-pointer"
                          title="Upload photo"
                        >
                          <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>

                      {/* Profile Name & Metadata */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {approvalStatus === "approved" ? (
                            <span className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Verified Student
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Approval Pending
                            </span>
                          )}

                          {subscription ? (
                            <span
                              className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-black text-amber-950 px-2 sm:px-2.5 py-0.5 rounded-full shadow-xs"
                              style={{ background: "linear-gradient(135deg, #D4A017 0%, #FBBF24 50%, #D4A017 100%)" }}
                            >
                              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-950" />
                              VIP PASS
                            </span>
                          ) : (
                            <button
                              onClick={handleProPlanUpgrade}
                              className="inline-flex items-center gap-1 text-[10px] sm:text-[10.5px] font-bold text-amber-300 hover:text-amber-200 transition-colors underline cursor-pointer"
                            >
                              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                              Upgrade to VIP
                            </button>
                          )}
                        </div>

                        <h2 className="text-base sm:text-2xl font-black text-white tracking-tight truncate">
                          {profile?.full_name || "Aspirant"}
                        </h2>

                        {profile?.target_exam && (
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-blue-100/80 mt-0.5 sm:mt-1 flex-wrap font-medium">
                            <span className="inline-flex items-center gap-1 text-blue-200 text-[10px] sm:text-[11px] bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-md truncate max-w-[170px] sm:max-w-none">
                              <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FBBF24] shrink-0" />
                              <span className="truncate">{profile.target_exam}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Profile Edit Shortcut Button */}
                    <button
                      onClick={() => setActiveTab("personal")}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                      title="Edit Profile Information"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit Info</span>
                    </button>
                  </div>

                  {/* 4 Glassmorphism Stat Cards - Sleek 4-Col Strip */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-3 pt-0.5 sm:pt-1">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3.5 text-center border border-white/15">
                      <p className="text-base sm:text-2xl font-black text-white leading-none">
                        {String(statistics.totalTests).padStart(2, "0")}
                      </p>
                      <p className="text-blue-200/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 sm:mt-1.5 truncate">
                        <span className="sm:hidden">Tests</span>
                        <span className="hidden sm:inline">Tests Completed</span>
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3.5 text-center border border-white/15">
                      <p className="text-base sm:text-2xl font-black text-emerald-400 leading-none">
                        {statistics.passRate}%
                      </p>
                      <p className="text-blue-200/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 sm:mt-1.5 truncate">
                        Pass Rate
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3.5 text-center border border-white/15">
                      <p className="text-base sm:text-2xl font-black text-[#FBBF24] leading-none">
                        {accountDays <= 0 ? 1 : accountDays}
                      </p>
                      <p className="text-blue-200/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 sm:mt-1.5 truncate">
                        <span className="sm:hidden">Days</span>
                        <span className="hidden sm:inline">Days on App</span>
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3.5 text-center border border-white/15">
                      <p className="text-xs sm:text-base font-black text-white leading-none truncate mt-0.5 sm:mt-1">
                        {subscription ? "VIP" : "Free"}
                      </p>
                      <p className="text-blue-200/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 sm:mt-2 truncate">
                        <span className="sm:hidden">{subscription ? "Active" : "Tier"}</span>
                        <span className="hidden sm:inline">{subscription ? "365-Day Access" : "Standard Tier"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ═══════════════════════════════════════════════════════════
                  SEGMENTED PREMIUM TAB BAR
                  ═══════════════════════════════════════════════════════════ */}
              <div className="bg-slate-100/90 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border border-slate-200/80 snap-x snap-mandatory">
                {tabsConfig.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      data-tab={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`min-w-fit px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all duration-150 shrink-0 snap-start cursor-pointer ${
                        isActive
                          ? "bg-white text-blue-600 shadow-xs border border-slate-200/90 font-black"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? "text-blue-600 stroke-[2.4]" : "text-slate-500"}`} />
                      <span>
                        <span className="sm:hidden">{tab.shortLabel}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </span>
                      {"badge" in tab && tab.badge && (
                        <span className={`text-[8.5px] sm:text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                          subscription
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                      {"unread" in tab && tab.unread && (
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  TAB CONTENT PANELS
                  ═══════════════════════════════════════════════════════════ */}
              <AnimatePresence mode="wait">

                {/* ─── TAB 1: PERSONAL INFORMATION ─── */}
                {activeTab === "personal" && (
                  <motion.div
                    key="personal"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4"
                  >
                    {/* Primary Editable Form Card */}
                    <div className="md:col-span-8 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/90 shadow-xs space-y-4 sm:space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-slate-900">Personal Information</h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Update your display name, WhatsApp & target exam</p>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-blue-100 whitespace-nowrap shrink-0">
                          Live Sync
                        </span>
                      </div>

                      <div className="space-y-3.5 sm:space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <Input
                              value={formData.full_name}
                              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                              placeholder="e.g. Rahul Sharma"
                              className="pl-10 h-11 rounded-xl border-slate-200 text-base sm:text-sm font-medium focus-visible:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            WhatsApp Mobile Number
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                              +91
                            </span>
                            <Input
                              value={formData.whatsapp_number}
                              onChange={(e) =>
                                setFormData({ ...formData, whatsapp_number: e.target.value.replace(/\D/g, "") })
                              }
                              placeholder="10-digit mobile number"
                              maxLength={10}
                              className="pl-12 h-11 rounded-xl border-slate-200 text-base sm:text-sm font-medium focus-visible:ring-blue-500"
                            />
                          </div>
                          <p className="text-[10.5px] sm:text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                            Used for score updates, test notifications & mentor support
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Target Competitive Exam
                          </label>
                          <div className="relative">
                            <Target className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <select
                              value={formData.target_exam}
                              onChange={(e) => setFormData({ ...formData, target_exam: e.target.value })}
                              className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 bg-white text-base sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              {targetExamsList.map((exam) => (
                                <option key={exam} value={exam}>
                                  {exam}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 sm:pt-2">
                        <Button
                          onClick={handleUpdateProfile}
                          disabled={saving}
                          className="w-full sm:w-auto h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          {saving ? "Saving Changes..." : "Save Profile Changes"}
                        </Button>
                      </div>
                    </div>

                    {/* Right: Account Meta Card */}
                    <div className="md:col-span-4 space-y-4">
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3 sm:space-y-4">
                        <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                          Account Credentials
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="p-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase block">Registered Login</span>
                              <span className="font-bold text-slate-800 truncate block mt-0.5">
                                {userEmail?.includes("@whatsapp.practicekoro.local")
                                  ? `+91 ${userEmail.split("@")[0]}`
                                  : userEmail || "Not specified"}
                              </span>
                            </div>
                            {userEmail && (
                              <button
                                onClick={() => copyToClipboard(userEmail.replace("@whatsapp.practicekoro.local", ""), "Login ID")}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition-colors shrink-0 cursor-pointer"
                                title="Copy"
                              >
                                {copiedField === "Login ID" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>

                          <div className="p-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase block">Joined Date</span>
                            <span className="font-bold text-slate-800 block mt-0.5 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {profile?.created_at
                                ? new Date(profile.created_at).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })
                                : "Active"}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase block">Account ID</span>
                            <span className="font-mono text-[11px] text-slate-600 truncate block mt-0.5">
                              {profile?.id ? `${profile.id.slice(0, 18)}...` : "PK-STUDENT"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── TAB 2: VIP MEMBERSHIP ─── */}
                {activeTab === "membership" && (
                  <motion.div
                    key="membership"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-4"
                  >
                    {subscription ? (
                      /* Active VIP Membership Pass Card */
                      <div className="bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden border border-amber-400/30">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                        <div className="relative z-10 space-y-4 sm:space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 sm:gap-3.5">
                              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
                                <Crown className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <h3 className="text-base sm:text-xl font-black text-white">Yearly VIP Pass Active</h3>
                                  <span className="text-[9px] sm:text-[10px] font-black text-amber-950 bg-amber-400 px-2 py-0.5 rounded-full">
                                    ★ UNLIMITED
                                  </span>
                                </div>
                                <p className="text-[11px] sm:text-xs text-blue-200 mt-0.5">
                                  Valid until {subscription.expiryDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right bg-white/10 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-white/15 shrink-0">
                              <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Access Status</span>
                              <span className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1 sm:justify-end mt-0.5">
                                <CheckCircle className="w-3.5 h-3.5" /> ALL TESTS UNLOCKED
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-1 sm:pt-2">
                            {[
                              "Unlimited Full-Length Mock Tests & Real Percentile Ranks",
                              "Chapter-Wise Topic Tests with Instant Solutions",
                              "Previous Year Question (PYQ) Vault & Speed Tests",
                              "Detailed Answer Explanations in Bengali & English",
                              "Automatic Mistakes Notebook & Targeted Revision",
                              "Direct Mentor & Support Chat Priority"
                            ].map((benefit, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-blue-100">
                                <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </div>
                                <span className="font-semibold">{benefit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* High-Converting VIP Pass Upgrade Card */
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200/90 shadow-sm space-y-4 sm:space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-6">
                          <div className="flex items-center gap-3 sm:gap-3.5">
                            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/25 shrink-0">
                              <Crown className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <h3 className="text-base sm:text-xl font-black text-slate-900">
                                  PracticeKoro VIP Pass
                                </h3>
                                <span className="text-[9px] font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                                  MOST POPULAR
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                Complete preparation for WB Police, Clerkship, Food SI, SSC & Railway
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:flex-col sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display">₹{subscriptionFee}</span>
                              <span className="text-xs font-bold text-slate-400">/ 1 Year</span>
                            </div>
                            <span className="text-[10.5px] sm:text-[11px] font-bold text-emerald-600">
                              Only ~₹{Math.round(subscriptionFee / 12)}/month
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                          {[
                            "100+ Full-Length Timed Simulated Mocks",
                            "Subject-Wise Topic Practice with Explanations",
                            "10 Years of Solved Previous Year Questions (PYQs)",
                            "Complete PDF Notes & Syllabus Study Digest",
                            "Instant Solution Reviews with Accuracy Analysis",
                            "Priority Student Mentor & WhatsApp Support"
                          ].map((perk, idx) => (
                            <div key={idx} className="flex items-center gap-2 sm:gap-2.5 text-xs text-slate-700">
                              <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                              </div>
                              <span className="font-semibold">{perk}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                          <Button
                            onClick={handleProPlanUpgrade}
                            className="w-full sm:w-auto h-12 px-8 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all"
                          >
                            <Crown className="w-4 h-4 fill-slate-950" />
                            <span>Activate VIP Membership (₹{subscriptionFee}/yr)</span>
                          </Button>
                          <span className="text-[10.5px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1 text-center sm:text-left">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            100% Secure Checkout via Razorpay (UPI / Cards / NetBanking)
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── TAB 3: ORDERS & RECEIPTS ─── */}
                {activeTab === "billing" && (
                  <motion.div
                    key="billing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/90 shadow-xs space-y-3 sm:space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">Order & Payment History</h3>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Past transactions and receipts</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => profile?.id && loadPurchases(profile.id)}
                        disabled={loadingPurchases}
                        className="h-8 rounded-xl text-xs gap-1.5 border-slate-200 text-slate-700 shrink-0 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingPurchases ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                      </Button>
                    </div>

                    {loadingPurchases ? (
                      <div className="py-10 text-center text-xs text-slate-400">Loading purchase records...</div>
                    ) : purchases.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">No purchase records yet</p>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                          When you subscribe to a VIP Pass or purchase study materials, your receipts will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {purchases.map((p) => (
                          <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 capitalize truncate">
                                  {p.content_type === "subscription" ? "Yearly VIP Pass" : `${p.content_type} Access`}
                                </p>
                                <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                  <span>
                                    {new Date(p.created_at).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric"
                                    })}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs sm:text-sm font-black text-slate-900 block">₹{p.amount}</span>
                              <span
                                className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                  p.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── TAB 4: SECURITY & LOGIN ─── */}
                {activeTab === "security" && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4"
                  >
                    {/* Change Password Card */}
                    <div className="md:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
                      <div className="border-b border-slate-100 pb-3 sm:pb-4">
                        <h3 className="text-sm sm:text-base font-black text-slate-900">Change Password</h3>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Update your account login password</p>
                      </div>

                      <form onSubmit={handlePasswordUpdate} className="space-y-3.5 sm:space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                              className="h-11 rounded-xl border-slate-200 pr-10 text-base sm:text-sm font-medium focus-visible:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password</label>
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-type new password"
                            className="h-11 rounded-xl border-slate-200 text-base sm:text-sm font-medium focus-visible:ring-blue-500"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={updatingPassword || !newPassword}
                          className="w-full sm:w-auto h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          {updatingPassword ? "Updating..." : "Update Password"}
                        </Button>
                      </form>
                    </div>

                    {/* Right: Password Recovery & Logout */}
                    <div className="md:col-span-5 space-y-3 sm:space-y-4">
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-2.5 sm:space-y-3">
                        <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                          Password Recovery
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Want to reset via email link? We will send a secure one-click link to your inbox.
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleSendResetEmail}
                          disabled={sendingResetEmail}
                          className="w-full h-10 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {sendingResetEmail ? "Sending Link..." : "Send Reset Email"}
                        </Button>
                      </div>

                      {/* Sign Out Card */}
                      <div className="bg-rose-50/70 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-rose-200/80 space-y-2">
                        <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                          <LogOut className="w-3.5 h-3.5 text-rose-600" />
                          Session Management
                        </h4>
                        <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                          Sign out of this browser session safely when using cyber cafe or shared family devices.
                        </p>
                        <Button
                          onClick={handleLogout}
                          className="w-full h-10 sm:h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 mt-2 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out of PracticeKoro
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── TAB 5: ANALYTICS & PERFORMANCE ─── */}
                {activeTab === "performance" && (
                  <motion.div
                    key="performance"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    {/* 3 Metric Cards - 3 Columns on Mobile! */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="bg-white rounded-xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200/90 shadow-xs text-center sm:text-left">
                        <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          <span className="sm:hidden">Attempts</span>
                          <span className="hidden sm:inline">Total Attempts</span>
                        </span>
                        <p className="text-xl sm:text-3xl font-black text-slate-900 mt-0.5 sm:mt-1">{statistics.totalTests}</p>
                        <p className="hidden sm:block text-[11px] text-slate-500 mt-1">Full Mocks & Topic Tests</p>
                      </div>
                      <div className="bg-white rounded-xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200/90 shadow-xs text-center sm:text-left">
                        <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          <span className="sm:hidden">Passed</span>
                          <span className="hidden sm:inline">Passed Tests</span>
                        </span>
                        <p className="text-xl sm:text-3xl font-black text-emerald-600 mt-0.5 sm:mt-1">{statistics.passedCount}</p>
                        <p className="hidden sm:block text-[11px] text-slate-500 mt-1">Above cutoff</p>
                      </div>
                      <div className="bg-white rounded-xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200/90 shadow-xs text-center sm:text-left">
                        <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          <span className="sm:hidden">Accuracy</span>
                          <span className="hidden sm:inline">Accuracy Rate</span>
                        </span>
                        <p className="text-xl sm:text-3xl font-black text-blue-600 mt-0.5 sm:mt-1">{statistics.passRate}%</p>
                        <p className="hidden sm:block text-[11px] text-slate-500 mt-1">Average score index</p>
                      </div>
                    </div>

                    {/* Quick Link Navigation Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      <button
                        onClick={() => navigate("/student/results")}
                        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 text-left transition-all shadow-xs group cursor-pointer flex items-center justify-between sm:block"
                      >
                        <div className="flex items-center gap-3 sm:block">
                          <div className="w-9 h-9 sm:w-auto sm:h-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center sm:bg-transparent sm:p-0 sm:mb-2 shrink-0">
                            <BarChart2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600">View Full Results</h4>
                            <p className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5">Scorecards & answer keys</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden shrink-0" />
                      </button>

                      <button
                        onClick={() => navigate("/student/mistakes")}
                        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 hover:border-rose-300 text-left transition-all shadow-xs group cursor-pointer flex items-center justify-between sm:block"
                      >
                        <div className="flex items-center gap-3 sm:block">
                          <div className="w-9 h-9 sm:w-auto sm:h-auto rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center sm:bg-transparent sm:p-0 sm:mb-2 shrink-0">
                            <AlertCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-rose-600">Mistakes</h4>
                            <p className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5">Review incorrect questions</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden shrink-0" />
                      </button>

                      <button
                        onClick={() => navigate("/student/bookmarks")}
                        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 text-left transition-all shadow-xs group cursor-pointer flex items-center justify-between sm:block"
                      >
                        <div className="flex items-center gap-3 sm:block">
                          <div className="w-9 h-9 sm:w-auto sm:h-auto rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center sm:bg-transparent sm:p-0 sm:mb-2 shrink-0">
                            <Bookmark className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-amber-600">Save Questions</h4>
                            <p className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5">Access saved questions</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden shrink-0" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ─── TAB 6: HELP & SUPPORT ─── */}
                {activeTab === "support" && (
                  <motion.div
                    key="support"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    {/* Live Support Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">Live Mentor Chat</h4>
                            <p className="text-[10.5px] sm:text-[11px] text-slate-500 truncate">Direct message student support</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => setChatOpen(true)}
                          className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Open Chat {chatUnreadCount > 0 ? `(${chatUnreadCount} unread)` : ""}
                        </Button>
                      </div>

                      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                            <Phone className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">WhatsApp Support</h4>
                            <p className="text-[10.5px] sm:text-[11px] text-slate-500 truncate">Quick response for payment & syllabus</p>
                          </div>
                        </div>
                        <a
                          href="https://wa.me/919876543210?text=Hello%20PracticeKoro%20Support,%20I%20need%20help%20with%20my%20account."
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-10 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Chat on WhatsApp
                        </a>
                      </div>
                    </div>

                    {/* FAQs Accordion */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/90 shadow-xs space-y-3 sm:space-y-4">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">Frequently Asked Questions</h3>
                      <div className="divide-y divide-slate-100">
                        {faqs.map((faq, idx) => {
                          const isExpanded = expandedFaq === idx;
                          return (
                            <div key={idx} className="py-2.5 sm:py-3">
                              <button
                                onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                                className="w-full text-left flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                <span>{faq.q}</span>
                                <ChevronRight
                                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                                    isExpanded ? "rotate-90 text-blue-600" : ""
                                  }`}
                                />
                              </button>
                              {isExpanded && (
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 leading-relaxed pl-1">
                                  {faq.a}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Student Chat Modal Component */}
          {profile && (
            <StudentChat
              studentId={profile.id}
              studentName={profile.full_name || "Student"}
              isOpen={chatOpen}
              onOpenChange={setChatOpen}
            />
          )}
        </div>
      </PullToRefresh>
    </StudentLayout>
  );
};

export default StudentProfile;
