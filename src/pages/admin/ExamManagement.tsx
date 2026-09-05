import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Power, PowerOff, BookOpen, MoreVertical, Calendar, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { GripVertical } from "lucide-react";

interface Exam {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_paid: boolean;
  price: number;
  created_at: string;
  created_by: string;
  order_index?: number;
}

const SortableExamRow = ({
  exam,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleVisibility,
  visibility
}: {
  exam: Exam,
  onEdit: (e: Exam) => void,
  onDelete: (id: string) => void,
  onToggleActive: (e: Exam) => void,
  onToggleVisibility: (id: string, name: string) => void,
  visibility: boolean
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: exam.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: 'relative' as const,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging ? '#f8fafc' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`hover:bg-gray-50/50 transition-colors ${isDragging ? "shadow-2xl border-2 border-emerald-200 rounded-xl" : ""}`}>
      {/* Desktop Row */}
      <div className="hidden md:grid md:grid-cols-[40px_2fr_2fr_1fr_1fr_80px] gap-4 px-4 py-3 items-center">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Exam Name & Icon */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${exam.is_active
            ? "bg-gradient-to-br from-emerald-100 to-teal-100"
            : "bg-gray-100"
            }`}>
            <BookOpen className={`w-5 h-5 ${exam.is_active ? "text-emerald-600" : "text-gray-400"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{exam.name}</p>
            {exam.is_paid ? (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                PAYMENT REQUIRED: ₹{exam.price}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border-green-200">
                FREE ACCESS
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{exam.description || "—"}</p>
        </div>

        {/* Status */}
        <div>
          <Badge
            variant="secondary"
            className={`text-[10px] px-2 py-0.5 ${exam.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-500"
              }`}
          >
            {exam.is_active ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </div>

        {/* Created Date */}
        <div className="text-sm text-gray-600">
          {new Date(exam.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50">
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl min-w-[180px]">
              <DropdownMenuItem onClick={() => onEdit(exam)} className="gap-2">
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(exam)} className="gap-2">
                {exam.is_active ? (
                  <>
                    <PowerOff className="w-4 h-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleVisibility(exam.id, exam.name)}
                className={`gap-2 ${visibility ? "text-emerald-600" : ""}`}
              >
                {visibility ? (
                  <>
                    <Eye className="w-4 h-4" />
                    On Landing ✓
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Show on Landing
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(exam.id)}
                className="gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Row */}
      <div className="md:hidden p-3">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 truncate text-sm">{exam.name}</p>
              <Badge
                variant="secondary"
                className={`text-[9px] px-1.5 py-0 shrink-0 ${exam.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
                  }`}
              >
                {exam.is_active ? "ACTIVE" : "INACTIVE"}
              </Badge>
            </div>
            {exam.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{exam.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50 shrink-0">
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl min-w-[180px]">
              <DropdownMenuItem onClick={() => onEdit(exam)} className="gap-2">
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(exam)} className="gap-2">
                {exam.is_active ? (
                  <>
                    <PowerOff className="w-4 h-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleVisibility(exam.id, exam.name)}
                className={`gap-2 ${visibility ? "text-emerald-600" : ""}`}
              >
                {visibility ? (
                  <>
                    <Eye className="w-4 h-4" />
                    On Landing ✓
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Show on Landing
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(exam.id)}
                className="gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

const ExamManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    is_paid: false,
    price: 0
  });
  const [landingVisibility, setLandingVisibility] = useState<{ [key: string]: boolean }>({});
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh landing visibility state
  const refreshLandingVisibility = () => {
    const visibility: { [key: string]: boolean } = {};
    exams.forEach(exam => {
      visibility[exam.id] = isExamVisibleOnLanding(exam.id);
    });
    setLandingVisibility(visibility);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setExams((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Persist to database
        persistOrder(newItems);

        return newItems;
      });
    }
  };

  const persistOrder = async (newExams: Exam[]) => {
    try {
      const updates = newExams.map((exam, index) => ({
        id: exam.id,
        order_index: index,
        name: exam.name, // Supabase update sometimes requires non-null fields or we can just send ID and order_index
        created_by: exam.created_by
      }));

      // We only update order_index and ID
      for (const [index, exam] of newExams.entries()) {
        await supabase
          .from("exams")
          .update({ order_index: index } as any)
          .eq("id", exam.id);
      }

      toast({
        title: "Order Updated",
        description: "Exam sequence saved successfully",
      });
    } catch (error) {
      console.error("Error persisting order:", error);
      toast({
        title: "Error",
        description: "Failed to save exam order",
        variant: "destructive",
      });
    }
  };

  const handleToggleLandingVisibility = (examId: string, examName: string) => {
    const newValue = toggleExamLandingVisibility(examId);
    setLandingVisibility(prev => ({ ...prev, [examId]: newValue }));
    toast({
      title: newValue ? "Visible on Landing" : "Hidden from Landing",
      description: `"${examName}" ${newValue ? "will now show" : "is now hidden"} on landing page for visitors`,
    });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
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
      setLoading(false);
      await supabase.auth.signOut();
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges",
        variant: "destructive"
      });
      navigate("/admin/login");
      return;
    }
    await loadExams();
    setLoading(false);
  };

  useEffect(() => {
    refreshLandingVisibility();
  }, [exams]);

  const loadExams = async () => {
    try {
      // First try to load with order_index (new feature)
      let { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("order_index", { ascending: true });

      // If it fails with "column does not exist", fallback to created_at
      if (error) {
        if (error.code === '42703') { // PostgreSQL error code for undefined_column
          console.warn("order_index column missing, falling back to created_at");
          const fallback = await supabase
            .from("exams")
            .select("*")
            .order("created_at", { ascending: true });

          if (fallback.error) throw fallback.error;
          data = fallback.data;
        } else {
          throw error;
        }
      }

      setExams((data as any) || []);
    } catch (error) {
      console.error("Error loading exams:", error);
      toast({
        title: "Error",
        description: "Failed to load exams",
        variant: "destructive"
      });
    }
  };

  const handleCreateExam = async () => {
    if (saving) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSaving(true);

    // First try with all fields
    const fullPayload = {
      name: formData.name,
      description: formData.description || null,
      is_active: formData.is_active,
      is_paid: formData.is_paid,
      price: formData.price,
      created_by: session.user.id
    };

    let { error } = await supabase.from("exams").insert(fullPayload);

    // Fallback if pricing columns are missing
    if (error && error.code === '42703') {
      console.warn("Pricing columns missing, retrying basic create");
      const { name, description, is_active, created_by } = fullPayload;
      const basicResult = await supabase.from("exams").insert({
        name, description, is_active, created_by
      });
      error = basicResult.error;
    }

    if (error) {
      console.error("Create exam error:", error);
      toast({ title: "Couldn't create exam", description: "Try again in a moment.", variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Exam created", description: "The new exam is ready to use." });
    setDialogOpen(false);
    setFormData({ name: "", description: "", is_active: true, is_paid: false, price: 0 });
    setSaving(false);
    await loadExams();
  };

  const handleUpdateExam = async () => {
    if (!editingExam || saving) return;
    setSaving(true);

    const fullPayload = {
      name: formData.name,
      description: formData.description || null,
      is_active: formData.is_active,
      is_paid: formData.is_paid,
      price: formData.price
    };

    let { error } = await supabase
      .from("exams")
      .update(fullPayload)
      .eq("id", editingExam.id);

    // Fallback if pricing columns are missing
    if (error && error.code === '42703') {
      console.warn("Pricing columns missing, retrying basic update");
      const { name, description, is_active } = fullPayload;
      const basicResult = await supabase
        .from("exams")
        .update({ name, description, is_active })
        .eq("id", editingExam.id);
      error = basicResult.error;
    }

    if (error) {
      console.error("Update exam error:", error);
      toast({ title: "Couldn't update exam", description: "Try again in a moment.", variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Exam updated", description: "Your changes were saved." });
    setDialogOpen(false);
    setEditingExam(null);
    setFormData({ name: "", description: "", is_active: true, is_paid: false, price: 0 });
    setSaving(false);
    await loadExams();
  };

  const handleDeleteExam = async (id: string) => {
    setExamToDelete(id);
  };

  const confirmDelete = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("exams").delete().eq("id", examToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "Exam deleted successfully" });
      await loadExams();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete exam", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setExamToDelete(null);
    }
  };

  const handleToggleActive = async (exam: Exam) => {
    const { error } = await supabase
      .from("exams")
      .update({ is_active: !exam.is_active })
      .eq("id", exam.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: exam.is_active ? "Exam deactivated" : "Exam activated" });
    await loadExams();
  };

  const openEditDialog = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      description: exam.description || "",
      is_active: exam.is_active,
      is_paid: exam.is_paid || false,
      price: exam.price || 0
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingExam(null);
    setFormData({ name: "", description: "", is_active: true, is_paid: false, price: 0 });
    setDialogOpen(true);
  };

  const CreateButton = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={openCreateDialog}
          size="icon"
          aria-label="Create exam"
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border border-white/20"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editingExam ? "Edit Exam" : "Create Exam"}</DialogTitle>
          <DialogDescription>
            {editingExam ? "Update exam details" : "Add a new exam category"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Exam Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., UPSC, SSC, Banking"
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description"
              rows={3}
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded-lg border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="is_active" className="text-sm cursor-pointer font-bold">Active</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_paid"
                checked={formData.is_paid}
                onChange={e => setFormData({ ...formData, is_paid: e.target.checked })}
                className="w-5 h-5 rounded-lg border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="is_paid" className="text-sm cursor-pointer font-bold">Paid Exam</Label>
            </div>
          </div>
          {formData.is_paid && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label htmlFor="price">Price (INR) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="h-12 rounded-xl"
              />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl h-12 flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={editingExam ? handleUpdateExam : handleCreateExam}
            disabled={!formData.name.trim() || saving}
            className="rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-teal-600 flex-1 sm:flex-none"
          >
            {saving ? "Saving..." : editingExam ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <AdminLayout title="Exam Management" subtitle="Manage exam categories">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-600 text-sm">Loading exams...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Exam Management" subtitle="Manage exam categories" headerActions={CreateButton}>
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
            <p className="text-xs text-gray-500">Total Exams</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{exams.filter(e => e.is_active).length}</p>
            <p className="text-xs text-gray-500">Active Exams</p>
          </div>
        </div>

        {/* Exams List - Row Based */}
        {exams.length === 0 ? (
          <Card className="border-0 bg-white rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Exams Yet</h3>
              <p className="text-gray-500 text-sm mb-4">Create your first exam category to get started</p>
              <Button onClick={openCreateDialog} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Exam
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 bg-white rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[40px_2fr_2fr_1fr_1fr_80px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span className="w-10"></span>
              <span>Exam Name</span>
              <span>Description</span>
              <span>Status</span>
              <span>Created</span>
              <span className="text-center">Actions</span>
            </div>

            <div className="divide-y divide-gray-100">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={exams.map(e => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {exams.map(exam => (
                    <SortableExamRow
                      key={exam.id}
                      exam={exam}
                      onEdit={openEditDialog}
                      onDelete={handleDeleteExam}
                      onToggleActive={handleToggleActive}
                      onToggleVisibility={handleToggleLandingVisibility}
                      visibility={landingVisibility[exam.id]}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </Card>
        )}
      </div>
      <DeleteAlertDialog
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        onConfirm={confirmDelete}
        itemName={exams.find(e => e.id === examToDelete)?.name}
        isDeleting={isDeleting}
      />
    </AdminLayout>
  );
};

export default ExamManagement;