import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    getConversation,
    sendMessage,
    markMessagesAsRead,
    getStudentUnreadCount,
    subscribeToChat,
    unsubscribeFromChat,
    ChatMessage,
} from "@/config/chat";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface StudentChatProps {
    studentId: string;
    studentName: string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const StudentChat = ({ studentId, studentName, isOpen: controlledOpen, onOpenChange }: StudentChatProps) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open);
        }
        setInternalOpen(open);
    };
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadMessages = async (showSpinner = false) => {
        if (showSpinner) setLoading(true);
        try {
            const conv = await getConversation(studentId);
            if (conv) {
                setMessages(conv.messages);
            } else {
                setMessages([]);
            }
            const count = await getStudentUnreadCount(studentId);
            setUnreadCount(count);
        } catch (e) {
            console.error("Error loading messages:", e);
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    // Initial load and polling for new messages
    useEffect(() => {
        loadMessages(true);

        // Poll for new messages every 3 seconds (fallback for realtime)
        const pollInterval = setInterval(() => {
            loadMessages();
        }, 3000);

        // Also try real-time subscription
        let channel: ReturnType<typeof subscribeToChat> | null = null;
        try {
            channel = subscribeToChat(studentId, (newMsg) => {
                setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                if (isOpen && newMsg.sender_role === "admin") {
                    markMessagesAsRead(studentId, "student");
                } else if (newMsg.sender_role === "admin") {
                    setUnreadCount((prev) => prev + 1);
                }
            });
        } catch (e) {
            console.error("Error subscribing to chat:", e);
        }

        return () => {
            clearInterval(pollInterval);
            if (channel) {
                unsubscribeFromChat(channel);
            }
        };
    }, [studentId]);

    // When chat opens, load fresh messages and mark as read
    useEffect(() => {
        if (isOpen) {
            loadMessages();
            markMessagesAsRead(studentId, "student");
            setUnreadCount(0);
        }
    }, [isOpen]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages.length]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async () => {
        if (!newMessage.trim() || loading || isSending) return;

        setIsSending(true);
        try {
            const result = await sendMessage(
                studentId,
                studentId,
                "student",
                newMessage.trim()
            );
            if (result) {
                setNewMessage("");
                // Add message immediately to UI
                setMessages(prev => [...prev, result]);
            } else {
                toast.error("Message didn't send. Try again.");
            }
        } catch (e) {
            console.error("Error sending message:", e);
            toast.error("Message didn't send. Try again.");
        }
        setIsSending(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="student-chat-title"
                    className="fixed inset-x-0 top-0 bottom-2 z-[100] md:inset-auto md:bottom-4 md:right-4 md:w-[400px] md:h-[550px] flex flex-col md:rounded-[28px] overflow-hidden"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    {/* ═══════════════════════════════════════════════════════════════
                        PREMIUM GRADIENT HEADER
                        ═══════════════════════════════════════════════════════════════ */}
                    <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-4 flex items-center justify-between shrink-0 relative overflow-hidden">
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:16px_16px]" />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                            transition={{ duration: 6, repeat: Infinity }}
                            className="absolute -top-12 -right-12 w-32 h-32 bg-white/15 rounded-full blur-2xl"
                        />

                        <div className="flex items-center gap-3.5 relative z-10">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-lg"
                            >
                                <MessageCircle className="w-5 h-5 text-white" />
                            </motion.div>
                            <div>
                                <h3 id="student-chat-title" className="text-white font-bold text-base">Student Support</h3>
                                <p className="text-white/70 text-xs font-medium">We usually reply within a few hours</p>
                            </div>
                        </div>
                        <motion.button
                            type="button"
                            aria-label="Close chat"
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsOpen(false)}
                            className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 relative z-10 hover:bg-white/25 transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </motion.button>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        MESSAGES AREA - ULTRA PREMIUM
                        ═══════════════════════════════════════════════════════════════ */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white">
                        {loading && messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-slate-400 text-sm font-medium">Loading conversation…</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-16"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                    className="w-20 h-20 mx-auto rounded-[24px] bg-gradient-to-br from-indigo-100 via-violet-100 to-purple-100 flex items-center justify-center mb-5 shadow-xl"
                                >
                                    <Sparkles className="w-10 h-10 text-indigo-500" />
                                </motion.div>
                                <h4 className="text-slate-900 font-bold text-lg mb-1.5">Start a conversation</h4>
                                <p className="text-slate-400 text-sm max-w-[250px] mx-auto">
                                    Ask any question or share feedback with our support team
                                </p>
                            </motion.div>
                        ) : (
                            <>
                                {messages.map((msg, index) => {
                                    const showDate = index === 0 ||
                                        formatDate(msg.created_at) !== formatDate(messages[index - 1].created_at);
                                    const isStudent = msg.sender_role === "student";

                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-center my-5"
                                                >
                                                    <span className="text-[10px] font-bold text-slate-400 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100 uppercase tracking-wider">
                                                        {formatDate(msg.created_at)}
                                                    </span>
                                                </motion.div>
                                            )}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
                                            >
                                                <div
                                                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${isStudent
                                                        ? "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white rounded-br-md shadow-lg shadow-indigo-500/25"
                                                        : "bg-white text-slate-800 shadow-lg border border-slate-100 rounded-bl-md"
                                                        }`}
                                                >
                                                    {!isStudent && (
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                                                <span className="text-[8px] font-bold text-white">A</span>
                                                            </div>
                                                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Admin</p>
                                                        </div>
                                                    )}
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                                    <p className={`text-[10px] mt-2 ${isStudent ? "text-white/60" : "text-slate-400"}`}>
                                                        {formatTime(msg.created_at)}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        INPUT AREA - ULTRA PREMIUM
                        ═══════════════════════════════════════════════════════════════ */}
                    <div
                        className="p-4 bg-white border-t border-slate-100 shrink-0"
                        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
                    >
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                aria-label="Message"
                                className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-100 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                            />
                            <motion.button
                                type="button"
                                aria-label="Send message"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSend}
                                disabled={!newMessage.trim() || loading || isSending}
                                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                                style={{ boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                                <Send className="w-5 h-5 text-white relative z-10" />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StudentChat;
