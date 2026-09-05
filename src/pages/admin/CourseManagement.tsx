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
import { BookOpen, Plus, Pencil, Trash2, Upload, FileText, MoreVertical, FolderOpen } from "lucide-react";
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

    const isAdmin = roles?.some(r => r.role === "admin");
    const isInstructor = roles?.some(r => r.role === "instructor");

    if (!isAdmin && !isInstructor) {
      navigate("/");
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
      setCourses(data || []);
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
      setMaterials(data || []);
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
    if (!user) {
      setUploadingFile(false);
      return;
    }

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
      aria-label="Create course"
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
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-600 text-sm">Loading courses...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Course Management" subtitle={`${courses.length} courses`} headerActions={CreateButton}>
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 md:gap-4">
          <div className="flex-1 min-w-[140px] bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Courses</p>
          </div>
          <div className="flex-1 min-w-[140px] bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{courses.filter(c => c.is_active).length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Active Courses</p>
          </div>
        </div>

        {/* Courses List - Row Based */}
        {courses.length === 0 ? (
          <Card className="border-0 bg-white rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Courses Yet</h3>
              <p className="text-gray-500 text-sm mb-4">Create your first course to get started</p>
              <Button onClick={openCreateDialog} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 bg-white rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[2fr_2fr_1fr_1fr_80px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Course Name</span>
              <span>Description</span>
              <span>Exam</span>
              <span>Created</span>
              <span className="text-center">Actions</span>
            </div>

            <div className="divide-y divide-gray-100">
              {courses.map(course => (
                <div key={course.id}>
                  <div className="hover:bg-gray-50/50 transition-colors">
                    {/* Desktop Row */}
                    <div className="hidden md:grid md:grid-cols-[2fr_2fr_1fr_1fr_80px] gap-4 px-4 py-3 items-center">
                      {/* Course Name & Icon */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="font-medium text-gray-900 truncate">{course.title}</p>
                      </div>

                      {/* Description */}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500 truncate">{course.description || "—"}</p>
                      </div>

                      {/* Exam */}
                      <div>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-gray-100">
                          {getExamName(course.exam_id)}
                        </Badge>
                      </div>

                      {/* Created Date */}
                      <div className="text-sm text-gray-600">
                        {new Date(course.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
                            <DropdownMenuItem onClick={() => { setSelectedCourse(course.id); loadMaterials(course.id); }} className="gap-2">
                              <FolderOpen className="w-4 h-4" />
                              View Materials
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(course)} className="gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(course.id)} className="gap-2 text-red-600 focus:text-red-600">
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5 text-emerald-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">{course.title}</p>
                          {course.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{course.description}</p>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50 shrink-0">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
                            <DropdownMenuItem onClick={() => { setSelectedCourse(course.id); loadMaterials(course.id); }} className="gap-2">
                              <FolderOpen className="w-4 h-4" />
                              View Materials
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(course)} className="gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(course.id)} className="gap-2 text-red-600 focus:text-red-600">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Materials Section (Expanded) */}
                  {selectedCourse === course.id && (
                    <div className="px-4 pb-4 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-3 pt-3">
                        <h4 className="text-sm font-semibold text-gray-700">Course Materials</h4>
                        <Button size="sm" onClick={() => setShowMaterialDialog(true)} className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600">
                          <Upload className="w-3 h-3 mr-1" />
                          Upload
                        </Button>
                      </div>
                      {materials.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">No materials uploaded yet</p>
                      ) : (
                        <div className="space-y-2">
                          {materials.map((material) => (
                            <div key={material.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                              <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{material.title}</p>
                                <p className="text-xs text-gray-400">
                                  {material.file_type} • {((material.file_size || 0) / 1024).toFixed(1)} KB
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
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "Create Course"}</DialogTitle>
            <DialogDescription>
              {editingCourse ? "Update course information" : "Add a new course to the system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., UPSC Prelims Prep"
                className="h-12 rounded-xl mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                rows={3}
                className="rounded-xl mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam">Linked Exam (Optional)</Label>
              <Select value={formData.exam_id} onValueChange={(value) => setFormData({ ...formData, exam_id: value })}>
                <SelectTrigger className="h-12 rounded-xl mt-1">
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl h-12 flex-1 sm:flex-none">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.title} className="rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-teal-600 flex-1 sm:flex-none">
              {editingCourse ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Material Dialog */}
      <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Upload Course Material</DialogTitle>
            <DialogDescription>Add study materials for this course</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="material-title">Material Title *</Label>
              <Input
                id="material-title"
                value={materialFormData.title}
                onChange={(e) => setMaterialFormData({ ...materialFormData, title: e.target.value })}
                placeholder="e.g., Chapter 1 Notes"
                className="h-12 rounded-xl mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setMaterialFormData({ ...materialFormData, file: e.target.files?.[0] || null })}
                className="h-12 rounded-xl mt-1 pt-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMaterialDialog(false)} className="rounded-xl h-12 flex-1 sm:flex-none">Cancel</Button>
            <Button onClick={handleUploadMaterial} disabled={uploadingFile || !materialFormData.title || !materialFormData.file} className="rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-teal-600 flex-1 sm:flex-none">
              {uploadingFile ? "Uploading..." : "Upload"}
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
