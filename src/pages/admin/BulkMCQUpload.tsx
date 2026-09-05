import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Eye, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";

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
  const [bulkText, setBulkText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [defaultSubject, setDefaultSubject] = useState({ id: "" as string | null, name: "" as string | null });
  const [defaultTopic, setDefaultTopic] = useState({ id: "" as string | null, name: "" as string | null });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

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
      .eq("role", "admin")
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

    if (data && data.length > 0) {
      setExams(data);
    }
    // Load subjects for questions category
    await loadSubjects();
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

    const finalExamId = selectedExamId || null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (!defaultSubject.id || !defaultTopic.id) {
      toast({
        title: "Error",
        description: "Please select both a Default Subject and a Default Topic",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Map questions for insert - only use text-based subject/topic (no subject_id/topic_id)
      const questionsToInsert = parsedQuestions.map(q => {
        const subName = q.subject || defaultSubject.name || "General";
        const topName = q.topic || (subName === defaultSubject.name ? defaultTopic.name : null);

        return {
          exam_id: finalExamId,
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
        };
      });

      const { error } = await supabase.from("questions").insert(questionsToInsert);
      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully added ${parsedQuestions.length} questions to Question Bank`,
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
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-700 font-medium">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Bulk MCQ Upload" subtitle="Upload multiple questions">
      <div className="flex flex-col gap-6">
        <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              Bulk Upload Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Default Subject</Label>
                <Select value={defaultSubject.id || ""} onValueChange={handleSubjectChange}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Applied to questions without explicit subject</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Default Topic</Label>
                <Select
                  value={defaultTopic.id || ""}
                  onValueChange={handleTopicChange}
                  disabled={!defaultSubject.id}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder={defaultSubject.id ? "Select topic" : "Select subject first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Applied to questions without explicit topic</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Paste Questions (Format below)</Label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste your questions here..."
                rows={15}
                className="font-mono text-sm rounded-xl shadow-none focus-visible:ring-emerald-500"
              />
            </div>

            <div>
              <Button onClick={parseQuestions} disabled={!bulkText.trim()} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
                <Eye className="w-4 h-4 mr-2" />
                Parse & Preview
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader>
            <CardTitle>Example Format</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-xl text-sm overflow-x-auto border">
              {exampleFormat}
            </pre>
            <p className="text-sm text-gray-500 mt-2">
              Note: Questions must be numbered (1., 2., etc.). Options must use (a), (b), (c), (d) format.
              Answer line must start with "Ans:" followed by the correct option.
              Short Notes, Subject, and Topic are optional. Separate questions with an empty line.
            </p>
          </CardContent>
        </Card>

        {showPreview && parsedQuestions.length > 0 && (
          <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Preview ({parsedQuestions.length} questions)</CardTitle>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 h-11">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : `Save All ${parsedQuestions.length} Questions`}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {parsedQuestions.map((q, index) => (
                  <Card key={index} className="p-4 rounded-xl border-gray-100 bg-gray-50/30">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className="bg-emerald-100 text-emerald-700">Q{index + 1}</Badge>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-600">
                        Subject: {q.subject || defaultSubject.name || "Non-Category"}
                      </Badge>
                      {(q.topic || (q.subject ? undefined : defaultTopic.name)) && (
                        <Badge variant="secondary" className="bg-violet-50 text-violet-600">
                          Topic: {q.topic || (q.subject ? "" : defaultTopic.name)}
                        </Badge>
                      )}
                      <Badge className="bg-emerald-600">Ans: {q.correct_answer}</Badge>
                    </div>
                    <p className="font-medium mb-3 text-gray-900">{q.question_text}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                      <div className="bg-white p-3 rounded-lg border border-gray-200">A. {q.option_a}</div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">B. {q.option_b}</div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">C. {q.option_c}</div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">D. {q.option_d}</div>
                    </div>
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-white border border-gray-200 rounded-xl text-sm italic text-gray-600">
                        <span className="font-bold not-italic text-gray-900">Short Notes: </span>
                        {q.explanation}
                      </div>
                    )}
                  </Card>
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
