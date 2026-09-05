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
  Lock,
  MessageSquare,
  Pencil,
  CheckCircle,
  Shield,
  Clock,
  Camera,
  Bell,
  Sparkles,
  Mail
} from "lucide-react";
import StudentLayout from "@/components/student/StudentLayout";
import { differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import StudentChat from "@/components/StudentChat";
import { getStudentUnreadCount } from "@/config/chat";
import { formatDistanceToNow } from "date-fns";
import { getActiveSubscription, getYearlySubscriptionFee } from "@/lib/subscription";
import { initRazorpayPayment } from "@/utils/payment";
import { Badge } from "@/components/ui/badge";

interface ProfileStatistics {
  totalTests: number;
  passRate: number;
}

const StudentProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [statistics, setStatistics] = useState<ProfileStatistics>({ totalTests: 0, passRate: 0 });
  const [formData, setFormData] = useState({ full_name: "", whatsapp_number: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [accountDays, setAccountDays] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [subscriptionFee, setSubscriptionFee] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 2MB", variant: "destructive" });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      // Path must be: {user_id}/{filename} - required by RLS policy
      const filePath = `${profile.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL with cache-busting
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrlWithCacheBust })
        .eq('id', profile.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: avatarUrlWithCacheBust });
      toast({ title: "Success", description: "Profile photo updated!" });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({ title: "Error", description: error.message || "Failed to upload", variant: "destructive" });
    }
    setUploadingImage(false);
  };

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading notifications:", error);
      return;
    }

    if (data) {
      setNotifications(data);
      setUnreadNotificationCount(data.filter(n => !n.is_read).length);
    }
  }, [profile?.id]);

  const loadChatUnreadCount = useCallback(async (studentId: string) => {
    const count = await getStudentUnreadCount(studentId);
    setChatUnreadCount(count);
  }, []);

  const loadStatistics = useCallback(async (userId: string) => {
    const { data: attempts } = await supabase
      .from("test_attempts")
      .select("passed")
      .eq("user_id", userId);

    if (attempts && attempts.length > 0) {
      const passed = attempts.filter(a => a.passed).length;
      setStatistics({
        totalTests: attempts.length,
        passRate: Math.round((passed / attempts.length) * 100),
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

    const [profileResult, approvalResult, subscription, fee] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("approval_status").select("status").eq("user_id", session.user.id).single(),
      getActiveSubscription(session.user.id),
      getYearlySubscriptionFee(),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data);
      setFormData({
        full_name: profileResult.data.full_name || "",
        whatsapp_number: profileResult.data.whatsapp_number || "",
      });
      if (profileResult.data.created_at) {
        setAccountDays(differenceInDays(new Date(), new Date(profileResult.data.created_at)));
      }
    }

    setApprovalStatus(approvalResult.data?.status || "pending");
    if (fee) setSubscriptionFee(fee);
    if (subscription) setSubscription(subscription);
    await loadStatistics(session.user.id);
    setLoading(false);
  }, [navigate, loadStatistics]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  // Load notifications
  useEffect(() => {
    if (profile?.id) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [profile?.id, loadNotifications]);

  // Load chat unread count
  useEffect(() => {
    if (profile?.id) {
      const studentId = profile.id;
      loadChatUnreadCount(studentId);
      const interval = setInterval(() => loadChatUnreadCount(studentId), 5000);
      return () => clearInterval(interval);
    }
  }, [profile?.id, loadChatUnreadCount]);

  const handleNotificationClick = useCallback(async (notif: any) => {
    if (!notif.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id);
      loadNotifications();
    }

    if (notif.link) {
      navigate(notif.link);
    } else if (notif.test_id) {
      // For backwards compatibility if test_id exists in any old local testing data
      navigate(`/student/take-test/${notif.test_id}`);
    }
  }, [navigate, loadNotifications]);

  const formatNotificationTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.clear();
    navigate("/");
  };

  const handleSubmit = async () => {
    if (formData.whatsapp_number && !/^\d{10}$/.test(formData.whatsapp_number)) {
      toast({ title: "Error", description: "Enter valid 10-digit number", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: formData.full_name,
      whatsapp_number: formData.whatsapp_number,
    }).eq("id", profile.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!" });
      setIsEditing(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <StudentLayout title="Profile" subtitle="Your account">
        <div className="w-full flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </StudentLayout>
    );
  }


  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ST';

  return (
    <StudentLayout title="Profile" subtitle="Your account" hideNavbar={chatOpen}>
      <div className="w-full space-y-3 pb-12 px-1">

        {/* Premium Profile Header - Matches Dashboard Height */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-3xl -ml-20 -mb-20" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full blur-2xl" />

          <div className="relative z-10">
            {/* Header - Matches Dashboard style */}
            <div className="flex items-center gap-4 mb-6">
              {/* Avatar with Upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shrink-0 overflow-hidden group"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl sm:text-2xl font-bold text-white">{initials}</span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingImage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs sm:text-sm font-medium mb-1">👤 Profile</p>
                <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{profile?.full_name || "Student"}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {subscription && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 rounded-full shadow-sm shadow-amber-500/20">
                      <Sparkles className="w-3 h-3" />
                      PREMIUM
                    </span>
                  )}
                  {approvalStatus === "approved" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-100 bg-emerald-500/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-100 bg-amber-500/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Row - 3 columns like Dashboard */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                <p className="text-2xl sm:text-3xl font-bold text-white">{statistics.totalTests}</p>
                <p className="text-white/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mt-1">Tests</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-300">{statistics.passRate}%</p>
                <p className="text-white/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mt-1">Pass Rate</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                <p className="text-2xl sm:text-3xl font-bold text-white">{accountDays === 0 ? '0' : accountDays}</p>
                <p className="text-white/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mt-1">Days</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Premium Subscription Details */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 relative overflow-hidden shadow-lg shadow-amber-500/20"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-12 -mt-12" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-base">Premium Plan</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <p className="text-white/90 text-xs font-semibold uppercase tracking-wider">Active</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Valid Till</p>
                <p className="text-white font-black text-sm">
                  {subscription.expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Account Details Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-100 overflow-hidden"
        >
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Account Details</p>
          </div>

          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                {userEmail?.includes("@whatsapp.practicekoro.local") ? (
                  <Phone className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Mail className="w-4 h-4 text-indigo-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-400 font-medium uppercase mb-0.5">
                  {userEmail?.includes("@whatsapp.practicekoro.local") ? "Login Mobile" : "Login Email"}
                </p>
                <p className="text-sm font-medium text-slate-900 truncate">
                  {userEmail?.includes("@whatsapp.practicekoro.local")
                    ? userEmail.split("@")[0]
                    : userEmail || "Not set"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-400 font-medium uppercase mb-0.5">Full Name</p>
                {isEditing ? (
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="Your name"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-900 truncate">{formData.full_name || "Not set"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-400 font-medium uppercase mb-0.5">WhatsApp</p>
                {isEditing ? (
                  <Input
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value.replace(/\D/g, '') })}
                    className="h-9 text-sm"
                    placeholder="10 digit number"
                    maxLength={10}
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-900">{formData.whatsapp_number || "Not set"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-100">
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-10 rounded-xl text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full h-10 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </motion.div>

        {/* Notifications Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-100 overflow-hidden"
        >
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Notifications</p>
            {unreadNotificationCount > 0 && (
              <span className="text-[9px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded-full">
                {unreadNotificationCount} new
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 3).map((notif) => {
                const isUnread = !notif.is_read;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${isUnread ? "bg-emerald-50/50" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isUnread ? "bg-emerald-100" : "bg-slate-100"}`}>
                      <Bell className={`w-4 h-4 ${isUnread ? "text-emerald-600" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isUnread ? "text-slate-900" : "text-slate-600"}`}>{notif.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{notif.message}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 shrink-0">
                      {notif.created_at ? formatNotificationTime(notif.created_at) : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {notifications.length > 3 && (
            <button
              onClick={() => navigate("/student/notifications")} // Assuming this route exists or we just want the UI
              className="w-full p-2.5 text-center text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-slate-100"
            >
              View All Notifications
            </button>
          )}
        </motion.div>

        {/* Chat Inbox Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white rounded-xl border border-slate-100 overflow-hidden"
        >
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Chat Inbox</p>
            {chatUnreadCount > 0 && (
              <span className="text-[9px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded-full">
                {chatUnreadCount} new
              </span>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Admin Support</p>
                <p className="text-xs text-slate-500">Chat with our support team</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setChatOpen(true)}
            className="w-full p-3 text-center text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Open Chat
          </button>
        </motion.div>

        {/* Student Chat Component */}
        {profile && (
          <StudentChat
            studentId={profile.id}
            studentName={profile.full_name || "Student"}
            isOpen={chatOpen}
            onOpenChange={setChatOpen}
          />
        )}

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-100 overflow-hidden"
        >
          <button
            onClick={() => navigate("/student/results")}
            className="flex items-center gap-3 p-3 w-full text-left border-b border-slate-100 active:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">Results</p>
              <p className="text-[10px] text-slate-400">View performance</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <button
            onClick={() => navigate("/student/exams")}
            className="flex items-center gap-3 p-3 w-full text-left border-b border-slate-100 active:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">Mock Tests</p>
              <p className="text-[10px] text-slate-400">Browse tests</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 w-full text-left active:bg-red-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-600 text-sm">Logout</p>
              <p className="text-[10px] text-slate-400">Sign out</p>
            </div>
          </button>
        </motion.div>
      </div>
    </StudentLayout>
  );
};

export default StudentProfile;