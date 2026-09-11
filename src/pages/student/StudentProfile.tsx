import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  TrendingUp,
  Bookmark,
  FileText,
  Briefcase,
  HelpCircle,
  LogOut,
  ChevronRight,
  Camera,
  Crown,
  Loader2,
  MessageSquare,
  CheckCircle2,
  Phone,
  Target,
  Clock,
  Sparkles,
  Award
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import StudentLayout from "@/components/student/StudentLayout";
import { useStudentAuth } from "@/contexts/StudentContext";
import { useTodayMetrics } from "@/hooks/useStudentData";
import { initRazorpayPayment } from "@/utils/payment";
import { motion } from "framer-motion";

export default function StudentProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    user,
    profile,
    hasSubscription,
    subscriptionFee,
    refreshSubscription,
    refreshProfile,
    logout
  } = useStudentAuth();

  const { data: todayMetrics } = useTodayMetrics(user?.id);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [stats, setStats] = useState({
    questionsSolved: 0,
    avgScore: 0,
    totalTests: 0,
    dayStreak: 0,
  });

  // Dialog states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || "");
      setEditPhone(profile.phone || "");
    }
  }, [profile]);

  // Load user test attempt stats
  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: attempts, error } = await supabase
        .from("test_attempts")
        .select("id, score, total_marks, percentage, correct_count, wrong_count")
        .eq("user_id", user.id);

      if (!error && attempts && attempts.length > 0) {
        const totalTests = attempts.length;
        const totalPercentage = attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
        const avgScore = Math.round(totalPercentage / totalTests);

        // Sum correct + wrong as answered questions
        const questionsSolved = attempts.reduce((acc, curr) => {
          return acc + (curr.correct_count || 0) + (curr.wrong_count || 0);
        }, 0);

        setStats({
          questionsSolved: questionsSolved > 0 ? questionsSolved : (todayMetrics?.questions || 0),
          avgScore: avgScore > 0 ? avgScore : 0,
          totalTests,
          dayStreak: todayMetrics?.streakDays || 1,
        });
      } else {
        setStats({
          questionsSolved: todayMetrics?.questions || 0,
          avgScore: todayMetrics?.accuracy || 0,
          totalTests: 0,
          dayStreak: todayMetrics?.streakDays || 1,
        });
      }
    } catch (err) {
      console.error("Error loading user stats:", err);
    }
  }, [user?.id, todayMetrics]);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  // Handle avatar upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file (PNG, JPG)", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size must be less than 2MB", variant: "destructive" });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

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
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: "Updated!", description: "Profile photo changed successfully." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message || "Failed to upload image.", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Save profile settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSavingSettings(true);

    try {
      const { error: profError } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          whatsapp_number: editPhone.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (profError) throw profError;

      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
          setSavingSettings(false);
          return;
        }
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdError) throw pwdError;
      }

      await refreshProfile();
      toast({ title: "Saved!", description: "Profile details updated successfully." });
      setNewPassword("");
      setIsSettingsOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Pro upgrade
  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await initRazorpayPayment({
        amount: subscriptionFee,
        contentId: "site_yearly_subscription",
        contentType: "subscription",
        title: "PracticeKoro Yearly Pro Plan",
      });
      await refreshSubscription();
      setIsSubscriptionOpen(false);
      toast({ title: "Success! 👑", description: "You are now a Pro Member!" });
    } catch (err: any) {
      if (err?.message !== "Payment cancelled") {
        toast({ title: "Payment Info", description: err?.message || "Could not complete payment." });
      }
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Susanta Lohar";
  const displayEmail = user?.email || profile?.email || "susantalohr@gmail.com";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <StudentLayout title="Profile" subtitle="Manage your account & preferences">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 md:py-8 space-y-6">

        {/* ═══════════════ TOP HEADER (Responsive) ═══════════════ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
              Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:block mt-0.5">
              Manage your personal details, learning progress, and subscriptions
            </p>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full sm:rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-2xs transition-colors cursor-pointer"
            aria-label="Settings"
            title="Account Settings"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* ═══════════════ RESPONSIVE 2-COLUMN DESKTOP / 1-COLUMN MOBILE LAYOUT ═══════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-7 items-start">

          {/* ──────────────── LEFT COLUMN: User Card & Stats (md:col-span-5 lg:col-span-4) ──────────────── */}
          <div className="md:col-span-5 lg:col-span-4 space-y-4">
            
            {/* User Identity Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Circular Avatar with Camera upload */}
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-slate-100 shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/logo-circle.png"; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-3xl flex items-center justify-center">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Camera Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0066FF] hover:bg-blue-700 text-white flex items-center justify-center shadow-sm border-2 border-white cursor-pointer transition-all active:scale-95"
                  title="Change Profile Photo"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Name & Email */}
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight mt-3 truncate max-w-full">
                {displayName}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate max-w-full">
                {displayEmail}
              </p>

              {/* Pro / Membership Badge */}
              <div className="mt-3">
                {hasSubscription ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-black shadow-2xs">
                    <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    <span>Pro Member</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setIsSubscriptionOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50/90 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-black transition-all shadow-2xs cursor-pointer group"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500 group-hover:scale-110 transition-transform" />
                    <span>Pro Member</span>
                  </button>
                )}
              </div>
            </div>

            {/* Key Stats: Horizontal 4-grid on Mobile, 2x2 Clean Tiles on Desktop */}
            <div className="grid grid-cols-4 md:grid-cols-2 gap-2 sm:gap-2.5 text-center">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3.5 flex flex-col items-center justify-center shadow-2xs hover:border-blue-200 transition-colors">
                <span className="text-base sm:text-xl font-black text-[#0F172A] leading-tight">
                  {stats.questionsSolved}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 truncate w-full">
                  Questions
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3.5 flex flex-col items-center justify-center shadow-2xs hover:border-purple-200 transition-colors">
                <span className="text-base sm:text-xl font-black text-[#0F172A] leading-tight">
                  {stats.avgScore}%
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 truncate w-full">
                  Avg. Score
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3.5 flex flex-col items-center justify-center shadow-2xs hover:border-indigo-200 transition-colors">
                <span className="text-base sm:text-xl font-black text-[#0F172A] leading-tight">
                  {stats.totalTests}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 truncate w-full">
                  Tests
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3.5 flex flex-col items-center justify-center shadow-2xs hover:border-amber-200 transition-colors">
                <span className="text-base sm:text-xl font-black text-[#0F172A] leading-tight">
                  {stats.dayStreak}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 truncate w-full">
                  Day Streak
                </span>
              </div>
            </div>

            {/* Pro Plan Banner Card (Desktop & Mobile helpful prompt) */}
            {!hasSubscription && (
              <div className="hidden md:block bg-gradient-to-br from-[#0A1628] to-[#1E293B] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <Crown className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Unlock All Mock Tests</h4>
                    <p className="text-[11px] text-slate-400">1 Year VIP Access Pass</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  Get full-length mocks for WBP, KP, WBCS, Clerkship, Food SI, and Central Exams with negative marking.
                </p>
                <Button
                  onClick={() => setIsSubscriptionOpen(true)}
                  className="w-full bg-[#F6C344] hover:bg-amber-400 text-slate-950 font-black text-xs h-9 rounded-xl shadow-xs gap-1 cursor-pointer"
                >
                  <span>View Pro Plans</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

          </div>

          {/* ──────────────── RIGHT COLUMN: Main Navigation Menu (md:col-span-7 lg:col-span-8) ──────────────── */}
          <div className="md:col-span-7 lg:col-span-8 space-y-4">

            {/* Menu Container (Matches phone mockup on mobile, executive style on desktop) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              
              {/* 1. My Progress */}
              <button
                onClick={() => navigate("/student/results")}
                className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-blue-50/30 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                    <TrendingUp className="w-4.5 h-4.5 stroke-[2.4]" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                      My Progress
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
                      Detailed accuracy, test results & performance analytics
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 2. My Bookmarks */}
              <button
                onClick={() => navigate("/student/bookmarks")}
                className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-cyan-50/30 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-2xs">
                    <Bookmark className="w-4.5 h-4.5 stroke-[2.4]" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                      My Bookmarks
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
                      Saved important questions for quick revision
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 3. Mistake Notebook */}
              <button
                onClick={() => navigate("/student/mistakes")}
                className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-rose-50/30 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
                    <FileText className="w-4.5 h-4.5 stroke-[2.4]" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                      Mistake Notebook
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
                      Auto-collected wrong questions to revise and master
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 4. My Subscription */}
              <button
                onClick={() => setIsSubscriptionOpen(true)}
                className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-amber-50/30 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-2xs">
                    <Briefcase className="w-4.5 h-4.5 stroke-[2.4]" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                      My Subscription
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
                      Check membership tier, validity & VIP benefits
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasSubscription ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      Upgrade
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>

              {/* 5. Settings */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-700 group-hover:text-white transition-all shadow-2xs">
                    <Settings className="w-4.5 h-4.5 stroke-[2.4]" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                      Settings
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
                      Edit full name, WhatsApp number & account password
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 6. Help & Support */}
              <button
                onClick={() => setIsSupportOpen(true)}
                className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-emerald-50/30 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                    <HelpCircle className="w-4.5 h-4.5 stroke-[2.4]" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                      Help & Support
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
                      Connect with mentors on WhatsApp or via email
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 7. Logout */}
              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-rose-50/60 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
                    <LogOut className="w-4.5 h-4.5 stroke-[2.4]" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold text-rose-600 block leading-tight">
                      Logout
                    </span>
                    <span className="text-[11px] text-rose-400 font-medium hidden sm:block mt-0.5">
                      Sign out of PracticeKoro safely
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-all" />
              </button>

            </div>

            {/* Quick Helper Banner for Desktop */}
            <div className="hidden sm:flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 border border-blue-100/80 text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold">Need assistance preparing for WBCS, Police, or Railway exams?</span>
              </div>
              <button
                onClick={() => setIsSupportOpen(true)}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 underline shrink-0 cursor-pointer"
              >
                Contact Mentors
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ═══════════════ SETTINGS DIALOG ═══════════════ */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Account Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update your profile information and login password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Full Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your full name"
                className="rounded-xl border-slate-200 text-sm h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">WhatsApp / Phone Number</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="rounded-xl border-slate-200 text-sm h-11"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-700">Change Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="rounded-xl border-slate-200 text-sm h-11"
              />
              <p className="text-[10px] text-slate-400">Minimum 6 characters</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-xl text-xs h-11 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingSettings}
                className="bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-11 px-5 cursor-pointer"
              >
                {savingSettings ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ SUBSCRIPTION DIALOG ═══════════════ */}
      <Dialog open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mb-2 mx-auto">
              <Crown className="w-6 h-6 fill-amber-500" />
            </div>
            <DialogTitle className="text-lg font-black text-center text-slate-900">
              PracticeKoro Pro Pass
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-slate-500">
              Unlimited access to all govt exam mock tests, notes, and analysis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {[
              "Unlimited Full-Length Mock Tests (WBP, KP, WBCS, SSC, Railway)",
              "Complete Chapter-wise Topic Tests with Detailed Solutions",
              "Cutoff Analytics & Selection Readiness Meter",
              "Exclusive Exam Study Notes & Mistakes Notebook Sync",
              "Priority Support & Regular Pattern Updates"
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </div>
            ))}

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between mt-4">
              <div>
                <p className="text-xs text-slate-500 font-bold">1 Year All-Access Pass</p>
                <p className="text-xl font-black text-slate-900">₹{subscriptionFee}<span className="text-xs font-medium text-slate-400">/year</span></p>
              </div>
              <Button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs h-11 px-5 shadow-sm cursor-pointer"
              >
                {upgrading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Processing...</>
                ) : hasSubscription ? (
                  "Renew Pro Pass"
                ) : (
                  "Upgrade Now 🚀"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ HELP & SUPPORT DIALOG ═══════════════ */}
      <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Help & Support
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Reach out to our mentor support team anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <a
              href="https://wa.me/919876543210?text=Hi%20PracticeKoro%20Support%2C%20I%20need%20help"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">WhatsApp Support</p>
                  <p className="text-[11px] text-slate-500">Instant reply within hours</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <div
              onClick={() => {
                setIsSupportOpen(false);
                toast({ title: "Email Support", description: "Contact us at support@practicekoro.com" });
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Email Support</p>
                  <p className="text-[11px] text-slate-500">support@practicekoro.com</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ LOGOUT CONFIRMATION DIALOG ═══════════════ */}
      <Dialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirm Logout
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to sign out of PracticeKoro?
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLogoutConfirmOpen(false)}
              className="rounded-xl text-xs h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold h-10 px-4 cursor-pointer"
            >
              Yes, Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </StudentLayout>
  );
}
