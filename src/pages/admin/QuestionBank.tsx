import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileQuestion, Search, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, CheckSquare, Square, MoreVertical, Plus, Loader2, Calendar, Tag, Globe, Layers, Filter, BookOpen, Lock, Check, Download } from "lucide-react";
import { downloadCsv, stampFilename } from "@/lib/csv";
import { logAdminAction } from "@/lib/adminAudit";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import { SubjectTopicSelectors } from "@/components/admin/SubjectTopicSelectors";
import { MathText } from "@/components/ui/MathText";
import { fetchAllRows, buildSafeUpdateData } from "@/utils/questionSecurity";

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
  difficulty?: "easy" | "medium" | "hard" | string | null;
  year?: number | null;
  language?: "bn" | "en" | "mixed" | string | null;
  status?: "draft" | "review" | "approved" | "published" | "archived" | string | null;
  source?: string | null;
  tags?: string[] | string | null;
  exams?: { name: string };
  subjects?: { name: string };
  topics?: { name: string };
  test_questions?: { mock_tests: { title: string } | null }[];
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
  const [filterMockTest, setFilterMockTest] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [mockTestQuestionIds, setMockTestQuestionIds] = useState<string[]>([]);
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
    exam_id: "",
    mock_test_id: "",
    difficulty: "all",
    year: "",
    language: "all",
  });
  const [bulkEditMockTests, setBulkEditMockTests] = useState<any[]>([]);

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
    difficulty: "medium",
    year: "",
    language: "bn",
    status: "published",
    source: "",
    tags: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterExam, filterMockTest, mockTestQuestionIds, filterSubject, filterTopic, filterDifficulty, filterYear, filterLanguage, questions]);

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
    await loadSubjectsAndTopics();
    await checkColumns();
    await loadQuestions();
    setLoading(false);
  };

  const loadSubjectsAndTopics = async () => {
    try {
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("category", "questions")
        .order("order_index", { ascending: true });
        
      if (subjectsData) {
        setSubjectOptions(subjectsData);
      }

      const { data: topicsData } = await supabase
        .from("topics")
        .select("id, name, subject_id")
        .eq("category", "questions")
        .order("order_index", { ascending: true });
        
      if (topicsData) {
        setTopicOptions(topicsData);
      }
    } catch (error) {
      console.error("Error loading subjects/topics:", error);
    }
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
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      setExams(data || []);
      
      // Also load all mock tests here so they are available in the dropdown
      // Only load tests that belong to an exam (exclude orphaned tests like Indus Valley test with null exam_id)
      const { data: tests } = await supabase
        .from("mock_tests")
        .select("id, title, exam_id")
        .not("exam_id", "is", null)
        .order("title");
      setMockTests(tests || []);
    } catch (error) {
      console.error("Error loading exams:", error);
      // Fallback: try without order
      const { data: fallbackData } = await supabase.from("exams").select("*");
      setExams(fallbackData || []);
    }
  };

  const loadMockTestQuestions = async (testId: string) => {
    if (testId === "all") {
      setMockTestQuestionIds([]);
      return;
    }

    const { data } = await supabase
      .from("test_questions")
      .select("question_id")
      .eq("test_id", testId);
    
    setMockTestQuestionIds((data || []).map(item => item.question_id));
  };

  const handleCategoryChange = (value: string) => {
    setFilterCategory(value);
    setFilterSubcategory("all");
    
    setFilterExam("all");
    setFilterSubject("all");
    setFilterMockTest("all");
    setFilterTopic("all");
    setMockTestQuestionIds([]);
  };

  const handleSubcategoryChange = (value: string) => {
    setFilterSubcategory(value);
    
    if (value === "all") {
      setFilterExam("all");
      setFilterMockTest("all");
      setMockTestQuestionIds([]);
      setFilterSubject("all");
      setFilterTopic("all");
      return;
    }

    if (filterCategory === "exam") {
      // Now the subcategory dropdown shows exams, not mock tests
      if (value.startsWith("exam:")) {
        const examId = value.substring(5);
        setFilterExam(examId);
        setFilterMockTest("all");
        setMockTestQuestionIds([]);
      }
    } else if (filterCategory === "subject") {
      if (value.startsWith("subject:")) {
        const subjectName = value.substring(8);
        setFilterSubject(subjectName);
        setFilterTopic("all");
      }
    }
  };

  // Handler for Mock Test selection (3rd dropdown when Exam category + specific exam is selected)
  const handleMockTestFilterChange = (value: string) => {
    if (value === "all") {
      setFilterMockTest("all");
      setMockTestQuestionIds([]);
    } else {
      setFilterMockTest(value);
      loadMockTestQuestions(value);
    }
  };

  // Add an explicit topic handler since topic comes after subject now
  const handleTopicChange = (value: string) => {
    setFilterTopic(value);
  };

  const loadQuestions = async () => {
    // Use fetchAllRows to bypass Supabase's 1000-row default limit — SECURITY FIX
    const allData = await fetchAllRows(
      "questions",
      "*, exams(name), test_questions(mock_tests(title))",
      undefined,
      "created_at",
      true
    );

    // Map data to include subjects/topics from text fields for display compatibility
    const mappedQuestions = allData.map((q: any) => ({
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
        (q.topic || "").toLowerCase().includes(query) ||
        (q.source || "").toLowerCase().includes(query)
      );
    }
    // Scope filtering: when a category is chosen, only show questions belonging to that category
    if (filterCategory === "exam") {
      // Only show questions that are linked to an exam
      filtered = filtered.filter((q) => q.exam_id);
    } else if (filterCategory === "subject") {
      // Only show questions that have a subject assigned
      filtered = filtered.filter((q) => q.subject);
    }

    if (filterExam !== "all") {
      filtered = filtered.filter((q) => q.exam_id === filterExam);
    }
    
    // Only apply Mock Test filter if category is Exam
    if (filterCategory === "exam") {
      if (filterMockTest !== "all" && mockTestQuestionIds.length > 0) {
        filtered = filtered.filter((q) => mockTestQuestionIds.includes(q.id));
      } else if (filterMockTest !== "all") {
        // If mock test is selected but has no questions, show empty
        filtered = [];
      }
    }

    // Only apply Subject/Topic filters if category is Subject
    if (filterCategory === "subject") {
      // If a specific subject is selected from the second dropdown
      if (filterSubject !== "all") {
        // Find by ID or text match
        const selectedSubName = subjectOptions.find(o => o.id === filterSubject)?.name;
        filtered = filtered.filter((q) =>
          q.subject_id === filterSubject ||
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
    }

    // Difficulty filter
    if (filterDifficulty !== "all") {
      filtered = filtered.filter((q) => q.difficulty === filterDifficulty);
    }

    // PYQ / Year filter
    if (filterYear === "pyq") {
      filtered = filtered.filter((q) => q.year !== null && q.year !== undefined && Number(q.year) > 0);
    } else if (filterYear !== "all") {
      filtered = filtered.filter((q) => String(q.year) === filterYear);
    }

    // Language filter
    if (filterLanguage !== "all") {
      filtered = filtered.filter((q) => q.language === filterLanguage);
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
      difficulty: question.difficulty || "medium",
      year: question.year ? String(question.year) : "",
      language: question.language || "bn",
      status: question.status || "published",
      source: question.source || "",
      tags: Array.isArray(question.tags) ? question.tags.join(", ") : (question.tags || ""),
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

    // SECURITY: Use buildSafeUpdateData to prevent accidental cross-contamination
    const safeData = buildSafeUpdateData(
      { subject_name: formData.subject_name ?? undefined, topic_name: formData.topic_name ?? undefined, subject_id: finalSubjectId, topic_id: finalTopicId },
      {
        subject: selectedQuestion.subject ?? undefined,
        topic: selectedQuestion.topic ?? undefined,
        subject_id: selectedQuestion.subject_id ?? undefined,
        topic_id: selectedQuestion.topic_id ?? undefined,
        subjects: selectedQuestion.subjects,
        topics: selectedQuestion.topics,
      }
    );

    // STRICT: Only update question content, subject/topic, and enhanced DB columns
    // NEVER change exam_id — it stays exactly as originally uploaded
    const updateData: any = {
      question_text: formData.question_text,
      option_a: formData.option_a,
      option_b: formData.option_b,
      option_c: formData.option_c,
      option_d: formData.option_d,
      correct_answer: formData.correct_answer,
      explanation: formData.explanation || null,
      subject: safeData.subject,
      topic: safeData.topic,
      difficulty: formData.difficulty || "medium",
      year: formData.year ? parseInt(formData.year, 10) || null : null,
      language: formData.language || "bn",
      status: formData.status || "published",
      source: formData.source || null,
      tags: formData.tags ? formData.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : null,
    };

    if (hasStructuredColumns) {
      updateData.subject_id = safeData.subject_id;
      updateData.topic_id = safeData.topic_id;
    }

    // NOTE: exam_id is intentionally NOT included in updateData
    // Questions can only be assigned to an exam during upload

    const { error } = await supabase.from("questions").update(updateData).eq("id", selectedQuestion.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update question: " + error.message, variant: "destructive" });
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
  const [topicOptions, setTopicOptions] = useState<{ id: string, name: string, subject_id?: string }[]>([]);



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

  const handleBulkExamChange = async (examId: string) => {
    setBulkEditData({ ...bulkEditData, exam_id: examId, mock_test_id: "" });
    if (examId === "all" || !examId) {
      setBulkEditMockTests([]);
      return;
    }

    const { data } = await supabase
      .from("mock_tests")
      .select("id, title")
      .eq("exam_id", examId)
      .order("title");
    
    setBulkEditMockTests(data || []);
  };

  const handleBulkEdit = async () => {
    if (selectedQuestions.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Determine the category of selected questions
    const selectedQs = questions.filter(q => selectedQuestions.includes(q.id));
    const isExamBased = selectedQs.some(q => q.exam_id);
    const isSubjectBased = selectedQs.some(q => q.subject && !q.exam_id);

    if (isExamBased) {
      // Exam-based questions: only allow changing exam_id and mock_test_id
      if (!bulkEditData.exam_id && !bulkEditData.mock_test_id) {
        toast({ title: "Error", description: "Select at least one field to update", variant: "destructive" });
        return;
      }
    } else {
      // Subject-based questions: only allow changing subject/topic
      if (!bulkEditData.subject_name && !bulkEditData.topic_name) {
        toast({ title: "Error", description: "Select at least one field to update", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const updateData: any = {};

      if (isSubjectBased || (!isExamBased && !isSubjectBased)) {
        // Subject-based: only update subject/topic, NEVER set exam_id
        if (bulkEditData.subject_name) {
          updateData.subject = bulkEditData.subject_name;
        }
        if (bulkEditData.topic_name) {
          updateData.topic = bulkEditData.topic_name;
        }

        // Resolve IDs for structured columns
        const { finalSubjectId, finalTopicId } = await ensureSubjectAndTopic(
          bulkEditData.subject_id,
          bulkEditData.subject_name,
          bulkEditData.topic_id,
          bulkEditData.topic_name,
          session.user.id
        );

        if (hasStructuredColumns) {
          if (finalSubjectId) updateData.subject_id = finalSubjectId;
          if (finalTopicId) updateData.topic_id = finalTopicId;
        }
      }

      if (isExamBased) {
        // Exam-based: only update exam_id, NEVER change subject/topic
        if (bulkEditData.exam_id && bulkEditData.exam_id !== "all") {
          updateData.exam_id = bulkEditData.exam_id;
        }
      }

      // Universal updates (applicable to both exam and subject questions)
      if (bulkEditData.difficulty && bulkEditData.difficulty !== "all") {
        updateData.difficulty = bulkEditData.difficulty;
      }
      if (bulkEditData.year) {
        updateData.year = parseInt(bulkEditData.year, 10) || null;
      }
      if (bulkEditData.language && bulkEditData.language !== "all") {
        updateData.language = bulkEditData.language;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("questions")
          .update(updateData)
          .in("id", selectedQuestions);

        if (error) throw error;
      }

      // Update Mock Test associations if selected (exam-based only)
      if (isExamBased && bulkEditData.mock_test_id && bulkEditData.mock_test_id !== "all") {
        const { data: existingLinks } = await supabase
          .from("test_questions")
          .select("question_id")
          .eq("test_id", bulkEditData.mock_test_id)
          .in("question_id", selectedQuestions);
        
        const linkedIds = new Set((existingLinks || []).map(l => l.question_id));
        const newLinks = selectedQuestions
          .filter(id => !linkedIds.has(id))
          .map(id => ({
            test_id: bulkEditData.mock_test_id,
            question_id: id,
            marks: 1,
            question_order: 0
          }));

        if (newLinks.length > 0) {
          const { error: linkError } = await supabase
            .from("test_questions")
            .insert(newLinks);
          if (linkError) throw linkError;
        }
      }

      toast({ title: "Success", description: `Successfully updated ${selectedQuestions.length} questions` });
      setBulkEditOpen(false);
      setBulkEditData({
        subject_id: "",
        subject_name: "",
        topic_id: "",
        topic_name: "",
        exam_id: "",
        mock_test_id: "",
        difficulty: "all",
        year: "",
        language: "all",
      });
      setBulkEditMockTests([]);
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
      className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 text-white"
    >
      <Plus className="w-5 h-5" />
    </Button>
  );

  if (loading) {
    return (
      <AdminLayout title="Question Bank" subtitle="Manage questions">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-600 text-sm font-semibold">Loading questions...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Question Bank" subtitle={`${questions.length} questions in database`} headerActions={AddButton}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Question Bank Vault</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Manage, filter, verify formulas and organize questions across exams & subjects</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
              {questions.length} MCQs Total
            </Badge>
          </div>
        </div>

        {/* Stats Row with Difficulty & PYQ breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-50/70 to-indigo-50/30 border border-blue-100/80 shadow-xs">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{questions.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Total MCQs</p>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-emerald-50/90 to-teal-50/40 border border-emerald-200/90 shadow-xs">
            <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">{questions.filter(q => q.difficulty === 'easy').length}</p>
            <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold mt-0.5">Easy</p>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-50/70 to-orange-50/30 border border-amber-100/80 shadow-xs">
            <p className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">{questions.filter(q => q.difficulty === 'medium').length}</p>
            <p className="text-[10px] text-amber-700 uppercase tracking-wider font-bold mt-0.5">Medium</p>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-rose-50/70 to-red-50/30 border border-rose-100/80 shadow-xs">
            <p className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">{questions.filter(q => q.difficulty === 'hard').length}</p>
            <p className="text-[10px] text-rose-700 uppercase tracking-wider font-bold mt-0.5">Hard</p>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-purple-50/70 to-violet-50/30 border border-purple-100/80 shadow-xs">
            <p className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">{questions.filter(q => q.year && Number(q.year) > 0).length}</p>
            <p className="text-[10px] text-purple-700 uppercase tracking-wider font-bold mt-0.5">PYQs</p>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-200/90 shadow-xs">
            <p className="text-xl sm:text-2xl font-black text-blue-700 tracking-tight">{subjectOptions.length}</p>
            <p className="text-[10px] text-blue-700 uppercase tracking-wider font-bold mt-0.5">Subjects</p>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3.5 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="relative md:col-span-2 lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search question text or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-2xl bg-white border-slate-200/90 text-sm shadow-2xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <Select value={filterCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200/90 text-xs font-bold text-slate-700 shadow-2xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-lg border-slate-200">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="exam">Exam Linked</SelectItem>
                <SelectItem value="subject">Subject Linked</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filterSubcategory} 
              onValueChange={handleSubcategoryChange} 
              disabled={filterCategory === "all"}
            >
              <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200/90 text-xs font-bold text-slate-700 shadow-2xs">
                <SelectValue placeholder={filterCategory === "exam" ? "Select Exam" : filterCategory === "subject" ? "Select Subject" : "Exam / Subject"} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-lg border-slate-200">
                <SelectItem value="all">
                  {filterCategory === "exam" ? "All Exams" : filterCategory === "subject" ? "All Subjects" : "All"}
                </SelectItem>
                {filterCategory === "exam" && exams.map((exam) => (
                  <SelectItem key={`exam:${exam.id}`} value={`exam:${exam.id}`}>{exam.name}</SelectItem>
                ))}
                {filterCategory === "subject" && subjectOptions.map((subject) => (
                  <SelectItem key={`subject:${subject.id}`} value={`subject:${subject.id}`}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Difficulty Filter */}
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200/90 text-xs font-bold text-slate-700 shadow-2xs">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-lg border-slate-200">
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">🟢 Easy</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="hard">🔴 Hard</SelectItem>
              </SelectContent>
            </Select>

            {/* PYQ Year Filter */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200/90 text-xs font-bold text-slate-700 shadow-2xs">
                <SelectValue placeholder="PYQ Year" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-lg border-slate-200">
                <SelectItem value="all">All Questions</SelectItem>
                <SelectItem value="pyq">All PYQ Papers</SelectItem>
                <SelectItem value="2025">2025 PYQ</SelectItem>
                <SelectItem value="2024">2024 PYQ</SelectItem>
                <SelectItem value="2023">2023 PYQ</SelectItem>
                <SelectItem value="2022">2022 PYQ</SelectItem>
                <SelectItem value="2021">2021 PYQ</SelectItem>
                <SelectItem value="2020">2020 PYQ</SelectItem>
                <SelectItem value="2019">2019 PYQ</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleExportQuestions}
              disabled={filteredQuestions.length === 0}
              className="h-11 rounded-2xl gap-2 font-bold text-slate-700 border-slate-200/90 shadow-2xs hover:bg-slate-50 col-span-2 lg:col-span-1"
            >
              <Download className="w-4 h-4 text-blue-600" />
              {selectedQuestions.length > 0 ? `Export (${selectedQuestions.length})` : "Export CSV"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
            {/* Language filter */}
            <div className="w-40">
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger className="h-10 rounded-2xl bg-slate-50 border-slate-200/90 text-xs font-bold text-slate-700">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-lg border-slate-200">
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show Mock Test dropdown when an Exam is selected */}
            {filterCategory === "exam" && filterExam !== "all" && (
              <div className="w-56">
                <Select 
                  value={filterMockTest} 
                  onValueChange={handleMockTestFilterChange}
                >
                  <SelectTrigger className="h-10 rounded-2xl bg-slate-50 border-slate-200/90 text-xs font-bold text-slate-700">
                    <SelectValue placeholder="Select Mock Test" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-lg border-slate-200">
                    <SelectItem value="all">All Mock Tests</SelectItem>
                    {mockTests
                      .filter(test => test.exam_id === filterExam)
                      .map((test) => (
                        <SelectItem key={`test:${test.id}`} value={test.id}>{test.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show Topic dropdown ONLY when a Subject is selected */}
            {filterCategory === "subject" && filterSubcategory !== "all" && filterSubcategory.startsWith("subject:") && (
              <div className="w-56">
                <Select 
                  value={filterTopic} 
                  onValueChange={handleTopicChange} 
                >
                  <SelectTrigger className="h-10 rounded-2xl bg-slate-50 border-slate-200/90 text-xs font-bold text-slate-700">
                    <SelectValue placeholder="Topic" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-lg border-slate-200">
                    <SelectItem value="all">All Topics</SelectItem>
                    {topicOptions
                      // Only show topics belonging to the selected subject
                      .filter(topic => topic.subject_id === filterSubject || filterSubject === "all")
                      .map((topic) => (
                        <SelectItem key={`topic:${topic.id}`} value={topic.id}>{topic.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(filterCategory !== "all" || filterExam !== "all" || filterDifficulty !== "all" || filterYear !== "all" || filterLanguage !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterCategory("all");
                  setFilterSubcategory("all");
                  setFilterExam("all");
                  setFilterSubject("all");
                  setFilterTopic("all");
                  setFilterMockTest("all");
                  setFilterDifficulty("all");
                  setFilterYear("all");
                  setFilterLanguage("all");
                }}
                className="h-10 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Selection Tools */}
        {filteredQuestions.length > 0 && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-2 rounded-xl font-bold text-slate-700 border-slate-200"
              >
                {selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                Select All ({filteredQuestions.length})
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Range:</span>
                <Input
                  type="number"
                  placeholder="From"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-16 h-9 rounded-xl border-slate-200 text-xs font-medium"
                  min="1"
                  max={filteredQuestions.length}
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <Input
                  type="number"
                  placeholder="To"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-16 h-9 rounded-xl border-slate-200 text-xs font-medium"
                  min="1"
                  max={filteredQuestions.length}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRangeSelect}
                  disabled={!rangeStart || !rangeEnd}
                  className="rounded-xl font-bold border-slate-200 text-xs h-9"
                >
                  Select Range
                </Button>
              </div>

              {selectedQuestions.length > 0 && (
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full text-xs">
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
                        topic_name: "",
                        exam_id: "",
                        mock_test_id: "",
                        difficulty: "all",
                        year: "",
                        language: "all"
                      });
                      setBulkEditOpen(true);
                    }}
                    className="rounded-xl gap-1.5 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 font-bold text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Subject/Topic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                    className="rounded-xl gap-1.5 text-rose-600 border-rose-200 bg-rose-50/40 hover:bg-rose-100/60 font-bold text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="text-slate-500 font-bold text-xs">
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Questions List - Row Based */}
        {filteredQuestions.length === 0 ? (
          <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600">
                <FileQuestion className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">No Questions Found</h3>
              <p className="text-slate-500 text-sm mb-5">
                {searchQuery || filterExam !== "all" || filterSubject !== "all" || filterTopic !== "all"
                  ? "Try adjusting your filters"
                  : "Start by adding questions to your question bank"}
              </p>
              <Button onClick={() => navigate("/admin/add-question")} className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 px-5">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {currentQuestions.map((question, index) => {
              const isSelected = selectedQuestions.includes(question.id);
              const correct = (question.correct_answer || "").toUpperCase().trim();
              const isA = correct === "A";
              const isB = correct === "B";
              const isC = correct === "C";
              const isD = correct === "D";

              return (
                <div
                  key={question.id}
                  className={`bg-white rounded-2xl sm:rounded-3xl border transition-all p-4 sm:p-5 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/20 shadow-xs ring-2 ring-blue-500/20"
                      : "border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  {/* Top Row: Circular Selector + Number & Question Text + Action Icons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Circle Selector */}
                      <button
                        type="button"
                        onClick={() => handleSelectQuestion(question.id)}
                        className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center shrink-0 mt-0.5 cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                            : "border-slate-300 bg-white hover:border-blue-600"
                        }`}
                        aria-label="Select question"
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      {/* Question Number & Text */}
                      <div className="flex-1 min-w-0 flex items-start gap-2 text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                        <span className="shrink-0 text-blue-600">{indexOfFirstQuestion + index + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <MathText text={question.question_text} formatBullets={false} />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on top right: Edit & Delete */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(question)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Question"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(question.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Middle: 2-Column Options (A & C left, B & D right) */}
                  <div className="ml-8 mt-3 mb-3.5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 sm:gap-x-12 gap-y-2 text-xs sm:text-sm">
                    {/* Left Column: A and C */}
                    <div className="space-y-2">
                      <div className={`flex items-start gap-2 p-2 rounded-xl transition-colors ${isA ? "font-bold text-slate-900 bg-emerald-50/70 border border-emerald-200/70" : "text-slate-600 bg-slate-50/50"}`}>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 font-black ${isA ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>A</span>
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <MathText text={question.option_a || ""} formatBullets={false} />
                          {isA && <span className="text-emerald-700 font-black ml-1 text-xs">✓ Correct</span>}
                        </div>
                      </div>
                      <div className={`flex items-start gap-2 p-2 rounded-xl transition-colors ${isC ? "font-bold text-slate-900 bg-emerald-50/70 border border-emerald-200/70" : "text-slate-600 bg-slate-50/50"}`}>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 font-black ${isC ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>C</span>
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <MathText text={question.option_c || ""} formatBullets={false} />
                          {isC && <span className="text-emerald-700 font-black ml-1 text-xs">✓ Correct</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: B and D */}
                    <div className="space-y-2">
                      <div className={`flex items-start gap-2 p-2 rounded-xl transition-colors ${isB ? "font-bold text-slate-900 bg-emerald-50/70 border border-emerald-200/70" : "text-slate-600 bg-slate-50/50"}`}>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 font-black ${isB ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>B</span>
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <MathText text={question.option_b || ""} formatBullets={false} />
                          {isB && <span className="text-emerald-700 font-black ml-1 text-xs">✓ Correct</span>}
                        </div>
                      </div>
                      <div className={`flex items-start gap-2 p-2 rounded-xl transition-colors ${isD ? "font-bold text-slate-900 bg-emerald-50/70 border border-emerald-200/70" : "text-slate-600 bg-slate-50/50"}`}>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 font-black ${isD ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>D</span>
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <MathText text={question.option_d || ""} formatBullets={false} />
                          {isD && <span className="text-emerald-700 font-black ml-1 text-xs">✓ Correct</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Metadata Row */}
                  <div className="ml-8 flex items-center flex-wrap gap-2.5 text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
                    <Badge variant="secondary" className="rounded-full text-[10px] font-bold px-2.5 py-0.5 bg-slate-100 text-slate-700">
                      <BookOpen className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                      {question.subjects?.name || question.subject || question.topics?.name || "General"}
                    </Badge>

                    {question.exams?.name && (
                      <Badge variant="outline" className="rounded-full text-[10px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                        {question.exams.name}
                      </Badge>
                    )}

                    {question.year && (
                      <Badge variant="outline" className="rounded-full text-[10px] font-bold px-2.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200">
                        PYQ {question.year}
                      </Badge>
                    )}

                    {question.difficulty && (
                      <Badge variant="secondary" className={`rounded-full text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 ${
                        question.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' :
                        question.difficulty === 'hard' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {question.difficulty}
                      </Badge>
                    )}

                    <span className="text-slate-400 font-medium text-[11px] uppercase">
                      LANG: {question.language || "bn"}
                    </span>

                    {question.explanation && (
                      <button
                        type="button"
                        onClick={() => viewDetails(question)}
                        className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> ব্যাখ্যা দেখুন
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-2xl border-slate-200 h-10 px-3 font-bold"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-2xs">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-2xl border-slate-200 h-10 px-3 font-bold"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Question Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Question</DialogTitle>
            <DialogDescription>Update question details, difficulty level, PYQ year, and tags</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Question Text *</Label>
              <Textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                rows={3}
                className="rounded-xl mt-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Option A *</Label>
                <Input value={formData.option_a} onChange={(e) => setFormData({ ...formData, option_a: e.target.value })} className="h-11 rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Option B *</Label>
                <Input value={formData.option_b} onChange={(e) => setFormData({ ...formData, option_b: e.target.value })} className="h-11 rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Option C *</Label>
                <Input value={formData.option_c} onChange={(e) => setFormData({ ...formData, option_c: e.target.value })} className="h-11 rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Option D *</Label>
                <Input value={formData.option_d} onChange={(e) => setFormData({ ...formData, option_d: e.target.value })} className="h-11 rounded-xl text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Correct Answer *</Label>
                <Select value={formData.correct_answer} onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Option A</SelectItem>
                    <SelectItem value="B">Option B</SelectItem>
                    <SelectItem value="C">Option C</SelectItem>
                    <SelectItem value="D">Option D</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Difficulty Level</Label>
                <Select value={formData.difficulty} onValueChange={(val: any) => setFormData({ ...formData, difficulty: val })}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Easy</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="hard">🔴 Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">PYQ Year (Optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 2024"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="h-11 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Language</Label>
                <Select value={formData.language} onValueChange={(val: any) => setFormData({ ...formData, language: val })}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Status</Label>
                <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Source / Paper Name</Label>
                <Input
                  placeholder="e.g. WBP SI 2020"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="h-11 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Tags (Comma separated)</Label>
              <Input
                placeholder="history, mughal, static-gk"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="h-11 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Short Notes / Explanation</Label>
              <Textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
                placeholder="Provide explanation or key points for this question..."
                className="rounded-xl text-sm"
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
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl h-11 flex-1 sm:flex-none">Cancel</Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.question_text || !formData.option_a || !formData.option_b || !formData.option_c || !formData.option_d}
              className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex-1 sm:flex-none shadow-md shadow-blue-600/20"
            >
              Update Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Question Specifications</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedQuestion.difficulty && (
                  <Badge variant="outline" className={`text-xs font-bold ${
                    selectedQuestion.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    selectedQuestion.difficulty === 'hard' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    Difficulty: {selectedQuestion.difficulty.toUpperCase()}
                  </Badge>
                )}
                {selectedQuestion.year && (
                  <Badge variant="outline" className="text-xs font-bold bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    PYQ Year: {selectedQuestion.year}
                  </Badge>
                )}
                {selectedQuestion.language && (
                  <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-700 border-slate-200">
                    Language: {selectedQuestion.language === 'bn' ? 'বাংলা' : selectedQuestion.language === 'en' ? 'English' : 'Mixed'}
                  </Badge>
                )}
                {selectedQuestion.status && (
                  <Badge className="text-xs font-semibold bg-blue-100 text-blue-800 border-0">
                    {selectedQuestion.status.toUpperCase()}
                  </Badge>
                )}
              </div>

              <div>
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Question</Label>
                <div className="text-sm mt-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <MathText text={selectedQuestion.question_text} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Options</Label>
                <div className="space-y-1.5">
                  <div className={`text-sm p-3 rounded-xl border ${selectedQuestion.correct_answer === "A" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-sm" : "bg-white border-slate-200"}`}>
                    <div className="flex gap-2"><span className="font-bold">A.</span> <MathText text={selectedQuestion.option_a} /></div>
                  </div>
                  <div className={`text-sm p-3 rounded-xl border ${selectedQuestion.correct_answer === "B" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-sm" : "bg-white border-slate-200"}`}>
                    <div className="flex gap-2"><span className="font-bold">B.</span> <MathText text={selectedQuestion.option_b} /></div>
                  </div>
                  <div className={`text-sm p-3 rounded-xl border ${selectedQuestion.correct_answer === "C" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-sm" : "bg-white border-slate-200"}`}>
                    <div className="flex gap-2"><span className="font-bold">C.</span> <MathText text={selectedQuestion.option_c} /></div>
                  </div>
                  <div className={`text-sm p-3 rounded-xl border ${selectedQuestion.correct_answer === "D" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-sm" : "bg-white border-slate-200"}`}>
                    <div className="flex gap-2"><span className="font-bold">D.</span> <MathText text={selectedQuestion.option_d} /></div>
                  </div>
                </div>
              </div>
              
              {selectedQuestion.explanation && (
                <div>
                  <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Explanation / Short Notes</Label>
                  <div className="text-sm mt-1 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 text-slate-800">
                    <MathText text={selectedQuestion.explanation} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <Label className="text-slate-500 text-xs">Correct Answer</Label>
                  <Badge className="mt-1 bg-emerald-600 font-bold block w-fit">Option {selectedQuestion.correct_answer}</Badge>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">Linked Exam</Label>
                  <p className="text-xs mt-1 font-bold text-slate-800 truncate">{selectedQuestion.exams?.name || "Independent / All"}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">Source Paper</Label>
                  <p className="text-xs mt-1 font-semibold text-slate-700 truncate">{selectedQuestion.source || "None"}</p>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <Label className="text-slate-500 text-xs">Test / Mock Test</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedQuestion.test_questions && selectedQuestion.test_questions.length > 0 ? (
                      selectedQuestion.test_questions.map((tq, i) => tq.mock_tests?.title && (
                        <Badge key={i} variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-medium">
                          {tq.mock_tests.title}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Not assigned to specific mock test</span>
                    )}
                  </div>
                </div>
                {(selectedQuestion.subjects?.name || selectedQuestion.subject) && (
                  <div>
                    <Label className="text-slate-500 text-xs">Subject</Label>
                    <p className="text-xs mt-1 font-bold text-blue-700">{selectedQuestion.subjects?.name || selectedQuestion.subject}</p>
                  </div>
                )}
                {(selectedQuestion.topics?.name || selectedQuestion.topic) && (
                  <div>
                    <Label className="text-slate-500 text-xs">Topic</Label>
                    <p className="text-xs mt-1 font-semibold text-slate-700">{selectedQuestion.topics?.name || selectedQuestion.topic}</p>
                  </div>
                )}
                {selectedQuestion.tags && (
                  <div className="col-span-2 sm:col-span-3">
                    <Label className="text-slate-500 text-xs">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(selectedQuestion.tags) ? selectedQuestion.tags : String(selectedQuestion.tags).split(',')).map((tag: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200">
                          #{String(tag).trim()}
                        </Badge>
                      ))}
                    </div>
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

      {/* Bulk Edit Subject/Topic/Metadata Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Bulk Update Questions</DialogTitle>
            <DialogDescription>
              Batch update {selectedQuestions.length} selected questions with common difficulty, year, language, or curriculum tags.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {/* Common Metadata Fields */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Universal Metadata</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Difficulty</Label>
                  <Select value={bulkEditData.difficulty} onValueChange={(val) => setBulkEditData({ ...bulkEditData, difficulty: val })}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-white">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Do not change</SelectItem>
                      <SelectItem value="easy">🟢 Easy</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="hard">🔴 Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">PYQ Year</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2024"
                    value={bulkEditData.year}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, year: e.target.value })}
                    className="h-10 rounded-xl text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Language</Label>
                  <Select value={bulkEditData.language} onValueChange={(val) => setBulkEditData({ ...bulkEditData, language: val })}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-white">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Do not change</SelectItem>
                      <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Detect category of selected questions */}
            {(() => {
              const selectedQs = questions.filter(q => selectedQuestions.includes(q.id));
              const isExamBased = selectedQs.some(q => q.exam_id);
              
              if (isExamBased) {
                return (
                  <>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-semibold text-blue-700">📝 Exam-linked questions — can assign Exam & Mock Test</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Exam</Label>
                        <Select value={bulkEditData.exam_id} onValueChange={handleBulkExamChange}>
                          <SelectTrigger className="h-10 rounded-xl text-xs">
                            <SelectValue placeholder="Select exam" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Do not change</SelectItem>
                            {exams.map((exam) => (
                              <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Mock Test</Label>
                        <Select 
                          value={bulkEditData.mock_test_id} 
                          onValueChange={(val) => setBulkEditData({ ...bulkEditData, mock_test_id: val })}
                          disabled={!bulkEditData.exam_id || bulkEditData.exam_id === "all"}
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs">
                            <SelectValue placeholder="Select test" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Do not change</SelectItem>
                            {bulkEditMockTests.map((test) => (
                              <SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                );
              } else {
                return (
                  <>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-700">📚 Subject-linked questions — can assign Subject & Topic</p>
                    </div>
                    <SubjectTopicSelectors
                      category="questions"
                      onSubjectChange={(id, name) => setBulkEditData({ ...bulkEditData, subject_id: id || "", subject_name: name })}
                      onTopicChange={(id, name) => setBulkEditData({ ...bulkEditData, topic_id: id || "", topic_name: name })}
                    />
                  </>
                );
              }
            })()}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkEditOpen(false)} className="rounded-xl h-11">Cancel</Button>
            <Button
              onClick={handleBulkEdit}
              disabled={saving || (
                !bulkEditData.subject_name &&
                !bulkEditData.topic_name &&
                (!bulkEditData.exam_id || bulkEditData.exam_id === "all") &&
                (!bulkEditData.mock_test_id || bulkEditData.mock_test_id === "all") &&
                (!bulkEditData.difficulty || bulkEditData.difficulty === "all") &&
                !bulkEditData.year &&
                (!bulkEditData.language || bulkEditData.language === "all")
              )}
              className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/20"
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
