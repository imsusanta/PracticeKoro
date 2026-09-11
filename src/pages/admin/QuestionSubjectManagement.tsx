import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FolderOpen, BookOpen, ChevronRight, MoreVertical, GripVertical, ListPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import { fetchAllRows } from "@/utils/questionSecurity";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Exam {
    id: string;
    name: string;
}

interface Subject {
    id: string;
    exam_id: string;
    name: string;
    description: string | null;
    icon?: string;
    color?: string;
    is_active?: boolean;
    created_at?: string;
    order_index?: number;
}

interface Topic {
    id: string;
    subject_id: string;
    name: string;
    description: string | null;
    order_index?: number;
    is_active?: boolean;
    created_at?: string;
}

// Sortable Subject Item Component
const SortableSubjectItem = ({ subject, isSelected, onClick, onEdit, onDelete, questionCount }: {
    subject: Subject;
    isSelected: boolean;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    questionCount: number;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subject.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={`p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between border ${isSelected
                ? "bg-blue-50/70 border-blue-600 shadow-xs ring-2 ring-blue-500/15"
                : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-slate-300"
                }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-slate-600 transition-colors shrink-0" onClick={e => e.stopPropagation()}>
                    <GripVertical className="w-4 h-4" />
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                    <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{subject.name}</p>
                    {subject.description && (
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{subject.description}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 border border-blue-200/60">
                    {questionCount} Q
                </Badge>
                <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "text-blue-600 translate-x-0.5" : "text-slate-300"}`} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl shadow-lg border-slate-200">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="gap-2 rounded-xl cursor-pointer">
                            <Pencil className="w-4 h-4 text-blue-600" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="gap-2 rounded-xl cursor-pointer text-rose-600 focus:text-rose-600">
                            <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

// Sortable Topic Item Component
const SortableTopicItem = ({ topic, index, onEdit, onDelete, questionCount }: {
    topic: Topic;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
    questionCount: number;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-slate-600 transition-colors shrink-0">
                    <GripVertical className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-violet-50 text-violet-700 text-xs font-black shrink-0 border border-violet-100">
                    {index + 1}
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{topic.name}</p>
                    {topic.description && (
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{topic.description}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold px-2.5 py-0.5 border border-violet-200/60">
                    {questionCount} Q
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl shadow-lg border-slate-200">
                        <DropdownMenuItem onClick={() => onEdit()} className="gap-2 rounded-xl cursor-pointer">
                            <Pencil className="w-4 h-4 text-blue-600" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete()} className="gap-2 rounded-xl cursor-pointer text-rose-600 focus:text-rose-600">
                            <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

const QuestionSubjectManagement = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

    // Dialog states
    const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
    const [topicDialogOpen, setTopicDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

    // Form data
    const [subjectForm, setSubjectForm] = useState({ name: "", description: "" });
    const [topicForm, setTopicForm] = useState({ name: "", description: "" });
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkTopicText, setBulkTopicText] = useState("");
    const [isSavingBulk, setIsSavingBulk] = useState(false);

    // Delete dialog states
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Question counts per subject/topic
    const [subjectQuestionCounts, setSubjectQuestionCounts] = useState<Record<string, number>>({});
    const [topicQuestionCounts, setTopicQuestionCounts] = useState<Record<string, number>>({});

    // Drag-drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Subject drag-end handler
    const handleSubjectDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = subjects.findIndex(s => s.id === active.id);
        const newIndex = subjects.findIndex(s => s.id === over.id);

        const reordered = arrayMove(subjects, oldIndex, newIndex);
        setSubjects(reordered);

        // Update order in database
        const updates = reordered.map((s, idx) => ({
            id: s.id,
            order_index: idx + 1
        }));

        for (const update of updates) {
            await supabase.from("subjects").update({ order_index: update.order_index } as any).eq("id", update.id);
        }
        toast({ title: "Reordered", description: "Subjects order saved" });
    };

    // Topic drag-end handler
    const handleTopicDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = topics.findIndex(t => t.id === active.id);
        const newIndex = topics.findIndex(t => t.id === over.id);

        const reordered = arrayMove(topics, oldIndex, newIndex);
        setTopics(reordered);

        // Update order in database
        const updates = reordered.map((t, idx) => ({
            id: t.id,
            order_index: idx + 1
        }));

        for (const update of updates) {
            await supabase.from("topics").update({ order_index: update.order_index } as any).eq("id", update.id);
        }
        toast({ title: "Reordered", description: "Topics order saved" });
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/admin/login"); return; }

        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .in("role", ["admin", "super_admin"])
            .maybeSingle();

        if (!roleData) {
            await supabase.auth.signOut();
            toast({ title: "Access Denied", description: "You do not have admin privileges", variant: "destructive" });
            navigate("/admin/login");
            return;
        }

        await Promise.all([loadSubjects()]);
        setLoading(false);
    };

    // loadExams removed

    const loadSubjects = async () => {
        // Build query for questions category
        // We look for category = 'questions' OR category is null (for legacy/migrated data)
        let { data, error } = await supabase
            .from("subjects")
            .select("id, exam_id, name, description, order_index")
            .or('category.eq.questions,category.is.null')
            .order("order_index", { ascending: true });

        if (error) {
            console.warn("Error loading subjects with category, falling back to all subjects:", error);
            // Fallback: try without category filter in case column doesn't exist
            const fallback = await supabase
                .from("subjects")
                .select("id, exam_id, name, description, order_index")
                .order("order_index", { ascending: true });

            data = fallback.data;
            error = fallback.error;
        }

        if (error) {
            toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
            return;
        }

        const subjectsData = data as Subject[] || [];
        setSubjects(subjectsData);
        const countMap: Record<string, number> = {};

        if (subjectsData.length > 0) {
            // SECURITY: Use fetchAllRows to bypass Supabase's 1000-row default limit
            const allQuestions = await fetchAllRows("questions", "subject");

            console.log("All questions fetched for counting:", allQuestions.length);

            // Count by matching subject name (trimmed, case-insensitive)
            allQuestions.forEach((q: any) => {
                const questionSubjectName = (q.subject || "").trim();
                if (questionSubjectName) {
                    const matchingSubject = subjectsData.find((s: any) =>
                        s.name.trim().toLowerCase() === questionSubjectName.toLowerCase()
                    );
                    if (matchingSubject) {
                        countMap[matchingSubject.id] = (countMap[matchingSubject.id] || 0) + 1;
                    }
                }
            });
            console.log("Subject count map:", countMap);
            setSubjectQuestionCounts(countMap);
        }
    };


    const loadTopics = async (subjectId: string) => {
        let { data, error } = await supabase
            .from("topics")
            .select("id, subject_id, name, description, order_index")
            .eq("subject_id", subjectId)
            .or('category.eq.questions,category.is.null')
            .order("order_index", { ascending: true });

        if (error) {
            console.warn("Error loading topics with category, falling back to all topics:", error);
            // Fallback: Try without category filter
            const fallback = await supabase
                .from("topics")
                .select("id, subject_id, name, description, order_index")
                .eq("subject_id", subjectId)
                .order("order_index", { ascending: true });

            data = fallback.data;
            error = fallback.error;
        }

        if (error) {
            toast({ title: "Error", description: "Failed to load topics", variant: "destructive" });
            return;
        }

        const topicsData = data as Topic[] || [];
        setTopics(topicsData);
        const countMap: Record<string, number> = {};

        if (topicsData.length > 0) {
            // Find the subject name for filtering
            const parentSubject = subjects.find(s => s.id === subjectId);
            const parentSubjectName = parentSubject?.name?.trim().toLowerCase() || "";

            // SECURITY: Use fetchAllRows to bypass Supabase's 1000-row default limit
            const allQuestions = await fetchAllRows("questions", "subject, topic");

            // Only count questions that belong to this subject (trimmed, case-insensitive)
            const subjectQuestions = parentSubjectName
                ? allQuestions.filter((q: any) => (q.subject || "").trim().toLowerCase() === parentSubjectName)
                : allQuestions;

            // Count by matching topic name (trimmed, case-insensitive)
            subjectQuestions.forEach((q: any) => {
                const questionTopicName = (q.topic || "").trim();
                if (questionTopicName) {
                    const matchingTopic = topicsData.find((t: any) =>
                        t.name.trim().toLowerCase() === questionTopicName.toLowerCase()
                    );
                    if (matchingTopic) {
                        countMap[matchingTopic.id] = (countMap[matchingTopic.id] || 0) + 1;
                    }
                }
            });
            console.log("Topic count map:", countMap);
            setTopicQuestionCounts(countMap);
        }
    };


    const selectSubject = async (subject: Subject) => {
        setSelectedSubject(subject);
        await loadTopics(subject.id);
    };

    // Subject CRUD
    const openCreateSubject = () => {
        setEditingSubject(null);
        setSubjectForm({ name: "", description: "" });
        setSubjectDialogOpen(true);
    };

    const openEditSubject = (subject: Subject) => {
        setEditingSubject(subject);
        setSubjectForm({ name: subject.name, description: subject.description || "" });
        setSubjectDialogOpen(true);
    };

    const handleSaveSubject = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        if (!subjectForm.name.trim()) {
            toast({ title: "Error", description: "Subject name is required", variant: "destructive" });
            return;
        }

        if (editingSubject) {
            const { error } = await supabase
                .from("subjects")
                .update({
                    name: subjectForm.name,
                    description: subjectForm.description || null,
                })
                .eq("id", editingSubject.id);

            if (error) {
                toast({ title: "Error", description: "Failed to update subject", variant: "destructive" });
                return;
            }
            toast({ title: "Success", description: "Subject updated" });
        } else {
            const { error } = await supabase
                .from("subjects")
                .insert([
                    {
                        name: subjectForm.name,
                        description: subjectForm.description || null,
                        created_by: session.user.id,
                        category: "questions"
                    },
                ]);

            if (error) {
                toast({ title: "Error", description: "Failed to create subject", variant: "destructive" });
                return;
            }
            toast({ title: "Success", description: "Subject created" });
        }

        setSubjectDialogOpen(false);
        await loadSubjects();
    };

    const handleDeleteSubject = async (subject: Subject) => {
        setSubjectToDelete(subject);
    };

    const confirmDeleteSubject = async () => {
        if (!subjectToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from("subjects").delete().eq("id", subjectToDelete.id);
            if (error) throw error;
            toast({ title: "Success", description: "Subject deleted" });
            if (selectedSubject?.id === subjectToDelete.id) {
                setSelectedSubject(null);
                setTopics([]);
            }
            await loadSubjects();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete subject", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setSubjectToDelete(null);
        }
    };

    // Topic CRUD
    const openCreateTopic = () => {
        if (!selectedSubject) return;
        setEditingTopic(null);
        setTopicForm({ name: "", description: "" });
        setBulkMode(false);
        setBulkTopicText("");
        setTopicDialogOpen(true);
    };

    const openEditTopic = (topic: Topic) => {
        setEditingTopic(topic);
        setTopicForm({ name: topic.name, description: topic.description || "" });
        setTopicDialogOpen(true);
    };

    const handleSaveTopic = async () => {
        if (!selectedSubject) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        if (editingTopic) {
            const { error } = await supabase
                .from("topics")
                .update({ name: topicForm.name, description: topicForm.description || null })
                .eq("id", editingTopic.id);

            if (error) {
                toast({ title: "Error", description: "Failed to update topic", variant: "destructive" });
                return;
            }
            toast({ title: "Success", description: "Topic updated" });
        } else {
            const maxOrder = topics.length > 0 ? Math.max(...topics.map(t => t.order_index || 0)) : 0;
            const { error } = await supabase
                .from("topics")
                .insert([
                    {
                        subject_id: selectedSubject.id,
                        name: topicForm.name,
                        description: topicForm.description || null,
                        created_by: session.user.id,
                        category: "questions",
                        order_index: maxOrder + 1
                    },
                ]);

            if (error) {
                toast({ title: "Error", description: "Failed to create topic", variant: "destructive" });
                return;
            }
            toast({ title: "Success", description: "Topic created" });
        }

        setTopicDialogOpen(false);
        await loadTopics(selectedSubject.id);
    };

    const handleBulkSaveTopic = async () => {
        if (!selectedSubject || !bulkTopicText.trim()) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Helper to strip list prefixes like "1.", "2)", "*", "-", "•"
        {/* eslint-disable-next-line no-useless-escape -- \- in [*-•] prevents a range; intentional. */}
        const cleanBulkLine = (line: string) => line.replace(/^\s*(?:\d+[.)\-]\s*|[*\-•]\s*)/, "").trim();

        const lines = bulkTopicText
            .split("\n")
            .map(line => cleanBulkLine(line))
            .filter(line => line.length > 0);

        if (lines.length === 0) {
            toast({ title: "Error", description: "No topics to add", variant: "destructive" });
            return;
        }

        setIsSavingBulk(true);
        const maxOrder = topics.length > 0 ? Math.max(...topics.map(t => t.order_index || 0)) : 0;

        const topicsToInsert = lines.map((name, idx) => ({
            subject_id: selectedSubject.id,
            name,
            description: null,
            created_by: session.user.id,
            category: "questions",
            order_index: maxOrder + idx + 1
        }));

        const { error } = await supabase.from("topics").insert(topicsToInsert);

        if (error) {
            toast({ title: "Error", description: "Failed to add topics in bulk", variant: "destructive" });
            setIsSavingBulk(false);
            return;
        }

        toast({ title: "Success", description: `${lines.length} topics added successfully` });
        setIsSavingBulk(false);
        setTopicDialogOpen(false);
        setBulkTopicText("");
        await loadTopics(selectedSubject.id);
    };

    const handleDeleteTopic = async (topic: Topic) => {
        setTopicToDelete(topic);
    };

    const confirmDeleteTopic = async () => {
        if (!topicToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from("topics").delete().eq("id", topicToDelete.id);
            if (error) throw error;
            toast({ title: "Success", description: "Topic deleted" });
            if (selectedSubject) await loadTopics(selectedSubject.id);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete topic", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setTopicToDelete(null);
        }
    };

    const CreateSubjectButton = (
        <Button onClick={openCreateSubject} size="icon" className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 text-white">
            <Plus className="w-5 h-5" />
        </Button>
    );

    if (loading) {
        return (
            <AdminLayout title="Subject Management" subtitle="Manage subjects and topics for questions">
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Subject Management" subtitle="Manage subjects and topics for questions" headerActions={CreateSubjectButton}>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            <FolderOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Question Subjects & Topics</h1>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Organize curriculum hierarchy, reorder chapters, and map questions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
                            {subjects.length} Subjects · {topics.length} Selected Topics
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                    {/* Subjects List */}
                    <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                Subjects ({subjects.length})
                            </h3>
                            <Button onClick={openCreateSubject} size="sm" className="rounded-xl h-9 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                                <Plus className="w-4 h-4 mr-1" /> Add Subject
                            </Button>
                        </div>
                        <CardContent className="p-4 sm:p-5">
                            {subjects.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                                        <FolderOpen className="w-6 h-6" />
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium">No subjects yet</p>
                                    <Button onClick={openCreateSubject} size="sm" className="mt-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                        <Plus className="w-4 h-4 mr-1" /> Add First Subject
                                    </Button>
                                </div>
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubjectDragEnd}>
                                    <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-3">
                                            {subjects.map(subject => (
                                                <SortableSubjectItem
                                                    key={subject.id}
                                                    subject={subject}
                                                    isSelected={selectedSubject?.id === subject.id}
                                                    onClick={() => selectSubject(subject)}
                                                    onEdit={() => openEditSubject(subject)}
                                                    onDelete={() => handleDeleteSubject(subject)}
                                                    questionCount={subjectQuestionCounts[subject.id] || 0}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </CardContent>
                    </Card>

                    {/* Topics List */}
                    <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                                <span className="w-2 h-2 rounded-full bg-violet-600" />
                                Topics {selectedSubject && `(${topics.length})`}
                            </h3>
                            {selectedSubject && (
                                <Button onClick={openCreateTopic} size="sm" className="rounded-xl h-9 font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-xs">
                                    <Plus className="w-4 h-4 mr-1" /> Add Topic
                                </Button>
                            )}
                        </div>
                        <CardContent className="p-4 sm:p-5">
                            {!selectedSubject ? (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <p className="text-slate-600 font-bold text-sm">Select a Subject</p>
                                    <p className="text-slate-400 text-xs mt-1">Choose any subject from the left panel to manage its topics</p>
                                </div>
                            ) : topics.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-50/60 border border-violet-100 flex items-center justify-center mx-auto mb-3 text-violet-600">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <p className="text-slate-700 font-bold text-sm">No topics in {selectedSubject.name}</p>
                                    <Button onClick={openCreateTopic} size="sm" className="mt-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold">
                                        <Plus className="w-4 h-4 mr-1" /> Add First Topic
                                    </Button>
                                </div>
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTopicDragEnd}>
                                    <SortableContext items={topics.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-3">
                                            {topics.map((topic, idx) => (
                                                <SortableTopicItem
                                                    key={topic.id}
                                                    topic={topic}
                                                    index={idx}
                                                    onEdit={() => openEditTopic(topic)}
                                                    onDelete={() => handleDeleteTopic(topic)}
                                                    questionCount={topicQuestionCounts[topic.id] || 0}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Subject Dialog */}
            <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingSubject ? "Edit Subject" : "Create Subject"}</DialogTitle>
                        <DialogDescription>
                            {editingSubject ? "Update subject details" : "Add a new subject for questions"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Subject Name *</Label>
                            <Input
                                value={subjectForm.name}
                                onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                                placeholder="e.g., Physics, Chemistry"
                                className="h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={subjectForm.description}
                                onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })}
                                placeholder="Brief description"
                                rows={2}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSubjectDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button onClick={handleSaveSubject} disabled={!subjectForm.name.trim()} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
                            {editingSubject ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Topic Dialog */}
            <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingTopic ? "Edit Topic" : "Add Topics"}</DialogTitle>
                        <DialogDescription>
                            {selectedSubject && `${editingTopic ? "Update" : "Add"} topic${!editingTopic ? "(s)" : ""} in ${selectedSubject.name}`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Tabs - only show when creating new */}
                    {!editingTopic && (
                        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setBulkMode(false)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                    !bulkMode
                                        ? "bg-white shadow-sm text-violet-700"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <Plus className="w-4 h-4" />
                                Single Topic
                            </button>
                            <button
                                onClick={() => setBulkMode(true)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                    bulkMode
                                        ? "bg-white shadow-sm text-violet-700"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <ListPlus className="w-4 h-4" />
                                Bulk Topics
                            </button>
                        </div>
                    )}

                    <div className="space-y-4 py-2">
                        {bulkMode && !editingTopic ? (
                            /* Bulk Mode */
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Topics (one per line) *</Label>
                                    <Textarea
                                        value={bulkTopicText}
                                        onChange={e => setBulkTopicText(e.target.value)}
                                        placeholder={"Topic 1\nTopic 2\nTopic 3\n..."}
                                        rows={10}
                                        className="rounded-xl font-mono text-sm leading-relaxed"
                                    />
                                </div>
                                {bulkTopicText.trim() && (
                                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                                        <p className="text-xs font-semibold text-violet-700 mb-1">
                                            {/* eslint-disable-next-line no-useless-escape -- \- in [*-•] prevents a range; intentional. */}
                                            📋 {bulkTopicText.split("\n").map(l => l.replace(/^\s*(?:\d+[.)\-]\s*|[*\-•]\s*)/, "").trim()).filter(l => l).length} topics will be added
                                        </p>
                                        <div className="max-h-24 overflow-y-auto space-y-0.5">
                                            {/* eslint-disable-next-line no-useless-escape -- \- in [*-•] prevents a range; intentional. */}
                                            {bulkTopicText.split("\n").map(l => l.replace(/^\s*(?:\d+[.)\-]\s*|[*\-•]\s*)/, "").trim()).filter(l => l).map((line, i) => (
                                                <p key={i} className="text-xs text-violet-600 truncate">
                                                    {i + 1}. {line}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Single Mode */
                            <>
                                <div className="space-y-2">
                                    <Label>Topic Name *</Label>
                                    <Input
                                        value={topicForm.name}
                                        onChange={e => setTopicForm({ ...topicForm, name: e.target.value })}
                                        placeholder="e.g., Heat, Light, Mechanics"
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={topicForm.description}
                                        onChange={e => setTopicForm({ ...topicForm, description: e.target.value })}
                                        placeholder="Brief description"
                                        rows={2}
                                        className="rounded-xl"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setTopicDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        {bulkMode && !editingTopic ? (
                            <Button
                                onClick={handleBulkSaveTopic}
                                disabled={!bulkTopicText.trim() || isSavingBulk}
                                className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600"
                            >
                                {isSavingBulk ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Adding...</>
                                ) : (
                                    {/* eslint-disable-next-line no-useless-escape -- \- in [*-•] prevents a range; intentional. */}
                                    <><ListPlus className="w-4 h-4 mr-2" /> Add {bulkTopicText.split("\n").map(l => l.replace(/^\s*(?:\d+[.)\-]\s*|[*\-•]\s*)/, "").trim()).filter(l => l).length} Topics</>
                                )}
                            </Button>
                        ) : (
                            <Button onClick={handleSaveTopic} disabled={!topicForm.name.trim()} className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600">
                                {editingTopic ? "Update" : "Create"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteAlertDialog
                isOpen={!!subjectToDelete}
                onClose={() => setSubjectToDelete(null)}
                onConfirm={confirmDeleteSubject}
                title="Delete Subject"
                description={
                    <>
                        Are you sure you want to delete <span className="font-bold text-slate-900">"{subjectToDelete?.name}"</span>?
                        This will also delete all topics and questions under it. This action cannot be undone.
                    </>
                }
                isDeleting={isDeleting}
            />

            <DeleteAlertDialog
                isOpen={!!topicToDelete}
                onClose={() => setTopicToDelete(null)}
                onConfirm={confirmDeleteTopic}
                title="Delete Topic"
                itemName={topicToDelete?.name}
                isDeleting={isDeleting}
            />
        </AdminLayout>
    );
};

export default QuestionSubjectManagement;
