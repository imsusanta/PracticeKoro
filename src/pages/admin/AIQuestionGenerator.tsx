import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Save, FileUp, Library, FileText, Download, Loader2, X, CheckCircle2, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";
import { SubjectTopicSelectors } from "@/components/admin/SubjectTopicSelectors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";

interface GeneratedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
}

const AIQuestionGenerator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasStructuredColumns, setHasStructuredColumns] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [topicQuestions, setTopicQuestions] = useState<GeneratedQuestion[]>([]);
  const [pdfQuestions, setPdfQuestions] = useState<GeneratedQuestion[]>([]);
  const [topicSelected, setTopicSelected] = useState<number[]>([]);
  const [pdfSelected, setPdfSelected] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("topic");
  const [formData, setFormData] = useState({
    subject_id: "",
    subject_name: "" as string | null,
    topic_id: "",
    topic_name: "" as string | null,
    count: 5,
    language: "Bengali",
    systemPrompt: "",
    extractedText: "",
  });
  const [pdfLibraryOpen, setPdfLibraryOpen] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<any[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<any>(null);

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        navigate("/admin/login");
        return;
      }

      const [roleResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["admin", "super_admin"]).maybeSingle(),
      ]);

      if (!roleResult.data) {
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
      await Promise.all([
        checkColumns()
      ]);
      setLoading(false);
    };

    const checkColumns = async () => {
      const { error } = await supabase.from("questions").select("subject_id").limit(0);
      if (error) {
        if (error.message?.includes("subject_id") || error.code === "PGRST100" || error.code === "42703") {
          setHasStructuredColumns(false);
        }
      } else {
        setHasStructuredColumns(true);
      }
      // Always load library regardless of column check result
      await loadLibrary();
    };

    initPage();
  }, [navigate, toast]);

  const loadLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from("pdfs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error loading PDF library:", error);
        return;
      }
      console.log("Loaded PDFs from library:", data?.length || 0, "files");
      if (data) setPdfFiles(data);
    } catch (err) {
      console.error("Exception loading PDF library:", err);
    }
  };

  const extractTextFromPDF = async (file: File | string) => {
    setExtractingPdf(true);
    try {
      let arrayBuffer: ArrayBuffer;
      if (typeof file === 'string') {
        const response = await fetch(file);
        arrayBuffer = await response.arrayBuffer();
      } else {
        arrayBuffer = await file.arrayBuffer();
      }

      // Load PDF.js from CDN to avoid build issues with top-level await
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        // Dynamically load the script if not already loaded
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF.js'));
          document.head.appendChild(script);
        });
      }
      
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      setFormData(prev => ({ ...prev, extractedText: fullText }));
      toast({
        title: "Success",
        description: "Text extracted from PDF successfully",
      });
    } catch (error) {
      console.error("PDF extraction error:", error);
      toast({
        title: "Error",
        description: "Failed to extract text from PDF",
        variant: "destructive",
      });
    } finally {
      setExtractingPdf(false);
    }
  };

  const sanitizeFilename = (filename: string) => {
    // Keep extension
    const parts = filename.split(".");
    const ext = parts.length > 1 ? parts.pop() : "";
    const name = parts.join(".");

    // Replace non-ascii and special characters with underscores
    const cleanName = name
      .replace(/[^\x00-\x7F]/g, "_") // Replace non-ascii
      .replace(/[^a-zA-Z0-9]/g, "_") // Replace non-alphanumeric
      .replace(/_+/g, "_")            // Collapse multiple underscores
      .trim();

    return ext ? `${cleanName || "file"}.${ext}` : (cleanName || "file");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setUploadingPdf(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Authentication session not found. Please refresh or login again.");

      const safeFileName = sanitizeFilename(file.name);
      const filePath = `${user.id}/${Date.now()}_${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("pdfs_library")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("pdfs_library")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("pdfs").insert({
        title: file.name,
        file_path: publicUrl,
        file_size: file.size,
        uploaded_by: user.id,
        subject_id: formData.subject_id || null,
        topic_id: formData.topic_id || null,
      });

      if (dbError) throw dbError;

      await loadLibrary();
      await extractTextFromPDF(file);

      toast({
        title: "Success",
        description: "PDF uploaded and saved to library",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSelectFromLibrary = (pdf: any) => {
    extractTextFromPDF(pdf.file_path);
    setPdfLibraryOpen(false);
  };

  const handleDeletePdf = (e: React.MouseEvent, pdf: any) => {
    e.stopPropagation();
    setPdfToDelete(pdf);
  };

  const confirmDeletePdf = async () => {
    if (!pdfToDelete) return;

    try {
      // 1. Delete from Storage
      // The file_path is a public URL, we need to extract the relative path
      // Public URL format: .../storage/v1/object/public/pdfs_library/user_id/timestamp_name.pdf
      const pathParts = pdfToDelete.file_path.split("pdfs_library/");
      if (pathParts.length < 2) throw new Error("Could not determine file path for deletion");

      const relativePath = pathParts[1];
      const { error: storageError } = await supabase.storage
        .from("pdfs_library")
        .remove([relativePath]);

      if (storageError) throw storageError;

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from("pdfs")
        .delete()
        .eq("id", pdfToDelete.id);

      if (dbError) throw dbError;

      toast({
        title: "Deleted",
        description: "PDF removed from library",
      });

      await loadLibrary();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete PDF",
        variant: "destructive",
      });
    } finally {
      setPdfToDelete(null);
    }
  };

  const handleGenerate = async () => {
    if (activeTab === "topic" && !formData.subject_name && !formData.topic_name) {
      toast({
        title: "Error",
        description: "Please enter at least a Subject or Topic to generate questions",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "pdf" && !formData.extractedText) {
      toast({
        title: "Error",
        description: "Please upload or select a PDF first",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    if (activeTab === "topic") {
      setTopicQuestions([]);
      setTopicSelected([]);
    } else {
      setPdfQuestions([]);
      setPdfSelected([]);
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          subject: formData.subject_name,
          topic: formData.topic_name,
          count: formData.count,
          language: formData.language,
          systemPrompt: formData.systemPrompt || undefined,
          customText: formData.extractedText || undefined,
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        setGenerating(false);
        return;
      }

      const questions = data.questions;
      if (activeTab === "topic") {
        setTopicQuestions(questions);
        setTopicSelected(questions.map((_: any, index: number) => index));
      } else {
        setPdfQuestions(questions);
        setPdfSelected(questions.map((_: any, index: number) => index));
      }

      toast({
        title: "Success",
        description: `Generated ${questions.length} questions successfully`,
      });
    } catch (error: any) {
      console.error("Question generation error:", error);
      const errorMessage = error?.message || error?.error || "Unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to generate: ${errorMessage}`,
        variant: "destructive",
      });
    }

    setGenerating(false);
  };

  const handleSave = async () => {
    const currentQuestions = activeTab === "topic" ? topicQuestions : pdfQuestions;
    const currentSelected = activeTab === "topic" ? topicSelected : pdfSelected;

    if (currentSelected.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one question to save",
        variant: "destructive",
      });
      return;
    }

    if (!formData.subject_name && !formData.topic_name) {
      toast({
        title: "Error",
        description: "Please provide at least a Subject or Topic",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setSaving(true);

    let finalSubjectId = formData.subject_id;
    let finalTopicId = formData.topic_id;

    try {
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
          const { data: newSub, error: subError } = await supabase
            .from("subjects")
            .insert({
              name: formData.subject_name,
              created_by: session.user.id,
              category: "questions"
            })
            .select("id")
            .single();

          if (subError) throw subError;
          if (newSub) finalSubjectId = newSub.id;
        }
      }

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
          const { data: newTop, error: topError } = await supabase
            .from("topics")
            .insert({
              subject_id: finalSubjectId,
              name: formData.topic_name,
              created_by: session.user.id,
              category: "questions"
            })
            .select("id")
            .single();

          if (topError) throw topError;
          if (newTop) finalTopicId = newTop.id;
        }
      }

      const selectedQuestionsData = currentSelected.map(index => currentQuestions[index]);
      const questionsToInsert = selectedQuestionsData.map(q => {
        // Sanitize correct_answer
        let correctAnswer = (q.correct_answer || "A").toString().trim().toUpperCase();
        if (correctAnswer.length > 1) {
          correctAnswer = correctAnswer.charAt(0);
        }
        if (!["A", "B", "C", "D"].includes(correctAnswer)) {
          correctAnswer = "A";
        }

        const row: any = {
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: correctAnswer,
          subject: formData.subject_name || null,
          topic: formData.topic_name || null,
          explanation: q.explanation || null,
          created_by: session.user.id,
        };

        if (hasStructuredColumns) {
          row.subject_id = finalSubjectId || null;
          row.topic_id = finalTopicId || null;
        }

        return row;
      });

      const { error } = await supabase.from("questions").insert(questionsToInsert);
      if (error) throw error;

      toast({
        title: "Success",
        description: `Saved ${currentSelected.length} questions to question bank`,
      });

      if (activeTab === "topic") {
        setTopicQuestions([]);
        setTopicSelected([]);
      } else {
        setPdfQuestions([]);
        setPdfSelected([]);
      }
    } catch (error: any) {
      console.error("Save questions error:", error);
      toast({
        title: "Error",
        description: `Failed to save questions: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  const handleDownloadPDF = () => {
    const currentQuestions = activeTab === "topic" ? topicQuestions : pdfQuestions;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Generated Questions - Practice Koro</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            .question { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            .question-text { font-weight: bold; margin-bottom: 10px; }
            .options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
            .answer { color: #10b981; font-weight: bold; }
            .notes { background: #f9fafb; padding: 10px; border-left: 4px solid #10b981; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Generated Questions</h1>
          <p>Subject: ${formData.subject_name || 'N/A'} | Topic: ${formData.topic_name || 'N/A'}</p>
          <hr />
          ${currentQuestions.map((q, i) => `
            <div class="question">
              <div class="question-text">${i + 1}. ${q.question_text}</div>
              <div class="options">
                <div>(A) ${q.option_a}</div>
                <div>(B) ${q.option_b}</div>
                <div>(C) ${q.option_c}</div>
                <div>(D) ${q.option_d}</div>
              </div>
              <div class="answer">Correct Answer: ${q.correct_answer}</div>
              ${q.explanation ? `<div class="notes"><strong>Short Notes:</strong><br/>${q.explanation}</div>` : ''}
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const handleToggleQuestion = (index: number) => {
    if (activeTab === "topic") {
      setTopicSelected(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      setPdfSelected(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (activeTab === "topic") {
      if (checked) {
        setTopicSelected(topicQuestions.map((_, i) => i));
      } else {
        setTopicSelected([]);
      }
    } else {
      if (checked) {
        setPdfSelected(pdfQuestions.map((_, i) => i));
      } else {
        setPdfSelected([]);
      }
    }
  };

  const renderResults = (questions: GeneratedQuestion[], selectedIndices: number[]) => {
    if (questions.length === 0) return null;

    return (
      <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 mt-8">
        <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Generated Questions ({questions.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`select-all-${activeTab}`}
                  checked={selectedIndices.length === questions.length && questions.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor={`select-all-${activeTab}`} className="text-sm font-medium cursor-pointer text-slate-700">
                  Select All ({selectedIndices.length})
                </Label>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-4">
                  <Label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Destination Details</Label>
                  <SubjectTopicSelectors
                    category="questions"
                    initialSubjectId={formData.subject_id}
                    initialTopicId={formData.topic_id}
                    onSubjectChange={(id, name) => setFormData({ ...formData, subject_id: id || "", subject_name: name })}
                    onTopicChange={(id, name) => setFormData({ ...formData, topic_id: id || "", topic_name: name })}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || selectedIndices.length === 0}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : `Add to Question Bank (${selectedIndices.length})`}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="flex-1 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
              {questions.map((q, index) => (
                <Card
                  key={index}
                  className={`p-5 rounded-2xl transition-all border-2 ${selectedIndices.includes(index)
                    ? 'border-emerald-500 bg-emerald-50/30'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                >
                  <div className="flex gap-3 mb-3 items-start">
                    <input
                      type="checkbox"
                      checked={selectedIndices.includes(index)}
                      onChange={() => handleToggleQuestion(index)}
                      className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2 items-center flex-wrap">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-bold">Q{index + 1}</Badge>
                        <Badge variant="outline" className="text-slate-500 font-medium border-slate-200">Answer: {q.correct_answer}</Badge>
                      </div>
                      <p className="font-bold text-slate-800 text-lg mb-4 leading-snug">{q.question_text}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div
                            key={opt}
                            className={`p-3 rounded-xl border flex items-center gap-3 ${q.correct_answer === opt
                              ? 'bg-emerald-100 border-emerald-200 text-emerald-800 font-bold'
                              : 'bg-slate-50 border-slate-100 text-slate-600'
                              }`}
                          >
                            <span className="w-6 h-6 rounded-lg bg-white/50 flex items-center justify-center text-[10px] font-black">{opt}</span>
                            {opt === 'A' ? q.option_a : opt === 'B' ? q.option_b : opt === 'C' ? q.option_c : q.option_d}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">Short Notes & Explanation</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout title="AI Question Generator" subtitle="Generate questions with AI">
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
    <AdminLayout title="AI Question Generator" subtitle="Generate questions with AI">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <Tabs defaultValue="topic" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-gray-100 overflow-hidden mb-6">
            <TabsTrigger value="topic" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm py-3 transition-all">
              <Sparkles className="w-4 h-4 mr-2" />
              AI General Generator
            </TabsTrigger>
            <TabsTrigger value="pdf" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-3 transition-all">
              <FileText className="w-4 h-4 mr-2" />
              PDF to Question Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topic">
            <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border-t-4 border-emerald-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  General Topic Generation
                </CardTitle>
                <p className="text-sm text-gray-500">Enter a subject and topic to generate balanced MCQs with AI.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-2">
                  <h4 className="text-sm font-semibold mb-2 text-emerald-800">💡 Tips:</h4>
                  <ul className="text-xs text-emerald-700 space-y-1 list-disc list-inside">
                    <li>Be specific with Subject and Topic (e.g., "History" + "French Revolution")</li>
                    <li>Questions will include detailed "Short Notes" automatically</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <SubjectTopicSelectors
                    category="questions"
                    onSubjectChange={(id, name) => setFormData({ ...formData, subject_id: id || "", subject_name: name })}
                    onTopicChange={(id, name) => setFormData({ ...formData, topic_id: id || "", topic_name: name })}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Language</Label>
                      <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                        <SelectTrigger className="h-12 rounded-xl mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bengali">Bengali</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Hindi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Number of Questions</Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.count}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setFormData({ ...formData, count: Math.min(Math.max(value, 1), 50) });
                        }}
                        className="rounded-xl mt-1 h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Custom Instructions (Optional)</Label>
                    <Textarea
                      value={formData.systemPrompt}
                      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                      placeholder="e.g., Focus on numerical problems, make it hard..."
                      className="rounded-xl mt-1 min-h-[80px]"
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-semibold shadow-lg shadow-emerald-200/50"
                  >
                    {generating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Generate Questions</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {renderResults(topicQuestions, topicSelected)}
          </TabsContent>

          <TabsContent value="pdf">
            <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border-t-4 border-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Question Generation from PDF
                </CardTitle>
                <p className="text-sm text-gray-500">Upload a PDF or select from library to extract content for generation.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Source Content</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="rounded-xl h-24 border-dashed border-2 hover:bg-blue-50 hover:border-blue-200 transition-all flex flex-col gap-2"
                        onClick={() => document.getElementById('pdf-upload-v2')?.click()}
                        disabled={uploadingPdf || extractingPdf}
                      >
                        {uploadingPdf ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <FileUp className="w-6 h-6 text-blue-600" />
                        )}
                        <span className="text-xs font-semibold">Upload PDF</span>
                      </Button>
                      <input
                        id="pdf-upload-v2"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                      />

                      <Dialog open={pdfLibraryOpen} onOpenChange={setPdfLibraryOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="rounded-xl h-24 border-dashed border-2 hover:bg-emerald-50 hover:border-emerald-200 transition-all flex flex-col gap-2"
                          >
                            <Library className="w-6 h-6 text-emerald-600" />
                            <span className="text-xs font-semibold">Library</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                          <DialogHeader className="p-6 pb-2">
                            <DialogTitle>Select from Library</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3">
                            {pdfFiles.length === 0 ? (
                              <div className="text-center py-12 text-gray-500 font-medium">No stored PDFs found</div>
                            ) : (
                              pdfFiles.map((pdf) => (
                                <div
                                  key={pdf.id}
                                  onClick={() => handleSelectFromLibrary(pdf)}
                                  className="flex items-center justify-between p-4 rounded-2xl border-2 border-transparent bg-slate-50 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                      <h4 className="font-bold text-sm text-slate-900 truncate max-w-[280px]">{pdf.title}</h4>
                                      <p className="text-[10px] text-slate-500 mt-0.5">{(pdf.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(pdf.created_at).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                                      onClick={(e) => handleDeletePdf(e, pdf)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <Library className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {formData.extractedText && (
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Content Ready</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-blue-200"
                            onClick={() => setFormData(p => ({ ...p, extractedText: "" }))}
                          >
                            <X className="w-3 h-3 text-blue-700" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-blue-600/80 leading-relaxed line-clamp-2 italic">
                          "{formData.extractedText.slice(0, 150)}..."
                        </p>
                        <div className="text-[10px] font-medium text-blue-500 flex justify-end">
                          {formData.extractedText.length.toLocaleString()} characters
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Subject & Topic Info</Label>
                      <div className="mt-1 space-y-4">
                        <SubjectTopicSelectors
                          category="questions"
                          onSubjectChange={(id, name) => setFormData({ ...formData, subject_id: id || "", subject_name: name })}
                          onTopicChange={(id, name) => setFormData({ ...formData, topic_id: id || "", topic_name: name })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Language</Label>
                    <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                      <SelectTrigger className="h-12 rounded-xl mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bengali">Bengali</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Question Count</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.count}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setFormData({ ...formData, count: Math.min(Math.max(value, 1), 50) });
                      }}
                      className="rounded-xl mt-1 h-12"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generating || (!formData.extractedText && !extractingPdf)}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 font-semibold shadow-lg shadow-blue-200/50"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing & Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate from Content</>
                  )}
                </Button>

                {!formData.extractedText && !generating && (
                  <p className="text-[10px] text-center text-slate-400">Please upload or select a PDF first</p>
                )}
              </CardContent>
            </Card>
            {renderResults(pdfQuestions, pdfSelected)}
          </TabsContent>
        </Tabs>

      </div>

      <DeleteAlertDialog
        isOpen={!!pdfToDelete}
        onClose={() => setPdfToDelete(null)}
        onConfirm={confirmDeletePdf}
        itemName={pdfToDelete?.title}
        isDeleting={uploadingPdf || extractingPdf} // Reusing loading states if any
      />
    </AdminLayout>
  );
};

export default AIQuestionGenerator;
