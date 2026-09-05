import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { NotebookPen, Plus, Trash2, Search, Edit, FolderOpen, BookOpen, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";

interface Note {
  id: string;
  title: string;
  content: string | null;
  exam_id: string | null;
  topic_id: string | null;
  subject_id: string | null;
  is_paid: boolean;
  price: number;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  exam_id: string | null;
}

interface Topic {
  id: string;
  subject_id: string;
  name: string;
}

const NotesManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/admin/login"); return; }

    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["admin", "super_admin"]).maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      toast({ title: "Access Denied", description: "No admin privileges", variant: "destructive" });
      navigate("/admin/login");
      return;
    }

    await Promise.all([loadSubjects(), loadTopics(), loadNotes()]);
    setLoading(false);
  };

  const loadSubjects = async () => {
    // Order by order_index to match Subject Management order
    const { data } = await supabase.from("subjects").select("id, name, exam_id, order_index").eq("category", "notes").order("order_index", { ascending: true, nullsFirst: false });
    if (data) setSubjects(data);
  };

  const loadTopics = async () => {
    const { data } = await supabase.from("topics").select("id, subject_id, name").eq("category", "notes").order("name");
    if (data) setTopics(data);
  };

  const loadNotes = async () => {
    console.log("Loading notes...");
    const { data, error } = await supabase
      .from("pdfs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading notes:", error);
      toast({ title: "Error", description: "Failed to load notes. Please check if the 'pdfs' table exists and has the required columns.", variant: "destructive" });
      return;
    }

    // Map data to ensure is_paid and price exist even if columns are missing in DB
    const mappedNotes = (data || []).map(note => ({
      ...note,
      is_paid: note.is_paid ?? false,
      price: note.price ?? 0
    })) as Note[];

    setNotes(mappedNotes);
  };


  const handleDelete = async (note: Note) => {
    setNoteToDelete(note);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("pdfs").delete().eq("id", noteToDelete.id);
      if (error) throw error;
      toast({ title: "Success", description: "Note deleted" });
      await loadNotes();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  const getSubjectName = (subjectId: string | null) => subjects.find(s => s.id === subjectId)?.name || "Unknown Subject";

  // Organizing notes data
  const organizedData = subjects
    .filter(s => filterSubject === "all" || s.id === filterSubject)
    .map(subject => {
      const subjectTopics = topics.filter(t => t.subject_id === subject.id);
      const subjectNotes = notes.filter(n => n.subject_id === subject.id);

      const topicsWithNotes = subjectTopics.map(topic => ({
        ...topic,
        notes: subjectNotes.filter(n => n.topic_id === topic.id &&
          (searchQuery === "" || n.title.toLowerCase().includes(searchQuery.toLowerCase())))
      })).filter(t => t.notes.length > 0 || searchQuery === "");

      return {
        ...subject,
        topics: topicsWithNotes,
        totalNotes: subjectNotes.length
      };
    }).filter(s => s.topics.some(t => t.notes.length > 0) || (searchQuery === "" && filterSubject === "all" && s.totalNotes > 0));

  const CreateButton = (
    <Button onClick={() => navigate("/admin/add-note")} size="icon" className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 border border-white/20 shadow-lg shadow-emerald-500/20">
      <Plus className="w-5 h-5" />
    </Button>
  );

  if (loading) {
    return (
      <AdminLayout title="Notes Management" subtitle="Manage study notes by subject & topic">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Notes Management" subtitle="Manage study notes by subject & topic" headerActions={CreateButton}>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search within notes..."
            className="pl-10 h-11 rounded-xl border-gray-200 bg-white/50 focus:bg-white transition-all shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-full md:w-56 h-11 rounded-xl border-gray-200 bg-white/50 shadow-sm">
            <SelectValue placeholder="Filter by Subject" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Hierarchical Notes List */}
      <div className="space-y-4">
        {organizedData.length === 0 ? (
          <Card className="border-0 bg-white/50 backdrop-blur-sm rounded-2xl border-dashed border-2 border-gray-200">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <NotebookPen className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1 text-lg">No Articles Found</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">Create your first educational article and organize it by subject.</p>
              <Button onClick={() => navigate("/admin/add-note")} className="rounded-xl px-6 bg-emerald-500 hover:bg-emerald-600 transition-colors">
                <Plus className="w-4 h-4 mr-2" /> Create First Note
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {organizedData.map(subject => (
              <AccordionItem key={subject.id} value={subject.id} className="border-0 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-2">
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-none">{subject.name}</h3>
                      <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                        {subject.totalNotes} {subject.totalNotes === 1 ? 'Article' : 'Articles'}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4 pt-0">
                  <div className="space-y-4 ml-2 border-l-2 border-emerald-50 pl-4 mt-2">
                    {subject.topics.map(topic => (
                      <div key={topic.id} className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-violet-500" />
                          <h4 className="font-bold text-gray-800 text-sm">{topic.name}</h4>
                        </div>
                        <div className="grid gap-2">
                          {topic.notes.map(note => (
                            <div key={note.id} className="group bg-gray-50/50 hover:bg-white border border-transparent hover:border-violet-100 hover:shadow-md hover:shadow-violet-500/5 p-3 rounded-xl transition-all flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-gray-100">
                                  <FileText className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                                </div>
                                <div className="min-w-0 flex items-center gap-2">
                                  <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                                    {note.title}
                                  </h3>
                                  {note.is_paid ? (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                                      PREMIUM
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border-green-200 shrink-0">
                                      FREE
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => navigate(`/admin/add-note?edit=${note.id}`)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(note)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {topic.notes.length === 0 && searchQuery !== "" && (
                            <p className="text-xs text-gray-400 italic py-1">No matching articles in this topic</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
      <DeleteAlertDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={confirmDelete}
        itemName={noteToDelete?.title}
        isDeleting={isDeleting}
      />
    </AdminLayout>
  );
};

export default NotesManagement;
