import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Plus,
  Trash2,
  Edit,
  Search,
  Star,
  ExternalLink,
  RotateCcw,
  Calendar,
  Clock,
  Tag,
  Filter,
  X,
  Loader2,
  Send,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { motion } from "framer-motion";
import {
  CurrentAffairsArticle,
  CurrentAffairsCategory,
  CURRENT_AFFAIRS_CATEGORIES,
  INITIAL_CURRENT_AFFAIRS,
  fetchCurrentAffairs,
  saveCurrentAffairs
} from "@/services/currentAffairsService";

// Auto-generate today's date string
function getTodayStr() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Auto-calculate read time from text length
function calcReadTime(summary: string, bullets: string): string {
  const totalWords = (summary + " " + bullets).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(2, Math.ceil(totalWords / 120));
  return `${mins} min read`;
}

const EMPTY_FORM = {
  category: "National" as CurrentAffairsCategory,
  titleBn: "",
  titleEn: "",
  summaryBn: "",
  bulletPointsText: "", // one per line
  examRelevance: "WBCS, WBP, SSC, Rail Group D",
  isImportant: false,
};

export default function CurrentAffairsManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [articles, setArticles] = useState<CurrentAffairsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [onlyImportant, setOnlyImportant] = useState(false);

  // Inline form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Delete & Reset state
  const [articleToDelete, setArticleToDelete] = useState<CurrentAffairsArticle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Auth check on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "super_admin"])
        .maybeSingle();

      if (!roleData) {
        toast({ title: "Access Denied", description: "Admin privileges required.", variant: "destructive" });
        navigate("/admin/login");
        return;
      }

      const data = await fetchCurrentAffairs();
      setArticles(data);
    } catch (err) {
      console.error("Auth check failed:", err);
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  // Update a single form field
  const updateForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Open form for new article
  const handleNewArticle = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  // Open form for editing
  const handleEditArticle = (article: CurrentAffairsArticle) => {
    setForm({
      category: article.category,
      titleBn: article.titleBn,
      titleEn: article.titleEn,
      summaryBn: article.summaryBn,
      bulletPointsText: (article.bulletPoints || []).join("\n"),
      examRelevance: article.examRelevance || "WBCS, WBP, SSC",
      isImportant: !!article.isImportant,
    });
    setEditingId(article.id);
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  // Save / Publish
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titleBn.trim() || !form.titleEn.trim() || !form.summaryBn.trim()) {
      toast({ title: "Fill required fields", description: "Bengali title, English title, and summary are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const bulletPoints = form.bulletPointsText
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

      const dateStr = getTodayStr();
      const readTime = calcReadTime(form.summaryBn, form.bulletPointsText);

      let updatedArticles: CurrentAffairsArticle[];

      if (editingId) {
        updatedArticles = articles.map(item => {
          if (item.id === editingId) {
            return {
              ...item,
              category: form.category,
              date: item.date, // keep original date for edits
              readTime,
              titleBn: form.titleBn.trim(),
              titleEn: form.titleEn.trim(),
              summaryBn: form.summaryBn.trim(),
              bulletPoints: bulletPoints.length > 0 ? bulletPoints : [form.summaryBn.trim()],
              examRelevance: form.examRelevance.trim() || "WBCS, WBP, SSC",
              isImportant: form.isImportant,
            };
          }
          return item;
        });
        toast({ title: "Updated!", description: "Article updated successfully." });
      } else {
        const newArticle: CurrentAffairsArticle = {
          id: `ca-${Date.now()}`,
          category: form.category,
          date: dateStr,
          readTime,
          titleBn: form.titleBn.trim(),
          titleEn: form.titleEn.trim(),
          summaryBn: form.summaryBn.trim(),
          bulletPoints: bulletPoints.length > 0 ? bulletPoints : [form.summaryBn.trim()],
          examRelevance: form.examRelevance.trim() || "WBCS, WBP, SSC",
          isImportant: form.isImportant,
        };
        updatedArticles = [newArticle, ...articles];
        toast({ title: "Published!", description: "New article is now live for students." });
      }

      setArticles(updatedArticles);
      await saveCurrentAffairs(updatedArticles);

      // Reset form
      setForm(EMPTY_FORM);
      setEditingId(null);
      setFormOpen(false);
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Save Failed", description: "Could not save article.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleImportance = async (id: string) => {
    const updated = articles.map(item => {
      if (item.id === id) {
        const nextState = !item.isImportant;
        toast({ title: nextState ? "Marked ⭐ High-Yield" : "Unmarked", description: item.titleEn });
        return { ...item, isImportant: nextState };
      }
      return item;
    });
    setArticles(updated);
    await saveCurrentAffairs(updated);
  };

  const confirmDelete = async () => {
    if (!articleToDelete) return;
    setIsDeleting(true);
    try {
      const updated = articles.filter(item => item.id !== articleToDelete.id);
      setArticles(updated);
      await saveCurrentAffairs(updated);
      toast({ title: "Deleted", description: "Article removed." });
    } catch {
      toast({ title: "Delete Failed", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setArticleToDelete(null);
    }
  };

  const handleResetToDefault = async () => {
    setArticles(INITIAL_CURRENT_AFFAIRS);
    await saveCurrentAffairs(INITIAL_CURRENT_AFFAIRS);
    setIsResetConfirmOpen(false);
    toast({ title: "Reset Complete", description: "Default sample articles restored." });
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(item => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesImportant = onlyImportant ? item.isImportant : true;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.titleBn.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.summaryBn.toLowerCase().includes(q) ||
        item.examRelevance.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesImportant && matchesQuery;
    });
  }, [articles, selectedCategory, onlyImportant, searchQuery]);

  const stats = useMemo(() => ({
    total: articles.length,
    highYield: articles.filter(a => a.isImportant).length,
    categoriesCount: new Set(articles.map(a => a.category)).size,
    latestDate: articles[0]?.date || "None",
  }), [articles]);

  const getCategoryColor = (cat: CurrentAffairsCategory) => {
    switch (cat) {
      case "West Bengal": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "National": return "bg-blue-50 text-blue-700 border-blue-200";
      case "International": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Economy": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Science & Tech": return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Sports": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <AdminLayout
      title="Current Affairs"
      subtitle="Publish daily exam-focused current affairs"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open("/student/current-affairs", "_blank")}
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5 font-bold text-xs h-10 px-3.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Student View</span>
          </Button>
          <Button
            size="sm"
            onClick={handleNewArticle}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-blue-500/20 gap-1.5 text-xs h-10 px-4"
          >
            <Plus className="w-4 h-4" />
            <span>Add Article</span>
          </Button>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ═══════════════ QUICK ADD / EDIT INLINE FORM ═══════════════ */}
        <div ref={formRef}>
          <button
            type="button"
            onClick={() => { if (!formOpen) handleNewArticle(); else { setFormOpen(false); setEditingId(null); } }}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">
                  {formOpen ? (editingId ? "✏️ Editing Article" : "📝 New Article") : "📝 Quick Add Current Affairs"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formOpen ? "Fill the form below and hit Publish" : "Click to open the form"}
                </p>
              </div>
            </div>
            {formOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {formOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-t-0 border-slate-200/90 rounded-b-2xl p-5 space-y-4 shadow-xs"
              >
                {/* Row 1: Titles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">English Title *</Label>
                    <Input
                      value={form.titleEn}
                      onChange={e => updateForm("titleEn", e.target.value)}
                      placeholder="e.g. New Chief Election Commissioner Appointed"
                      className="rounded-xl border-slate-200 text-sm h-11"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Bengali Title (বাংলা শিরোনাম) *</Label>
                    <Input
                      value={form.titleBn}
                      onChange={e => updateForm("titleBn", e.target.value)}
                      placeholder="যেমন: নতুন মুখ্য নির্বাচন কমিশনার নিযুক্ত"
                      className="rounded-xl border-slate-200 text-sm h-11 font-bengali"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Category + Exam Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(val: CurrentAffairsCategory) => updateForm("category", val)}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 text-sm h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {CURRENT_AFFAIRS_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Target Exams</Label>
                    <Input
                      value={form.examRelevance}
                      onChange={e => updateForm("examRelevance", e.target.value)}
                      placeholder="WBCS, WBP, SSC CGL, Rail Group D"
                      className="rounded-xl border-slate-200 text-sm h-11"
                    />
                  </div>
                </div>

                {/* Row 3: Summary */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Summary (বাংলা সংক্ষেপ) *</Label>
                  <Textarea
                    rows={3}
                    value={form.summaryBn}
                    onChange={e => updateForm("summaryBn", e.target.value)}
                    placeholder="সংক্ষিপ্ত বিশ্লেষণ লিখুন যা পরীক্ষার্থীদের দ্রুত বুঝতে সাহায্য করবে..."
                    className="rounded-xl border-slate-200 text-sm font-bengali"
                    required
                  />
                </div>

                {/* Row 4: Bullet Points (textarea, one per line) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Key Exam Points — one per line (পরীক্ষার পয়েন্ট)
                  </Label>
                  <Textarea
                    rows={4}
                    value={form.bulletPointsText}
                    onChange={e => updateForm("bulletPointsText", e.target.value)}
                    placeholder={"পরীক্ষার জন্য গুরুত্বপূর্ণ পয়েন্ট ১\nপরীক্ষার জন্য গুরুত্বপূর্ণ পয়েন্ট ২\nপরীক্ষার জন্য গুরুত্বপূর্ণ পয়েন্ট ৩"}
                    className="rounded-xl border-slate-200 text-sm font-bengali"
                  />
                  <p className="text-[10px] text-slate-400">Each line becomes a separate bullet point for students</p>
                </div>

                {/* Row 5: Important toggle + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
                    <Switch checked={form.isImportant} onCheckedChange={val => updateForm("isImportant", val)} />
                    <div>
                      <p className="text-xs font-bold text-amber-900">⭐ High-Yield (Most Important)</p>
                      <p className="text-[10px] text-amber-700">Shows highlighted badge for students</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); }}
                      className="rounded-xl border-slate-200 text-xs font-bold h-11 px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 h-11 px-6 gap-1.5"
                    >
                      {saving ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                      ) : editingId ? (
                        <><Edit className="w-3.5 h-3.5" /> Save Changes</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Publish Article</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Auto-filled info */}
                <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Date: {getTodayStr()} (auto)</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Read time: {calcReadTime(form.summaryBn, form.bulletPointsText)} (auto)</span>
                </div>
              </form>
            </motion.div>
          )}
        </div>

        {/* ═══════════════ STATS CARDS ═══════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/70 to-indigo-50/30 border border-blue-100/80 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/70 to-orange-50/30 border border-amber-100/80 shadow-xs">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">High-Yield</span>
            <p className="text-2xl font-black text-amber-700 mt-1">{stats.highYield}</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-50/70 to-violet-50/30 border border-purple-100/80 shadow-xs">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Categories</span>
            <p className="text-2xl font-black text-purple-700 mt-1">{stats.categoriesCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/90 to-teal-50/40 border border-emerald-200/90 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Latest</span>
            <p className="text-sm font-black text-emerald-800 mt-1 truncate">{stats.latestDate}</p>
          </div>
        </div>

        {/* ═══════════════ SEARCH & FILTER ═══════════════ */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-2xl border-slate-200/90 text-sm"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={onlyImportant ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyImportant(prev => !prev)}
                className={`h-11 rounded-2xl text-xs gap-1.5 font-bold ${
                  onlyImportant ? "bg-amber-500 hover:bg-amber-600 text-white" : "border-slate-200 text-slate-700"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${onlyImportant ? "fill-white" : "text-amber-500"}`} />
                High-Yield
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsResetConfirmOpen(true)}
                className="h-11 rounded-2xl text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 gap-1 font-bold"
                title="Restore default sample articles"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </Button>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["All", ...CURRENT_AFFAIRS_CATEGORIES].map(cat => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    active ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ ARTICLES LIST ═══════════════ */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading articles...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Globe className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Articles Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery || selectedCategory !== "All" || onlyImportant
                ? "Try adjusting your search or filters."
                : "No articles yet. Click above to add your first one!"}
            </p>
            <Button
              onClick={handleNewArticle}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl px-5 h-11"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add New Article
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map(article => (
              <motion.div
                key={article.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all ${
                  editingId === article.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200/90 hover:border-blue-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getCategoryColor(article.category)}`}>
                        {article.category}
                      </span>
                      {article.isImportant && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> High-Yield
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {article.date}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {article.readTime}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 leading-snug font-bengali">{article.titleBn}</h3>
                    <p className="text-xs font-bold text-slate-500">{article.titleEn}</p>
                    <p className="text-xs text-slate-600 leading-relaxed font-bengali line-clamp-2">{article.summaryBn}</p>

                    {article.examRelevance && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-bold text-slate-600">Exams:</span>
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 bg-blue-50/50 text-blue-700 border-blue-200 text-[11px] font-bold">
                          {article.examRelevance}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleImportance(article.id)}
                      className={`h-9 px-2.5 rounded-xl text-xs font-bold ${
                        article.isImportant ? "text-amber-500 bg-amber-50/80 hover:bg-amber-100/80" : "text-slate-400 hover:text-amber-500 hover:bg-slate-100"
                      }`}
                    >
                      <Star className={`w-4 h-4 ${article.isImportant ? "fill-amber-400" : ""}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditArticle(article)}
                      className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setArticleToDelete(article)}
                      className="h-9 px-2.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <DeleteAlertDialog
        isOpen={!!articleToDelete}
        onClose={() => setArticleToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Current Affairs Article"
        description={`Are you sure you want to delete "${articleToDelete?.titleEn}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />

      {/* Reset Confirmation */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Restore Sample Articles?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This will replace current articles with the default sample set.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsResetConfirmOpen(false)} className="rounded-xl text-xs">Cancel</Button>
            <Button variant="default" size="sm" onClick={handleResetToDefault} className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
              Confirm Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
