import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Power, PowerOff, BookOpen, MoreVertical, Calendar, Eye, EyeOff, ChevronRight, GripVertical, Clock, Target, FileText, Search } from "lucide-react";
import { logAdminAction } from "@/lib/adminAudit";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import { isExamVisibleOnLanding, toggleExamLandingVisibility } from "@/config/landingVisibility";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Exam {
    id: string;
    name: string;
    description: string | null;
    category?: string | null;
    is_active: boolean;
    is_paid: boolean;
    price: number;
    created_at: string;
    created_by: string;
    order_index?: number;
    test_count?: number;
    question_count?: number;
}

interface MockTest {
    id: string;
    exam_id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    total_marks: number;
    passing_marks: number;
    test_type: "full_mock" | "topic_wise" | "pyq";
    negative_marking?: boolean;
    negative_marks_per_question?: number;
    is_published: boolean;
    is_paid: boolean;
    price: number;
    created_at: string;
    test_questions?: { count: number }[];
}

// Sortable Exam Item Component
const SortableExamItem = ({
    exam,
    isSelected,
    onClick,
    onEdit,
    onDelete,
    onToggleActive,
    onToggleVisibility,
    visibility
}: {
    exam: Exam;
    isSelected: boolean;
    onClick: () => void;
    onEdit: (e: Exam) => void;
    onDelete: (id: string) => void;
    onToggleActive: (e: Exam) => void;
    onToggleVisibility: (id: string, name: string) => void;
    visibility: boolean;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exam.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${isSelected
                ? "bg-blue-50/70 border-2 border-blue-600 shadow-sm"
                : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded shrink-0" onClick={e => e.stopPropagation()}>
                    <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${exam.is_active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-200 text-gray-400"
                    }`}>
                    <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{exam.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {exam.category && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                {exam.category}
                            </Badge>
                        )}
                        {!exam.is_active && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-200 text-gray-600">INACTIVE</Badge>
                        )}
                        {exam.is_paid ? (
                            <span className="text-[10px] font-semibold text-blue-600">₹{exam.price}</span>
                        ) : (
                            <span className="text-[10px] font-semibold text-emerald-600">FREE</span>
                        )}
                        {visibility && <Eye className="w-3 h-3 text-blue-600" />}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-blue-50">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(exam); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit Exam
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleActive(exam); }}>
                            {exam.is_active ? <PowerOff className="w-4 h-4 mr-2" /> : <Power className="w-4 h-4 mr-2" />}
                            {exam.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleVisibility(exam.id, exam.name); }}>
                            {visibility ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                            {visibility ? "Hide from Landing" : "Show on Landing"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(exam.id); }} className="text-red-600 focus:text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Exam
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "text-blue-600 translate-x-1" : "text-gray-300"}`} />
            </div>
        </div>
    );
};

