import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentContext";
import StudentLayout from "@/components/student/StudentLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  Inbox,
  Trash2,
  Calendar,
  ArrowRight,
  Crown,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface DbNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const StudentNotifications = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useStudentAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadNotifications(user.id);
      } else {
        navigate("/login");
      }
    };
    fetchUser();
  }, []);

  const loadNotifications = async (uId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      setNotifications(data.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type ?? "general",
        is_read: n.is_read ?? false,
        link: n.link ?? null,
        created_at: n.created_at ?? new Date().toISOString(),
      })));
    } else {
      // Fallback matching Screen 19 of blueprint
      setNotifications([
        {
          id: "notif-1",
          title: "New Mock Test Added",
          message: "Panchayat Full Mock Test 5 is now live. Practice full length test to check your preparation.",
          type: "mock_test",
          is_read: false,
          link: "/student/exam",
          created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        },
        {
          id: "notif-2",
          title: "Your Test Result is Ready",
          message: "General Awareness - Topic Test performance evaluation has been generated. View accuracy and solutions.",
          type: "result",
          is_read: false,
          link: "/student/results",
          created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
        },
        {
          id: "notif-3",
          title: "Daily Challenge is Live",
          message: "Complete today's 10-question sprint to maintain your daily streak and earn extra XP!",
          type: "daily",
          is_read: false,
          link: "/student/daily",
          created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
        },
        {
          id: "notif-4",
          title: "New Current Affairs",
          message: "Daily Current Affairs - 16 Sept 2025 digest and test have been published in Study Section.",
          type: "current_affairs",
          is_read: true,
          link: "/student/current-affairs",
          created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString()
        }
      ]);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast({ title: "Success", description: "All notifications marked as read" });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications(notifications.filter(n => n.id !== id));
      toast({ title: "Deleted", description: "Notification removed" });
    }
  };

  const handleNotificationClick = (notification: DbNotification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "new_test":
        return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
      case "announcement":
        return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
      case "reminder":
        return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
      default:
        return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <StudentLayout title="Notifications" subtitle="System Updates">
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
                  Practice<span className="text-[#0066FF]">Koro</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  Inbox
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Exam Notifications & Alerts</p>
            </div>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl px-4 py-3.5 sm:p-7 md:p-8 bg-gradient-to-br from-[#0A2655] via-[#0D3B7E] to-[#1455AF] text-white shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none -mb-24" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FBBF24] text-[9px] sm:text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Live Notification Feed
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight font-display text-white">
                Exam Alerts & <span className="text-[#FBBF24]">Updates</span>
              </h1>
              <p className="hidden sm:block text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                Stay updated with newly launched mock exams, syllabus announcements, results release, and platform updates.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  className="h-11 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs flex items-center gap-2 backdrop-blur-md"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-300" />
                  Mark all as read
                </Button>
              )}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 sm:p-4 border border-white/15 text-center min-w-[68px] sm:min-w-[85px]">
                <p className="text-lg sm:text-2xl font-black text-amber-300 leading-none">{unreadCount}</p>
                <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mt-1">Unread</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 space-y-3 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 font-display">All Caught Up!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You have no pending notifications. When new mock tests or exam updates are released, you'll see them right here.
              </p>
              <Button
                onClick={() => navigate("/student/exam")}
                className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Browse Mock Tests
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {notifications.map((notif, idx) => {
                const color = getTypeColor(notif.type);

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer flex items-start justify-between gap-4 group ${
                      notif.is_read
                        ? "bg-white border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.02)] opacity-85 hover:opacity-100"
                        : "bg-white border-blue-200/80 shadow-[0_4px_16px_rgba(37,99,235,0.06)] ring-1 ring-blue-500/10"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${color.bg} ${color.text} ${color.border}`}>
                        <Bell className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold text-sm sm:text-base text-slate-900 truncate ${!notif.is_read ? "font-black" : ""}`}>
                            {notif.title}
                          </h4>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed mb-2.5">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-center">
                      {notif.link && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                          Open <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentNotifications;
