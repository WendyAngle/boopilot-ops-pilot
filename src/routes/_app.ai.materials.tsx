import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Search,
  RotateCcw,
  Upload,
  Sparkles,
  Tag as TagIcon,
  Pencil,
  Trash2,
  Eye,
  Image as ImageIcon,
  Video as VideoIcon,
  Music2,
  FileStack,
  CheckCircle2,
  Check,
  X,
  Play,
  Pause,
  Volume2,
  Layers,
  ScanSearch,
  Loader2,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
  HelpCircle,
  ArrowUpDown,
  Link2,
  Target,
} from "lucide-react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { StatCard } from "@/components/stat-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import {
  type Asset,
  type AssetType,
  type Purpose,
  PURPOSE_LABEL,
  PURPOSE_BY_TYPE,
  MODULE_LABEL,
  inferPurpose,
  useMaterialsStore,
  addAssets,
  updateAsset,
  deleteAssets,
} from "@/lib/materials-store";

export const Route = createFileRoute("/_app/ai/materials")({
  component: MyMaterialsPage,
  head: () => ({ meta: [{ title: "我的原料 — BooPilot" }] }),
});

const SAMPLE_IMG = (seed: string) =>
  `https://picsum.photos/seed/${seed}/640/480`;


// 「智能去重」演示分组：完全重复（同 hash）与高相似（感知哈希近似）
const DEDUPE_MOCK_GROUPS: Array<{
  key: string;
  reason: "exact" | "similar";
  similarity: number;
  fingerprint: string;
  memberIds: string[];
}> = [
  {
    key: "dup-h1",
    reason: "exact",
    similarity: 100,
    fingerprint: "sha256:1a2b…h1",
    memberIds: ["a1", "a9", "a10"],
  },
  {
    key: "dup-h2",
    reason: "exact",
    similarity: 100,
    fingerprint: "sha256:9f0c…h2",
    memberIds: ["a2", "a11"],
  },
  {
    key: "dup-h3",
    reason: "exact",
    similarity: 100,
    fingerprint: "sha256:7d31…h3",
    memberIds: ["a3", "a12"],
  },
  {
    key: "sim-h5",
    reason: "similar",
    similarity: 92,
    fingerprint: "phash:e4a1…h5",
    memberIds: ["a5", "a13", "a14"],
  },
];

const TYPE_META: Record<AssetType, { label: string; icon: typeof ImageIcon; tint: string }> = {
  image: { label: "图片", icon: ImageIcon, tint: "text-sky-600 bg-sky-100 dark:bg-sky-500/15" },
  video: { label: "视频", icon: VideoIcon, tint: "text-violet-600 bg-violet-100 dark:bg-violet-500/15" },
  audio: { label: "音频", icon: Music2, tint: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15" },
};

type FilterType = "all" | AssetType;

function inferTypeFromFile(file: File): AssetType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "audio";
}

