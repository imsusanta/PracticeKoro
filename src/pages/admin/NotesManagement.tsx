import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { NotebookPen, Plus, Trash2, Search, Edit, FolderOpen, BookOpen, FileText, ChevronRight, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
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
    const { data } = await supabase.from("subjects").select("id, name, exam_id, order_index").eq("category", "notes").order("order_index", { ascending: true, nullsFirst: false });
    if (data) {
      setSubjects(data);
      // Auto-select first subject if none selected
      if (!selectedSubjectId && data.length > 0) {
        setSelectedSubjectId(data[0].id);
      }
    }
  };

  const loadTopics = async () => {
    const { data } = await supabase.from("topics").select("id, subject_id, name, order_index").eq("category", "notes").order("order_index", { ascending: true, nullsFirst: false });
    if (data) setTopics(data);
  };

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from("pdfs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load notes.", variant: "destructive" });
      return;
    }

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

  // Get notes count per subject
  const getSubjectNoteCount = (subjectId: string) => notes.filter(n => n.subject_id === subjectId).length;

  // Filter subjects for the sidebar search
  const filteredSubjects = subjects.filter(s =>
    sidebarSearch === "" || s.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  // Get selected subject data
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedSubjectTopics = topics.filter(t => t.subject_id === selectedSubjectId);
  const selectedSubjectNotes = notes.filter(n => n.subject_id === selectedSubjectId);

  const topicsWithNotes = selectedSubjectTopics.map(topic => ({
    ...topic,
    notes: selectedSubjectNotes.filter(n => n.topic_id === topic.id &&
      (searchQuery === "" || n.title.toLowerCase().includes(searchQuery.toLowerCase())))
  }));

  const CreateButton = (
    <Button onClick={() => navigate("/admin/add-note")} size="icon" className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 text-white">
      <Plus className="w-5 h-5" />
    </Button>
  );

  if (loading) {
    return (
      <AdminLayout title="Notes Management" subtitle="Manage study notes by subject & topic">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Notes Management" subtitle="Manage study notes by subject & topic" headerActions={CreateButton}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <NotebookPen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Study Notes & PDF Vault</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Create and organize chapter-wise notes and downloadable PDFs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
              {notes.length} Total Notes
            </Badge>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-50/70 to-indigo-50/30 border border-blue-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Notes</span>
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                <NotebookPen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{notes.length}</p>
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Across all subjects</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-emerald-50/90 to-teal-50/40 border border-emerald-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Free Access</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">{notes.filter(n => !n.is_paid).length}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Available for all students</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-50/70 to-orange-50/30 border border-amber-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Premium Notes</span>
              <div className="w-8 h-8 rounded-xl bg-amber-600/10 text-amber-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">{notes.filter(n => n.is_paid).length}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Pro Pass exclusive</p>
          </div>
        </div>

        {/* ═══════ DUAL-PANE LAYOUT ═══════ */}
        <div className="flex flex-col lg:flex-row gap-5 min-h-[60vh]">

          {/* ── LEFT: Subject Navigator ── */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0">
            {/* Mobile: Dropdown Selector */}
            <div className="lg:hidden mb-4">
              <Select value={selectedSubjectId || ""} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="w-full h-11 rounded-2xl bg-white border-slate-200/90 font-bold text-slate-800 text-sm shadow-2xs">
                  <SelectValue placeholder="Select a Subject" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 shadow-lg">
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2 font-medium">
                        {s.name}
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-slate-100 text-slate-600 font-bold ml-1 rounded-full">
                          {getSubjectNoteCount(s.id)}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: Full Subject Sidebar */}
            <div className="hidden lg:flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden h-full max-h-[calc(100vh-280px)]">
              {/* Sidebar Header */}
              <div className="p-4 pb-3 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Subjects</h3>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                    {subjects.length}
                  </Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    className="w-full h-10 pl-9 pr-3 text-xs rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-medium shadow-2xs"
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Subject List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                {filteredSubjects.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <p className="text-sm text-slate-400 font-medium">No subjects found</p>
                  </div>
                ) : (
                  filteredSubjects.map(subject => {
                    const isActive = subject.id === selectedSubjectId;
                    const noteCount = getSubjectNoteCount(subject.id);
                    return (
                      <button
                        key={subject.id}
                        onClick={() => setSelectedSubjectId(subject.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group/sub ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isActive 
                            ? "bg-white/20 text-white" 
                            : "bg-blue-50 text-blue-600 group-hover/sub:bg-blue-100"
                        }`}>
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-bold truncate ${isActive ? "text-white" : "text-slate-900"}`}>
                            {subject.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isActive 
                              ? "bg-white/20 text-white" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {noteCount}
                          </span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Topic Workspace ── */}
          <div className="flex-1 min-w-0">
            {!selectedSubject ? (
              /* No subject selected empty state */
              <div className="flex items-center justify-center h-full min-h-[400px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-slate-900 text-lg mb-1">Select a Subject</h3>
                  <p className="text-slate-500 text-xs max-w-xs mx-auto">Choose a subject from the left to view and manage its topics and notes.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4" key={selectedSubjectId}>
                {/* Workspace Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">{selectedSubject.name}</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {selectedSubjectTopics.length} {selectedSubjectTopics.length === 1 ? 'Topic' : 'Topics'} · {selectedSubjectNotes.length} {selectedSubjectNotes.length === 1 ? 'Article' : 'Articles'}
                      </p>
                    </div>
                  </div>
                  {/* Search notes in workspace */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search notes..."
                      className="w-full h-10 pl-10 pr-3 text-xs rounded-2xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-medium shadow-2xs"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Topics List */}
                {topicsWithNotes.length === 0 ? (
                  <div className="flex items-center justify-center py-16 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <h3 className="font-black text-slate-900 text-base mb-1">No Topics Yet</h3>
                      <p className="text-slate-500 text-xs mb-5">This subject doesn't have any topics or notes.</p>
                      <Button onClick={() => navigate("/admin/add-note")} className="h-10 rounded-2xl px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20">
                        <Plus className="w-4 h-4 mr-1.5" /> Add Note
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topicsWithNotes.map((topic, tIdx) => (
                      <div 
                        key={topic.id} 
                        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        {/* Topic Header */}
                        <div className="group/topic flex items-center gap-3 px-5 py-3.5 bg-slate-50/70 border-b border-slate-100">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <h4 className="font-black text-slate-900 text-sm tracking-tight flex-1">{topic.name}</h4>
                          
                          {/* Quick Add Note Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/add-note?subject_id=${topic.subject_id}&topic_id=${topic.id}&topic_name=${encodeURIComponent(topic.name)}`);
                            }}
                            className="h-8 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all text-xs font-bold mr-1"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add Note
                          </Button>

                          <Badge variant="secondary" className="bg-white text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200/80">
                            {topic.notes.length} {topic.notes.length === 1 ? 'note' : 'notes'}
                          </Badge>
                        </div>

                        {/* Notes List */}
                        {topic.notes.length > 0 && (
                          <div className="divide-y divide-slate-100">
                            {topic.notes.map(note => (
                              <div key={note.id} className="flex items-center gap-3 px-5 py-3.5 group/note hover:bg-slate-50/70 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/80 group-hover/note:border-blue-200 group-hover/note:bg-blue-50 transition-all text-slate-400 group-hover/note:text-blue-600">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-900 text-sm group-hover/note:text-blue-600 transition-colors truncate">
                                    {note.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {note.is_paid ? (
                                      <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 text-[9px] font-black uppercase tracking-wider rounded-full">
                                        Premium
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-black uppercase tracking-wider rounded-full">
                                        Free
                                      </span>
                                    )}
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    onClick={() => navigate(`/admin/add-note?edit=${note.id}`)}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                    onClick={() => handleDelete(note)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
