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
            className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between ${isSelected
                ? "bg-emerald-50 border-2 border-emerald-500"
                : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                }`}
        >
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded" onClick={e => e.stopPropagation()}>
                    <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <p className="font-semibold text-gray-900 text-sm">{subject.name}</p>
                    {subject.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{subject.description}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs font-medium px-2">
                    {questionCount} Q
                </Badge>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
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
        <div ref={setNodeRef} style={style} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <Badge variant="secondary" className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-100 text-violet-600 text-xs">
                    {index + 1}
                </Badge>
                <div>
                    <p className="font-medium text-gray-900 text-sm">{topic.name}</p>
                    {topic.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{topic.description}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs font-medium px-2">
                    {questionCount} Q
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => onEdit()}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete()} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
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
            console.error("Error loading subjects with category:", error);
            // Fallback: try without order_index or just search by category
            const fallback = await supabase
                .from("subjects")
                .select("id, exam_id, name, description, order_index")
                .or('category.eq.questions,category.is.null')
                .order("name");

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
            // Fallback: Try without order_index
            const fallback = await supabase
                .from("topics")
                .select("id, subject_id, name, description, order_index")
                .eq("subject_id", subjectId)
                .or('category.eq.questions,category.is.null')
                .order("name");

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
        <Button onClick={openCreateSubject} size="icon" className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 border border-white/20">
            <Plus className="w-5 h-5" />
        </Button>
    );

    if (loading) {
        return (
            <AdminLayout title="Subject Management" subtitle="Manage subjects and topics for questions">
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Subject Management" subtitle="Manage subjects and topics for questions" headerActions={CreateSubjectButton}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subjects List */}
                <Card className="border-0 bg-white rounded-2xl">
                    <CardContent className="p-4">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-emerald-600" />
                            Subjects ({subjects.length})
                        </h3>

                        {subjects.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">No subjects yet</p>
                                <Button onClick={openCreateSubject} size="sm" className="mt-3 rounded-xl">
                                    <Plus className="w-4 h-4 mr-1" /> Add Subject
                                </Button>
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubjectDragEnd}>
                                <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
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
                <Card className="border-0 bg-white rounded-2xl">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-violet-600" />
                                Topics {selectedSubject && `(${topics.length})`}
                            </h3>
                            {selectedSubject && (
                                <Button onClick={openCreateTopic} size="sm" className="rounded-xl h-8">
                                    <Plus className="w-4 h-4 mr-1" /> Add Topic
                                </Button>
                            )}
                        </div>

                        {!selectedSubject ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">Select a subject to view topics</p>
                            </div>
                        ) : topics.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">No topics in {selectedSubject.name}</p>
                                <Button onClick={openCreateTopic} size="sm" className="mt-3 rounded-xl">
                                    <Plus className="w-4 h-4 mr-1" /> Add Topic
                                </Button>
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTopicDragEnd}>
                                <SortableContext items={topics.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
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
                                            📋 {bulkTopicText.split("\n").map(l => l.replace(/^\s*(?:\d+[.)\-]\s*|[*\-•]\s*)/, "").trim()).filter(l => l).length} topics will be added
                                        </p>
                                        <div className="max-h-24 overflow-y-auto space-y-0.5">
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
