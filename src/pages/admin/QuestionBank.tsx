import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileQuestion, Search, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, CheckSquare, Square, MoreVertical, Plus, Loader2, Download } from "lucide-react";
import { downloadCsv, stampFilename } from "@/lib/csv";
import { logAdminAction } from "@/lib/adminAudit";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import { SubjectTopicSelectors } from "@/components/admin/SubjectTopicSelectors";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  subject: string | null;
  topic: string | null;
  subject_id: string | null;
  topic_id: string | null;
  exam_id: string;
  exams?: { name: string };
  subjects?: { name: string };
  topics?: { name: string };
}

interface Exam {
  id: string;
  name: string;
}

const QuestionBank = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExam, setFilterExam] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 10;
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasStructuredColumns, setHasStructuredColumns] = useState<boolean | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    subject_id: "",
    subject_name: "" as string | null,
    topic_id: "",
    topic_name: "" as string | null,
  });

  const [formData, setFormData] = useState({
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    explanation: "",
    subject_id: "",
    subject_name: "" as string | null,
    topic_id: "",
    topic_name: "" as string | null,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterExam, filterSubject, filterTopic, questions]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      navigate("/admin/login");
      return;
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["admin", "super_admin"]).maybeSingle();
    if (!roleData) {
      setLoading(false);
      await supabase.auth.signOut();
      toast({ title: "Access Denied", description: "You do not have admin privileges", variant: "destructive" });
      navigate("/admin/login");
      return;
    }
    await loadExams();
    await checkColumns();
    await loadQuestions();
    setLoading(false);
  };

  const checkColumns = async () => {
    const { error } = await supabase.from("questions").select("subject_id").limit(0);
    if (error) {
      console.warn("Structured columns check result:", error);
      // Code 42703 is "undefined_column" in Postgres, PostgREST might map it
      if (error.message?.includes("subject_id") || error.code === "PGRST100" || error.code === "42703") {
        setHasStructuredColumns(false);
        return;
      }
    }
    setHasStructuredColumns(true);
  };

  const loadExams = async () => {
    const { data } = await (supabase.from("exams").select("id, name, order_index").eq("is_active", true).order("order_index", { ascending: true }) as any);
    if (data) setExams(data as Exam[]);
  };

  const loadQuestions = async () => {
    // Load questions with only the columns that exist and relationships that are valid
    const { data, error } = await supabase
      .from("questions")
      .select("*, exams(name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load Questions Error:", error);
      toast({ title: "Error", description: "Failed to load questions.", variant: "destructive" });
      return;
    }

    // Map data to include subjects/topics from text fields for display compatibility
    const mappedQuestions = (data || []).map(q => ({
      ...q,
      subject_id: null,
      topic_id: null,
      subjects: q.subject ? { name: q.subject } : undefined,
      topics: q.topic ? { name: q.topic } : undefined
    }));

    setQuestions(mappedQuestions as Question[]);
  };

  const applyFilters = () => {
    let filtered = [...questions];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((q) =>
        q.question_text.toLowerCase().includes(query) ||
        (q.subject || "").toLowerCase().includes(query) ||
        (q.topic || "").toLowerCase().includes(query)
      );
    }
    if (filterExam !== "all") {
      filtered = filtered.filter((q) => q.exam_id === filterExam);
    }
    if (filterSubject !== "all") {
      // Match against text-based subject field
      const selectedSubName = subjectOptions.find(o => o.id === filterSubject)?.name;
      filtered = filtered.filter((q) =>
        q.subject === filterSubject ||
        (selectedSubName && q.subject === selectedSubName)
      );
    }
    if (filterTopic !== "all") {
      // Match against text-based topic field
      const selectedTopName = topicOptions.find(o => o.id === filterTopic)?.name;
      filtered = filtered.filter((q) =>
        q.topic === filterTopic ||
        (selectedTopName && q.topic === selectedTopName)
      );
    }
    setFilteredQuestions(filtered);
    setCurrentPage(1);
  };

  const handleEdit = (question: Question) => {
    setSelectedQuestion(question);
    setFormData({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      explanation: question.explanation || "",
      subject_id: question.subject_id || "",
      subject_name: question.subjects?.name || question.subject || "",
      topic_id: question.topic_id || "",
      topic_name: question.topics?.name || question.topic || "",
    });
    setEditOpen(true);
  };

  const ensureSubjectAndTopic = async (subjectId: string, subjectName: string | null, topicId: string, topicName: string | null, userId: string) => {
    let finalSubjectId = subjectId;
    let finalTopicId = topicId;

    // 1. Resolve Subject (exam-independent - find by name + category only)
    if (!finalSubjectId && subjectName) {
      // Check if it exists first
      const { data: existingSub } = await supabase
        .from("subjects")
        .select("id")
        .eq("name", subjectName)
        .eq("category", "questions")
        .maybeSingle();

      if (existingSub) {
        finalSubjectId = existingSub.id;
      } else {
        // Create it
        const { data: newSub } = await supabase
          .from("subjects")
          .insert({ name: subjectName, created_by: userId, category: "questions" })
          .select("id")
          .single();
        if (newSub) finalSubjectId = newSub.id;
      }
    }

    // 2. Resolve Topic
    if (finalSubjectId && !finalTopicId && topicName) {
      // Check if it exists first
      const { data: existingTop } = await supabase
        .from("topics")
        .select("id")
        .eq("subject_id", finalSubjectId)
        .eq("name", topicName)
        .eq("category", "questions")
        .maybeSingle();

      if (existingTop) {
        finalTopicId = existingTop.id;
      } else {
        // Create it
        const { data: newTop } = await supabase
          .from("topics")
          .insert({ subject_id: finalSubjectId, name: topicName, created_by: userId, category: "questions" })
          .select("id")
          .single();
        if (newTop) finalTopicId = newTop.id;
      }
    }

    return { finalSubjectId, finalTopicId };
  };

  const handleUpdate = async () => {
    if (!selectedQuestion) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { finalSubjectId, finalTopicId } = await ensureSubjectAndTopic(
      formData.subject_id,
      formData.subject_name,
      formData.topic_id,
      formData.topic_name,
      session.user.id
    );

    const updateData: any = {
      question_text: formData.question_text,
      option_a: formData.option_a,
      option_b: formData.option_b,
      option_c: formData.option_c,
      option_d: formData.option_d,
      correct_answer: formData.correct_answer,
      explanation: formData.explanation || null,
      subject: formData.subject_name || null,
      topic: formData.topic_name || null,
    };

    if (hasStructuredColumns) {
      updateData.subject_id = finalSubjectId || null;
      updateData.topic_id = finalTopicId || null;
    }

    const { error } = await supabase.from("questions").update(updateData).eq("id", selectedQuestion.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update question", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Question updated successfully" });
    setEditOpen(false);
    setSelectedQuestion(null);
    await loadQuestions();
  };

  const handleDelete = async (questionId: string) => {
    setQuestionToDelete(questionId);
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("questions").delete().eq("id", questionToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "Question deleted successfully" });
      await loadQuestions();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete question", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setQuestionToDelete(null);
    }
  };

  const viewDetails = (question: Question) => {
    setSelectedQuestion(question);
    setDetailsOpen(true);
  };

  const [subjectOptions, setSubjectOptions] = useState<{ id: string, name: string }[]>([]);
  const [topicOptions, setTopicOptions] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    // Build filter options from actual question data
    if (questions.length === 0) {
      setSubjectOptions([]);
      setTopicOptions([]);
      return;
    }

    // Get unique subjects from questions
    const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean)));
    setSubjectOptions(uniqueSubjects.map(name => ({ id: name as string, name: name as string })));

    // Get unique topics from questions (filtered by selected subject if any)
    if (filterSubject !== "all") {
      const matchingQuestions = questions.filter(q => q.subject === filterSubject);
      const uniqueTopics = Array.from(new Set(matchingQuestions.map(q => q.topic).filter(Boolean)));
      setTopicOptions(uniqueTopics.map(name => ({ id: name as string, name: name as string })));
    } else {
      const uniqueTopics = Array.from(new Set(questions.map(q => q.topic).filter(Boolean)));
      setTopicOptions(uniqueTopics.map(name => ({ id: name as string, name: name as string })));
    }
  }, [questions, filterSubject]);



  const handleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleRangeSelect = () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    if (isNaN(start) || isNaN(end) || start < 1 || end > filteredQuestions.length || start > end) {
      toast({ title: "Invalid Range", description: `Enter valid numbers between 1 and ${filteredQuestions.length}`, variant: "destructive" });
      return;
    }
    const rangeIds = filteredQuestions.slice(start - 1, end).map(q => q.id);
    setSelectedQuestions(prev => {
      const newSelection = new Set([...prev, ...rangeIds]);
      return Array.from(newSelection);
    });
    toast({ title: "Range Selected", description: `Selected questions ${start} to ${end}` });
  };

  const clearSelection = () => {
    setSelectedQuestions([]);
    setRangeStart("");
    setRangeEnd("");
  };

  const handleExportQuestions = () => {
    const source = selectedQuestions.length > 0
      ? filteredQuestions.filter((question) => selectedQuestions.includes(question.id))
      : filteredQuestions;
    const ok = downloadCsv(
      stampFilename(selectedQuestions.length > 0 ? "questions-selected" : "questions"),
      source.map((question) => ({
        question: question.question_text,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        correct_answer: question.correct_answer,
        subject: question.subjects?.name || question.subject || "",
        topic: question.topics?.name || question.topic || "",
        exam: question.exams?.name || "",
        explanation: question.explanation || "",
      }))
    );
    toast({
      title: ok ? "Exported" : "Nothing to export",
      description: ok
        ? `${source.length} question${source.length === 1 ? "" : "s"} saved as CSV`
        : "No questions match the current filters",
    });
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedQuestions.length === 0) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("questions").delete().in("id", selectedQuestions);
      if (error) throw error;
      await logAdminAction({
        action: "bulk_delete_questions",
        tableName: "questions",
        newData: { count: selectedQuestions.length },
      });
      toast({ title: "Success", description: `Deleted ${selectedQuestions.length} questions` });
      setBulkDeleteOpen(false);
      setSelectedQuestions([]);
      await loadQuestions();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete questions", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedQuestions.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (!bulkEditData.subject_name && !bulkEditData.topic_name) {
      toast({ title: "Error", description: "Enter at least Subject or Topic to update", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Use the exam_id of the first selected question to resolve subject/topic
      const firstQuestion = questions.find(q => q.id === selectedQuestions[0]);
      if (!firstQuestion) throw new Error("Question not found");

      // 2. Resolve Subject and Topic once for this bulk operation
      const { finalSubjectId, finalTopicId } = await ensureSubjectAndTopic(
        bulkEditData.subject_id,
        bulkEditData.subject_name,
        bulkEditData.topic_id,
        bulkEditData.topic_name,
        session.user.id
      );

      // 3. Update all selected questions in one call
      const updateData: any = {
        subject: bulkEditData.subject_name || null,
        topic: bulkEditData.topic_name || null,
      };

      if (hasStructuredColumns) {
        updateData.subject_id = finalSubjectId || null;
        updateData.topic_id = finalTopicId || null;
      }

      const { error } = await supabase
        .from("questions")
        .update(updateData)
        .in("id", selectedQuestions);

      if (error) throw error;

      toast({ title: "Success", description: `Successfully updated ${selectedQuestions.length} questions` });
      setBulkEditOpen(false);
      setBulkEditData({ subject_id: "", subject_name: "", topic_id: "", topic_name: "" });
      setSelectedQuestions([]);
      await loadQuestions();
    } catch (error: any) {
      console.error("Bulk Update Error:", error);
      toast({ title: "Error", description: error.message || "Failed to update questions", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

  const AddButton = (
    <Button
      onClick={() => navigate("/admin/add-question")}
      size="icon"
      className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border border-white/20"
    >
      <Plus className="w-5 h-5" />
    </Button>
  );

  if (loading) {
    return (
      <AdminLayout title="Question Bank" subtitle="Manage questions">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-600 text-sm">Loading questions...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Question Bank" subtitle={`${questions.length} questions`} headerActions={AddButton}>
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm min-w-[120px] md:min-w-0">
            <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Questions</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm min-w-[120px] md:min-w-0">
            <p className="text-2xl font-bold text-emerald-600">{subjectOptions.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Subjects</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm min-w-[120px] md:min-w-0">
            <p className="text-2xl font-bold text-teal-600">{topicOptions.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Topics</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
          <div className="relative flex-1 lg:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white border-gray-200"
            />
          </div>
          <div className="grid grid-cols-2 lg:flex gap-2">
            <Select value={filterExam} onValueChange={setFilterExam}>
              <SelectTrigger className="h-12 rounded-xl flex-1 lg:w-[140px]">
                <SelectValue placeholder="Exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-12 rounded-xl flex-1 lg:w-[140px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjectOptions.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger className="h-12 rounded-xl flex-1 lg:w-[140px]">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topicOptions.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleExportQuestions}
              disabled={filteredQuestions.length === 0}
              className="h-12 rounded-xl gap-2 col-span-2 lg:col-span-1"
            >
              <Download className="w-4 h-4" />
              {selectedQuestions.length > 0 ? `Export ${selectedQuestions.length}` : "Export CSV"}
            </Button>
          </div>

        </div>

        {/* Selection Tools */}
        {filteredQuestions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-2 rounded-xl"
              >
                {selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0 ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select All ({filteredQuestions.length})
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Range:</span>
                <Input
                  type="number"
                  placeholder="From"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-16 h-9 rounded-lg"
                  min="1"
                  max={filteredQuestions.length}
                />
                <span className="text-sm text-gray-500">to</span>
                <Input
                  type="number"
                  placeholder="To"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-16 h-9 rounded-lg"
                  min="1"
                  max={filteredQuestions.length}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRangeSelect}
                  disabled={!rangeStart || !rangeEnd}
                  className="rounded-lg"
                >
                  Select Range
                </Button>
              </div>

              {selectedQuestions.length > 0 && (
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    {selectedQuestions.length} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkEditData({
                        subject_id: "",
                        subject_name: "",
                        topic_id: "",
                        topic_name: ""
                      });
                      setBulkEditOpen(true);
                    }}
                    className="rounded-lg gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Subject/Topic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                    className="rounded-lg gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="text-gray-500">
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Questions List - Row Based */}
        {filteredQuestions.length === 0 ? (
          <Card className="border-0 bg-white rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <FileQuestion className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Questions Found</h3>
              <p className="text-gray-500 text-sm mb-4">
                {searchQuery || filterExam !== "all" || filterSubject !== "all" || filterTopic !== "all"
                  ? "Try adjusting your filters"
                  : "Start by adding questions to your question bank"}
              </p>
              <Button onClick={() => navigate("/admin/add-question")} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 bg-white rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[40px_2.2fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span></span>
              <span>Question</span>
              <span>Exam</span>
              <span>Subject</span>
              <span>Topic</span>
              <span className="text-center">Actions</span>
            </div>

            <div className="divide-y divide-gray-100">
              {currentQuestions.map((question, index) => {
                const isSelected = selectedQuestions.includes(question.id);
                return (
                  <div key={question.id} className={`transition-colors ${isSelected ? "bg-emerald-50" : "hover:bg-gray-50/50"}`}>
                    {/* Desktop Row */}
                    <div className="hidden md:grid md:grid-cols-[40px_2.2fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 items-start">
                      {/* Checkbox */}
                      <div className="flex items-center pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectQuestion(question.id)}
                        />
                      </div>

                      {/* Question */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-400">Q{indexOfFirstQuestion + index + 1}</span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{question.question_text}</p>
                      </div>

                      <div className="min-w-0">
                        {question.exams?.name ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit max-w-full truncate">
                            {question.exams.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </div>

                      {/* Subject */}
                      <div className="min-w-0">
                        {question.subjects?.name || question.subject ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 w-fit bg-blue-100 text-blue-700 max-w-full truncate">
                            {question.subjects?.name || question.subject}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </div>

                      {/* Topic */}
                      <div className="min-w-0">
                        {question.topics?.name || question.topic ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit max-w-full truncate">
                            {question.topics?.name || question.topic}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </div>

                      {/* Answer hidden as per user request */}

                      {/* Actions */}
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
                            <DropdownMenuItem onClick={() => viewDetails(question)} className="gap-2">
                              <Eye className="w-4 h-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(question)} className="gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(question.id)} className="gap-2 text-red-600 focus:text-red-600">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Mobile Row */}
                    <div className="md:hidden p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectQuestion(question.id)}
                          className="mt-1"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-gray-400">Q{indexOfFirstQuestion + index + 1}</span>
                            {(question.subjects?.name || question.subject) && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700">
                                {question.subjects?.name || question.subject}
                              </Badge>
                            )}
                            {(question.topics?.name || question.topic) && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-gray-200 text-gray-600">
                                {question.topics?.name || question.topic}
                              </Badge>
                            )}
                            <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0">{question.correct_answer}</Badge>
                          </div>
                          <p className="text-sm text-gray-800 line-clamp-2">{question.question_text}</p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50 shrink-0">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
                            <DropdownMenuItem onClick={() => viewDetails(question)} className="gap-2">
                              <Eye className="w-4 h-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(question)} className="gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(question.id)} className="gap-2 text-red-600 focus:text-red-600">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Edit Question Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update question details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                rows={3}
                className="rounded-xl mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Option A *</Label>
                <Input value={formData.option_a} onChange={(e) => setFormData({ ...formData, option_a: e.target.value })} className="h-12 rounded-xl mt-1" />
              </div>
              <div className="space-y-2">
                <Label>Option B *</Label>
                <Input value={formData.option_b} onChange={(e) => setFormData({ ...formData, option_b: e.target.value })} className="h-12 rounded-xl mt-1" />
              </div>
              <div className="space-y-2">
                <Label>Option C *</Label>
                <Input value={formData.option_c} onChange={(e) => setFormData({ ...formData, option_c: e.target.value })} className="h-12 rounded-xl mt-1" />
              </div>
              <div className="space-y-2">
                <Label>Option D *</Label>
                <Input value={formData.option_d} onChange={(e) => setFormData({ ...formData, option_d: e.target.value })} className="h-12 rounded-xl mt-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Correct Answer *</Label>
              <Select value={formData.correct_answer} onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}>
                <SelectTrigger className="h-12 rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Short Notes / Explanation</Label>
              <Textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
                placeholder="Provide an explanation or short notes for this question..."
                className="rounded-xl mt-1"
              />
            </div>

            {selectedQuestion && (
              <SubjectTopicSelectors
                category="questions"
                initialSubjectId={formData.subject_id}
                initialTopicId={formData.topic_id}
                initialSubjectName={formData.subject_name}
                initialTopicName={formData.topic_name}
                onSubjectChange={(id, name) => setFormData({ ...formData, subject_id: id || "", subject_name: name })}
                onTopicChange={(id, name) => setFormData({ ...formData, topic_id: id || "", topic_name: name })}
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl h-12 flex-1 sm:flex-none">Cancel</Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.question_text || !formData.option_a || !formData.option_b || !formData.option_c || !formData.option_d}
              className="rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-teal-600 flex-1 sm:flex-none"
            >
              Update Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-500 text-xs">Question</Label>
                <p className="text-sm mt-1">{selectedQuestion.question_text}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500 text-xs">Options</Label>
                <div className="space-y-1.5">
                  <p className={`text-sm p-2 rounded-lg ${selectedQuestion.correct_answer === "A" ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-gray-50"}`}>
                    A. {selectedQuestion.option_a}
                  </p>
                  <p className={`text-sm p-2 rounded-lg ${selectedQuestion.correct_answer === "B" ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-gray-50"}`}>
                    B. {selectedQuestion.option_b}
                  </p>
                  <p className={`text-sm p-2 rounded-lg ${selectedQuestion.correct_answer === "C" ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-gray-50"}`}>
                    C. {selectedQuestion.option_c}
                  </p>
                  <p className={`text-sm p-2 rounded-lg ${selectedQuestion.correct_answer === "D" ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-gray-50"}`}>
                    D. {selectedQuestion.option_d}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Correct Answer</Label>
                  <Badge className="mt-1 bg-emerald-500">{selectedQuestion.correct_answer}</Badge>
                </div>
                {(selectedQuestion.subjects?.name || selectedQuestion.subject) && (
                  <div>
                    <Label className="text-gray-500 text-xs">Subject</Label>
                    <p className="text-sm mt-1">{selectedQuestion.subjects?.name || selectedQuestion.subject}</p>
                  </div>
                )}
                {(selectedQuestion.topics?.name || selectedQuestion.topic) && (
                  <div>
                    <Label className="text-gray-500 text-xs">Topic</Label>
                    <p className="text-sm mt-1">{selectedQuestion.topics?.name || selectedQuestion.topic}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={confirmDelete}
        itemName="this question"
        isDeleting={isDeleting}
      />

      <DeleteAlertDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Bulk Delete Questions"
        description={`Are you sure you want to delete ${selectedQuestions.length} selected questions? This action cannot be undone.`}
        isDeleting={isDeleting}
      />

      {/* Bulk Edit Subject/Topic Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subject/Topic</DialogTitle>
            <DialogDescription>
              Update subject and/or topic for {selectedQuestions.length} selected questions. Leave empty to keep existing value.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <SubjectTopicSelectors
              category="questions"
              onSubjectChange={(id, name) => setBulkEditData({ ...bulkEditData, subject_id: id || "", subject_name: name })}
              onTopicChange={(id, name) => setBulkEditData({ ...bulkEditData, topic_id: id || "", topic_name: name })}
            />
            <p className="text-xs text-gray-500 italic">Moving {selectedQuestions.length} questions to the selected Subject and Topic.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleBulkEdit}
              disabled={saving || (!bulkEditData.subject_name && !bulkEditData.topic_name)}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  Update {selectedQuestions.length} Questions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default QuestionBank;
