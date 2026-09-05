import { useState, useEffect, useCallback } from "react";
import { Bell, X, CheckCircle, Clock, Megaphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DbNotification {
    id: string;
    title: string;
    message: string;
    type: string | null;
    link: string | null;
    is_read: boolean | null;
    created_at: string | null;
}

const NotificationBell = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<DbNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        fetchUser();
    }, []);

    const loadNotifications = useCallback(async () => {
        if (!userId) return;

        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) {
            console.error("Error loading notifications:", error);
            return;
        }

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            loadNotifications();
            // Poll for new notifications every 30 seconds
            const interval = setInterval(loadNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [userId, loadNotifications]);

    const handleMarkAsRead = async (id: string) => {
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id);
        loadNotifications();
    };

    const handleMarkAllRead = async () => {
        if (!userId) return;
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId);
        loadNotifications();
    };

    const handleNotificationClick = (notification: DbNotification) => {
        handleMarkAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
            setOpen(false);
        }
    };

    const formatTime = (dateString: string | null) => {
        if (!dateString) return "";
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
    };

    const getTypeIcon = (type: string | null) => {
        switch (type) {
            case "new_test":
                return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case "reminder":
                return <Clock className="w-4 h-4 text-amber-500" />;
            case "announcement":
                return <Megaphone className="w-4 h-4 text-blue-500" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
                    className="relative w-10 h-10 rounded-xl hover:bg-emerald-50"
                >
                    <Bell className="w-5 h-5 text-gray-600" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0">
                <SheetHeader className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <SheetTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="text-white/80 hover:text-white hover:bg-white/20 text-xs"
                            >
                                Mark all read
                            </Button>
                        )}
                    </SheetTitle>
                </SheetHeader>

                <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <Bell className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No notifications yet</p>
                            <p className="text-gray-400 text-sm mt-1">
                                You'll see updates about new tests here
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => {
                                const isUnread = !notification.is_read;
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-4 cursor-pointer transition-colors ${isUnread ? "bg-emerald-50/50" : "hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUnread
                                                ? "bg-emerald-100"
                                                : "bg-gray-100"
                                                }`}>
                                                {getTypeIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm font-medium truncate ${isUnread ? "text-gray-900" : "text-gray-600"
                                                        }`}>
                                                        {notification.title}
                                                    </p>
                                                    {isUnread && (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="p-4 border-t bg-gray-50 flex justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                navigate("/student/notifications");
                                setOpen(false);
                            }}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-bold gap-1"
                        >
                            View All Notifications <ExternalLink className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default NotificationBell;
