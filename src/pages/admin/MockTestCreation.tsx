import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Plus, Pencil, Trash2, Power, PowerOff, MoreVertical, Clock, Target, Search, Eye, EyeOff, Bell, Send, CheckSquare, Square } from "lucide-react";
import { logAdminAction } from "@/lib/adminAudit";
import { getNotificationRecipients } from "@/lib/adminRecipients";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import { isTestVisibleOnLanding, toggleTestLandingVisibility } from "@/config/landingVisibility";
import { addNotification, sendBrowserNotification } from "@/config/notifications";

const SortableTestItem = ({ test, children }: { test: MockTest, children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: test.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: 'relative' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center">
        <div {...listeners} className="px-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
};

interface MockTest {
  id: string;
  title: string;
  description: string | null;
  test_type: string;
  duration_minutes: number;
  passing_marks: number;
  total_marks: number;
  is_published: boolean;
  is_paid: boolean;
  price: number;
  exam_id: string;
  subject_id?: string;
  exams?: { name: string };
  subjects?: { name: string };
  created_at: string;
  order_index?: number;
  question_count?: number;
}

interface Exam {
  id: string;
  name: string;
}

interface Question {
  id: string;
  question_text: string;
  // Legacy schema uses plain text fields
  subject: string | null;
  topic: string | null;
  // Some deployments may have FK columns; keep optional for compatibility
  subject_id?: string | null;
  topic_id?: string | null;
  subjects?: { name: string } | null;
  topics?: { name: string } | null;
}

const MockTestCreation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [questionSubjects, setQuestionSubjects] = useState<{ id: string, name: string }[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [subjectOptions, setSubjectOptions] = useState<{ id: string, name: string }[]>([]);
  const [topicOptions, setTopicOptions] = useState<{ id: string, name: string }[]>([]);
  // Filters for tests list
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [testFilterType, setTestFilterType] = useState<string>("all");
  const [testFilterExam, setTestFilterExam] = useState<string>("all");
  const [testFilterSubject, setTestFilterSubject] = useState<string>("all");
  const [testFilterStatus, setTestFilterStatus] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    exam_id: "",
    subject_id: "",
    test_type: "full_mock",
    duration_minutes: 60,
    passing_marks: 40,
    marks_per_question: 1,
    is_paid: false,
    price: 0
  });
  const [landingVisibility, setLandingVisibility] = useState<{ [key: string]: boolean }>({});

  // Delete dialog states
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAttemptCount, setDeleteAttemptCount] = useState(0);
  const [testToNotify, setTestToNotify] = useState<MockTest | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Refresh landing visibility state
  const refreshLandingVisibility = () => {
    const visibility: { [key: string]: boolean } = {};
    tests.forEach(test => {
      visibility[test.id] = isTestVisibleOnLanding(test.id);
    });
    setLandingVisibility(visibility);
  };

  const handleToggleLandingVisibility = (testId: string, testTitle: string) => {
    const newValue = toggleTestLandingVisibility(testId);
    setLandingVisibility(prev => ({ ...prev, [testId]: newValue }));
    toast({
      title: newValue ? "Visible on Landing" : "Hidden from Landing",
      description: `"${testTitle}" ${newValue ? "will now show" : "is now hidden"} on landing page for visitors`,
    });
  };

  const handleSendNotification = async (test: MockTest) => {
    setNotifying(true);
    try {
      const title = "🆕 New Mock Test Available!";
      const message = `${test.title} is now available. Duration: ${test.duration_minutes} mins, Total Marks: ${test.total_marks}. Start practicing now!`;
      const link = `/student/take-test/${test.id}`;
      const { userIds } = await getNotificationRecipients("all");

      if (userIds.length > 0) {
        const notifications = userIds.map((user_id) => ({
          user_id,
          title,
          message,
          type: "new_test",
          link,
          is_read: false,
        }));

        const { error: insertError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (insertError) throw insertError;
      }

      await sendBrowserNotification(
        "New Mock Test Available!",
        `${test.title} - ${test.duration_minutes} mins, ${test.total_marks} marks`
      );

      await logAdminAction({
        action: "notify_new_test",
        tableName: "notifications",
        recordId: test.id,
        newData: { title: test.title, recipients: userIds.length },
      });

      toast({
        title: "Notification sent",
        description: `"${test.title}" was sent to ${userIds.length} students.`,
      });
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast({
        title: "Error",
        description: "Failed to send notifications to students.",
        variant: "destructive",
      });
    } finally {
      setNotifying(false);
      setTestToNotify(null);
    }
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
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["admin", "super_admin"]).maybeSingle();
    if (!roleData) {
      setLoading(false);
      await supabase.auth.signOut();
      toast({ title: "Access Denied", description: "You do not have admin privileges", variant: "destructive" });
      navigate("/admin/login");
      return;
    }
    await loadExams();
    await loadQuestionSubjects();
    await loadTests();
    setLoading(false);
  };

  useEffect(() => {
    refreshLandingVisibility();
  }, [tests]);

  const loadExams = async () => {
    try {
      // First try to load with order_index (new feature)
      let { data, error } = await supabase
        .from("exams")
        .select("id, name, is_active")
        .order("order_index", { ascending: true });

      // If it fails with "column does not exist", fallback to created_at
      if (error) {
        console.warn("Retrying exam load due to error:", error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("exams")
          .select("id, name, is_active")
          .order("created_at", { ascending: true });

        if (fallbackError) {
          console.error("Exam load fallback failed:", fallbackError);
          // Last resort: select all without order
          const { data: finalResort } = await supabase.from("exams").select("id, name, is_active");
          if (finalResort) setExams(finalResort);
          return;
        }
        data = fallbackData;
      }

      setExams(data || []);
      console.log(`Loaded ${data?.length || 0} exams`);
    } catch (err) {
      console.error("loadExams catch blocker:", err);
    }
  };

  const loadQuestionSubjects = async () => {
    const { data } = await (supabase
      .from("subjects")
      .select("id, name, order_index")
      .or('category.eq.questions,category.is.null')
      .order("order_index", { ascending: true }) as any);
    if (data) setQuestionSubjects(data);
  };

  const loadTests = async () => {
    // Order by created_at in the database, then apply order_index sorting client-side if available
    const { data, error } = await supabase.from("mock_tests").select("*, exams(name), subjects(name)").order("created_at", { ascending: false });

    // Check for errors FIRST before processing data
    if (error) {
      console.error("Error loading tests:", error);
      toast({ title: "Error", description: `Failed to load tests: ${error.message}`, variant: "destructive" });
      return;
    }

    // Sort logic: use order_index if available, otherwise fall back to created_at
    // Cast to any to handle order_index which may not exist in the database schema yet
    const sortedData = (data || []).sort((a: any, b: any) => {
      // If both have order_index, sort by that
      if (a.order_index !== null && b.order_index !== null && a.order_index !== undefined && b.order_index !== undefined) {
        return a.order_index - b.order_index;
      }
      // Otherwise sort by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const testsWithMeta = sortedData as MockTest[];
    const { data: questionRows } = await supabase.from("test_questions").select("test_id");
    const countMap = new Map<string, number>();
    (questionRows || []).forEach((row) => {
      countMap.set(row.test_id, (countMap.get(row.test_id) || 0) + 1);
    });
    setTests(testsWithMeta.map((test) => ({
      ...test,
      question_count: countMap.get(test.id) ?? (test as MockTest & { total_questions?: number }).total_questions ?? 0,
    })));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTests((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Persist to database
        persistOrder(newItems);

        return newItems;
      });
    }
  };

  const persistOrder = async (newTests: MockTest[]) => {
    try {
      const updates = newTests.map((test, index) => ({
        id: test.id,
        order_index: index,
      }));

      // Try to persist order - this will fail if order_index column doesn't exist
      const { error } = await supabase
        .from("mock_tests")
        .update({ order_index: updates[0].order_index } as any)
        .eq("id", updates[0].id);

      if (error && error.message.includes("order_index")) {
        // Column doesn't exist - notify user but don't show error
        console.warn("order_index column doesn't exist in mock_tests table. Drag-and-drop ordering is visual only.");
        toast({
          title: "Order Updated (Visual Only)",
          description: "To save order permanently, add 'order_index' column to mock_tests table",
        });
        return;
      }

      // Column exists, persist all updates
      for (const update of updates.slice(1)) {
        await supabase
          .from("mock_tests")
          .update({ order_index: update.order_index } as any)
          .eq("id", update.id);
      }

      toast({
        title: "Order Updated",
        description: "Test sequence saved successfully",
      });
    } catch (error) {
      console.error("Error persisting order:", error);
      toast({
        title: "Error",
        description: "Failed to save test order",
        variant: "destructive",
      });
    }
  };

  const loadQuestions = async () => {
    // Load all questions - no exam filter (questions are now exam-independent)
    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, subject, topic")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load Questions Error:", error);
      toast({ title: "Error", description: "Failed to load questions.", variant: "destructive" });
      return;
    }

    // Map data to match expected interface structure
    const mappedQuestions = (data || []).map(q => ({
      ...q,
      subject_id: null,
      topic_id: null,
      subjects: q.subject ? { name: q.subject } : undefined,
      topics: q.topic ? { name: q.topic } : undefined
    }));

    setQuestions(mappedQuestions as Question[]);
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      !searchQuery || q.question_text.toLowerCase().includes(searchQuery.toLowerCase());

    // Get the selected subject name - since questions store subject as plain text
    const selectedSubOpt = subjectOptions.find(o => o.id === filterSubject);
    const matchesSubject = filterSubject === "all" ||
      q.subject === filterSubject ||
      (selectedSubOpt && q.subject === selectedSubOpt.name);

    // Get the selected topic name - since questions store topic as plain text
    const selectedTopOpt = topicOptions.find(o => o.id === filterTopic);
    const matchesTopic = filterTopic === "all" ||
      q.topic === filterTopic ||
      (selectedTopOpt && q.topic === selectedTopOpt.name);

    return matchesSearch && matchesTopic && matchesSubject;
  });

  // subjectOptions and topicOptions are declared at the top of the component

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (questions.length === 0) {
        setSubjectOptions([]);
        setTopicOptions([]);
        return;
      }

      // Build subject options from actual question subjects (text-based)
      const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean)));
      const subOpts = uniqueSubjects.map(name => ({ id: name as string, name: name as string }));
      setSubjectOptions(subOpts);

      // Build topic options from questions matching selected subject
      if (filterSubject !== "all") {
        const matchingQuestions = questions.filter(q => q.subject === filterSubject);
        const uniqueTopics = Array.from(new Set(matchingQuestions.map(q => q.topic).filter(Boolean)));
        const topOpts = uniqueTopics.map(name => ({ id: name as string, name: name as string }));
        setTopicOptions(topOpts);
      } else {
        setTopicOptions([]);
      }
    };
    loadFilterOptions();
  }, [filterSubject, questions]);

  // Filter tests list
  const filteredTests = tests.filter(test => {
    const matchesSearch = !testSearchQuery ||
      test.title.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
      (test.description || "").toLowerCase().includes(testSearchQuery.toLowerCase());
    // Filter by test type
    const matchesType = testFilterType === "all" || test.test_type === testFilterType;
    // Filter by exam (only for full_mock) or subject (only for topic_wise)
    const matchesExam = testFilterType !== "full_mock" || testFilterExam === "all" || test.exam_id === testFilterExam;
    const matchesSubject = testFilterType !== "topic_wise" || testFilterSubject === "all" || test.subject_id === testFilterSubject;
    const matchesStatus = testFilterStatus === "all" ||
      (testFilterStatus === "published" && test.is_published) ||
      (testFilterStatus === "draft" && !test.is_published);
    return matchesSearch && matchesType && matchesExam && matchesSubject && matchesStatus;
  });

  const handleCreateTest = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const totalMarks = selectedQuestions.length * formData.marks_per_question;

    const testData = {
      title: formData.title,
      description: formData.description || null,
      exam_id: formData.test_type === "topic_wise" ? null : (formData.exam_id || null),
      subject_id: formData.test_type === "topic_wise" ? (formData.subject_id || null) : null,
      test_type: formData.test_type as "full_mock" | "topic_wise",
      duration_minutes: formData.duration_minutes,
      passing_marks: formData.passing_marks,
      total_marks: totalMarks,
      is_published: false,
      is_paid: formData.is_paid,
      price: formData.price,
      created_by: session.user.id
    };

    console.log("Attempting to create test with data:", testData);

    const { data, error } = await supabase.from("mock_tests").insert([testData]).select().single();

    if (error || !data) {
      console.error("Error creating test:", error);

      // Fallback: If error is about missing columns (like is_paid/price), try a simpler insert
      if (error?.message?.includes("column") && (error.message.includes("is_paid") || error.message.includes("price"))) {
        console.warn("Retrying with simple insert (ignoring is_paid/price)");
        const simpleTestData = { ...testData };
        delete (simpleTestData as any).is_paid;
        delete (simpleTestData as any).price;

        const { data: retryData, error: retryError } = await supabase.from("mock_tests").insert([simpleTestData]).select().single();
        if (retryError || !retryData) {
          console.error("Retry failed:", retryError);
          toast({ title: "Error", description: "Failed to create test: " + (retryError?.message || "Unknown error"), variant: "destructive" });
          return;
        }
        // Success on retry
        handleQuestionsInsert(retryData.id);
        return;
      }

      toast({ title: "Error", description: "Failed to create test: " + (error?.message || "Check console for details"), variant: "destructive" });
      return;
    }

    handleQuestionsInsert(data.id);
  };

  const handleQuestionsInsert = async (testId: string) => {
    const testQuestions = selectedQuestions.map((questionId, index) => ({
      test_id: testId,
      question_id: questionId,
      question_order: index + 1,
      marks: formData.marks_per_question
    }));

    const { error: questionsError } = await supabase.from("test_questions").insert(testQuestions);
    if (questionsError) {
      console.error("Error adding questions:", questionsError);
      toast({ title: "Error", description: "Failed to add questions to test", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Test created successfully" });
    setDialogOpen(false);
    setQuestionDialogOpen(false);
    setFormData({ title: "", description: "", exam_id: "", subject_id: "", test_type: "full_mock", duration_minutes: 60, passing_marks: 40, marks_per_question: 1, is_paid: false, price: 0 });
    setSelectedQuestions([]);
    await loadTests();
  };

  // Update questions for an existing test
  const handleUpdateTestQuestions = async () => {
    if (!editingTest) return;

    // Delete existing questions for this test
    const { error: deleteError } = await supabase
      .from("test_questions")
      .delete()
      .eq("test_id", editingTest.id);

    if (deleteError) {
      console.error("Error deleting old questions:", deleteError);
      toast({ title: "Error", description: "Failed to update questions", variant: "destructive" });
      return;
    }

    // Insert new questions
    const testQuestions = selectedQuestions.map((questionId, index) => ({
      test_id: editingTest.id,
      question_id: questionId,
      question_order: index + 1,
      marks: formData.marks_per_question
    }));

    const { error: insertError } = await supabase.from("test_questions").insert(testQuestions);
    if (insertError) {
      console.error("Error inserting new questions:", insertError);
      toast({ title: "Error", description: "Failed to add questions", variant: "destructive" });
      return;
    }

    const totalMarks = selectedQuestions.length * formData.marks_per_question;
    const { error: marksError } = await supabase.from("mock_tests").update({
      total_marks: totalMarks
    }).eq("id", editingTest.id);
    if (marksError) {
      console.error("Error updating total marks:", marksError);
      toast({ title: "Error", description: "Questions saved but total marks failed to update", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `Updated ${selectedQuestions.length} questions` });
    setQuestionDialogOpen(false);
    setDialogOpen(false);
    setEditingTest(null);
    setSelectedQuestions([]);
    await loadTests();
  };

  const handleDeleteTest = async (id: string) => {
    const { count } = await supabase
      .from("test_attempts")
      .select("id", { count: "exact", head: true })
      .eq("test_id", id);
    setDeleteAttemptCount(count || 0);
    setTestToDelete(id);
  };

  const confirmDelete = async () => {
    if (!testToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("mock_tests").delete().eq("id", testToDelete);
      if (error) throw error;
      const deleted = tests.find((test) => test.id === testToDelete);
      await logAdminAction({
        action: "delete_mock_test",
        tableName: "mock_tests",
        recordId: testToDelete,
        oldData: { title: deleted?.title, attempts: deleteAttemptCount },
      });
      toast({ title: "Success", description: "Test deleted successfully" });
      setSelectedTestIds((prev) => prev.filter((id) => id !== testToDelete));
      await loadTests();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete test", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setTestToDelete(null);
      setDeleteAttemptCount(0);
    }
  };

  const handleTogglePublish = async (test: MockTest) => {
    if (!test.is_published && (test.question_count ?? 0) === 0) {
      toast({
        title: "Cannot publish",
        description: "Add at least one question before publishing this test.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase.from("mock_tests").update({ is_published: !test.is_published }).eq("id", test.id);
    if (error) {
      toast({ title: "Error", description: "Failed to update test", variant: "destructive" });
      return;
    }
    await logAdminAction({
      action: test.is_published ? "unpublish_mock_test" : "publish_mock_test",
      tableName: "mock_tests",
      recordId: test.id,
      newData: { title: test.title, is_published: !test.is_published },
    });
    toast({ title: "Success", description: test.is_published ? "Test unpublished" : "Test published" });
    await loadTests();
  };

  const toggleTestSelection = (id: string) => {
    setSelectedTestIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleSelectAllTests = () => {
    if (selectedTestIds.length === filteredTests.length) {
      setSelectedTestIds([]);
    } else {
      setSelectedTestIds(filteredTests.map((test) => test.id));
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    const targets = tests.filter((test) => selectedTestIds.includes(test.id));
    const eligible = publish
      ? targets.filter((test) => !test.is_published && (test.question_count ?? 0) > 0)
      : targets.filter((test) => test.is_published);
    const skippedEmpty = publish
      ? targets.filter((test) => !test.is_published && (test.question_count ?? 0) === 0).length
      : 0;

    if (eligible.length === 0) {
      toast({
        title: publish ? "Nothing to publish" : "Nothing to unpublish",
        description: skippedEmpty > 0 ? `${skippedEmpty} selected draft${skippedEmpty === 1 ? "" : "s"} have no questions.` : "Adjust your selection and try again.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("mock_tests")
      .update({ is_published: publish })
      .in("id", eligible.map((test) => test.id));

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await logAdminAction({
      action: publish ? "bulk_publish_mock_tests" : "bulk_unpublish_mock_tests",
      tableName: "mock_tests",
      newData: { count: eligible.length },
    });
    toast({
      title: publish ? "Published" : "Unpublished",
      description: skippedEmpty > 0
        ? `${eligible.length} updated, ${skippedEmpty} skipped (no questions)`
        : `${eligible.length} test${eligible.length === 1 ? "" : "s"} updated`,
    });
    setSelectedTestIds([]);
    await loadTests();
  };

  const confirmBulkDeleteTests = async () => {
    if (selectedTestIds.length === 0) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("mock_tests").delete().in("id", selectedTestIds);
      if (error) throw error;
      await logAdminAction({
        action: "bulk_delete_mock_tests",
        tableName: "mock_tests",
        newData: { count: selectedTestIds.length },
      });
      toast({ title: "Deleted", description: `${selectedTestIds.length} tests removed` });
      setSelectedTestIds([]);
      setBulkDeleteOpen(false);
      await loadTests();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete selected tests", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTest(null);
    setFormData({ title: "", description: "", exam_id: "", subject_id: "", test_type: "full_mock", duration_minutes: 60, passing_marks: 40, marks_per_question: 1, is_paid: false, price: 0 });
    setSelectedQuestions([]);
    setDialogOpen(true);
  };

  const proceedToQuestionSelection = async () => {
    // Exam is now optional to align with Question Bank logic
    await loadQuestions();
    setSearchQuery("");
    setFilterSubject("all");
    setFilterTopic("all");
    setDialogOpen(false);
    setQuestionDialogOpen(true);
  };

  // Function to manage questions for an existing test
  const manageTestQuestions = async () => {
    if (!editingTest) return;

    // Load all available questions
    await loadQuestions();

    // Load questions currently in this test
    const { data: testQuestionsData } = await supabase
      .from("test_questions")
      .select("question_id")
      .eq("test_id", editingTest.id);

    if (testQuestionsData) {
      setSelectedQuestions(testQuestionsData.map(tq => tq.question_id));
    }

    setSearchQuery("");
    setFilterSubject("all");
    setFilterTopic("all");
    setDialogOpen(false);
    setQuestionDialogOpen(true);
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]);
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const openEditDialog = (test: MockTest) => {
    setEditingTest(test);
    setFormData({
      title: test.title,
      description: test.description || "",
      exam_id: test.exam_id,
      subject_id: test.subject_id || "",
      test_type: test.test_type,
      duration_minutes: test.duration_minutes,
      passing_marks: test.passing_marks,
      marks_per_question: 1,
      is_paid: test.is_paid || false,
      price: test.price || 0
    });
    setDialogOpen(true);
  };

  const handleUpdateTest = async () => {
    if (!editingTest) return;

    const updateData = {
      title: formData.title,
      description: formData.description || null,
      exam_id: formData.test_type === "topic_wise" ? null : (formData.exam_id || null),
      subject_id: formData.test_type === "topic_wise" ? (formData.subject_id || null) : null,
      test_type: formData.test_type as "full_mock" | "topic_wise",
      duration_minutes: formData.duration_minutes,
      passing_marks: formData.passing_marks,
      is_paid: formData.is_paid,
      price: formData.price
    };

    console.log("Attempting to update test with data:", updateData);

    const { error } = await supabase.from("mock_tests").update(updateData).eq("id", editingTest.id);

    if (error) {
      console.error("Error updating test:", error);

      // Fallback: If error is about missing columns (like is_paid/price), try a simpler update
      if (error?.message?.includes("column") && (error.message.includes("is_paid") || error.message.includes("price"))) {
        console.warn("Retrying with simple update (ignoring is_paid/price)");
        const simpleUpdateData = { ...updateData };
        delete (simpleUpdateData as any).is_paid;
        delete (simpleUpdateData as any).price;

        const { error: retryError } = await supabase.from("mock_tests").update(simpleUpdateData).eq("id", editingTest.id);
        if (retryError) {
          console.error("Retry update failed:", retryError);
          toast({ title: "Error", description: "Failed to update test: " + (retryError?.message || "Unknown error"), variant: "destructive" });
          return;
        }
        // Success on retry
        toast({ title: "Success", description: "Test updated successfully (migration pending)" });
        setDialogOpen(false);
        setEditingTest(null);
        await loadTests();
        return;
      }

      toast({ title: "Error", description: "Failed to update test: " + (error?.message || "Check console for details"), variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Test updated successfully" });
    setDialogOpen(false);
    setEditingTest(null);
    await loadTests();
  };

  const CreateButton = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={openCreateDialog}
          size="icon"
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border border-white/20"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editingTest ? "Edit Test" : "Create New Test"}</DialogTitle>
          <DialogDescription>{editingTest ? "Update test details" : "Fill in test details"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., UPSC Mock Test 1" className="h-12 rounded-xl mt-1" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} className="rounded-xl mt-1" />
          </div>
          <div className="space-y-2">
            <Label>{formData.test_type === "topic_wise" ? "Subject *" : "Exam Category *"}</Label>
            {formData.test_type === "topic_wise" ? (
              <>
                <select
                  id="subject_select"
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                  className="flex h-12 w-full items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-300 transition-all mt-1"
                >
                  <option value="">Select subject</option>
                  {questionSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
                {questionSubjects.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No subjects found. Add subjects in Question Bank first.</p>
                )}
              </>
            ) : (
              <>
                <select
                  id="exam_select"
                  name="exam_id"
                  value={formData.exam_id}
                  onChange={e => setFormData({ ...formData, exam_id: e.target.value })}
                  className="flex h-12 w-full items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-300 transition-all mt-1"
                >
                  <option value="">Select exam category</option>
                  {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
                </select>
                {exams.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No exams found. Add exams in Exam Management first.</p>
                )}
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label>Test Type *</Label>
            <select
              value={formData.test_type}
              onChange={e => setFormData({ ...formData, test_type: e.target.value })}
              className="flex h-12 w-full items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-300 transition-all mt-1"
            >
              <option value="full_mock">Full Mock Test</option>
              <option value="topic_wise">Topic-wise Test</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (min) *</Label>
              <Input type="number" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })} className="h-12 rounded-xl mt-1" />
            </div>
            <div className="space-y-2">
              <Label>Passing Marks *</Label>
              <Input type="number" value={formData.passing_marks} onChange={e => setFormData({ ...formData, passing_marks: parseInt(e.target.value) || 0 })} className="h-12 rounded-xl mt-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Marks per Question *</Label>
            <Input type="number" value={formData.marks_per_question} onChange={e => setFormData({ ...formData, marks_per_question: parseInt(e.target.value) || 1 })} className="h-12 rounded-xl mt-1" />
          </div>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="is_paid"
              checked={formData.is_paid}
              onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked as boolean, price: checked ? 0 : 0 })}
            />
            <Label htmlFor="is_paid" className="text-sm font-medium leading-none cursor-pointer">
              Requires Premium Subscription?
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingTest(null); }} className="rounded-xl h-12 flex-1 sm:flex-none">Cancel</Button>
          {editingTest ? (
            <>
              <Button
                variant="outline"
                onClick={manageTestQuestions}
                className="rounded-xl h-12 flex-1 sm:flex-none border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                Manage Questions
              </Button>
              <Button onClick={handleUpdateTest} disabled={!formData.title} className="rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-teal-600 flex-1 sm:flex-none">Update Test</Button>
            </>
          ) : (
            <Button onClick={proceedToQuestionSelection} disabled={!formData.title} className="rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-teal-600 flex-1 sm:flex-none">Next: Select Que.</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <AdminLayout title="Mock Test Creation" subtitle="Manage mock tests">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-600 text-sm">Loading tests...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Mock Test Creation" subtitle={`${tests.length} tests`} headerActions={CreateButton}>
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-4">
          <button
            onClick={() => setTestFilterStatus("all")}
            className={`flex-1 min-w-[120px] bg-white rounded-2xl p-4 border shadow-sm transition-all ${testFilterStatus === "all" ? "border-emerald-500 ring-2 ring-emerald-200" : "border-gray-100 hover:border-emerald-200"}`}
          >
            <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Tests</p>
          </button>
          <button
            onClick={() => setTestFilterStatus("published")}
            className={`flex-1 min-w-[120px] bg-white rounded-2xl p-4 border shadow-sm transition-all ${testFilterStatus === "published" ? "border-emerald-500 ring-2 ring-emerald-200" : "border-gray-100 hover:border-emerald-200"}`}
          >
            <p className="text-2xl font-bold text-emerald-600">{tests.filter(t => t.is_published).length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Published</p>
          </button>
          <button
            onClick={() => setTestFilterStatus("draft")}
            className={`flex-1 min-w-[120px] bg-white rounded-2xl p-4 border shadow-sm transition-all ${testFilterStatus === "draft" ? "border-amber-500 ring-2 ring-amber-200" : "border-gray-100 hover:border-amber-200"}`}
          >
            <p className="text-2xl font-bold text-amber-600">{tests.filter(t => !t.is_published).length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Drafts</p>
          </button>
        </div>

        {/* Test Type Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "All Tests" },
            { key: "full_mock", label: "Full Test" },
            { key: "topic_wise", label: "Topic Test" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setTestFilterType(tab.key);
                setTestFilterExam("all");
                setTestFilterSubject("all");
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${testFilterType === tab.key
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-200"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
          <div className="flex-1 lg:min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tests..."
              value={testSearchQuery}
              onChange={e => setTestSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white border-gray-200"
            />
          </div>
          {/* Show Exam filter for Full Test, Subject filter for Topic Test */}
          {testFilterType === "full_mock" && (
            <Select value={testFilterExam} onValueChange={setTestFilterExam}>
              <SelectTrigger className="h-12 rounded-xl bg-white lg:w-[180px]">
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams.map(exam => <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {testFilterType === "topic_wise" && (
            <Select value={testFilterSubject} onValueChange={setTestFilterSubject}>
              <SelectTrigger className="h-12 rounded-xl bg-white lg:w-[180px]">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {questionSubjects.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {filteredTests.length > 0 && (
          <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSelectAllTests} className="rounded-xl gap-2">
              {selectedTestIds.length === filteredTests.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              Select all ({filteredTests.length})
            </Button>
            {selectedTestIds.length > 0 && (
              <>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{selectedTestIds.length} selected</Badge>
                <Button variant="outline" size="sm" onClick={() => handleBulkPublish(true)} className="rounded-lg text-emerald-700 border-emerald-200">
                  <Power className="w-3.5 h-3.5 mr-1" /> Publish
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkPublish(false)} className="rounded-lg">
                  <PowerOff className="w-3.5 h-3.5 mr-1" /> Unpublish
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)} className="rounded-lg text-red-600 border-red-200">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTestIds([])} className="text-gray-500">Clear</Button>
              </>
            )}
          </div>
        )}

        {/* Tests List - Row Based */}
        {tests.length === 0 ? (
          <Card className="border-0 bg-white rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <BarChart className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Tests Yet</h3>
              <p className="text-gray-500 text-sm mb-4">Create your first mock test</p>
              <Button onClick={openCreateDialog} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            </CardContent>
          </Card>
        ) : filteredTests.length === 0 ? (
          <Card className="border-0 bg-white rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Tests Found</h3>
              <p className="text-gray-500 text-sm mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" onClick={() => { setTestSearchQuery(""); setTestFilterType("all"); setTestFilterExam("all"); setTestFilterSubject("all"); setTestFilterStatus("all"); }} className="rounded-xl">
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 bg-white rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[36px_2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span></span>
              <span>Test Name</span>
              <span>Category/Subject</span>
              <span>Duration</span>
              <span>Questions / Marks</span>
              <span>Status</span>
              <span className="text-center">Actions</span>
            </div>

            <div className="divide-y divide-gray-100">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredTests.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredTests.map(test => (
                    <SortableTestItem key={test.id} test={test}>
                      <div className="hover:bg-gray-50/50 transition-colors w-full">
                        {/* Desktop Row */}
                        <div className="hidden md:grid md:grid-cols-[36px_2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 items-center">
                          <div>
                            <Checkbox
                              checked={selectedTestIds.includes(test.id)}
                              onCheckedChange={() => toggleTestSelection(test.id)}
                            />
                          </div>
                          {/* Test Name */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${test.is_published
                              ? "bg-gradient-to-br from-emerald-100 to-teal-100"
                              : "bg-gray-100"
                              }`}>
                              <BarChart className={`w-5 h-5 ${test.is_published ? "text-emerald-600" : "text-gray-400"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{test.title}</p>
                              {test.description && <p className="text-xs text-gray-500 truncate">{test.description}</p>}
                            </div>
                          </div>

                          {/* Category/Subject */}
                          <div>
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-gray-100">
                              {test.test_type === "topic_wise" ? (test.subjects?.name || "Subject") : (test.exams?.name || "Exam")}
                            </Badge>
                          </div>

                          {/* Duration */}
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {test.duration_minutes} min
                          </div>

                          {/* Marks */}
                          <div className="text-sm text-gray-600">
                            <p className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-gray-400" />
                              {test.question_count ?? 0} Q · {test.total_marks} marks
                            </p>
                            <p className="text-[11px] text-gray-400">{test.passing_marks} pass</p>
                          </div>

                          {/* Status */}
                          <div>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-2 py-0.5 ${test.is_published
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                                }`}
                            >
                              {test.is_published ? "PUBLISHED" : "DRAFT"}
                            </Badge>
                            {test.is_paid ? (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 ml-1">
                                PREMIUM
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border-green-200 ml-1">
                                FREE
                              </Badge>
                            )}
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
                                <DropdownMenuItem onClick={() => openEditDialog(test)} className="gap-2">
                                  <Pencil className="w-4 h-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTogglePublish(test)} className="gap-2">
                                  {test.is_published ? (
                                    <>
                                      <PowerOff className="w-4 h-4" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Power className="w-4 h-4" />
                                      Publish
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleLandingVisibility(test.id, test.title)}
                                  className={`gap-2 ${landingVisibility[test.id] ? "text-emerald-600" : ""}`}
                                >
                                  {landingVisibility[test.id] ? (
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
                                <DropdownMenuItem
                                  onClick={() => setTestToNotify(test)}
                                  className="gap-2 text-blue-600"
                                >
                                  <Bell className="w-4 h-4" />
                                  Send Notification
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteTest(test.id)} className="gap-2 text-red-600 focus:text-red-600">
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
                            <Checkbox
                              checked={selectedTestIds.includes(test.id)}
                              onCheckedChange={() => toggleTestSelection(test.id)}
                            />
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${test.is_published
                              ? "bg-gradient-to-br from-emerald-100 to-teal-100"
                              : "bg-gray-100"
                              }`}>
                              <BarChart className={`w-5 h-5 ${test.is_published ? "text-emerald-600" : "text-gray-400"}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 truncate text-sm">{test.title}</p>
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] px-1.5 py-0 shrink-0 ${test.is_published
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                  {test.is_published ? "PUB" : "DRAFT"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                <span>{test.test_type === "topic_wise" ? test.subjects?.name : test.exams?.name}</span>
                                <span>•</span>
                                <span>{test.duration_minutes}min</span>
                                <span>•</span>
                                <span>{test.question_count ?? 0}Q · {test.total_marks}marks</span>
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-emerald-50 shrink-0">
                                  <MoreVertical className="w-4 h-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl min-w-[180px]">
                                <DropdownMenuItem onClick={() => openEditDialog(test)} className="gap-2">
                                  <Pencil className="w-4 h-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTogglePublish(test)} className="gap-2">
                                  {test.is_published ? (
                                    <>
                                      <PowerOff className="w-4 h-4" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Power className="w-4 h-4" />
                                      Publish
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleLandingVisibility(test.id, test.title)}
                                  className={`gap-2 ${landingVisibility[test.id] ? "text-emerald-600" : ""}`}
                                >
                                  {landingVisibility[test.id] ? (
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
                                <DropdownMenuItem
                                  onClick={() => setTestToNotify(test)}
                                  className="gap-2 text-blue-600"
                                >
                                  <Bell className="w-4 h-4" />
                                  Send Notification
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteTest(test.id)} className="gap-2 text-red-600 focus:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </SortableTestItem>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </Card>
        )}
      </div>

      {/* Question Selection Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Select Questions ({selectedQuestions.length})</DialogTitle>
            <DialogDescription>Choose questions for this test</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search questions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl" />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjectOptions.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topicOptions.map(topic => <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredQuestions.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl mb-3">
              <Checkbox checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0} onCheckedChange={handleSelectAll} id="select-all-q" />
              <Label htmlFor="select-all-q" className="text-sm font-medium cursor-pointer">Select All ({filteredQuestions.length})</Label>
              {selectedQuestions.length > 0 && (
                <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700">{selectedQuestions.length} selected</Badge>
              )}
            </div>
          )}

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredQuestions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {questions.length === 0 ? "No questions available for this exam. Add questions first." : "No questions match your filters."}
              </p>
            ) : filteredQuestions.map((question, index) => {
              const qId = `q-${question.id}`;
              const isSelected = selectedQuestions.includes(question.id);
              return (
                <div
                  key={question.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? "border-emerald-300 bg-emerald-50" : "border-gray-100 hover:bg-gray-50"}`}
                  onClick={() => toggleQuestionSelection(question.id)}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleQuestionSelection(question.id)} className="mt-0.5" id={qId} />
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400">Q{index + 1}</span>
                      {(question.subjects?.name || question.subject) && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {question.subjects?.name || question.subject}
                        </Badge>
                      )}
                      {(question.topics?.name || question.topic) && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {question.topics?.name || question.topic}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{question.question_text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setQuestionDialogOpen(false);
                if (editingTest) {
                  setDialogOpen(true);
                }
              }}
              className="rounded-xl h-12 flex-1 sm:flex-none"
            >
              {editingTest ? "Back" : "Cancel"}
            </Button>
            {editingTest ? (
              <Button
                onClick={handleUpdateTestQuestions}
                disabled={selectedQuestions.length === 0}
                className="rounded-xl h-12 bg-gradient-to-r from-indigo-500 to-purple-600 flex-1 sm:flex-none"
              >
                <span className="truncate">Update Questions ({selectedQuestions.length})</span>
              </Button>
            ) : (
              <Button
                onClick={handleCreateTest}
                disabled={selectedQuestions.length === 0}
                className="rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-teal-600 flex-1 sm:flex-none"
              >
                <span className="truncate">Create ({selectedQuestions.length} Qs)</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteAlertDialog
        isOpen={!!testToDelete}
        onClose={() => { setTestToDelete(null); setDeleteAttemptCount(0); }}
        onConfirm={confirmDelete}
        title="Delete mock test"
        description={
          <>
            Delete <span className="font-bold text-slate-900">{tests.find(t => t.id === testToDelete)?.title}</span>?
            This test has{" "}
            <span className="font-bold text-slate-900">{tests.find(t => t.id === testToDelete)?.question_count ?? 0} questions</span>
            {" "}and{" "}
            <span className="font-bold text-slate-900">{deleteAttemptCount} student attempt{deleteAttemptCount === 1 ? "" : "s"}</span>.
            {deleteAttemptCount > 0 ? " Attempts may be removed or fail to delete if the database blocks it." : " This cannot be undone."}
          </>
        }
        isDeleting={isDeleting}
      />
      <DeleteAlertDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDeleteTests}
        title="Delete selected tests"
        description={`Delete ${selectedTestIds.length} mock test${selectedTestIds.length === 1 ? "" : "s"}? Linked questions and attempts may be affected.`}
        isDeleting={isDeleting}
      />
      <DeleteAlertDialog
        isOpen={!!testToNotify}
        onClose={() => setTestToNotify(null)}
        onConfirm={() => testToNotify && handleSendNotification(testToNotify)}
        title="Notify all students"
        description={
          <>
            Send a “new mock test” notification for{" "}
            <span className="font-bold text-slate-900">{testToNotify?.title}</span> to every student?
          </>
        }
        confirmText={notifying ? "Sending..." : "Send notification"}
        isDeleting={notifying}
        variant="primary"
      />
    </AdminLayout>
  );
};

export default MockTestCreation;