import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Eye, Save, Layers, CheckCircle2, Copy, Check, FileText, Sparkles, BookOpen, GraduationCap, AlertCircle, HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { MathText } from "@/components/ui/MathText";

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

interface Exam {
  id: string;
  name: string;
}

interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  subject?: string;
  topic?: string;
  explanation?: string;
}

const BulkMCQUpload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [selectedMockTestId, setSelectedMockTestId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  // Upload Type: 'exam' or 'subject' — strictly mutually exclusive
  const [uploadType, setUploadType] = useState<'exam' | 'subject'>('subject');

  const [defaultSubject, setDefaultSubject] = useState({ id: "" as string | null, name: "" as string | null });
  const [defaultTopic, setDefaultTopic] = useState({ id: "" as string | null, name: "" as string | null });
  const [defaultDifficulty, setDefaultDifficulty] = useState<string>("medium");
  const [defaultYear, setDefaultYear] = useState<string>("");
  const [defaultLanguage, setDefaultLanguage] = useState<string>("bn");
  const [defaultSource, setDefaultSource] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [copiedExample, setCopiedExample] = useState(false);

  const exampleFormat = `1. What is the capital of India?
(a) Mumbai
(b) New Delhi
(c) Kolkata
(d) Chennai
Ans:(b) New Delhi
Short Notes:
• New Delhi is the capital of India.
• It is the seat of all three branches of the Government.
• Located along the banks of the Yamuna River.

2. Who wrote "Romeo and Juliet"?
(a) Charles Dickens
(b) William Shakespeare
(c) Jane Austen
(d) Mark Twain
Ans:(b) William Shakespeare
Short Notes:
• William Shakespeare wrote Romeo and Juliet around 1594-1596.
• It is one of the most famous tragedies in English literature.`;

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
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      setLoading(false);
      await supabase.auth.signOut();
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges",
        variant: "destructive",
      });
      navigate("/admin/login");
      return;
    }

    await loadExams();
    setLoading(false);
  };

  const loadExams = async () => {
    const { data } = await supabase
      .from("exams")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (data) {
      setExams(data);
    }
    // Load subjects for questions category
    await loadSubjects();
  };

  const loadMockTests = async (examId: string) => {
    if (!examId) {
      setMockTests([]);
      return;
    }

    const { data } = await supabase
      .from("mock_tests")
      .select("id, title")
      .eq("exam_id", examId)
      .order("title");
    
    setMockTests(data || []);
    if (data && data.length > 0) {
      setSelectedMockTestId(data[0].id);
    } else {
      setSelectedMockTestId("");
    }
  };

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    loadMockTests(examId);
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("category", "questions")
      .order("order_index", { ascending: true });
    setSubjects(data || []);
  };

  const loadTopics = async (subjectId: string) => {
    const { data } = await supabase
      .from("topics")
      .select("id, name, subject_id")
      .eq("subject_id", subjectId)
      .eq("category", "questions")
      .order("order_index", { ascending: true });
    setTopics(data || []);
  };

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    setDefaultSubject({ id: subjectId, name: subject?.name || null });
    setDefaultTopic({ id: null, name: null }); // Reset topic when subject changes
    if (subjectId) {
      loadTopics(subjectId);
    } else {
      setTopics([]);
    }
  };

  const handleTopicChange = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    setDefaultTopic({ id: topicId, name: topic?.name || null });
  };

  const parseQuestions = () => {
    const questions: ParsedQuestion[] = [];
    const blocks = bulkText.split(/\n\s*\n/);

    for (const block of blocks) {
      if (!block.trim()) continue;

      const lines = block.split('\n').map(l => l.trim()).filter(l => l);

      let question = "";
      let optionA = "";
      let optionB = "";
      let optionC = "";
      let optionD = "";
      let answer = "";
      let subject = "";
      let topic = "";
      let explanation = "";
      let inShortNotes = false; // Track if we're collecting multi-line short notes

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this line starts a new field (which ends short notes collection)
        const isNewField =
          line.match(/^\d+\.\s+/) || // New question
          line.match(/^\(a\)/i) || line.startsWith("A.") || line.startsWith("A)") ||
          line.match(/^\(b\)/i) || line.startsWith("B.") || line.startsWith("B)") ||
          line.match(/^\(c\)/i) || line.startsWith("C.") || line.startsWith("C)") ||
          line.match(/^\(d\)/i) || line.startsWith("D.") || line.startsWith("D)") ||
          line.toLowerCase().startsWith("ans:") ||
          line.toLowerCase().startsWith("answer:") ||
          line.toLowerCase().startsWith("subject:") ||
          line.toLowerCase().startsWith("topic:") ||
          line.toLowerCase().startsWith("question:");

        // If we're in short notes mode and hit a new field, stop collecting
        if (inShortNotes && isNewField) {
          inShortNotes = false;
        }

        // If in short notes mode, append this line (bullet points, etc.)
        if (inShortNotes) {
          explanation += (explanation ? "\n" : "") + line;
          continue;
        }

        const questionMatch = line.match(/^\d+\.\s+(.+)$/);
        if (questionMatch) {
          question = questionMatch[1].trim();
        }
        else if (line.match(/^\(a\)/i)) {
          optionA = line.substring(3).trim();
        } else if (line.match(/^\(b\)/i)) {
          optionB = line.substring(3).trim();
        } else if (line.match(/^\(c\)/i)) {
          optionC = line.substring(3).trim();
        } else if (line.match(/^\(d\)/i)) {
          optionD = line.substring(3).trim();
        }
        else if (line.toLowerCase().startsWith("ans:")) {
          const answerText = line.substring(4).trim();
          const answerMatch = answerText.match(/^\(([a-d])\)/i);
          if (answerMatch) {
            answer = answerMatch[1].toUpperCase();
          }
        }
        else if (line.toLowerCase().startsWith("short notes:")) {
          // Start collecting short notes - can be single or multi-line
          const firstLine = line.substring(12).trim();
          explanation = firstLine;
          inShortNotes = true; // Continue collecting on next lines
          console.log("[BulkUpload] Started Short Notes:", firstLine);
        }
        else if (line.toLowerCase().startsWith("question:")) {
          question = line.substring(9).trim();
        } else if (line.startsWith("A.") || line.startsWith("A)")) {
          optionA = line.substring(2).trim();
        } else if (line.startsWith("B.") || line.startsWith("B)")) {
          optionB = line.substring(2).trim();
        } else if (line.startsWith("C.") || line.startsWith("C)")) {
          optionC = line.substring(2).trim();
        } else if (line.startsWith("D.") || line.startsWith("D)")) {
          optionD = line.substring(2).trim();
        } else if (line.toLowerCase().startsWith("answer:")) {
          const ans = line.substring(7).trim().toUpperCase();
          const match = ans.match(/^\(?([A-D])\)?/);
          if (match) {
            answer = match[1];
          }
        } else if (line.toLowerCase().startsWith("subject:")) {
          subject = line.substring(8).trim();
        } else if (line.toLowerCase().startsWith("topic:")) {
          topic = line.substring(6).trim();
        }
      }

      console.log("[BulkUpload] Final explanation for question:", question.substring(0, 30), "=>", explanation);

      if (question && optionA && optionB && optionC && optionD && answer) {
        questions.push({
          question_text: question,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_answer: answer,
          subject: subject || undefined,
          topic: topic || undefined,
          explanation: explanation || undefined,
        });
      }
    }

    if (questions.length === 0) {
      toast({
        title: "Error",
        description: "No valid questions found. Please check the format.",
        variant: "destructive",
      });
      return;
    }

    setParsedQuestions(questions);
    console.log("[BulkUpload] Parsed questions:", questions.map(q => ({ text: q.question_text.substring(0, 30), explanation: q.explanation })));
    setShowPreview(true);
    toast({
      title: "Success",
      description: `Parsed ${questions.length} questions successfully`,
    });
  };

  const handleSave = async () => {
    if (parsedQuestions.length === 0) {
      toast({
        title: "Error",
        description: "No questions to save",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // STRICT VALIDATION based on upload type
    if (uploadType === 'exam') {
      if (!selectedExamId) {
        toast({
          title: "Error",
          description: "Please select an Exam Category",
          variant: "destructive",
        });
        return;
      }
    } else {
      // uploadType === 'subject'
      if (!defaultSubject.id || !defaultTopic.id) {
        toast({
          title: "Error",
          description: "Please select both a Subject and a Topic",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);

    try {
      // STRICT MUTUAL EXCLUSIVITY:
      // - Upload Type 'exam' → exam_id is set, subject/topic from text only
      // - Upload Type 'subject' → exam_id is ALWAYS NULL, subject/topic from defaults
      const questionsToInsert = parsedQuestions.map(q => {
        const commonMetadata = {
          difficulty: defaultDifficulty || "medium",
          year: defaultYear ? parseInt(defaultYear, 10) || null : null,
          language: defaultLanguage || "bn",
          source: defaultSource || null,
          status: "published",
        };

        if (uploadType === 'exam') {
          // Exam mode: set exam_id, subject/topic come from question text if provided
          return {
            exam_id: selectedExamId,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            subject: q.subject || null,
            topic: q.topic || null,
            explanation: q.explanation || null,
            created_by: session.user.id,
            ...commonMetadata,
          };
        } else {
          // Subject mode: exam_id is NULL, subject/topic from defaults
          const subName = q.subject || defaultSubject.name || null;
          const topName = q.topic || (subName && subName === defaultSubject.name ? defaultTopic.name : null);
          return {
            exam_id: null,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            subject: subName,
            topic: topName,
            explanation: q.explanation || null,
            created_by: session.user.id,
            ...commonMetadata,
          };
        }
      });

      const { data: insertedQuestions, error } = await supabase
        .from("questions")
        .insert(questionsToInsert)
        .select("id");

      if (error) throw error;

      // If a mock test is selected, link the questions to it
      if (uploadType === 'exam' && selectedMockTestId && selectedMockTestId !== "none" && insertedQuestions) {
        // Get current max order for the test
        const { data: currentQuestions } = await supabase
          .from("test_questions")
          .select("question_order")
          .eq("test_id", selectedMockTestId)
          .order("question_order", { ascending: false })
          .limit(1);

        const nextOrder = (currentQuestions?.[0]?.question_order || 0) + 1;

        const testQuestionsLinks = insertedQuestions.map((q, idx) => ({
          test_id: selectedMockTestId,
          question_id: q.id,
          marks: 1, // Default marks
          question_order: nextOrder + idx,
        }));

        const { error: linkError } = await supabase
          .from("test_questions")
          .insert(testQuestionsLinks);

        if (linkError) {
          console.error("Error linking questions to mock test:", linkError);
          toast({
            title: "Warning",
            description: "Questions saved to Bank, but failed to link to Mock Test.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: `Successfully added ${parsedQuestions.length} questions to Question Bank${selectedMockTestId ? " and linked to Mock Test" : ""}`,
      });

      setBulkText("");
      setParsedQuestions([]);
      setShowPreview(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save questions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Bulk MCQ Upload" subtitle="Upload multiple questions">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 font-medium text-sm">Loading bulk uploader...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exampleFormat);
    setCopiedExample(true);
    toast({
      title: "Copied!",
      description: "Example MCQ format copied to clipboard",
    });
    setTimeout(() => setCopiedExample(false), 2000);
  };

  return (
    <AdminLayout title="Bulk MCQ Upload" subtitle="Upload multiple questions">
      <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
        {/* Executive Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Bulk MCQ Parser & Upload</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Batch parse formatted text and push into Question Bank or Mock Tests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
              {parsedQuestions.length > 0 ? `${parsedQuestions.length} Questions Ready` : "Ready to Parse"}
            </Badge>
          </div>
        </div>

        {/* Main Uploader Form Card */}
        <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Layers className="w-4 h-4 text-blue-600" />
                Step 1: Select Target Destination
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
                Strict Routing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Upload Target Toggle Tabs */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Upload Target Destination *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setUploadType('subject'); setSelectedExamId(''); setSelectedMockTestId(''); }}
                  className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-sm font-bold transition-all border ${
                    uploadType === 'subject'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Subject & Topic Bank
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadType('exam'); setDefaultSubject({ id: null, name: null }); setDefaultTopic({ id: null, name: null }); }}
                  className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-sm font-bold transition-all border ${
                    uploadType === 'exam'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Exam & Mock Test Target
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/80 border border-amber-200/80 px-3 py-2 rounded-xl mt-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Questions are strictly separated — questions added to Subject Bank won't mix with Mock Tests automatically unless linked.</span>
              </div>
            </div>

            {/* Destination Specific Dropdowns */}
            {uploadType === 'exam' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-blue-50/40 rounded-2xl border border-blue-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Exam Category *</Label>
                  <Select value={selectedExamId} onValueChange={handleExamChange}>
                    <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200 text-sm shadow-2xs">
                      <SelectValue placeholder="Select Exam" />
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
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Link to Full Mock Test (Optional)</Label>
                  <Select value={selectedMockTestId} onValueChange={setSelectedMockTestId} disabled={!selectedExamId}>
                    <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200 text-sm shadow-2xs">
                      <SelectValue placeholder={selectedExamId ? "Select Mock Test" : "Select exam first"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="none">Don't link to mock test (Bank Only)</SelectItem>
                      {mockTests.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-500 font-medium">Instantly links imported questions to this test paper</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Target Subject *</Label>
                  <Select value={defaultSubject.id || ""} onValueChange={handleSubjectChange}>
                    <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200 text-sm shadow-2xs">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Target Topic *</Label>
                  <Select
                    value={defaultTopic.id || ""}
                    onValueChange={handleTopicChange}
                    disabled={!defaultSubject.id}
                  >
                    <SelectTrigger className="h-11 rounded-2xl bg-white border-slate-200 text-sm shadow-2xs">
                      <SelectValue placeholder={defaultSubject.id ? "Select Topic" : "Select subject first"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Batch Question Properties */}
            <div className="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Default MCQ Properties (Applied to all parsed questions)
                </Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Difficulty</Label>
                  <Select value={defaultDifficulty} onValueChange={setDefaultDifficulty}>
                    <SelectTrigger className="h-11 rounded-2xl bg-white text-xs border-slate-200 shadow-2xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="easy">🟢 Easy (Beginner)</SelectItem>
                      <SelectItem value="medium">🟡 Medium (Standard)</SelectItem>
                      <SelectItem value="hard">🔴 Hard (Advanced)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">PYQ Year (Optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2024"
                    value={defaultYear}
                    onChange={(e) => setDefaultYear(e.target.value)}
                    className="h-11 rounded-2xl bg-white text-xs border-slate-200 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Language</Label>
                  <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                    <SelectTrigger className="h-11 rounded-2xl bg-white text-xs border-slate-200 shadow-2xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="mixed">Mixed Language</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Source / Paper Name</Label>
                  <Input
                    placeholder="e.g. WBP Constable 2019"
                    value={defaultSource}
                    onChange={(e) => setDefaultSource(e.target.value)}
                    className="h-11 rounded-2xl bg-white text-xs border-slate-200 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Paste Questions Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Step 2: Paste Raw Questions
                </Label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {bulkText ? `${bulkText.split('\n').length} lines pasted` : "Numbered questions format"}
                </span>
              </div>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste formatted questions here (e.g. 1. Question... (a) ... (b) ... Ans:(a)...)"
                rows={14}
                className="font-mono text-xs sm:text-sm rounded-2xl border-slate-200 bg-slate-50/40 p-4 focus-visible:bg-white focus-visible:ring-blue-600 transition-all leading-relaxed shadow-inner"
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                onClick={parseQuestions}
                disabled={!bulkText.trim()}
                className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 text-white font-bold text-sm transition-all"
              >
                <Eye className="w-4 h-4 mr-2" />
                Parse & Preview Questions
              </Button>
              {bulkText && (
                <Button
                  variant="ghost"
                  onClick={() => { setBulkText(""); setParsedQuestions([]); setShowPreview(false); }}
                  className="rounded-2xl h-11 px-4 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Clear Input
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Example Format Guide Card */}
        <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-800">Standard MCQ Parser Format</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 rounded-xl text-xs font-bold border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
            >
              {copiedExample ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Copy Example
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs overflow-x-auto font-mono leading-relaxed border border-slate-800 shadow-inner">
              {exampleFormat}
            </pre>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
              <p>• Questions must be numbered (<code className="text-blue-600 font-bold">1.</code>, <code className="text-blue-600 font-bold">2.</code>, etc.).</p>
              <p>• Options must use <code className="text-blue-600 font-bold">(a)</code>, <code className="text-blue-600 font-bold">(b)</code>, <code className="text-blue-600 font-bold">(c)</code>, <code className="text-blue-600 font-bold">(d)</code>.</p>
              <p>• Answer line must start with <code className="text-blue-600 font-bold">Ans:(b)</code>.</p>
              <p>• Separate consecutive questions with an empty blank line.</p>
            </div>
          </CardContent>
        </Card>

        {/* Parsed Questions Preview Section */}
        {showPreview && parsedQuestions.length > 0 && (
          <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Parsed Preview ({parsedQuestions.length} Questions)
                </CardTitle>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Review the questions before saving to the database</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 text-white font-bold h-11 px-6 text-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving to Database..." : `Save All ${parsedQuestions.length} Questions`}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                {parsedQuestions.map((q, index) => (
                  <div key={index} className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/30 hover:bg-white hover:border-blue-200 transition-all shadow-2xs">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge className="bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                        Q{index + 1}
                      </Badge>
                      {(q.subject || defaultSubject.name) && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold rounded-full">
                          Subject: {q.subject || defaultSubject.name}
                        </Badge>
                      )}
                      {(q.topic || (q.subject ? undefined : defaultTopic.name)) && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold rounded-full">
                          Topic: {q.topic || (q.subject ? "" : defaultTopic.name)}
                        </Badge>
                      )}
                      <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full ml-auto">
                        Correct: {q.correct_answer}
                      </Badge>
                    </div>

                    <div className="font-semibold text-sm sm:text-base text-slate-900 mb-4 leading-relaxed">
                      <MathText text={q.question_text} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3 text-sm">
                      <div className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                        q.correct_answer.toUpperCase().includes('A')
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          q.correct_answer.toUpperCase().includes('A') ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>A</span>
                        <div className="pt-0.5"><MathText text={q.option_a} /></div>
                      </div>

                      <div className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                        q.correct_answer.toUpperCase().includes('B')
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          q.correct_answer.toUpperCase().includes('B') ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>B</span>
                        <div className="pt-0.5"><MathText text={q.option_b} /></div>
                      </div>

                      <div className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                        q.correct_answer.toUpperCase().includes('C')
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          q.correct_answer.toUpperCase().includes('C') ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>C</span>
                        <div className="pt-0.5"><MathText text={q.option_c} /></div>
                      </div>

                      <div className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                        q.correct_answer.toUpperCase().includes('D')
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          q.correct_answer.toUpperCase().includes('D') ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>D</span>
                        <div className="pt-0.5"><MathText text={q.option_d} /></div>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="mt-3 p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                        <span className="font-bold text-blue-900 shrink-0">Short Notes:</span>
                        <div className="flex-1"><MathText text={q.explanation} /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default BulkMCQUpload;