// Sortable Mock Test Item Component
const SortableMockTestItem = ({ mockTest, index, onEdit, onDelete }: {
    mockTest: MockTest;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}) => {
    return (
        <div className="p-4 rounded-xl bg-gray-50 hover:bg-blue-50/20 transition-all border border-gray-100 flex items-center justify-between group">
            <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm text-blue-600 font-bold text-xs">
                    {index + 1}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{mockTest.title}</h4>
                        {mockTest.test_type === "pyq" ? (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                                PYQ
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                Full Mock
                            </Badge>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 mt-1">
                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {mockTest.duration_minutes}m
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Target className="w-3 h-3 text-blue-500" />
                            {mockTest.total_marks} Marks
                        </div>
                        {mockTest.negative_marking ? (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-rose-50 text-rose-700 border-rose-200">
                                -{mockTest.negative_marks_per_question ?? 0.25} Neg
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200">
                                No Neg
                            </Badge>
                        )}
                        <div className="flex items-center gap-1 text-[11px] text-purple-600 font-medium">
                            <FileText className="w-3 h-3" />
                            {mockTest.test_questions?.[0]?.count || 0} Qs
                        </div>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-medium ${mockTest.is_published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500"}`}>
                            {mockTest.is_published ? "PUBLISHED" : "DRAFT"}
                        </Badge>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={onEdit} className="w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm">
                    <Pencil className="w-4 h-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete} className="w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm">
                    <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
            </div>
        </div>
    );
};

const ExamManagement = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [exams, setExams] = useState<Exam[]>([]);
    const [mockTests, setMockTests] = useState<MockTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [testsLoading, setTestsLoading] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

    // Dialog states
    const [examDialogOpen, setExamDialogOpen] = useState(false);
    const [mockTestDialogOpen, setMockTestDialogOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [editingMockTest, setEditingMockTest] = useState<MockTest | null>(null);

    // Form states
    const [examFormData, setExamFormData] = useState({
        name: "",
        description: "",
        category: "State Govt.",
        is_active: true,
        is_paid: false,
        price: 0
    });

    const [mockTestFormData, setMockTestFormData] = useState({
        title: "",
        description: "",
        duration_minutes: 60,
        total_marks: 100,
        passing_marks: 33,
        test_type: "full_mock" as "full_mock" | "topic_wise" | "pyq",
        negative_marking: false,
        negative_marks_per_question: 0.25,
        is_published: true,
        is_paid: false
    });

    const [landingVisibility, setLandingVisibility] = useState<{ [key: string]: boolean }>({});
    const [examToDelete, setExamToDelete] = useState<string | null>(null);
    const [mockTestToDelete, setMockTestToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
            .eq("role", "admin")
            .maybeSingle();

        if (!roleData) {
            await supabase.auth.signOut();
            toast({ title: "Access Denied", description: "You do not have admin privileges", variant: "destructive" });
            navigate("/admin/login");
            return;
        }
        await loadExams();
        setLoading(false);
    };

    const loadExams = async () => {
        try {
            let { data, error } = await supabase
                .from("exams")
                .select("*")
                .order("order_index", { ascending: true });

            if (error) {
                if (error.code === '42703') {
                    const fallback = await supabase.from("exams").select("*").order("created_at", { ascending: true });
                    if (fallback.error) throw fallback.error;
                    data = fallback.data;
                } else throw error;
            }

            const loaded = (data as Exam[]) || [];
            const ids = loaded.map((exam) => exam.id);
            let testCounts = new Map<string, number>();
            let questionCounts = new Map<string, number>();

            if (ids.length > 0) {
                const [testsResult, questionsResult] = await Promise.all([
                    supabase.from("mock_tests").select("exam_id"),
                    supabase.from("questions").select("exam_id"),
                ]);
                (testsResult.data || []).forEach((row) => {
                    if (!row.exam_id) return;
                    testCounts.set(row.exam_id, (testCounts.get(row.exam_id) || 0) + 1);
                });
                (questionsResult.data || []).forEach((row) => {
                    if (!row.exam_id) return;
                    questionCounts.set(row.exam_id, (questionCounts.get(row.exam_id) || 0) + 1);
                });
            }

            const examsList = loaded.map((exam) => ({
                ...exam,
                test_count: testCounts.get(exam.id) || 0,
                question_count: questionCounts.get(exam.id) || 0,
            }));
            setExams(examsList);

            // Update landing visibility
            const visibility: { [key: string]: boolean } = {};
            examsList.forEach((exam: Exam) => {
                visibility[exam.id] = isExamVisibleOnLanding(exam.id);
            });
            setLandingVisibility(visibility);

            // Select first exam if none selected
            if (examsList.length > 0 && !selectedExamId) {
                selectExam(examsList[0].id);
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load exams", variant: "destructive" });
        }
    };

    const loadMockTests = async (examId: string) => {
        setTestsLoading(true);
        try {
            const { data, error } = await supabase
                .from("mock_tests")
                .select("*, test_questions(count)")
                .eq("exam_id", examId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setMockTests((data as any) || []);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load mock tests", variant: "destructive" });
        } finally {
            setTestsLoading(false);
        }
    };

    const selectExam = (id: string) => {
        setSelectedExamId(id);
        loadMockTests(id);
    };

    // Exam CRUD
    const handleSaveExam = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const payload = {
            name: examFormData.name,
            description: examFormData.description || null,
            category: examFormData.category || "State Govt.",
            is_active: examFormData.is_active,
            is_paid: examFormData.is_paid,
            price: examFormData.price,
            created_by: session.user.id
        };

        let savedData: any = null;
        let error: any = null;
        if (editingExam) {
            const res = await supabase.from("exams").update(payload).eq("id", editingExam.id).select().maybeSingle();
            savedData = res.data;
            error = res.error;
        } else {
            const res = await supabase.from("exams").insert([payload]).select().maybeSingle();
            savedData = res.data;
            error = res.error;
        }

        if (error && error.message?.includes("category")) {
            console.warn("Retrying exam save without category column");
            const fallbackPayload = { ...payload };
            delete (fallbackPayload as any).category;
            const res = editingExam
                ? await supabase.from("exams").update(fallbackPayload).eq("id", editingExam.id).select().maybeSingle()
                : await supabase.from("exams").insert([fallbackPayload]).select().maybeSingle();
            savedData = res.data;
            error = res.error;
        }

        if (error) {
            toast({ title: "Error", description: "Failed to save exam", variant: "destructive" });
            return;
        }

        await logAdminAction({
            action: editingExam ? "update_exam" : "create_exam",
            tableName: "exams",
            recordId: editingExam?.id || savedData?.id,
            oldData: editingExam || undefined,
            newData: payload,
        });

        toast({ title: "Success", description: `Exam ${editingExam ? "updated" : "created"} successfully` });
        setExamDialogOpen(false);
        await loadExams();
    };

    const handleDeleteExam = async () => {
        if (!examToDelete) return;
        setIsDeleting(true);
        const deleted = exams.find((exam) => exam.id === examToDelete);
        const { error } = await supabase.from("exams").delete().eq("id", examToDelete);
        if (error) {
            toast({ title: "Error", description: "Failed to delete exam", variant: "destructive" });
        } else {
            await logAdminAction({
                action: "delete_exam",
                tableName: "exams",
                recordId: examToDelete,
                oldData: deleted,
            });
            toast({ title: "Success", description: "Exam deleted successfully" });
            if (selectedExamId === examToDelete) setSelectedExamId(null);
            await loadExams();
        }
        setIsDeleting(false);
        setExamToDelete(null);
    };

    const handleToggleActive = async (exam: Exam) => {
        const { error } = await supabase.from("exams").update({ is_active: !exam.is_active }).eq("id", exam.id);
        if (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } else {
            await logAdminAction({
                action: exam.is_active ? "deactivate_exam" : "activate_exam",
                tableName: "exams",
                recordId: exam.id,
                oldData: { is_active: exam.is_active },
                newData: { is_active: !exam.is_active },
            });
            toast({ title: "Success", description: `Exam ${exam.is_active ? "deactivated" : "activated"}` });
            await loadExams();
        }
    };

    const handleToggleLandingVisibility = (examId: string, examName: string) => {
        const newValue = toggleExamLandingVisibility(examId);
        setLandingVisibility(prev => ({ ...prev, [examId]: newValue }));
        toast({ title: newValue ? "Visible on Landing" : "Hidden from Landing", description: `"${examName}" visibility updated` });
    };

    const handleExamDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = exams.findIndex(e => e.id === active.id);
        const newIndex = exams.findIndex(e => e.id === over.id);

        const reordered = arrayMove(exams, oldIndex, newIndex);
        setExams(reordered);

        for (let i = 0; i < reordered.length; i++) {
            await supabase.from("exams").update({ order_index: i } as any).eq("id", reordered[i].id);
        }
        toast({ title: "Order Updated", description: "Exam sequence saved" });
    };

    // Mock Test CRUD
    const openCreateMockTest = () => {
        if (!selectedExamId) {
            toast({ title: "Error", description: "Please select an exam first", variant: "destructive" });
            return;
        }
        setEditingMockTest(null);
        setMockTestFormData({
            title: "",
            description: "",
            duration_minutes: 60,
            total_marks: 100,
            passing_marks: 33,
            test_type: "full_mock",
            negative_marking: false,
            negative_marks_per_question: 0.25,
            is_published: true,
            is_paid: false
        });
        setMockTestDialogOpen(true);
    };

    const openEditMockTest = (test: MockTest) => {
        setEditingMockTest(test);
        setMockTestFormData({
            title: test.title,
            description: test.description || "",
            duration_minutes: test.duration_minutes,
            total_marks: test.total_marks,
            passing_marks: test.passing_marks,
            test_type: test.test_type,
            negative_marking: test.negative_marking ?? false,
            negative_marks_per_question: test.negative_marks_per_question ?? 0.25,
            is_published: test.is_published,
            is_paid: test.is_paid || false
        });
        setMockTestDialogOpen(true);
    };

    const handleSaveMockTest = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !selectedExamId) return;

        const payload = {
            exam_id: selectedExamId,
            title: mockTestFormData.title,
            description: mockTestFormData.description || null,
            duration_minutes: mockTestFormData.duration_minutes,
            total_marks: mockTestFormData.total_marks,
            passing_marks: mockTestFormData.passing_marks,
            test_type: mockTestFormData.test_type,
            negative_marking: mockTestFormData.negative_marking,
            negative_marks_per_question: mockTestFormData.negative_marking ? mockTestFormData.negative_marks_per_question : 0,
            is_published: mockTestFormData.is_published,
            is_paid: mockTestFormData.is_paid,
            created_by: session.user.id
        };

        let error;
        if (editingMockTest) {
            const { error: updateError } = await (supabase.from("mock_tests") as any).update(payload).eq("id", editingMockTest.id);
            error = updateError;
        } else {
            const { error: insertError } = await (supabase.from("mock_tests") as any).insert([payload]);
            error = insertError;
        }

        if (error && error.message?.includes("column")) {
            console.warn("Retrying mock test save without negative marking columns");
            const fallbackPayload = { ...payload };
            delete (fallbackPayload as any).negative_marking;
            delete (fallbackPayload as any).negative_marks_per_question;
            const res = editingMockTest
                ? await (supabase.from("mock_tests") as any).update(fallbackPayload).eq("id", editingMockTest.id)
                : await (supabase.from("mock_tests") as any).insert([fallbackPayload]);
            error = res.error;
        }

        if (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save mock test", variant: "destructive" });
            return;
        }

        toast({ title: "Success", description: `Mock Test ${editingMockTest ? "updated" : "created"} successfully` });
        setMockTestDialogOpen(false);
        await loadMockTests(selectedExamId);
    };

    const handleDeleteMockTest = async () => {
        if (!mockTestToDelete || !selectedExamId) return;
        setIsDeleting(true);
        const { error } = await supabase.from("mock_tests").delete().eq("id", mockTestToDelete);
        if (error) {
            toast({ title: "Error", description: "Failed to delete mock test", variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Mock Test deleted successfully" });
            await loadMockTests(selectedExamId);
        }
        setIsDeleting(false);
        setMockTestToDelete(null);
    };

    const selectedExamName = exams.find(e => e.id === selectedExamId)?.name;

    if (loading) {
        return (
            <AdminLayout title="Exam Management" subtitle="Manage exams and mock tests">
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-blue-600 text-sm font-medium">Initializing...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Exam Management" subtitle="Manage exams, categories, and mock tests">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
                {/* Left Column: Exams */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            Exam Categories
                        </h3>
                        <Button
                            onClick={() => {
                                setEditingExam(null);
                                setExamFormData({ name: "", description: "", category: "State Govt.", is_active: true, is_paid: false, price: 0 });
                                setExamDialogOpen(true);
                            }}
                            size="sm"
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 h-9"
                        >
                            <Plus className="w-4 h-4 mr-1.5" /> Add Exam
                        </Button>
                    </div>

                    <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-3">
                            {exams.length === 0 ? (
                                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <p className="text-sm text-gray-500">No exams yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExamDragEnd}>
                                        <SortableContext items={exams.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                            {exams.map(exam => (
                                                <SortableExamItem
                                                    key={exam.id}
                                                    exam={exam}
                                                    isSelected={selectedExamId === exam.id}
                                                    onClick={() => selectExam(exam.id)}
                                                    onEdit={(e) => {
                                                        setEditingExam(e);
                                                        setExamFormData({
                                                            name: e.name,
                                                            description: e.description || "",
                                                            category: e.category || "State Govt.",
                                                            is_active: e.is_active,
                                                            is_paid: e.is_paid,
                                                            price: e.price
                                                        });
                                                        setExamDialogOpen(true);
                                                    }}
                                                    onDelete={(id) => setExamToDelete(id)}
                                                    onToggleActive={handleToggleActive}
                                                    onToggleVisibility={handleToggleLandingVisibility}
                                                    visibility={landingVisibility[exam.id]}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Mock Tests */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {selectedExamId ? `Mock Tests for ${selectedExamName}` : "Select an Exam"}
                        </h3>
                        {selectedExamId && (
                            <Button onClick={openCreateMockTest} size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 h-9">
                                <Plus className="w-4 h-4 mr-1.5" /> Add Test
                            </Button>
                        )}
                    </div>

                    <Card className="border-0 shadow-sm bg-white rounded-2xl min-h-[400px]">
                        <CardContent className="p-4">
                            {!selectedExamId ? (
                                <div className="flex flex-col items-center justify-center h-[350px] text-center">
                                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                        <BookOpen className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-gray-900 font-semibold mb-1">No Exam Selected</h4>
                                    <p className="text-gray-500 text-sm max-w-[250px]">Choose an exam from the left to manage its full mock tests and PYQs.</p>
                                </div>
                            ) : testsLoading ? (
                                <div className="flex flex-col items-center justify-center h-[350px]">
                                    <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-gray-500 text-sm font-medium">Loading tests...</p>
                                </div>
                            ) : mockTests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[350px] text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <FileText className="w-10 h-10 text-gray-300 mb-3" />
                                    <h4 className="text-gray-900 font-semibold mb-1">No Mock Tests Yet</h4>
                                    <p className="text-gray-500 text-sm mb-6">Create the first comprehensive mock test or PYQ for this exam.</p>
                                    <Button onClick={openCreateMockTest} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                                        <Plus className="w-4 h-4 mr-2" /> Create Mock Test
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {mockTests.map((test, idx) => (
                                        <SortableMockTestItem
                                            key={test.id}
                                            mockTest={test}
                                            index={idx}
                                            onEdit={() => openEditMockTest(test)}
                                            onDelete={() => setMockTestToDelete(test.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Exam Dialog */}
            <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingExam ? "Edit Exam" : "Create Exam"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Exam Name *</Label>
                            <Input
                                value={examFormData.name}
                                onChange={e => setExamFormData({ ...examFormData, name: e.target.value })}
                                placeholder="e.g., WBPSC Clerkship, WBP Constable"
                                className="h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category *</Label>
                            <Select value={examFormData.category} onValueChange={(v) => setExamFormData({ ...examFormData, category: v })}>
                                <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="State Govt.">State Govt. (WBPSC, WBCS, etc.)</SelectItem>
                                    <SelectItem value="Central Govt.">Central Govt. (SSC, Railway, etc.)</SelectItem>
                                    <SelectItem value="Teaching">Teaching (TET, Primary, SSC)</SelectItem>
                                    <SelectItem value="Police">Police (WBP, KP, SI, Constable)</SelectItem>
                                    <SelectItem value="Defence">Defence (Army, Navy, Airforce)</SelectItem>
                                    <SelectItem value="Banking">Banking (IBPS, SBI, RRB)</SelectItem>
                                    <SelectItem value="Other">Other Exams</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={examFormData.description}
                                onChange={e => setExamFormData({ ...examFormData, description: e.target.value })}
                                placeholder="Details about this exam"
                                rows={2}
                                className="rounded-xl resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="e_active" checked={examFormData.is_active} onChange={e => setExamFormData({ ...examFormData, is_active: e.target.checked })} className="w-5 h-5 rounded-lg border-blue-300 text-blue-600" />
                                <Label htmlFor="e_active" className="text-sm font-semibold cursor-pointer">Active</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="e_paid" checked={examFormData.is_paid} onChange={e => setExamFormData({ ...examFormData, is_paid: e.target.checked })} className="w-5 h-5 rounded-lg border-blue-300 text-blue-600" />
                                <Label htmlFor="e_paid" className="text-sm font-semibold cursor-pointer">Paid</Label>
                            </div>
                        </div>
                        {examFormData.is_paid && (
                            <div className="space-y-2">
                                <Label>Price (₹)</Label>
                                <Input type="number" value={examFormData.price} onChange={e => setExamFormData({ ...examFormData, price: Number(e.target.value) })} className="h-11 rounded-xl" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExamDialogOpen(false)} className="rounded-xl h-11 flex-1">Cancel</Button>
                        <Button onClick={handleSaveExam} disabled={!examFormData.name} className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white flex-1">Save Exam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mock Test Dialog */}
            <Dialog open={mockTestDialogOpen} onOpenChange={setMockTestDialogOpen}>
                <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingMockTest ? "Edit Mock Test" : "Create New Mock Test"}</DialogTitle>
                        <DialogDescription>Setup test details and negative marking for {selectedExamName}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        <div className="md:col-span-2 space-y-2">
                            <Label>Test Title *</Label>
                            <Input
                                value={mockTestFormData.title}
                                onChange={e => setMockTestFormData({ ...mockTestFormData, title: e.target.value })}
                                placeholder="e.g., Full Mock Test 01 or 2024 PYQ Official Paper"
                                className="h-11 rounded-xl"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={mockTestFormData.description}
                                onChange={e => setMockTestFormData({ ...mockTestFormData, description: e.target.value })}
                                placeholder="Introduction or instructions for this test"
                                rows={2}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Duration (Minutes)</Label>
                            <div className="relative">
                                <Input type="number" value={mockTestFormData.duration_minutes} onChange={e => setMockTestFormData({ ...mockTestFormData, duration_minutes: Number(e.target.value) })} className="h-11 rounded-xl pr-10" />
                                <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Test Type</Label>
                            <Select value={mockTestFormData.test_type} onValueChange={(v: any) => setMockTestFormData({ ...mockTestFormData, test_type: v })}>
                                <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="full_mock">Full Mock Test</SelectItem>
                                    <SelectItem value="pyq">Previous Year Question (PYQ)</SelectItem>
                                    <SelectItem value="topic_wise">Topic Wise Test</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Total Marks</Label>
                            <Input type="number" value={mockTestFormData.total_marks} onChange={e => setMockTestFormData({ ...mockTestFormData, total_marks: Number(e.target.value) })} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>Passing Marks</Label>
                            <Input type="number" value={mockTestFormData.passing_marks} onChange={e => setMockTestFormData({ ...mockTestFormData, passing_marks: Number(e.target.value) })} className="h-11 rounded-xl" />
                        </div>

                        {/* Negative Marking Configuration */}
                        <div className="md:col-span-2 p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="m_neg_marking" className="font-semibold text-slate-800 cursor-pointer text-sm">
                                        Negative Marking
                                    </Label>
                                    <p className="text-xs text-slate-500">Deduct marks for incorrect answers in this test</p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="m_neg_marking"
                                    checked={mockTestFormData.negative_marking}
                                    onChange={(e) => setMockTestFormData({ ...mockTestFormData, negative_marking: e.target.checked })}
                                    className="w-5 h-5 rounded-lg border-blue-300 text-blue-600"
                                />
                            </div>

                            {mockTestFormData.negative_marking && (
                                <div className="pt-2 border-t border-blue-100/80 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-slate-600">Deduction per incorrect MCQ</Label>
                                        <span className="text-xs font-bold text-rose-600">-{mockTestFormData.negative_marks_per_question} marks</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={mockTestFormData.negative_marks_per_question}
                                            onChange={e => setMockTestFormData({ ...mockTestFormData, negative_marks_per_question: parseFloat(e.target.value) || 0 })}
                                            className="h-9 rounded-lg bg-white"
                                        />
                                        <div className="flex items-center gap-1">
                                            {[0.25, 0.33, 0.50, 1.0].map((val) => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => setMockTestFormData({ ...mockTestFormData, negative_marks_per_question: val })}
                                                    className={`text-xs px-2 py-1 rounded-md border font-medium transition-colors whitespace-nowrap ${
                                                        mockTestFormData.negative_marks_per_question === val
                                                            ? "bg-blue-600 text-white border-blue-600"
                                                            : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50"
                                                    }`}
                                                >
                                                    -{val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 flex items-center gap-4 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="m_published" checked={mockTestFormData.is_published} onChange={e => setMockTestFormData({ ...mockTestFormData, is_published: e.target.checked })} className="w-5 h-5 rounded-lg border-blue-300 text-blue-600" />
                                <Label htmlFor="m_published" className="text-sm font-semibold cursor-pointer">Published to Students</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 pt-4">
                        <Button variant="outline" onClick={() => setMockTestDialogOpen(false)} className="rounded-xl h-11 flex-1">Cancel</Button>
                        <Button onClick={handleSaveMockTest} disabled={!mockTestFormData.title} className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white flex-1">
                            {editingMockTest ? "Update Mock Test" : "Create Mock Test"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deletion Dialogs */}
            <DeleteAlertDialog
                isOpen={!!examToDelete}
                onClose={() => setExamToDelete(null)}
                onConfirm={handleDeleteExam}
                title="Delete exam"
                description={(() => {
                    const exam = exams.find(e => e.id === examToDelete);
                    const tests = exam?.test_count ?? 0;
                    const questions = exam?.question_count ?? 0;
                    return (
                        <>
                            Delete <span className="font-bold text-slate-900">{exam?.name}</span>? This exam is linked to{" "}
                            <span className="font-bold text-slate-900">{tests} mock test{tests === 1 ? "" : "s"}</span> and{" "}
                            <span className="font-bold text-slate-900">{questions} question{questions === 1 ? "" : "s"}</span>.
                            {(tests > 0 || questions > 0)
                                ? " Linked records may fail to delete or become orphaned."
                                : " This cannot be undone."}
                        </>
                    );
                })()}
                isDeleting={isDeleting}
            />

            <DeleteAlertDialog
                isOpen={!!mockTestToDelete}
                onClose={() => setMockTestToDelete(null)}
                onConfirm={handleDeleteMockTest}
                itemName={mockTests.find(t => t.id === mockTestToDelete)?.title}
                isDeleting={isDeleting}
            />
        </AdminLayout>
    );
};

export default ExamManagement;