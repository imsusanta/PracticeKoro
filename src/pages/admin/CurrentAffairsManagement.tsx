import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Sparkles,
  Calendar,
  Clock,
  Tag,
  BookOpen,
  Filter,
  CheckCircle2,
  X,
  PlusCircle,
  Loader2
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
import { motion, AnimatePresence } from "framer-motion";
import {
  CurrentAffairsArticle,
  CurrentAffairsCategory,
  CURRENT_AFFAIRS_CATEGORIES,
  INITIAL_CURRENT_AFFAIRS,
  fetchCurrentAffairs,
  saveCurrentAffairs
} from "@/services/currentAffairsService";

export default function CurrentAffairsManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [articles, setArticles] = useState<CurrentAffairsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [onlyImportant, setOnlyImportant] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  // Form Fields
  const [category, setCategory] = useState<CurrentAffairsCategory>("National");
  const [dateStr, setDateStr] = useState("");
  const [readTime, setReadTime] = useState("3 min read");
  const [titleBn, setTitleBn] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [summaryBn, setSummaryBn] = useState("");
  const [bulletPoints, setBulletPoints] = useState<string[]>([]);
  const [newBulletInput, setNewBulletInput] = useState("");
  const [examRelevance, setExamRelevance] = useState("");
  const [isImportant, setIsImportant] = useState(false);

  // Delete State
  const [articleToDelete, setArticleToDelete] = useState<CurrentAffairsArticle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset confirmation dialog
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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
        toast({
          title: "Access Denied",
          description: "Admin privileges required to access Current Affairs Management.",
          variant: "destructive"
        });
        navigate("/admin/login");
        return;
      }

      await loadArticles();
    } catch (err) {
      console.error("Auth check failed:", err);
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    const data = await fetchCurrentAffairs();
    setArticles(data);
  };

  const handleOpenCreateModal = () => {
    setEditingArticleId(null);
    setCategory("National");
    const today = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    setDateStr(today);
    setReadTime("4 min read");
    setTitleBn("");
    setTitleEn("");
    setSummaryBn("");
    setBulletPoints([
      "পরীক্ষার জন্য গুরুত্বপূর্ণ পয়েন্ট ১",
      "পরীক্ষার জন্য গুরুত্বপূর্ণ পয়েন্ট ২"
    ]);
    setNewBulletInput("");
    setExamRelevance("WBCS, WBP, SSC CGL, Rail Group D");
    setIsImportant(false);
    setIsDialogOpen(true);
  };

  const handleOpenEditModal = (article: CurrentAffairsArticle) => {
    setEditingArticleId(article.id);
    setCategory(article.category);
    setDateStr(article.date);
    setReadTime(article.readTime);
    setTitleBn(article.titleBn);
    setTitleEn(article.titleEn);
    setSummaryBn(article.summaryBn);
    setBulletPoints(article.bulletPoints || []);
    setNewBulletInput("");
    setExamRelevance(article.examRelevance || "");
    setIsImportant(!!article.isImportant);
    setIsDialogOpen(true);
  };

  const handleAddBulletPoint = () => {
    if (!newBulletInput.trim()) return;
    setBulletPoints(prev => [...prev, newBulletInput.trim()]);
    setNewBulletInput("");
  };

  const handleRemoveBulletPoint = (index: number) => {
    setBulletPoints(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titleBn.trim() || !titleEn.trim() || !summaryBn.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in Bengali title, English title, and summary.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      let updatedArticles: CurrentAffairsArticle[];

      if (editingArticleId) {
        // Edit existing
        updatedArticles = articles.map(item => {
          if (item.id === editingArticleId) {
            return {
              ...item,
              category,
              date: dateStr.trim() || "Today",
              readTime: readTime.trim() || "3 min read",
              titleBn: titleBn.trim(),
              titleEn: titleEn.trim(),
              summaryBn: summaryBn.trim(),
              bulletPoints: bulletPoints.length > 0 ? bulletPoints : [summaryBn.trim()],
              examRelevance: examRelevance.trim() || "WBCS, WBP, SSC",
              isImportant
            };
          }
          return item;
        });
        toast({ title: "Updated!", description: "Current Affairs article updated successfully." });
      } else {
        // Create new
        const newArticle: CurrentAffairsArticle = {
          id: `ca-${Date.now()}`,
          category,
          date: dateStr.trim() || "Today",
          readTime: readTime.trim() || "3 min read",
          titleBn: titleBn.trim(),
          titleEn: titleEn.trim(),
          summaryBn: summaryBn.trim(),
          bulletPoints: bulletPoints.length > 0 ? bulletPoints : [summaryBn.trim()],
          examRelevance: examRelevance.trim() || "WBCS, WBP, SSC",
          isImportant
        };
        updatedArticles = [newArticle, ...articles];
        toast({ title: "Created!", description: "New Current Affairs article published." });
      }

      setArticles(updatedArticles);
      await saveCurrentAffairs(updatedArticles);
      setIsDialogOpen(false);
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
        toast({
          title: nextState ? "Marked as High-Yield ⭐" : "Unmarked from High-Yield",
          description: item.titleEn
        });
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
    } catch (err) {
      console.error("Delete failed:", err);
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
    toast({
      title: "Reset Complete",
      description: "Default exam-focused current affairs sample set restored."
    });
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

  const stats = useMemo(() => {
    const total = articles.length;
    const highYield = articles.filter(a => a.isImportant).length;
    const categoriesCount = new Set(articles.map(a => a.category)).size;
    const latestDate = articles[0]?.date || "None";
    return { total, highYield, categoriesCount, latestDate };
  }, [articles]);

  const getCategoryColor = (cat: CurrentAffairsCategory) => {
    switch (cat) {
      case "West Bengal":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "National":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "International":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Economy":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Science & Tech":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Sports":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <AdminLayout
      title="Current Affairs Management"
      subtitle="Create, edit, and organize daily & exam-oriented Current Affairs"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open("/student/current-affairs", "_blank")}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5 font-semibold text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Student View</span>
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Article</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Articles</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 font-display">{stats.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Published items</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">High-Yield</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600 mt-2 font-display">{stats.highYield}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Starred for quick revision</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Categories</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 font-display">{stats.categoriesCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active subject areas</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Latest Release</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base font-bold text-slate-800 mt-2 truncate">{stats.latestDate}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Recent edition</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search Bengali/English title, summary, exam tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] rounded-xl border-slate-200 text-xs font-semibold">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="All">All Categories</SelectItem>
                  {CURRENT_AFFAIRS_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={onlyImportant ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyImportant(prev => !prev)}
                className={`rounded-xl text-xs gap-1 font-semibold ${
                  onlyImportant ? "bg-amber-500 hover:bg-amber-600 text-white" : "border-slate-200 text-slate-700"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${onlyImportant ? "fill-white" : ""}`} />
                <span>High-Yield</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsResetConfirmOpen(true)}
                className="rounded-xl text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 gap-1"
                title="Restore default sample articles"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </Button>
            </div>
          </div>

          {/* Active filter pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["All", ...CURRENT_AFFAIRS_CATEGORIES].map(cat => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Articles List */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading current affairs articles...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Globe className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Articles Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery || selectedCategory !== "All" || onlyImportant
                ? "Try adjusting your search terms or filters to find what you're looking for."
                : "No current affairs items published yet. Click below to add your first article!"}
            </p>
            <Button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
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
                className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getCategoryColor(
                          article.category
                        )}`}
                      >
                        {article.category}
                      </span>
                      {article.isImportant && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> High-Yield
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {article.date}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {article.readTime}
                      </span>
                    </div>

                    {/* Bengali Title */}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug font-bengali">
                      {article.titleBn}
                    </h3>

                    {/* English Title */}
                    <p className="text-xs font-semibold text-slate-600">
                      {article.titleEn}
                    </p>

                    {/* Bengali Summary */}
                    <p className="text-xs text-slate-600 leading-relaxed font-bengali">
                      {article.summaryBn}
                    </p>

                    {/* Bullet Points */}
                    {article.bulletPoints && article.bulletPoints.length > 0 && (
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5 mt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Key Takeaways:</p>
                        <ul className="space-y-1">
                          {article.bulletPoints.map((pt, idx) => (
                            <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5 font-bengali">
                              <span className="text-blue-500 font-bold">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Exam Relevance Tag */}
                    {article.examRelevance && (
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-600">Target Exams:</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {article.examRelevance}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleImportance(article.id)}
                      className={`h-8 px-2 rounded-xl text-xs ${
                        article.isImportant ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-amber-500"
                      }`}
                      title={article.isImportant ? "Unmark High-Yield" : "Mark as High-Yield"}
                    >
                      <Star className={`w-4 h-4 ${article.isImportant ? "fill-amber-400" : ""}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditModal(article)}
                      className="h-8 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setArticleToDelete(article)}
                      className="h-8 px-2 rounded-xl text-rose-500 hover:bg-rose-50 text-xs"
                      title="Delete Article"
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

      {/* Add / Edit Article Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 font-display">
              {editingArticleId ? "Edit Current Affairs Article" : "Create Current Affairs Article"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide exam-focused concise news, Bengali headlines, and key takeaways.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveArticle} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Category *</Label>
                <Select
                  value={category}
                  onValueChange={(val: CurrentAffairsCategory) => setCategory(val)}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CURRENT_AFFAIRS_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Date Display *</Label>
                <Input
                  value={dateStr}
                  onChange={e => setDateStr(e.target.value)}
                  placeholder="e.g. 16 September 2025"
                  className="rounded-xl border-slate-200 text-xs"
                />
              </div>

              {/* Read Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Read Time *</Label>
                <Input
                  value={readTime}
                  onChange={e => setReadTime(e.target.value)}
                  placeholder="e.g. 4 min read"
                  className="rounded-xl border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Bengali Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Bengali Title (বাংলা শিরোনাম) *
              </Label>
              <Input
                value={titleBn}
                onChange={e => setTitleBn(e.target.value)}
                placeholder="যেমন: দেশের নতুন মুখ্য নির্বাচন কমিশনার হিসেবে দায়িত্ব গ্রহণ"
                className="rounded-xl border-slate-200 text-xs font-bengali"
                required
              />
            </div>

            {/* English Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                English Subtitle / Title *
              </Label>
              <Input
                value={titleEn}
                onChange={e => setTitleEn(e.target.value)}
                placeholder="e.g. Appointment of New Chief Election Commissioner of India"
                className="rounded-xl border-slate-200 text-xs"
                required
              />
            </div>

            {/* Bengali Summary */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Summary (বাংলা সংক্ষেপ) *
              </Label>
              <Textarea
                rows={3}
                value={summaryBn}
                onChange={e => setSummaryBn(e.target.value)}
                placeholder="সংক্ষিপ্ত বিশ্লেষণ যা পরীক্ষার্থীদের দ্রুত বুঝতে সাহায্য করবে..."
                className="rounded-xl border-slate-200 text-xs font-bengali"
                required
              />
            </div>

            {/* Bullet Points Builder */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">
                Key Exam Points (পরীক্ষার জন্য গুরুত্বপূর্ণ পয়েন্ট)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newBulletInput}
                  onChange={e => setNewBulletInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBulletPoint();
                    }
                  }}
                  placeholder="নতুন পয়েন্ট লিখুন এবং Enter অথবা Add চাপুন..."
                  className="rounded-xl border-slate-200 text-xs font-bengali"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBulletPoint}
                  className="rounded-xl border-slate-200 text-xs font-bold shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>

              {bulletPoints.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  {bulletPoints.map((point, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200/60 text-xs"
                    >
                      <span className="font-bengali text-slate-800 flex-1">{point}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBulletPoint(index)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exam Relevance */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Target Exams</Label>
              <Input
                value={examRelevance}
                onChange={e => setExamRelevance(e.target.value)}
                placeholder="e.g. WBCS, WBP Constable, KP, Rail Group D, SSC CGL"
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>

            {/* Important Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200/80">
              <div>
                <p className="text-xs font-bold text-amber-900">Mark as High-Yield (Most Important)</p>
                <p className="text-[11px] text-amber-700">Displays a highlighted badge and star for students</p>
              </div>
              <Switch checked={isImportant} onCheckedChange={setIsImportant} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl border-slate-200 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : editingArticleId ? (
                  "Save Changes"
                ) : (
                  "Publish Article"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <DeleteAlertDialog
        open={!!articleToDelete}
        onOpenChange={open => !open && setArticleToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Current Affairs Article"
        description={`Are you sure you want to delete "${articleToDelete?.titleEn}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Restore Sample Current Affairs?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This will replace current articles with the default curated set of exam-oriented current affairs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleResetToDefault}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              Confirm Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