function MyMaterialsPage() {
  const assets = useMaterialsStore();
  const [keyword, setKeyword] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterPurposes, setFilterPurposes] = useState<Purpose[]>([]);
  const [filterTime, setFilterTime] = useState<"all" | "7d" | "30d">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState<"new" | "old" | "type" | "size">("new");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [tagBulkOpen, setTagBulkOpen] = useState(false);
  const [dedupeOpen, setDedupeOpen] = useState(false);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const base = assets.filter((a) => {
      if (filterType !== "all" && a.type !== filterType) return false;
      if (filterTags.length > 0 && !filterTags.every((t) => a.tags.includes(t))) return false;
      if (filterPurposes.length > 0 && !filterPurposes.some((p) => a.purpose.includes(p))) return false;
      if (filterTime !== "all") {
        const diff = now - new Date(a.uploadedAt.replace(" ", "T")).getTime();
        const limit = filterTime === "7d" ? 7 * dayMs : 30 * dayMs;
        if (isFinite(diff) && diff > limit) return false;
      }
      if (!kw) return true;
      return (
        a.name.toLowerCase().includes(kw) ||
        a.description.toLowerCase().includes(kw) ||
        a.tags.some((t) => t.toLowerCase().includes(kw))
      );
    });
    const sorted = [...base];
    if (sortMode === "new") sorted.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
    else if (sortMode === "old") sorted.sort((a, b) => (a.uploadedAt > b.uploadedAt ? 1 : -1));
    else if (sortMode === "type") sorted.sort((a, b) => a.type.localeCompare(b.type));
    else if (sortMode === "size") sorted.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
    return sorted;
  }, [assets, keyword, filterType, filterTags, filterPurposes, filterTime, sortMode]);

  const tagPool = useMemo(() => {
    const s = new Set<string>();
    assets.forEach((a) => a.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [assets]);

  // 当前 type 对应的可选用途（all 时合并所有）
  const purposeOptions = useMemo<Purpose[]>(() => {
    if (filterType === "all") {
      return Array.from(new Set((["audio", "image", "video"] as AssetType[]).flatMap((t) => PURPOSE_BY_TYPE[t])));
    }
    return PURPOSE_BY_TYPE[filterType];
  }, [filterType]);

  const hasActiveFilter =
    keyword.trim() !== "" ||
    filterType !== "all" ||
    filterTags.length > 0 ||
    filterPurposes.length > 0 ||
    filterTime !== "all";

  const counts = useMemo(() => {
    return {
      total: assets.length,
      image: assets.filter((a) => a.type === "image").length,
      video: assets.filter((a) => a.type === "video").length,
      audio: assets.filter((a) => a.type === "audio").length,
    };
  }, [assets]);

  // 统计区指标
  const overview = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let newThisMonth = 0;
    let usedCount = 0;
    let totalBytes = 0;
    assets.forEach((a) => {
      const t = new Date(a.uploadedAt.replace(" ", "T"));
      if (!isNaN(t.getTime()) && t.getFullYear() === y && t.getMonth() === m) newThisMonth += 1;
      if ((a.usedBy?.length ?? 0) > 0) usedCount += 1;
      const match = /([\d.]+)\s*(KB|MB|GB|TB)/i.exec(a.size);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        const factor =
          unit === "KB" ? 1024 :
          unit === "MB" ? 1024 ** 2 :
          unit === "GB" ? 1024 ** 3 :
          1024 ** 4;
        totalBytes += num * factor;
      }
    });
    const formatBytes = (b: number) => {
      if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
      if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
      if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
      return `${b} B`;
    };
    return {
      total: assets.length,
      newThisMonth,
      usedCount,
      storage: formatBytes(totalBytes),
    };
  }, [assets]);


  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selected);
      filtered.forEach((a) => next.delete(a.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((a) => next.add(a.id));
      setSelected(next);
    }
  };

  const handleReset = () => {
    setKeyword("");
    setFilterType("all");
    setFilterTags([]);
    setFilterPurposes([]);
    setFilterTime("all");
  };

  // 切换 type 时，清掉与新 type 不相容的用途选项
  const handleChangeType = (t: FilterType) => {
    setFilterType(t);
    if (t !== "all") {
      const allowed = new Set(PURPOSE_BY_TYPE[t]);
      setFilterPurposes((prev) => prev.filter((p) => allowed.has(p)));
    }
  };

  // 被选中且有引用关系的素材汇总
  const selectedAssets = useMemo(
    () => assets.filter((a) => selected.has(a.id)),
    [assets, selected],
  );
  const selectedReferencedCount = selectedAssets.reduce((n, a) => n + (a.usedBy.length > 0 ? 1 : 0), 0);

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    deleteAssets(ids);
    toast.success(`已删除 ${ids.length} 个素材`);
    setSelected(new Set());
    setBulkDeleteOpen(false);
  };

  const clearSelection = () => setSelected(new Set());

  const handleUploadDone = (newAssets: Asset[]) => {
    addAssets(newAssets);
    setUploadOpen(false);
    toast.success(`已上传 ${newAssets.length} 个素材，已自动分类`);
  };

  const handleEditSave = (next: Asset) => {
    updateAsset(next.id, next);
    setEditAsset(null);
    toast.success("已保存修改");
  };

  const handleBulkTags = (tags: string[], mode: "replace" | "append") => {
    selectedAssets.forEach((a) => {
      if (mode === "replace") updateAsset(a.id, { tags });
      else updateAsset(a.id, { tags: Array.from(new Set([...a.tags, ...tags])) });
    });
    setTagBulkOpen(false);
    toast.success(`已为 ${selected.size} 个素材${mode === "replace" ? "替换" : "新增"}标签`);
  };

  const handleDedupe = (keepIds: string[], removeIds: string[]) => {
    deleteAssets(removeIds);
    setSelected((prev) => {
      const next = new Set(prev);
      removeIds.forEach((id) => next.delete(id));
      return next;
    });
    setDedupeOpen(false);
    toast.success(`已去重，保留 ${keepIds.length} 个，移除 ${removeIds.length} 个`);
  };

  const handleDelete = (id: string) => {
    deleteAssets([id]);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDeleteAsset(null);
    toast.success("已删除素材");
  };


  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-5 pb-24">
      {/* A. 页头 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">我的原料</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          集中管理您上传的图片、视频与音频素材，可被 AI 创作流程直接调用。
        </p>
      </div>



      {/* B. 卡片统计区 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="资产总数" value={overview.total} icon={FileStack} tone="primary" />
        <StatCard
          title="图片 / 视频 / 音频"
          value={`${counts.image} / ${counts.video} / ${counts.audio}`}
          icon={Layers}
          tone="violet"
        />
        <StatCard title="本月新增" value={overview.newThisMonth} icon={Upload} tone="success" />
        <StatCard title="已被引用" value={overview.usedCount} icon={Link2} tone="warning" />
      </div>


      {/* C. 筛选区 */}
      <div className="space-y-2">
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索名称、描述或标签"
                className="h-9 pl-9 pr-8"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="清除搜索"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 标签筛选 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <TagIcon className="h-3.5 w-3.5" />
                  标签
                  {filterTags.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {filterTags.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-medium">按标签筛选</span>
                  {filterTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTags([])}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      清空
                    </button>
                  )}
                </div>
                <div className="flex max-h-56 flex-wrap gap-1.5 overflow-auto p-1">
                  {tagPool.length === 0 && (
                    <span className="text-xs text-muted-foreground">暂无标签</span>
                  )}
                  {tagPool.map((t) => {
                    const on = filterTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setFilterTags((prev) =>
                            prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                          )
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] transition",
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-background hover:bg-muted",
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* 用途筛选 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  用途
                  {filterPurposes.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {filterPurposes.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-medium">按用途筛选</span>
                  {filterPurposes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterPurposes([])}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      清空
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 p-1">
                  {purposeOptions.map((p) => {
                    const on = filterPurposes.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setFilterPurposes((prev) =>
                            prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
                          )
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] transition",
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-background hover:bg-muted",
                        )}
                      >
                        {PURPOSE_LABEL[p]}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* 时间筛选 */}
            <Select value={filterTime} onValueChange={(v) => setFilterTime(v as typeof filterTime)}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="7d">近 7 天</SelectItem>
                <SelectItem value="30d">近 30 天</SelectItem>
              </SelectContent>
            </Select>

            {/* 排序 */}
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
              <SelectTrigger className="h-9 w-[130px] gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">最新上传</SelectItem>
                <SelectItem value="old">最早上传</SelectItem>
                <SelectItem value="type">按类型</SelectItem>
                <SelectItem value="size">按大小</SelectItem>
              </SelectContent>
            </Select>


            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className={cn(
                "h-9 gap-1.5",
                !hasActiveFilter && "pointer-events-none opacity-40",
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" /> 重置
            </Button>

            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="全选当前列表"
              />
              <span className="tabular-nums">
                {selected.size > 0 ? (
                  <>
                    已选 <span className="font-medium text-foreground">{selected.size}</span> / {filtered.length}
                  </>
                ) : (
                  <>共 {filtered.length} 个</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* C2. 选中态提示条 */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-xs text-muted-foreground">
              已选中 <span className="font-medium text-foreground tabular-nums">{selected.size}</span> 个素材，使用上方功能区按钮进行批量操作
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 px-2 text-xs text-muted-foreground"
              onClick={clearSelection}
            >
              取消选择
            </Button>
          </div>
        )}

      </div>

      {/* C. 功能操作区 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setUploadOpen(true)} className="h-9 gap-1.5">
            <Upload className="h-4 w-4" />
            批量上传
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={selected.size === 0}
            onClick={() => setTagBulkOpen(true)}
          >
            <TagIcon className="h-4 w-4" />
            修改标签
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setDedupeOpen(true)}
          >
            <ScanSearch className="h-4 w-4" />
            智能去重
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:text-muted-foreground"
            disabled={selected.size === 0}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            批量删除
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex h-9 items-center rounded-md border border-border/60 bg-background p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded",
                    viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>网格视图</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded",
                    viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>列表视图</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => toast.success("已刷新")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>刷新</TooltipContent>
          </Tooltip>
        </div>
      </div>



      {/* D. 内容区 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-16 text-center">
          <FileStack className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {hasActiveFilter ? "未找到匹配的素材，试试调整筛选条件" : "素材库还是空的，去上传第一个素材吧"}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {hasActiveFilter && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                清空筛选
              </Button>
            )}
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              立即上传
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              selected={selected.has(asset.id)}
              onToggleSelect={() => toggleSelect(asset.id)}
              onPreview={() => setPreviewAsset(asset)}
              onEdit={() => setEditAsset(asset)}
              onDelete={() => setDeleteAsset(asset)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="grid grid-cols-[40px_64px_1fr_80px_120px_1fr_140px_120px] items-center gap-3 border-b border-border/60 bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span></span>
            <span></span>
            <span>名称</span>
            <span>类型</span>
            <span>大小 / 时长</span>
            <span>标签</span>
            <span>上传时间</span>
            <span className="text-right">操作</span>
          </div>
          {filtered.map((asset) => (
            <AssetListRow
              key={asset.id}
              asset={asset}
              selected={selected.has(asset.id)}
              onToggleSelect={() => toggleSelect(asset.id)}
              onPreview={() => setPreviewAsset(asset)}
              onEdit={() => setEditAsset(asset)}
              onDelete={() => setDeleteAsset(asset)}
            />
          ))}
        </div>
      )}




      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onDone={handleUploadDone}
      />

      <PreviewDialog
        asset={previewAsset}
        onOpenChange={(v) => !v && setPreviewAsset(null)}
      />

      <EditDialog
        asset={editAsset}
        onOpenChange={(v) => !v && setEditAsset(null)}
        onSave={handleEditSave}
      />

      <BulkTagsDialog
        open={tagBulkOpen}
        count={selected.size}
        onOpenChange={setTagBulkOpen}
        onSubmit={handleBulkTags}
      />

      <DedupeDialog
        open={dedupeOpen}
        onOpenChange={setDedupeOpen}
        assets={assets}
        onConfirm={handleDedupe}
      />

      <DeleteAssetDialog
        asset={deleteAsset}
        onCancel={() => setDeleteAsset(null)}
        onConfirm={(id) => handleDelete(id)}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量删除 {selected.size} 个素材？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedReferencedCount > 0 ? (
                <>
                  其中 <b className="text-destructive">{selectedReferencedCount}</b> 个素材已被创作记录引用。
                  删除后，相关创作记录将无法重新生成或回放。该操作不可恢复。
                </>
              ) : (
                <>删除后不可恢复，请谨慎操作。</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}

// ----- TypeSeg (segmented control) -----
function TypeSeg({
  active,
  onClick,
  icon: Icon,
  label,
  value,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ImageIcon;
  label: string;
  value: number;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {dot ? (
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
      <span className={cn("tabular-nums font-semibold", active ? "text-foreground" : "text-muted-foreground")}>
        {value}
      </span>
    </button>
  );
}

// ----- Asset Card -----
function AssetCard({
  asset,
  selected,
  onToggleSelect,
  onPreview,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  selected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[asset.type];
  const TypeIcon = meta.icon;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-md",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border/60",
      )}
    >
      <div
        className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-muted"
        onClick={onPreview}
      >
        {asset.type === "image" || asset.type === "video" ? (
          <img
            src={asset.thumb ?? SAMPLE_IMG(asset.id)}
            alt={asset.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/40 dark:to-teal-900/30">
            <div className="flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-300">
              <Volume2 className="h-10 w-10" />
              <AudioWave />
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Checkbox: 仅 hover 或选中态显示 */}
        <div
          className={cn(
            "absolute left-2 top-2 z-10 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border border-white/60 bg-white/80 backdrop-blur transition",
              selected && "border-primary bg-primary text-primary-foreground",
            )}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              className="h-4 w-4 border-none data-[state=checked]:bg-transparent data-[state=checked]:text-current"
            />
          </div>
        </div>

        {/* 选中角标 */}
        {selected && (
          <span className="absolute right-2 top-2 z-10 flex h-5 items-center gap-1 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground shadow">
            <Check className="h-3 w-3" />
          </span>
        )}

        {/* 被引用徽标 */}
        {asset.usedBy.length > 0 && !selected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="absolute right-2 top-2 z-10 flex h-5 items-center gap-1 rounded-full bg-amber-500/95 px-1.5 text-[10px] font-medium text-white shadow"
                onClick={(e) => e.stopPropagation()}
              >
                <Link2 className="h-3 w-3" />
                {asset.usedBy.length}
              </span>
            </TooltipTrigger>
            <TooltipContent>已被 {asset.usedBy.length} 条创作记录引用</TooltipContent>
          </Tooltip>
        )}

        {/* 类型 badge：移至左下角避免与角标冲突 */}
        <Badge
          className={cn(
            "absolute bottom-2 left-2 h-5 gap-1 border-0 px-1.5 py-0 text-[10px] font-medium shadow-sm",
            meta.tint,
          )}
        >
          <TypeIcon className="h-3 w-3" />
          {meta.label}
        </Badge>

        {asset.duration && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {asset.duration}
          </span>
        )}

        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md hover:bg-white"
          >
            {asset.type === "audio" ? (
              <>
                <Play className="h-3.5 w-3.5" /> 试听
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> 预览
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1.5 p-3">
        <div
          className="line-clamp-1 cursor-pointer text-sm font-medium hover:text-primary"
          title={asset.name}
          onClick={onPreview}
        >
          {asset.name}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {asset.purpose.slice(0, 2).map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="h-4 gap-0.5 border-primary/30 bg-primary/5 px-1.5 py-0 text-[10px] font-normal text-primary"
              >
                <Target className="h-2.5 w-2.5" />
                {PURPOSE_LABEL[p]}
              </Badge>
            ))}
            {asset.purpose.length > 2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-[10px] text-muted-foreground">
                    +{asset.purpose.length - 2}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {asset.purpose.slice(2).map((p) => PURPOSE_LABEL[p]).join("、")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <span className="shrink-0">{asset.size}</span>
        </div>

        {asset.tags.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            {asset.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="h-4 px-1.5 py-0 text-[10px] font-normal">
                {t}
              </Badge>
            ))}
            {asset.tags.length > 3 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-[10px] text-muted-foreground">
                    +{asset.tags.length - 3}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{asset.tags.slice(3).join("、")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-1.5">
          <span className="text-[11px] text-muted-foreground">{asset.uploadedAt.slice(0, 10)}</span>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPreview}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>预览</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>编辑信息</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Asset List Row -----
function AssetListRow({
  asset,
  selected,
  onToggleSelect,
  onPreview,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  selected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[asset.type];
  const TypeIcon = meta.icon;
  return (
    <div
      className={cn(
        "grid grid-cols-[40px_64px_1fr_80px_120px_1fr_140px_120px] items-center gap-3 border-b border-border/60 px-3 py-2 text-sm transition hover:bg-muted/40 last:border-b-0",
        selected && "bg-primary/5",
      )}
    >
      <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="选择该素材" />
      <button
        type="button"
        onClick={onPreview}
        className="relative h-12 w-16 overflow-hidden rounded-md bg-muted"
      >
        {asset.type === "audio" ? (
          <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
            <Volume2 className="h-5 w-5" />
          </div>
        ) : (
          <img
            src={asset.thumb ?? SAMPLE_IMG(asset.id)}
            alt={asset.name}
            className="h-full w-full object-cover"
          />
        )}
      </button>
      <button
        type="button"
        onClick={onPreview}
        className="line-clamp-1 text-left font-medium hover:text-primary"
        title={asset.name}
      >
        {asset.name}
      </button>
      <Badge className={cn("h-5 w-fit gap-1 border-0 px-1.5 py-0 text-[10px]", meta.tint)}>
        <TypeIcon className="h-3 w-3" />
        {meta.label}
      </Badge>
      <div className="text-xs text-muted-foreground">
        {asset.size}
        {asset.duration && <span className="ml-1">· {asset.duration}</span>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {asset.tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="secondary" className="h-4 px-1.5 py-0 text-[10px] font-normal">
            {t}
          </Badge>
        ))}
        {asset.tags.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{asset.tags.length - 3}</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{asset.uploadedAt}</span>
      <div className="flex items-center justify-end gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPreview}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>预览</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>编辑</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>删除</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function AudioWave() {
  return (
    <div className="flex h-6 items-end gap-0.5">
      {[8, 14, 20, 12, 22, 10, 18, 14, 8].map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-emerald-500/70 dark:bg-emerald-400/70"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

// ----- Upload Dialog -----
type PendingUpload = {
  id: string;
  file: File;
  type: AssetType;
  previewUrl: string;
  progress: number;
  status: "uploading" | "done" | "duplicate";
  suggestedTags: string[];
  description: string;
};

function UploadDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: (assets: Asset[]) => void;
}) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => setPending([]);

  const startMockUpload = (items: PendingUpload[]) => {
    items.forEach((item) => {
      const tick = () => {
        setPending((prev) =>
          prev.map((p) => {
            if (p.id !== item.id) return p;
            const next = Math.min(100, p.progress + 10 + Math.random() * 20);
            const status: PendingUpload["status"] =
              next >= 100 ? (Math.random() < 0.15 ? "duplicate" : "done") : "uploading";
            return { ...p, progress: next, status };
          }),
        );
      };
      const interval = setInterval(() => {
        tick();
      }, 350);
      setTimeout(() => clearInterval(interval), 3500);
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: PendingUpload[] = Array.from(files).map((file, i) => {
      const type = inferTypeFromFile(file);
      // auto-suggest tags from filename
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const suggested = baseName
        .split(/[\s_\-—,，]+/)
        .filter((t) => t.length >= 2 && t.length <= 8)
        .slice(0, 3);
      return {
        id: `u-${Date.now()}-${i}`,
        file,
        type,
        previewUrl:
          type === "image" ? URL.createObjectURL(file) : SAMPLE_IMG(`upl-${i}`),
        progress: 5,
        status: "uploading",
        suggestedTags: suggested.length ? suggested : [TYPE_META[type].label],
        description: "",
      };
    });
    setPending((prev) => [...prev, ...items]);
    startMockUpload(items);
  };

  const removePending = (id: string) =>
    setPending((prev) => prev.filter((p) => p.id !== id));

  const handleConfirm = () => {
    const finalAssets: Asset[] = pending
      .filter((p) => p.status !== "duplicate")
      .map((p) => {
        const name = p.file.name;
        return {
          id: `a-${p.id}`,
          name,
          type: p.type,
          purpose: inferPurpose(p.type, name, p.suggestedTags),
          url: p.previewUrl,
          thumb: p.type === "audio" ? undefined : p.previewUrl,
          size: `${(p.file.size / 1024 / 1024).toFixed(1)} MB`,
          duration: p.type === "audio" ? "00:30" : p.type === "video" ? "00:20" : undefined,
          tags: p.suggestedTags,
          description: p.description || `自动分类：${TYPE_META[p.type].label}`,
          uploadedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
          hash: p.id,
          usedBy: [],
        };
      });
    if (finalAssets.length === 0) {
      toast.error("没有可入库的素材");
      return;
    }
    onDone(finalAssets);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> 批量上传素材
          </DialogTitle>
          <DialogDescription>
            支持图片、视频、音频。上传完成后系统将
            <span className="mx-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" /> 自动分类
            </span>
            并基于文件名智能推荐标签。
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-xl border-2 border-dashed border-border/70 bg-muted/30 p-8 text-center transition hover:bg-muted/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm">
            拖拽文件到此处，或
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ml-1 font-medium text-primary hover:underline"
            >
              点击选择文件
            </button>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            单个文件最大 200MB，可同时选择多个
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {pending.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {pending.map((p) => {
              const meta = TYPE_META[p.type];
              const TypeIcon = meta.icon;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {p.type === "image" ? (
                      <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <TypeIcon className={cn("h-5 w-5", meta.tint.split(" ")[0])} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="line-clamp-1 text-sm font-medium">{p.file.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {meta.label}
                      </Badge>
                      {p.status === "done" && (
                        <Badge className="gap-1 border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> 完成
                        </Badge>
                      )}
                      {p.status === "duplicate" && (
                        <Badge variant="destructive" className="gap-1">
                          <ScanSearch className="h-3 w-3" /> 疑似重复
                        </Badge>
                      )}
                      {p.status === "uploading" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={p.progress} className="h-1.5" />
                      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                        {Math.round(p.progress)}%
                      </span>
                    </div>
                    {p.suggestedTags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">推荐标签：</span>
                        {p.suggestedTags.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removePending(p.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={pending.length === 0}>
            确认入库（{pending.filter((p) => p.status !== "duplicate").length}）
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Preview Dialog -----
function PreviewDialog({
  asset,
  onOpenChange,
}: {
  asset: Asset | null;
  onOpenChange: (v: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play();
      setPlaying(true);
    }
  };

  return (
    <Dialog open={!!asset} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="line-clamp-1">{asset?.name}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {asset?.description}
          </DialogDescription>
        </DialogHeader>
        {asset && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl bg-muted">
              {asset.type === "image" && (
                <img src={asset.url} alt={asset.name} className="w-full object-contain" />
              )}
              {asset.type === "video" && (
                <video src={asset.url} controls className="h-full w-full" />
              )}
              {asset.type === "audio" && (
                <div className="flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-50 to-teal-100 p-12 dark:from-emerald-950/40 dark:to-teal-900/30">
                  <button
                    onClick={togglePlay}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
                  >
                    {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 pl-1" />}
                  </button>
                  <AudioWave />
                  <audio
                    ref={audioRef}
                    src={asset.url}
                    onEnded={() => setPlaying(false)}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{TYPE_META[asset.type].label}</Badge>
              <span>{asset.size}</span>
              {asset.duration && <span>· 时长 {asset.duration}</span>}
              <span>· 上传于 {asset.uploadedAt}</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-muted-foreground">用途</div>
              <div className="flex flex-wrap gap-1">
                {asset.purpose.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">未分类</span>
                ) : (
                  asset.purpose.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="gap-1 border-primary/30 bg-primary/5 text-primary"
                    >
                      <Target className="h-3 w-3" />
                      {PURPOSE_LABEL[p]}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            {asset.tags.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground">标签</div>
                <div className="flex flex-wrap gap-1">
                  {asset.tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Link2 className="h-3 w-3" />
                引用情况
                <Badge variant="outline" className="h-4 px-1 py-0 text-[10px] font-normal">
                  {asset.usedBy.length}
                </Badge>
              </div>
              {asset.usedBy.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                  暂未被任何创作记录引用
                </div>
              ) : (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1.5">
                  {asset.usedBy.map((r) => (
                    <div
                      key={r.refId}
                      className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/60"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Badge variant="outline" className="h-4 shrink-0 px-1 py-0 text-[10px]">
                          {MODULE_LABEL[r.module]}
                        </Badge>
                        <span className="line-clamp-1 text-foreground">{r.refTitle}</span>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{r.usedAt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----- Edit Dialog -----
function EditDialog({
  asset,
  onOpenChange,
  onSave,
}: {
  asset: Asset | null;
  onOpenChange: (v: boolean) => void;
  onSave: (asset: Asset) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [purpose, setPurpose] = useState<Purpose[]>([]);

  // Initialize when asset changes
  const lastIdRef = useRef<string | null>(null);
  if (asset && asset.id !== lastIdRef.current) {
    lastIdRef.current = asset.id;
    setName(asset.name);
    setDescription(asset.description);
    setTags(asset.tags);
    setPurpose(asset.purpose);
  }

  const purposeChoices = asset ? PURPOSE_BY_TYPE[asset.type] : [];

  return (
    <Dialog open={!!asset} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> 编辑素材
          </DialogTitle>
          <DialogDescription>修改文件名称、用途、描述以及标签</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>文件名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              用途
              <span className="text-[11px] font-normal text-muted-foreground">（决定该素材在创作页中可被哪些选择器看到，可多选）</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {purposeChoices.map((p) => {
                const on = purpose.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setPurpose((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition",
                      on
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-background hover:bg-muted",
                    )}
                  >
                    {PURPOSE_LABEL[p]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>标签</Label>
            <TagMultiSelect value={tags} onChange={setTags} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (!asset) return;
              if (!name.trim()) {
                toast.error("文件名称不能为空");
                return;
              }
              if (purpose.length === 0) {
                toast.error("请至少选择一项用途");
                return;
              }
              onSave({ ...asset, name: name.trim(), description, tags, purpose });
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Bulk Tags Dialog -----
function BulkTagsDialog({
  open,
  count,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  count: number;
  onOpenChange: (v: boolean) => void;
  onSubmit: (tags: string[], mode: "replace" | "append") => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [mode, setMode] = useState<"replace" | "append">("append");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setTags([]);
          setMode("append");
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="h-4 w-4" /> 批量修改标签
          </DialogTitle>
          <DialogDescription>
            将对已选中的 <b>{count}</b> 个素材生效
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>标签</Label>
            <TagMultiSelect value={tags} onChange={setTags} />
          </div>
          <div className="space-y-2">
            <Label>应用方式</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "replace" | "append")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="append">追加到现有标签</SelectItem>
                <SelectItem value="replace">替换现有标签</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onSubmit(tags, mode)} disabled={tags.length === 0}>
            确认应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Dedupe Dialog -----
function DedupeDialog({
  open,
  onOpenChange,
  assets,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assets: Asset[];
  onConfirm: (keepIds: string[], removeIds: string[]) => void;
}) {
  // 基于 mock 指纹分组，再叠加任何运行时上传中标记为重复的素材（按 hash 聚合）
  const groups = useMemo(() => {
    if (!open) return [] as {
      key: string;
      reason: "exact" | "similar";
      similarity: number;
      fingerprint: string;
      items: Asset[];
    }[];
    const byId = new Map(assets.map((a) => [a.id, a]));
    const seeded = DEDUPE_MOCK_GROUPS.map((g) => ({
      key: g.key,
      reason: g.reason,
      similarity: g.similarity,
      fingerprint: g.fingerprint,
      items: g.memberIds.map((id) => byId.get(id)).filter(Boolean) as Asset[],
    })).filter((g) => g.items.length > 1);

    // 再补充：用户运行时上传后产生的、与已有素材 hash 完全一致的新条目
    const seenIds = new Set(seeded.flatMap((g) => g.items.map((i) => i.id)));
    const byHash = new Map<string, Asset[]>();
    assets.forEach((a) => {
      if (seenIds.has(a.id)) return;
      if (!byHash.has(a.hash)) byHash.set(a.hash, []);
      byHash.get(a.hash)!.push(a);
    });
    const runtime = Array.from(byHash.entries())
      .filter(([, v]) => v.length > 1)
      .map(([h, items]) => ({
        key: `rt-${h}`,
        reason: "exact" as const,
        similarity: 100,
        fingerprint: `sha256:${h}`,
        items,
      }));
    return [...seeded, ...runtime];
  }, [open, assets]);

  const [keep, setKeep] = useState<Record<string, string>>({});

  const initKeep = () => {
    const next: Record<string, string> = {};
    groups.forEach((g) => {
      next[g.key] = g.items[0].id;
    });
    setKeep(next);
  };

  // initialize on open
  const lastOpenRef = useRef(false);
  if (open && !lastOpenRef.current) {
    lastOpenRef.current = true;
    initKeep();
  } else if (!open && lastOpenRef.current) {
    lastOpenRef.current = false;
  }

  const handleConfirm = () => {
    const keepIds: string[] = [];
    const removeIds: string[] = [];
    groups.forEach((g) => {
      const kid = keep[g.key];
      g.items.forEach((i) => {
        if (i.id === kid) keepIds.push(i.id);
        else removeIds.push(i.id);
      });
    });
    if (removeIds.length === 0) {
      toast.info("未发现可去重的素材");
      onOpenChange(false);
      return;
    }
    onConfirm(keepIds, removeIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4" /> 智能去重
          </DialogTitle>
          <DialogDescription>
            系统已根据文件指纹（类型 + 大小 + 内容哈希）扫描出疑似重复的素材，请为每组选择需要保留的版本。
          </DialogDescription>
        </DialogHeader>
        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-10 text-center">
            <Layers className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">未发现重复素材</p>
          </div>
        ) : (
          <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
            {groups.map((g) => (
              <div key={g.key} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[11px]",
                        g.reason === "exact"
                          ? "bg-destructive/10 text-destructive border border-destructive/30"
                          : "bg-warning/10 text-warning border border-warning/30",
                      )}
                      variant="outline"
                    >
                      {g.reason === "exact" ? "完全重复" : "高度相似"} · {g.similarity}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {g.items.length} 个素材
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/80">
                      {g.fingerprint}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    保留 1 个，移除 {g.items.length - 1} 个
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {g.items.map((it) => {
                    const isKept = keep[g.key] === it.id;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => setKeep((p) => ({ ...p, [g.key]: it.id }))}
                        className={cn(
                          "group relative overflow-hidden rounded-md border-2 text-left transition",
                          isKept
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/60 opacity-70 hover:opacity-100",
                        )}
                      >
                        <div className="aspect-[4/3] bg-muted">
                          {it.type !== "audio" ? (
                            <img
                              src={it.thumb ?? SAMPLE_IMG(it.id)}
                              alt={it.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-emerald-600">
                              <Music2 className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="line-clamp-1 text-[12px] font-medium">{it.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {it.uploadedAt.slice(0, 10)} · {it.size}
                          </div>
                        </div>
                        {isKept && (
                          <span className="absolute right-1 top-1 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow">
                            <CheckCircle2 className="h-3 w-3" /> 保留
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={groups.length === 0}>
            确认去重
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Delete Asset Dialog (含「被引用情况」展示) -----
function DeleteAssetDialog({
  asset,
  onCancel,
  onConfirm,
}: {
  asset: Asset | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const lastIdRef = useRef<string | null>(null);
  if (asset && asset.id !== lastIdRef.current) {
    lastIdRef.current = asset.id;
    setConfirmText("");
  } else if (!asset && lastIdRef.current) {
    lastIdRef.current = null;
  }

  const refs = asset?.usedBy ?? [];
  const requireName = refs.length > 0;
  const canDelete = !requireName || confirmText.trim() === asset?.name;

  return (
    <AlertDialog open={!!asset} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" /> 确认删除该素材？
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {asset && (
                <div className="rounded-md border border-border/60 bg-muted/40 p-2.5 text-xs">
                  <div className="font-medium text-foreground line-clamp-1">{asset.name}</div>
                  <div className="mt-0.5 text-muted-foreground">
                    {asset.size}
                    {asset.duration ? ` · ${asset.duration}` : ""} · {asset.uploadedAt}
                  </div>
                </div>
              )}
              {refs.length === 0 ? (
                <p className="text-sm text-muted-foreground">删除后无法恢复，且素材将无法再被引用。</p>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <Link2 className="h-3.5 w-3.5" />
                    该素材正在被 <b>{refs.length}</b> 条创作记录引用，删除后这些记录将无法回放或重新生成。
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
                    {refs.map((r) => (
                      <div
                        key={r.refId}
                        className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/60"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Badge variant="outline" className="h-4 shrink-0 px-1 py-0 text-[10px]">
                            {MODULE_LABEL[r.module]}
                          </Badge>
                          <span className="line-clamp-1 text-foreground">{r.refTitle}</span>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{r.usedAt.slice(0, 10)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      请输入素材名称 <b className="font-mono text-foreground">{asset?.name}</b> 以确认删除
                    </Label>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="输入完整文件名"
                      className="h-9"
                    />
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            onClick={() => asset && onConfirm(asset.id)}
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
