import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/student/StudentLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    CheckCheck,
    ChevronLeft,
    Clock,
    ExternalLink,
    Inbox,
    Trash2,
    Calendar,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { LoadError } from "@/components/PageState";

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
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<DbNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
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
        setLoadError(false);
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", uId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading notifications:", error);
            setLoadError(true);
        } else if (data) {
            setNotifications(data);
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
            toast({ title: "All caught up", description: "All notifications marked as read" });
        } else {
            toast({ title: "Couldn't update", description: "Try marking them as read again.", variant: "destructive" });
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
            toast({ title: "Removed", description: "Notification deleted" });
        } else {
            toast({ title: "Couldn't delete", description: "Try again in a moment.", variant: "destructive" });
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
            case "new_test": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "announcement": return "bg-indigo-50 text-indigo-600 border-indigo-100";
            case "reminder": return "bg-amber-50 text-amber-600 border-amber-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    return (
        <StudentLayout title="Notifications" subtitle="Stay updated with your progress">
            <div className="w-full mx-auto px-1 py-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            aria-label="Back"
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
                            <p className="text-slate-500 text-sm">Stay updated with your progress</p>
                        </div>
                    </div>

                    {notifications.some(n => !n.is_read) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="rounded-xl border-slate-200 text-slate-600 font-semibold text-xs gap-2"
                        >
                            <CheckCheck className="w-4 h-4 text-emerald-500" />
                            Mark all as read
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="space-y-3">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/60" />
                        ))
                    ) : loadError ? (
                        <LoadError
                            title="Couldn't load notifications"
                            description="Your updates didn't load. Try again."
                            onRetry={() => userId && loadNotifications(userId)}
                        />
                    ) : notifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl border border-slate-100 p-12 text-center"
                        >
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Inbox className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">All caught up!</h3>
                            <p className="text-slate-500 mt-2">You don't have any notifications at the moment.</p>
                        </motion.div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {notifications.map((notif, idx) => (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`
                                        relative group cursor-pointer bg-white rounded-2xl border transition-all duration-300
                                        ${notif.is_read
                                            ? "border-slate-100 opacity-75 hover:opacity-100"
                                            : "border-indigo-100 shadow-sm hover:shadow-md ring-1 ring-indigo-50/50 shadow-indigo-500/5 bg-gradient-to-r from-white to-indigo-50/10"}
                                    `}
                                >
                                    <div className="p-4 flex gap-4">
                                        {/* Status Indicator */}
                                        {!notif.is_read && (
                                            <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-500 rounded-full" />
                                        )}

                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${getTypeColor(notif.type)}`}>
                                            <Bell className="w-6 h-6" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={`font-bold text-slate-900 truncate pr-4 ${!notif.is_read ? "text-base" : "text-sm"}`}>
                                                    {notif.title}
                                                </h4>
                                            </div>
                                            <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                                                {notif.message}
                                            </p>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    {notif.link && (
                                                        <div className="text-xs font-bold text-indigo-500 flex items-center gap-1 mr-2 bg-indigo-50 px-2 py-1 rounded-lg">
                                                            Open <ArrowRight className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        aria-label="Delete notification"
                                                        onClick={(e) => handleDelete(notif.id, e)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </StudentLayout>
    );
};

export default StudentNotifications;
