import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Bell,
    Send,
    TestTube2,
    FileText,
    MessageSquare,
    Clock,
    Megaphone,
    Trash2,
    RefreshCw,
    Users,
    Sparkles
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import { motion, AnimatePresence } from "framer-motion";
import { getNotificationRecipients, AUDIENCE_LABELS, type NotificationAudience } from "@/lib/adminRecipients";
import { logAdminAction } from "@/lib/adminAudit";

type NotificationType = "new_test" | "reminder" | "announcement";

interface MockTest {
    id: string;
    title: string;
    exam_name?: string;
}

interface Note {
    id: string;
    title: string;
    subject_name?: string;
}

const SendNotifications = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Form state
    const [notificationType, setNotificationType] = useState<"mock_test" | "notes" | "custom">("custom");
    const [selectedTestId, setSelectedTestId] = useState("");
    const [selectedNoteId, setSelectedNoteId] = useState("");
    const [customTitle, setCustomTitle] = useState("");
    const [customMessage, setCustomMessage] = useState("");

    // Data state
    const [mockTests, setMockTests] = useState<MockTest[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

    // Diagnostic state
    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [audience, setAudience] = useState<NotificationAudience>("all");
    const [audienceCount, setAudienceCount] = useState<number | null>(null);
    const [showSendConfirm, setShowSendConfirm] = useState(false);

    // Delete dialog states
    const [notifToDelete, setNotifToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showClearAllDialog, setShowClearAllDialog] = useState(false);

    useEffect(() => {
        checkAuth();
        fetchStudentCount();
    }, []);

    useEffect(() => {
        let cancelled = false;
        getNotificationRecipients(audience)
            .then(({ userIds }) => {
                if (!cancelled) setAudienceCount(userIds.length);
            })
            .catch(() => {
                if (!cancelled) setAudienceCount(null);
            });
        return () => {
            cancelled = true;
        };
    }, [audience]);

    const fetchStudentCount = async () => {
        const { count, error } = await supabase
            .from("user_roles")
            .select("*", { count: 'exact', head: true })
            .eq("role", "student");

        if (!error) setStudentCount(count);
    };

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/admin/login");
            return;
        }
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "admin")
            .maybeSingle();

        if (!roleData) {
            await supabase.auth.signOut();
            navigate("/admin/login");
            return;
        }
        await loadData();
        setLoading(false);
    };

    const loadData = async () => {
        // Load mock tests
        const { data: tests } = await supabase
            .from("mock_tests")
            .select("id, title, exam:exams(name)")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(50);

        if (tests) {
            setMockTests(
                tests.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    exam_name: t.exam?.name,
                }))
            );
        }

        // Load notes (stored in pdfs table)
        const { data: notesData } = await supabase
            .from("pdfs")
            .select("id, title, subject:subjects(name)")
            .order("created_at", { ascending: false })
            .limit(50);

        if (notesData) {
            setNotes(
                notesData.map((n: any) => ({
                    id: n.id,
                    title: n.title,
                    subject_name: n.subject?.name,
                }))
            );
        }

        // Load recent notifications
        loadNotifications();
    };

    const loadNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(500);

            if (error) {
                console.error("Fetch error:", error);
                return;
            }

            console.log(`Admin debug: Found ${data?.length || 0} notification rows in database`);

            if (data) {
                // Group fanned-out notifications into unique broadcasts
                const uniqueBroadcasts: any[] = [];
                const seen = new Set();

                data.forEach((notif: any) => {
                    // Simpler grouping: same title and message sent within 30 minutes
                    const date = notif.created_at ? new Date(notif.created_at) : new Date();
                    const timeBucket = Math.floor(date.getTime() / (1000 * 60 * 30));
                    const key = `${notif.title?.trim()}|${notif.message?.trim()}|${timeBucket}`;

                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueBroadcasts.push({
                            ...notif,
                            createdAt: notif.created_at || new Date().toISOString(),
                            recipientCount: 1,
                            readCount: notif.is_read ? 1 : 0,
                        });
                    } else {
                        const existing = uniqueBroadcasts.find((item) => {
                            const date = item.created_at ? new Date(item.created_at) : new Date(item.createdAt);
                            const bucket = Math.floor(date.getTime() / (1000 * 60 * 30));
                            return `${item.title?.trim()}|${item.message?.trim()}|${bucket}` === key;
                        });
                        if (existing) {
                            existing.recipientCount = (existing.recipientCount || 1) + 1;
                            existing.readCount = (existing.readCount || 0) + (notif.is_read ? 1 : 0);
                        }
                    }
                });

                console.log(`Grouped into ${uniqueBroadcasts.length} broadcasts`);
                // Merge with local history for immediate visibility
                const localHistoryRaw = localStorage.getItem("admin_notif_history");
                if (localHistoryRaw) {
                    try {
                        const localHistory = JSON.parse(localHistoryRaw);
                        localHistory.forEach((ln: any) => {
                            const date = new Date(ln.createdAt);
                            const timeBucket = Math.floor(date.getTime() / (1000 * 60 * 30));
                            const key = `${ln.title?.trim()}|${ln.message?.trim()}|${timeBucket}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                uniqueBroadcasts.push(ln);
                            }
                        });
                        uniqueBroadcasts.sort((a, b) =>
                            new Date(b.createdAt || b.created_at).getTime() -
                            new Date(a.createdAt || a.created_at).getTime()
                        );
                    } catch (e) { }
                }

                setRecentNotifications(uniqueBroadcasts.slice(0, 30));
            }
        } catch (err: any) {
            console.error("Unexpected error loading notifications:", err);
        }
    };

    const buildNotificationContent = () => {
        if (notificationType === "mock_test") {
            const selectedTest = mockTests.find((t) => t.id === selectedTestId);
            if (!selectedTest) return null;
            return {
                title: "New Mock Test Available! 📝",
                message: `${selectedTest.title}${selectedTest.exam_name ? ` - ${selectedTest.exam_name}` : ""} is now live. Start practicing now!`,
                notifType: "new_test" as NotificationType,
                link: `/student/take-test/${selectedTest.id}`,
            };
        }
        if (notificationType === "notes") {
            const selectedNote = notes.find((n) => n.id === selectedNoteId);
            if (!selectedNote) return null;
            return {
                title: "New Study Notes Uploaded! 📚",
                message: `${selectedNote.title}${selectedNote.subject_name ? ` - ${selectedNote.subject_name}` : ""} is now available for you to read.`,
                notifType: "announcement" as NotificationType,
                link: "/student/notes",
            };
        }
        if (!customTitle.trim() || !customMessage.trim()) return null;
        return {
            title: customTitle.trim(),
            message: customMessage.trim(),
            notifType: "announcement" as NotificationType,
            link: "",
        };
    };

    const requestSendNotification = () => {
        const content = buildNotificationContent();
        if (!content) {
            toast({
                title: "Missing details",
                description: notificationType === "custom" ? "Enter a title and message" : "Select an item first",
                variant: "destructive",
            });
            return;
        }
        setShowSendConfirm(true);
    };

    const handleSendNotification = async () => {
        setSending(true);

        try {
            const content = buildNotificationContent();
            if (!content) {
                setSending(false);
                return;
            }
            const { title, message, notifType, link } = content;
            const { userIds, label } = await getNotificationRecipients(audience);

            if (userIds.length === 0) {
                toast({ title: "No recipients", description: `No students match “${label}”`, variant: "destructive" });
                setSending(false);
                return;
            }

            const notifications = userIds.map((user_id) => ({
                user_id,
                title,
                message,
                type: notifType,
                link: link || null,
                is_read: false,
            }));

            const { error: insertError } = await supabase
                .from("notifications")
                .insert(notifications);

            if (insertError) {
                throw insertError;
            }

            await logAdminAction({
                action: "send_notification",
                tableName: "notifications",
                newData: { title, audience, recipients: userIds.length, type: notifType },
            });

            toast({ title: "Sent", description: `Notification delivered to ${userIds.length} ${label.toLowerCase()}` });

            // Save to local history for immediate admin visibility (covers RLS delay)
            const newLocalNotif = {
                id: `local-${Date.now()}`,
                title,
                message,
                type: notifType,
                createdAt: new Date().toISOString()
            };
            const existingHistory = JSON.parse(localStorage.getItem("admin_notif_history") || "[]");
            localStorage.setItem("admin_notif_history", JSON.stringify([newLocalNotif, ...existingHistory].slice(0, 50)));

            // Reset form
            setSelectedTestId("");
            setSelectedNoteId("");
            setCustomTitle("");
            setCustomMessage("");
            setShowSendConfirm(false);

            // Wait a moment for DB consistency before reload
            setTimeout(() => {
                loadNotifications();
            }, 500);
        } catch (error: any) {
            console.error("Notification error:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }

        setSending(false);
    };

    const handleDeleteNotification = async (notif: any) => {
        setNotifToDelete(notif);
    };

    const confirmDeleteNotification = async () => {
        if (!notifToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("title", notifToDelete.title)
                .eq("message", notifToDelete.message)
                .eq("type", notifToDelete.type)
                .eq("link", notifToDelete.link);

            if (error) throw error;

            // Also remove from local history
            const localHistory = JSON.parse(localStorage.getItem("admin_notif_history") || "[]");
            const updatedHistory = localHistory.filter((n: any) =>
                n.title !== notifToDelete.title || n.message !== notifToDelete.message
            );
            localStorage.setItem("admin_notif_history", JSON.stringify(updatedHistory));

            toast({ title: "Notification deleted globally" });
            loadNotifications();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setNotifToDelete(null);
        }
    };

    const handleClearAll = async () => {
        setShowClearAllDialog(true);
    };

    const confirmClearAll = async () => {
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

            if (error) throw error;

            // Also clear local history
            localStorage.removeItem("admin_notif_history");

            toast({ title: "All notifications cleared from database" });
            loadNotifications();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setShowClearAllDialog(false);
        }
    };

    const formatTime = (dateString: string) => {
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
        return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    };

    const getTypeIcon = (type: NotificationType) => {
        switch (type) {
            case "new_test":
                return <TestTube2 className="w-4 h-4 text-emerald-500" />;
            case "reminder":
                return <Clock className="w-4 h-4 text-amber-500" />;
            case "announcement":
                return <Megaphone className="w-4 h-4 text-blue-500" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <AdminLayout title="Send Notifications" subtitle="Notify students">
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Send Notifications" subtitle="Notify students about new content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Send Notification Form */}
                <Card className="border-0 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100/50">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            Send Notification
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Notification Type Selection */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-3 block">Notification Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "mock_test", label: "Mock Test", icon: TestTube2, color: "emerald" },
                                    { id: "notes", label: "Notes", icon: FileText, color: "blue" },
                                    { id: "custom", label: "Custom", icon: MessageSquare, color: "purple" },
                                ].map((type) => {
                                    const Icon = type.icon;
                                    const isSelected = notificationType === type.id;
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => setNotificationType(type.id as any)}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isSelected
                                                ? `border-${type.color}-500 bg-${type.color}-50`
                                                : "border-gray-200 hover:border-gray-300"
                                                }`}
                                        >
                                            <Icon
                                                className={`w-5 h-5 ${isSelected ? `text-${type.color}-600` : "text-gray-400"
                                                    }`}
                                            />
                                            <span
                                                className={`text-xs font-medium ${isSelected ? `text-${type.color}-700` : "text-gray-600"
                                                    }`}
                                            >
                                                {type.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dynamic Form Based on Type */}
                        <AnimatePresence mode="wait">
                            {notificationType === "mock_test" && (
                                <motion.div
                                    key="mock_test"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    <label className="text-sm font-medium text-gray-700 block">Select Mock Test</label>
                                    <select
                                        value={selectedTestId}
                                        onChange={(e) => setSelectedTestId(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="">-- Select a mock test --</option>
                                        {mockTests.map((test) => (
                                            <option key={test.id} value={test.id}>
                                                {test.title} {test.exam_name && `(${test.exam_name})`}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedTestId && (
                                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <p className="text-xs text-emerald-700 font-medium mb-1">Preview:</p>
                                            <p className="text-sm text-emerald-800 font-semibold">New Mock Test Available! 📝</p>
                                            <p className="text-xs text-emerald-600 mt-1">
                                                {mockTests.find((t) => t.id === selectedTestId)?.title} is now live. Start practicing now!
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {notificationType === "notes" && (
                                <motion.div
                                    key="notes"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    <label className="text-sm font-medium text-gray-700 block">Select Notes</label>
                                    <select
                                        value={selectedNoteId}
                                        onChange={(e) => setSelectedNoteId(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">-- Select a note --</option>
                                        {notes.map((note) => (
                                            <option key={note.id} value={note.id}>
                                                {note.title} {note.subject_name && `(${note.subject_name})`}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedNoteId && (
                                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <p className="text-xs text-blue-700 font-medium mb-1">Preview:</p>
                                            <p className="text-sm text-blue-800 font-semibold">New Study Notes Uploaded! 📚</p>
                                            <p className="text-xs text-blue-600 mt-1">
                                                {notes.find((n) => n.id === selectedNoteId)?.title} is now available for you to read.
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {notificationType === "custom" && (
                                <motion.div
                                    key="custom"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-2">Title</label>
                                        <Input
                                            value={customTitle}
                                            onChange={(e) => setCustomTitle(e.target.value)}
                                            placeholder="Enter notification title..."
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-2">Message</label>
                                        <Textarea
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                            placeholder="Enter notification message..."
                                            className="rounded-xl min-h-[100px]"
                                        />
                                    </div>
                                    {customTitle && customMessage && (
                                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                            <p className="text-xs text-purple-700 font-medium mb-1">Preview:</p>
                                            <p className="text-sm text-purple-800 font-semibold">{customTitle}</p>
                                            <p className="text-xs text-purple-600 mt-1">{customMessage}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Recipients</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.keys(AUDIENCE_LABELS) as NotificationAudience[]).map((key) => {
                                    const selected = audience === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setAudience(key)}
                                            className={`p-2.5 rounded-xl border-2 text-left transition-all ${selected
                                                ? "border-indigo-500 bg-indigo-50"
                                                : "border-gray-200 hover:border-gray-300"
                                                }`}
                                        >
                                            <p className={`text-xs font-semibold ${selected ? "text-indigo-700" : "text-gray-700"}`}>
                                                {AUDIENCE_LABELS[key]}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {audienceCount == null ? "Counting recipients..." : `${audienceCount} student${audienceCount === 1 ? "" : "s"} will receive this`}
                            </p>
                        </div>

                        {/* Send Button */}
                        <Button
                            onClick={requestSendNotification}
                            disabled={sending}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold"
                        >
                            {sending ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Review & send
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Notifications */}
                <Card className="border-0 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-white" />
                                </div>
                                Recent Notifications
                                <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600">
                                    {recentNotifications.length}
                                </Badge>
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => loadNotifications()}
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-white"
                                    title="Refresh List"
                                >
                                    <RefreshCw className="w-4 h-4 text-gray-400" />
                                </Button>
                                {recentNotifications.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearAll}
                                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Clear All
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentNotifications.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                                    <Bell className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-500 font-medium">No notifications sent yet</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Send your first notification to students
                                </p>

                                <div className="mt-8 p-5 bg-indigo-50 rounded-2xl border border-indigo-100/50 text-left">
                                    <p className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-indigo-600" /> System Upgrade
                                    </p>
                                    <p className="text-[11px] text-indigo-700 leading-relaxed mb-4">
                                        Previously, notifications were only saved in your browser. Now they are saved in the **Database** (Supabase) so your students can see them on their phones and computers!
                                    </p>
                                    <ul className="text-[11px] text-indigo-700 space-y-2 border-t border-indigo-100/50 pt-4">
                                        <li className="flex justify-between font-medium">
                                            <span>Students found:</span>
                                            <span className="text-indigo-900">{studentCount ?? "..."}</span>
                                        </li>
                                        <li className="text-[10px] leading-relaxed italic opacity-80">
                                            If count &gt; 0 but this box is empty, it means you need to run the **SQL Migration** to give Admin permission to view the database.
                                        </li>
                                    </ul>
                                    <Button
                                        onClick={() => loadNotifications()}
                                        variant="default"
                                        size="sm"
                                        className="w-full mt-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                    >
                                        <RefreshCw className="w-3 h-3 mr-2" /> Refresh Dashboard
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                                {recentNotifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className="p-4 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.type === "new_test"
                                                    ? "bg-emerald-100"
                                                    : notif.type === "reminder"
                                                        ? "bg-amber-100"
                                                        : "bg-blue-100"
                                                    }`}
                                            >
                                                {getTypeIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {notif.title}
                                                    </p>
                                                    <button
                                                        onClick={() => handleDeleteNotification(notif)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge
                                                        className={`text-[10px] border-0 ${notif.type === "new_test"
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : notif.type === "reminder"
                                                                ? "bg-amber-100 text-amber-700"
                                                                : "bg-blue-100 text-blue-700"
                                                            }`}
                                                    >
                                                        {notif.type.replace("_", " ")}
                                                    </Badge>
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatTime(notif.createdAt)}
                                                    </span>
                                                    {typeof notif.recipientCount === "number" && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {notif.readCount || 0}/{notif.recipientCount} read
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <DeleteAlertDialog
                isOpen={showSendConfirm}
                onClose={() => setShowSendConfirm(false)}
                onConfirm={handleSendNotification}
                title="Send notification"
                description={
                    <>
                        Send this to <span className="font-bold text-slate-900">{audienceCount ?? "..."} {AUDIENCE_LABELS[audience].toLowerCase()}</span>?
                        This creates one inbox row per student and cannot be undone in a single click.
                    </>
                }
                confirmText={sending ? "Sending..." : `Send to ${audienceCount ?? 0}`}
                isDeleting={sending}
                variant="primary"
            />

            <DeleteAlertDialog
                isOpen={!!notifToDelete}
                onClose={() => setNotifToDelete(null)}
                onConfirm={confirmDeleteNotification}
                title="Delete Notification"
                description="Are you sure you want to delete this notification for all students? This action cannot be undone."
                isDeleting={isDeleting}
            />

            <DeleteAlertDialog
                isOpen={showClearAllDialog}
                onClose={() => setShowClearAllDialog(false)}
                onConfirm={confirmClearAll}
                title="Clear All Notifications"
                description={
                    <>
                        <span className="font-bold text-red-600">CRITICAL:</span> This will delete <span className="font-bold text-slate-900">ALL</span> notifications for <span className="font-bold text-slate-900">ALL</span> students. This action <span className="font-bold text-slate-900">cannot be undone</span>.
                    </>
                }
                isDeleting={isDeleting}
            />
        </AdminLayout>
    );
};

export default SendNotifications;
