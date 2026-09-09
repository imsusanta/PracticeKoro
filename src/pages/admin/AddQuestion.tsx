import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FilePlus, Save, RefreshCw, Sparkles, CheckCircle2, BookOpen, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubjectTopicSelectors } from "@/components/admin/SubjectTopicSelectors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/admin/AdminLayout";
import { MathText } from "@/components/ui/MathText";

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
    exam_id: "",
    difficulty: "medium",
    year: "",
    language: "bn",
    status: "published",
    source: "",
    tags: "",
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
        exam_id: formData.exam_id || null,
        difficulty: formData.difficulty || "medium",
        year: formData.year ? parseInt(formData.year, 10) || null : null,
        language: formData.language || "bn",
        status: formData.status || "published",
        source: formData.source || null,
        tags: formData.tags ? formData.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : null,
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
        description: "Question added successfully to database",
      });

      // Reset form but keep exam, subject, difficulty, and language for subsequent entries
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
      exam_id: "",
      difficulty: "medium",
      year: "",
      language: "bn",
      status: "published",
      source: "",
      tags: "",
      explanation: "",
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Add Question" subtitle="Create new MCQ">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 font-medium text-sm">Loading question editor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Add Question" subtitle="Create new MCQ for Question Bank & Mock Tests">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
        {/* Executive Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Single Question Creator</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Add questions with LaTeX math preview, answer keys, and categorization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
              Question Bank Ready
            </Badge>
          </div>
        </div>

        {/* Question Form Card */}
        <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900">MCQ Parameters & Details</CardTitle>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              {formData.difficulty.toUpperCase()} • {formData.language.toUpperCase()}
            </span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Classification: Exam, Difficulty, PYQ Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/90">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Target Exam (Optional)</Label>
                  <Select value={formData.exam_id || "none"} onValueChange={(value) => setFormData({ ...formData, exam_id: value === "none" ? "" : value })}>
                    <SelectTrigger className="rounded-2xl h-11 bg-white text-xs border-slate-200 shadow-2xs">
                      <SelectValue placeholder="Select Exam" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="none">General / No Specific Exam</SelectItem>
                      {exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Difficulty Rating</Label>
                  <Select value={formData.difficulty} onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}>
                    <SelectTrigger className="rounded-2xl h-11 bg-white text-xs border-slate-200 shadow-2xs">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="easy">🟢 Easy (Beginner)</SelectItem>
                      <SelectItem value="medium">🟡 Medium (Standard)</SelectItem>
                      <SelectItem value="hard">🔴 Hard (Advanced)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">PYQ Year (Optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2024"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="rounded-2xl h-11 bg-white text-xs border-slate-200 shadow-2xs"
                  />
                </div>
              </div>

              {/* Language, Status, Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Language</Label>
                  <Select value={formData.language} onValueChange={(value: any) => setFormData({ ...formData, language: value })}>
                    <SelectTrigger className="rounded-2xl h-11 bg-white text-xs border-slate-200 shadow-2xs">
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
                  <Label className="text-xs font-bold text-slate-700">Publication Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="rounded-2xl h-11 bg-white text-xs border-slate-200 shadow-2xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Source / Paper Name</Label>
                  <Input
                    placeholder="e.g. WBP Constable Prelims 2019"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="rounded-2xl h-11 bg-white text-xs border-slate-200 shadow-2xs"
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Question Text * (Supports LaTeX $...$)
                  </Label>
                </div>
                <Textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Enter the question text in Bengali or English..."
                  rows={4}
                  className="rounded-2xl border-slate-200 text-sm focus-visible:ring-blue-600 bg-slate-50/30 p-3.5 leading-relaxed"
                />
                {formData.question_text && (
                  <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-100 text-sm text-slate-800">
                    <span className="text-[11px] font-bold text-blue-700 block mb-1 uppercase tracking-wider">Live Math Preview:</span>
                    <MathText text={formData.question_text} />
                  </div>
                )}
              </div>

              {/* Options A, B, C, D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">A</span>
                    <Label className="text-xs font-bold text-slate-700">Option A *</Label>
                  </div>
                  <Textarea
                    value={formData.option_a}
                    onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                    placeholder="Option A content..."
                    rows={2}
                    className="rounded-xl text-sm border-slate-200 bg-white focus-visible:ring-blue-600"
                  />
                  {formData.option_a && (
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                      <MathText text={formData.option_a} />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">B</span>
                    <Label className="text-xs font-bold text-slate-700">Option B *</Label>
                  </div>
                  <Textarea
                    value={formData.option_b}
                    onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                    placeholder="Option B content..."
                    rows={2}
                    className="rounded-xl text-sm border-slate-200 bg-white focus-visible:ring-blue-600"
                  />
                  {formData.option_b && (
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                      <MathText text={formData.option_b} />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">C</span>
                    <Label className="text-xs font-bold text-slate-700">Option C *</Label>
                  </div>
                  <Textarea
                    value={formData.option_c}
                    onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                    placeholder="Option C content..."
                    rows={2}
                    className="rounded-xl text-sm border-slate-200 bg-white focus-visible:ring-blue-600"
                  />
                  {formData.option_c && (
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                      <MathText text={formData.option_c} />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center justify-center">D</span>
                    <Label className="text-xs font-bold text-slate-700">Option D *</Label>
                  </div>
                  <Textarea
                    value={formData.option_d}
                    onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                    placeholder="Option D content..."
                    rows={2}
                    className="rounded-xl text-sm border-slate-200 bg-white focus-visible:ring-blue-600"
                  />
                  {formData.option_d && (
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                      <MathText text={formData.option_d} />
                    </div>
                  )}
                </div>
              </div>

              {/* Correct Answer Selection */}
              <div className="p-4 sm:p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2">
                <Label className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
                  Select Correct Answer Key *
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {["A", "B", "C", "D"].map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      variant={formData.correct_answer === opt ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, correct_answer: opt })}
                      className={`h-11 rounded-2xl font-extrabold text-sm transition-all ${
                        formData.correct_answer === opt
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-emerald-50/50 hover:border-emerald-300"
                      }`}
                    >
                      Option {opt}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Subject & Topic Selectors */}
              <div className="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Subject & Topic Routing
                </Label>
                <SubjectTopicSelectors
                  category="questions"
                  initialSubjectId={formData.subject_id}
                  initialTopicId={formData.topic_id}
                  onSubjectChange={(id, name) => setFormData({ ...formData, subject_id: id || "", subject_name: name })}
                  onTopicChange={(id, name) => setFormData({ ...formData, topic_id: id || "", topic_name: name })}
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 block">Tags (Comma separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g. history, mughal, battle, gs"
                  className="rounded-2xl h-11 border-slate-200 text-sm bg-white shadow-2xs"
                />
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 block">Short Notes / Explanation (Optional)</Label>
                <Textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="ব্যাখ্যা বা শর্ট নোট লিখুন (যেমন: • পয়েন্ট ১ • পয়েন্ট ২)..."
                  rows={3}
                  className="rounded-2xl border-slate-200 text-sm focus-visible:ring-blue-600 bg-slate-50/30 p-3"
                />
                {formData.explanation && (
                  <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-100 text-xs text-slate-800">
                    <strong className="text-blue-900 block mb-1 font-bold uppercase tracking-wider">Live Notes Preview:</strong>
                    <MathText text={formData.explanation} />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="rounded-2xl h-11 px-5 text-slate-700 font-bold border-slate-200 hover:bg-slate-50 flex-1 sm:flex-none"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Form
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !formData.question_text || !formData.option_a || !formData.option_b || !formData.option_c || !formData.option_d}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-11 px-6 flex-1 sm:flex-none shadow-md shadow-blue-500/20 text-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving Question..." : "Save Question to Bank"}
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
