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
      .from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();

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
    <Button onClick={() => navigate("/admin/add-note")} size="icon" className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 border border-white/20 shadow-lg shadow-blue-500/20">
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
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total", value: notes.length, icon: NotebookPen, color: "from-blue-600 to-indigo-700" },
          { label: "Free", value: notes.filter(n => !n.is_paid).length, icon: BookOpen, color: "from-emerald-500 to-teal-600" },
          { label: "Premium", value: notes.filter(n => n.is_paid).length, icon: Layers, color: "from-amber-400 to-orange-500" },
        ].map((stat, i) => (
          <div key={i} className="relative group overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-gray-100/50 hover:shadow-lg transition-all duration-300">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-[0.04] group-hover:opacity-[0.08] rounded-full -mr-6 -mt-6 transition-all duration-500`} />
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-md`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 font-inter uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 font-manrope">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ DUAL-PANE LAYOUT ═══════ */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-[60vh]">

        {/* ── LEFT: Subject Navigator ── */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0">
          {/* Mobile: Dropdown Selector */}
          <div className="lg:hidden mb-4">
            <Select value={selectedSubjectId || ""} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="w-full h-12 rounded-2xl glass-input-premium font-inter font-semibold">
                <SelectValue placeholder="Select a Subject" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/60 bg-white/95 backdrop-blur-xl shadow-xl font-inter">
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      {s.name}
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-gray-100 text-gray-500 font-bold ml-1">
                        {getSubjectNoteCount(s.id)}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Full Subject Sidebar */}
          <div className="hidden lg:flex flex-col bg-white/60 backdrop-blur-md rounded-[1.5rem] border border-gray-100/50 shadow-sm overflow-hidden h-full max-h-[calc(100vh-280px)]">
            {/* Sidebar Header */}
            <div className="p-4 pb-3 border-b border-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em] font-inter">Subjects</h3>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {subjects.length}
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  className="w-full h-9 pl-9 pr-3 text-sm rounded-xl bg-gray-50/80 border border-gray-100 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-inter"
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Subject List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredSubjects.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-gray-400 font-inter">No subjects found</p>
                </div>
              ) : (
                filteredSubjects.map(subject => {
                  const isActive = subject.id === selectedSubjectId;
                  const noteCount = getSubjectNoteCount(subject.id);
                  return (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubjectId(subject.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group/sub ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        isActive 
                          ? "bg-white/20" 
                          : "bg-blue-50 group-hover/sub:bg-blue-100"
                      }`}>
                        <FolderOpen className={`w-4 h-4 ${isActive ? "text-white" : "text-blue-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate font-inter ${isActive ? "text-white" : ""}`}>
                          {subject.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isActive 
                            ? "bg-white/20 text-white" 
                            : "bg-gray-100 text-gray-400"
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
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center animate-premium-entry">
                <div className="w-20 h-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5">
                  <FolderOpen className="w-9 h-9 text-blue-500" />
                </div>
                <h3 className="font-bold text-gray-800 text-xl font-manrope mb-2">Select a Subject</h3>
                <p className="text-gray-400 font-inter text-sm max-w-xs mx-auto">Choose a subject from the left to view and manage its topics and notes.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-premium-entry" key={selectedSubjectId}>
              {/* Workspace Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <FolderOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 font-manrope leading-tight">{selectedSubject.name}</h2>
                    <p className="text-xs text-gray-400 font-inter">
                      {selectedSubjectTopics.length} {selectedSubjectTopics.length === 1 ? 'Topic' : 'Topics'} · {selectedSubjectNotes.length} {selectedSubjectNotes.length === 1 ? 'Article' : 'Articles'}
                    </p>
                  </div>
                </div>
                {/* Search notes in workspace */}
                <div className="relative hidden sm:block w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-inter"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Topics List */}
              {topicsWithNotes.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-7 h-7 text-gray-300" />
                    </div>
                    <h3 className="font-bold text-gray-600 font-manrope mb-1">No Topics Yet</h3>
                    <p className="text-gray-400 font-inter text-sm mb-5">This subject doesn't have any topics or notes.</p>
                    <Button onClick={() => navigate("/admin/add-note")} className="h-10 rounded-xl px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/20 transition-all font-inter font-semibold text-sm">
                      <Plus className="w-4 h-4 mr-1.5" /> Add Note
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {topicsWithNotes.map((topic, tIdx) => (
                    <div 
                      key={topic.id} 
                      className="bg-white rounded-2xl border border-gray-100/50 shadow-sm overflow-hidden hover:border-blue-200 transition-all animate-premium-entry"
                      style={{ animationDelay: `${tIdx * 0.08}s` }}
                    >
                      {/* Topic Header */}
                      <div className="group/topic flex items-center gap-3 px-5 py-3.5 bg-slate-50/50 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm font-manrope tracking-tight flex-1">{topic.name}</h4>
                        
                        {/* Quick Add Note Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/add-note?subject_id=${topic.subject_id}&topic_id=${topic.id}&topic_name=${encodeURIComponent(topic.name)}`);
                          }}
                          className="h-7 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg opacity-0 group-hover/topic:opacity-100 transition-all font-inter text-xs font-semibold mr-1"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add Note
                        </Button>

                        <Badge variant="secondary" className="bg-white text-gray-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-gray-100 transition-opacity group-hover/topic:opacity-0 sm:group-hover/topic:opacity-100">
                          {topic.notes.length} {topic.notes.length === 1 ? 'note' : 'notes'}
                        </Badge>
                      </div>

                      {/* Notes List */}
                      {topic.notes.length > 0 && (
                        <div className="divide-y divide-gray-50">
                          {topic.notes.map(note => (
                            <div key={note.id} className="flex items-center gap-3 px-5 py-3 group/note hover:bg-blue-50/30 transition-colors duration-200">
                              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover/note:border-blue-200 group-hover/note:bg-blue-50 transition-all">
                                <FileText className="w-4 h-4 text-slate-400 group-hover/note:text-blue-600 transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 font-inter text-sm group-hover/note:text-blue-700 transition-colors truncate">
                                  {note.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {note.is_paid ? (
                                    <span className="inline-flex items-center h-4 px-1.5 bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase tracking-tighter rounded">
                                      Premium
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center h-4 px-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black uppercase tracking-tighter rounded">
                                      Free
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-medium font-inter">
                                    {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-all">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                  onClick={() => navigate(`/admin/add-note?edit=${note.id}`)}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
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
