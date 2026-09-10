import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Plus, Pencil, Trash2, Upload, FileText, MoreVertical, FolderOpen, Sparkles, GraduationCap, CheckCircle2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";

interface Course {
  id: string;
  title: string;
  description: string;
  exam_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Exam {
  id: string;
  name: string;
}

interface CourseMaterial {
  id: string;
  title: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export default function CourseManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    exam_id: "",
  });

  const [materialFormData, setMaterialFormData] = useState({
    title: "",
    file: null as File | null,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin/login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
    const isInstructor = roles?.some(r => r.role === "instructor");

    if (!isAdmin && !isInstructor) {
      navigate("/admin/login");
      return;
    }

    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadCourses(), loadExams()]);
    setLoading(false);
  };

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } else {
      setCourses((data || []).map((c) => ({
        ...c,
        description: c.description ?? "",
        is_active: c.is_active ?? false,
        created_at: c.created_at ?? "",
      })));
    }
  };

  const loadExams = async () => {
    const { data, error } = await supabase
      .from("exams")
      .select("id, name")
      .eq("is_active", true);

    if (error) {
      console.error("Error loading exams:", error);
    } else {
      setExams(data || []);
    }
  };

  const loadMaterials = async (courseId: string) => {
    const { data, error } = await supabase
      .from("course_materials")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load materials",
        variant: "destructive",
      });
    } else {
      setMaterials((data || []).map((m) => ({
        id: m.id,
        title: m.title,
        file_path: m.file_path,
        file_type: m.file_type ?? null,
        file_size: m.file_size ?? null,
        created_at: m.created_at ?? "",
      })));
    }
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingCourse) {
      const { error } = await supabase
        .from("courses")
        .update({
          title: formData.title,
          description: formData.description,
          exam_id: formData.exam_id || null,
        })
        .eq("id", editingCourse.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update course", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Course updated successfully" });
        setShowDialog(false);
        loadCourses();
      }
    } else {
      const { error } = await supabase
        .from("courses")
        .insert({
          title: formData.title,
          description: formData.description,
          exam_id: formData.exam_id || null,
          created_by: user.id,
        });

      if (error) {
        toast({ title: "Error", description: "Failed to create course", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Course created successfully" });
        setShowDialog(false);
        loadCourses();
      }
    }

    setFormData({ title: "", description: "", exam_id: "" });
    setEditingCourse(null);
  };

  const handleDelete = async (id: string) => {
    setCourseToDelete(id);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("courses").delete().eq("id", courseToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "Course deleted successfully" });
      loadCourses();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete course", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setCourseToDelete(null);
    }
  };

  const handleUploadMaterial = async () => {
    if (!selectedCourse || !materialFormData.file) return;

    setUploadingFile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = materialFormData.file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${selectedCourse}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(filePath, materialFormData.file);

    if (uploadError) {
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
      setUploadingFile(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("course_materials")
      .insert({
        course_id: selectedCourse,
        title: materialFormData.title,
        file_path: filePath,
        file_type: materialFormData.file.type,
        file_size: materialFormData.file.size,
        uploaded_by: user.id,
      });

    if (insertError) {
      toast({ title: "Error", description: "Failed to save material", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Material uploaded successfully" });
      setShowMaterialDialog(false);
      loadMaterials(selectedCourse);
    }

    setUploadingFile(false);
    setMaterialFormData({ title: "", file: null });
  };

  const openCreateDialog = () => {
    setEditingCourse(null);
    setFormData({ title: "", description: "", exam_id: "" });
    setShowDialog(true);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || "",
      exam_id: course.exam_id || "",
    });
    setShowDialog(true);
  };

  const getExamName = (examId: string | null) => {
    if (!examId) return "—";
    return exams.find(e => e.id === examId)?.name || "—";
  };

  const CreateButton = (
    <Button
      onClick={openCreateDialog}
      size="icon"
      className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200"
    >
      <Plus className="w-5 h-5" />
    </Button>
  );

  if (loading) {
    return (
      <AdminLayout title="Course Management" subtitle="Manage courses and materials">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 font-medium text-sm">Loading courses...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Course Management" subtitle="Manage courses and materials">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
        {/* Executive Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Course Management</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Curricula creation, study materials distribution, and exam linkages</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
              {courses.length} Courses
            </Badge>
            <Button
              onClick={openCreateDialog}
              className="h-11 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 text-white font-bold text-xs sm:text-sm transition-all"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Course
            </Button>
          </div>
        </div>

        {/* Metrics KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-50/80 to-indigo-50/40 border border-blue-100/60 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">
                Total
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{courses.length}</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Total Courses</div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-emerald-50/80 to-teal-50/40 border border-emerald-100/60 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{courses.filter(c => c.is_active).length}</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Active Courses</div>
            </div>
          </div>
        </div>

        {/* Courses Table / Cards */}
        {courses.length === 0 ? (
          <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4 text-blue-600">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No Courses Created Yet</h3>
              <p className="text-slate-500 text-xs sm:text-sm mb-4">Create your first course to attach materials and link exams</p>
              <Button
                onClick={openCreateDialog}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-11 px-5 shadow-md shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[2fr_2fr_1fr_1fr_80px] gap-4 px-6 py-4 bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <span>Course Name</span>
              <span>Description</span>
              <span>Target Exam</span>
              <span>Created Date</span>
              <span className="text-center">Actions</span>
            </div>

            <div className="divide-y divide-slate-100">
              {courses.map(course => (
                <div key={course.id} className="transition-colors">
                  {/* Desktop Row */}
                  <div className="hidden md:grid md:grid-cols-[2fr_2fr_1fr_1fr_80px] gap-4 px-6 py-4 items-center hover:bg-slate-50/40">
                    {/* Course Name & Icon */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate text-sm">{course.title}</p>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {course.is_active ? "🟢 Active" : "⚪ Inactive"}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 truncate">{course.description || "—"}</p>
                    </div>

                    {/* Exam */}
                    <div>
                      <Badge variant="outline" className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50/50 text-blue-700 border-blue-200 truncate">
                        {getExamName(course.exam_id)}
                      </Badge>
                    </div>

                    {/* Created Date */}
                    <div className="text-xs text-slate-500 font-medium">
                      {new Date(course.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-500">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl min-w-[170px] shadow-lg border-slate-200">
                          <DropdownMenuItem
                            onClick={() => {
                              if (selectedCourse === course.id) {
                                setSelectedCourse(null);
                              } else {
                                setSelectedCourse(course.id);
                                loadMaterials(course.id);
                              }
                            }}
                            className="gap-2 text-xs font-semibold py-2.5 rounded-xl cursor-pointer"
                          >
                            <FolderOpen className="w-4 h-4 text-blue-600" />
                            {selectedCourse === course.id ? "Hide Materials" : "View Materials"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(course)} className="gap-2 text-xs font-semibold py-2.5 rounded-xl cursor-pointer">
                            <Pencil className="w-4 h-4 text-slate-600" />
                            Edit Course
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(course.id)} className="gap-2 text-xs font-semibold py-2.5 rounded-xl text-rose-600 focus:text-rose-700 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                            Delete Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Mobile Card Row */}
                  <div className="md:hidden p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-slate-900 truncate text-sm">{course.title}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl min-w-[160px]">
                              <DropdownMenuItem
                                onClick={() => {
                                  if (selectedCourse === course.id) {
                                    setSelectedCourse(null);
                                  } else {
                                    setSelectedCourse(course.id);
                                    loadMaterials(course.id);
                                  }
                                }}
                                className="gap-2 text-xs font-semibold py-2 rounded-xl"
                              >
                                <FolderOpen className="w-4 h-4 text-blue-600" />
                                Materials
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(course)} className="gap-2 text-xs font-semibold py-2 rounded-xl">
                                <Pencil className="w-4 h-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(course.id)} className="gap-2 text-xs font-semibold py-2 rounded-xl text-rose-600">
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {course.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{course.description}</p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border-blue-200">
                            {getExamName(course.exam_id)}
                          </Badge>
                          <span className="text-[11px] text-slate-400">
                            {new Date(course.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Materials Expanded Section */}
                  {selectedCourse === course.id && (
                    <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 animate-in fade-in-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-blue-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Course Materials & Downloads</h4>
                          <Badge variant="secondary" className="text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                            {materials.length} Files
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setShowMaterialDialog(true)}
                          className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" />
                          Upload Material
                        </Button>
                      </div>

                      {materials.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center text-xs text-slate-500">
                          No materials uploaded yet for this course. Click "Upload Material" to attach study notes or PDFs.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {materials.map((material) => (
                            <div key={material.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-200 transition-colors">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{material.title}</p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  {material.file_type || 'File'} • {((material.file_size || 0) / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit Course Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900">
              {editingCourse ? "Edit Course" : "Create New Course"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingCourse ? "Update course information and exam target" : "Add a structured course to the platform"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold text-slate-700">Course Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., WBCS Prelims Complete Batch"
                className="h-11 rounded-2xl text-sm border-slate-200 shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold text-slate-700">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief course overview and topics covered..."
                rows={3}
                className="rounded-2xl text-sm border-slate-200 shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam" className="text-xs font-bold text-slate-700">Linked Exam (Optional)</Label>
              <Select value={formData.exam_id} onValueChange={(value) => setFormData({ ...formData, exam_id: value })}>
                <SelectTrigger className="h-11 rounded-2xl text-sm border-slate-200 shadow-2xs">
                  <SelectValue placeholder="Select target exam" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-2xl h-11 px-5 text-slate-700 font-bold border-slate-200 flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title}
              className="rounded-2xl h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold flex-1 sm:flex-none shadow-md shadow-blue-500/20"
            >
              {editingCourse ? "Update Course" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Material Dialog */}
      <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900">Upload Course Material</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Attach study guides, notes, or handouts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="material-title" className="text-xs font-bold text-slate-700">Material Title *</Label>
              <Input
                id="material-title"
                value={materialFormData.title}
                onChange={(e) => setMaterialFormData({ ...materialFormData, title: e.target.value })}
                placeholder="e.g., Chapter 1 Modern Indian History"
                className="h-11 rounded-2xl text-sm border-slate-200 shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file" className="text-xs font-bold text-slate-700">Upload File (PDF / Doc) *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setMaterialFormData({ ...materialFormData, file: e.target.files?.[0] || null })}
                className="h-11 rounded-2xl text-sm border-slate-200 shadow-2xs pt-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowMaterialDialog(false)} className="rounded-2xl h-11 px-5 text-slate-700 font-bold border-slate-200 flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              onClick={handleUploadMaterial}
              disabled={uploadingFile || !materialFormData.title || !materialFormData.file}
              className="rounded-2xl h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold flex-1 sm:flex-none shadow-md shadow-blue-500/20"
            >
              {uploadingFile ? "Uploading..." : "Upload Material"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={confirmDelete}
        itemName={courses.find(c => c.id === courseToDelete)?.title}
        isDeleting={isDeleting}
      />
    </AdminLayout>
  );
}
