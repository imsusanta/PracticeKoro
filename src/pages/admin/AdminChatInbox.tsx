import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, ArrowLeft, User, Trash2, Search, Users } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import {
    getAllConversations,
    getConversation,
    sendMessage,
    markMessagesAsRead,
    deleteConversation,
    subscribeToAllChats,
    unsubscribeFromChat,
    ChatConversation,
    ChatMessage,
} from "@/config/chat";

interface Student {
    id: string;
    full_name: string;
    whatsapp_number?: string;
}

const AdminChatInbox = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [selectedStudentName, setSelectedStudentName] = useState<string>("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllStudents, setShowAllStudents] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [adminId, setAdminId] = useState<string>("");
    const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadStudents = useCallback(async () => {
        const { data } = await supabase
            .from("profiles")
            .select("id, full_name, whatsapp_number")
            .order("full_name");
        if (data) {
            setAllStudents(data);
        }
    }, []);

    const loadConversations = useCallback(async () => {
        try {
            const all = await getAllConversations();
            const convList = Object.values(all).sort((a, b) =>
                new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );
            setConversations(convList);
        } catch (e) {
            console.error("Error loading conversations:", e);
        }
    }, []);

    const loadMessages = useCallback(async (studentId: string) => {
        try {
            const conv = await getConversation(studentId);
            if (conv) {
                setMessages(conv.messages);
                await markMessagesAsRead(studentId, "admin");
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.error("Error loading messages:", e);
        }
    }, []);

    const checkAuth = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/admin/login");
            return;
        }
        setAdminId(session.user.id);
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["admin", "super_admin"]).maybeSingle();
        if (!roleData) {
            await supabase.auth.signOut();
            navigate("/admin/login");
            return;
        }
        await loadStudents();
        await loadConversations();
        setLoading(false);
    }, [navigate, loadStudents, loadConversations]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Real-time subscription + polling fallback
    useEffect(() => {
        // Poll for new messages every 3 seconds (fallback for realtime)
        const pollInterval = setInterval(() => {
            loadConversations();
            if (selectedStudent) {
                loadMessages(selectedStudent);
            }
        }, 3000);

        let channel: ReturnType<typeof subscribeToAllChats> | null = null;
        try {
            channel = subscribeToAllChats((newMsg) => {
                // Update messages if this is the selected student
                if (selectedStudent && newMsg.student_id === selectedStudent) {
                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
                // Reload conversations to update unread counts
                loadConversations();
            });
        } catch (e) {
            console.error("Error subscribing to chats:", e);
        }

        return () => {
            clearInterval(pollInterval);
            if (channel) {
                unsubscribeFromChat(channel);
            }
        };
    }, [selectedStudent, loadConversations, loadMessages]);

    useEffect(() => {
        if (selectedStudent) {
            loadMessages(selectedStudent);
        }
    }, [selectedStudent]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const handleSelectStudent = useCallback((studentId: string, studentName: string) => {
        setSelectedStudent(studentId);
        setSelectedStudentName(studentName);
        loadMessages(studentId);
    }, [loadMessages]);

    const handleSend = useCallback(async () => {
        if (!newMessage.trim() || !selectedStudent || !adminId) return;

        await sendMessage(
            selectedStudent,
            adminId,
            "admin",
            newMessage.trim()
        );
        setNewMessage("");
        await loadMessages(selectedStudent);
        await loadConversations();
    }, [newMessage, selectedStudent, adminId, loadMessages, loadConversations]);

    const handleDelete = useCallback(async (studentId: string) => {
        setStudentToDelete(studentId);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!studentToDelete) return;
        setIsDeleting(true);
        try {
            await deleteConversation(studentToDelete);
            setSelectedStudent(null);
            await loadConversations();
            toast({ title: "Conversation deleted" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error deleting conversation", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setStudentToDelete(null);
        }
    }, [studentToDelete, loadConversations, toast]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    };

    // Filter students based on search
    const filteredStudents = allStudents.filter(s =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.whatsapp_number?.includes(searchQuery)
    );

    // Get conversation stats for each student
    const getStudentConv = (studentId: string) => conversations.find(c => c.studentId === studentId);

    if (loading) {
        return (
            <AdminLayout title="Chat Inbox" subtitle="Student messages">
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Chat Inbox" subtitle="Chat with students">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-160px)] md:h-[calc(100vh-200px)] min-h-[500px]">
                {/* Students/Conversations List */}
                <Card className={`border-0 rounded-2xl overflow-hidden flex flex-col ${selectedStudent ? "hidden lg:flex" : "flex"}`}>
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100/50 py-3 px-4">
                        <div className="flex items-center justify-between mb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                {showAllStudents ? (
                                    <>
                                        <Users className="w-5 h-5 text-emerald-600" />
                                        All Students
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-5 h-5 text-emerald-600" />
                                        Chats
                                    </>
                                )}
                                {!showAllStudents && conversations.filter(c => c.unreadByAdmin > 0).length > 0 && (
                                    <Badge className="bg-red-500 text-white border-0 ml-2">
                                        {conversations.filter(c => c.unreadByAdmin > 0).length}
                                    </Badge>
                                )}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllStudents(!showAllStudents)}
                                className="text-xs text-emerald-600 hover:text-emerald-700"
                            >
                                {showAllStudents ? "Show Chats" : "All Students"}
                            </Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 rounded-xl border-gray-200"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto max-h-[calc(100%-120px)]">
                        {showAllStudents ? (
                            // All Students List
                            filteredStudents.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <p className="text-gray-500 font-medium">No students found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredStudents.map((student) => {
                                        const conv = getStudentConv(student.id);
                                        return (
                                            <div
                                                key={student.id}
                                                onClick={() => handleSelectStudent(student.id, student.full_name || "Student")}
                                                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedStudent === student.id ? "bg-emerald-50" : ""
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                                        <span className="text-emerald-700 font-bold text-sm">
                                                            {student.full_name?.[0]?.toUpperCase() || "S"}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">{student.full_name || "Unknown"}</p>
                                                        <p className="text-xs text-gray-400">{student.whatsapp_number || "No number"}</p>
                                                    </div>
                                                    {conv && conv.unreadByAdmin > 0 && (
                                                        <span className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                                                            {conv.unreadByAdmin}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            // Conversations List
                            conversations.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                                        <MessageCircle className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 font-medium">No chats yet</p>
                                    <p className="text-gray-400 text-sm mt-1">Click "All Students" to start a chat</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {conversations
                                        .filter(conv =>
                                            conv.studentName.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((conv) => (
                                            <div
                                                key={conv.studentId}
                                                onClick={() => handleSelectStudent(conv.studentId, conv.studentName)}
                                                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedStudent === conv.studentId ? "bg-emerald-50" : ""
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                                        <User className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-medium text-gray-900 truncate">{conv.studentName}</p>
                                                            <span className="text-xs text-gray-400">{formatTime(conv.lastMessageAt)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-0.5">
                                                            <p className="text-sm text-gray-500 truncate">
                                                                {conv.messages[conv.messages.length - 1]?.message || "No messages"}
                                                            </p>
                                                            {conv.unreadByAdmin > 0 && (
                                                                <span className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                                                                    {conv.unreadByAdmin}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className={`border-0 rounded-2xl overflow-hidden lg:col-span-2 flex flex-col ${!selectedStudent ? "hidden lg:flex" : "flex"}`}>
                    {selectedStudent ? (
                        <>
                            {/* Chat Header */}
                            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 py-4 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedStudent(null)}
                                            className="lg:hidden w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"
                                        >
                                            <ArrowLeft className="w-5 h-5 text-white" />
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{selectedStudentName}</p>
                                            <p className="text-white/70 text-xs">Student</p>
                                        </div>
                                    </div>
                                    {messages.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(selectedStudent)}
                                            className="text-white/70 hover:text-white hover:bg-white/20"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                                {messages.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                                            <Send className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <p className="text-gray-600 font-medium">Start the conversation</p>
                                        <p className="text-gray-400 text-sm mt-1">Send a message to {selectedStudentName}</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isAdmin = msg.sender_role === "admin";
                                        return (
                                            <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                                                <div
                                                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${isAdmin
                                                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md"
                                                        : "bg-white text-gray-800 shadow-sm rounded-bl-md"
                                                        }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                    <p className={`text-[10px] mt-1 ${isAdmin ? "text-white/70" : "text-gray-400"}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                        placeholder="Type a message..."
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!newMessage.trim()}
                                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600"
                                    >
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                                    <MessageCircle className="w-10 h-10 text-emerald-600" />
                                </div>
                                <p className="text-gray-600 font-medium">Select a student to chat</p>
                                <p className="text-gray-400 text-sm mt-1">Choose from the list or search by name</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
            <DeleteAlertDialog
                isOpen={!!studentToDelete}
                onClose={() => setStudentToDelete(null)}
                onConfirm={confirmDelete}
                itemName="this conversation"
                isDeleting={isDeleting}
            />
        </AdminLayout>
    );
};

export default AdminChatInbox;
