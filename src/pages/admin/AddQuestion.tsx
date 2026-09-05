import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FilePlus, Save, RefreshCw } from "lucide-react";
import { SubjectTopicSelectors } from "@/components/admin/SubjectTopicSelectors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/admin/AdminLayout";

interface Exam {
  id: string;
  name: string;
}

const AddQuestion = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasStructuredColumns, setHasStructuredColumns] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    subject_id: "",
    subject_name: "" as string | null,
    topic_id: "",
    topic_name: "" as string | null,
    explanation: "",
  });

  const loadExams = useCallback(async () => {
    const { data } = await supabase
      .from("exams")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (data) {
      setExams(data);
    }
  }, []);

  const checkColumns = useCallback(async () => {
    const { error } = await supabase.from("questions").select("subject_id").limit(0);
    if (error) {
      if (error.message?.includes("subject_id") || error.code === "PGRST100" || error.code === "42703") {
        setHasStructuredColumns(false);
        return;
      }
    }
    setHasStructuredColumns(true);
  }, []);

  const checkAuth = useCallback(async () => {
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
        description: "You do not have administrative privileges",
        variant: "destructive",
      });
      navigate("/admin/login");
      return;
    }

    await loadExams();
    await checkColumns();
    setLoading(false);
  }, [navigate, toast, loadExams, checkColumns]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const ensureSubjectAndTopic = async (userId: string) => {
    let finalSubjectId = formData.subject_id;
    let finalTopicId = formData.topic_id;

    // Resolve Subject (exam-independent - find by name + category only)
    if (!finalSubjectId && formData.subject_name) {
      const { data: existingSub } = await supabase
        .from("subjects")
        .select("id")
        .eq("name", formData.subject_name)
        .eq("category", "questions")
        .maybeSingle();

      if (existingSub) {
        finalSubjectId = existingSub.id;
      } else {
        const { data: newSub } = await supabase
          .from("subjects")
          .insert({ name: formData.subject_name, created_by: userId, category: "questions" })
          .select("id")
          .single();
        if (newSub) finalSubjectId = newSub.id;
      }
    }

    // Resolve Topic
    if (finalSubjectId && !finalTopicId && formData.topic_name) {
      const { data: existingTop } = await supabase
        .from("topics")
        .select("id")
        .eq("subject_id", finalSubjectId)
        .eq("name", formData.topic_name)
        .eq("category", "questions")
        .maybeSingle();

      if (existingTop) {
        finalTopicId = existingTop.id;
      } else {
        const { data: newTop } = await supabase
          .from("topics")
          .insert({ subject_id: finalSubjectId, name: formData.topic_name, created_by: userId, category: "questions" })
          .select("id")
          .single();
        if (newTop) finalTopicId = newTop.id;
      }
    }

    return { finalSubjectId, finalTopicId };
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (!formData.question_text || !formData.option_a ||
      !formData.option_b || !formData.option_c || !formData.option_d) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { finalSubjectId, finalTopicId } = await ensureSubjectAndTopic(session.user.id);

      const questionData: any = {
        question_text: formData.question_text,
        option_a: formData.option_a,
        option_b: formData.option_b,
        option_c: formData.option_c,
        option_d: formData.option_d,
        correct_answer: formData.correct_answer,
        subject: formData.subject_name || null,
        topic: formData.topic_name || null,
        explanation: formData.explanation || null,
        created_by: session.user.id,
      };

      if (hasStructuredColumns) {
        questionData.subject_id = finalSubjectId || null;
        questionData.topic_id = finalTopicId || null;
      }

      const { error } = await supabase.from("questions").insert(questionData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question added successfully",
      });

      // Reset form but keep exam, subject and topic for subsequent entries
      setFormData({
        ...formData,
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        explanation: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add question",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      subject_id: "",
      subject_name: "",
      topic_id: "",
      topic_name: "",
      explanation: "",
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Add Question" subtitle="Create new MCQ">
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
    <AdminLayout title="Add Question" subtitle="Create new MCQ">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-emerald-600" />
              Add New MCQ Question
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Correct Answer *</Label>
                  <Select value={formData.correct_answer} onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}>
                    <SelectTrigger className="rounded-xl h-12">
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
              </div>

              <div>
                <Label className="text-sm font-medium">Question Text *</Label>
                <Textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Enter the question..."
                  rows={4}
                  className="rounded-xl shadow-none focus-visible:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Option A *</Label>
                  <Textarea
                    value={formData.option_a}
                    onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                    placeholder="Enter option A..."
                    rows={2}
                    className="rounded-xl shadow-none focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Option B *</Label>
                  <Textarea
                    value={formData.option_b}
                    onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                    placeholder="Enter option B..."
                    rows={2}
                    className="rounded-xl shadow-none focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Option C *</Label>
                  <Textarea
                    value={formData.option_c}
                    onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                    placeholder="Enter option C..."
                    rows={2}
                    className="rounded-xl shadow-none focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Option D *</Label>
                  <Textarea
                    value={formData.option_d}
                    onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                    placeholder="Enter option D..."
                    rows={2}
                    className="rounded-xl shadow-none focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <SubjectTopicSelectors
                category="questions"
                initialSubjectId={formData.subject_id}
                initialTopicId={formData.topic_id}
                onSubjectChange={(id, name) => setFormData({ ...formData, subject_id: id || "", subject_name: name })}
                onTopicChange={(id, name) => setFormData({ ...formData, topic_id: id || "", topic_name: name })}
              />

              <div>
                <Label className="text-sm font-medium">Explanation (Optional)</Label>
                <Textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Provide an explanation for the correct answer..."
                  rows={2}
                  className="rounded-xl shadow-none focus-visible:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button variant="outline" onClick={handleReset} className="rounded-xl h-12 flex-1 sm:flex-none">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 h-12 flex-1 sm:flex-none">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Question"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AddQuestion;
