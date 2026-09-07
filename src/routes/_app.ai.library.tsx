import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  RotateCcw,
  RefreshCw,
  Tag as TagIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Send,
  Save,
  Download,
  Eye,
  Sparkles,
  Layers,
  CheckCircle2,
  Play,
  LayoutGrid,
  Rows3,
  ArrowUpDown,
  HelpCircle,
  MoreHorizontal,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/pagination-bar";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";
import {
  CreatePostTaskDialog,
  type Platform,
  type PostItem,
} from "@/routes/_app.materials.posts";

export const Route = createFileRoute("/_app/ai/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "AI 成片库 — BooPilot" },
      { name: "description", content: "集中管理 AI 生成的图片与视频成片。" },
    ],
  }),
});

/* ============================================================ */
/* 类型 & Mock                                                  */
/* ============================================================ */

type LibrarySource =
  | "text2image"
  | "image2image"
  | "text2video"
  | "image2video"
  | "replicate"
  | "remix"
  | "image_erase"
  | "video_erase";

const SOURCE_META: Record<
  LibrarySource,
  { label: string; type: "image" | "video"; tone: string }
> = {
  text2image: { label: "文生图", type: "image", tone: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  image2image: { label: "图生图", type: "image", tone: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  text2video: { label: "文生视频", type: "video", tone: "bg-violet-500/10 text-violet-600 border-violet-500/30" },
  image2video: { label: "图生视频", type: "video", tone: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30" },
  replicate: { label: "爆款复刻", type: "video", tone: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  remix: { label: "视频混剪", type: "video", tone: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  image_erase: { label: "图片内容消除", type: "image", tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  video_erase: { label: "视频内容消除", type: "video", tone: "bg-teal-500/10 text-teal-600 border-teal-500/30" },
};

type LibraryType = "image" | "video";

export interface LibraryItem {
  id: string;
  name: string;
  description: string;
  sellingPoints: string;
  source: LibrarySource;
  type: LibraryType;
  url: string;
  cover?: string;
  createdAt: string;
  tags: string[];
  hasPostTask: boolean;
  postPublished: boolean;
  savedToMaterials: boolean;
}

const SAMPLE_VIDEO = "https://www.w3schools.com/html/mov_bbb.mp4";
const IMG = (seed: number) => `https://picsum.photos/seed/ailib-${seed}/720/900`;

const NAMES = [
  "夏季新品-清凉冰感系列主图",
  "618 大促氛围海报",
  "TikTok 跟拍挑战短片",
  "海外品牌故事 30s",
  "美妆爆款种草视频",
  "智能小家电场景演示",
  "潮玩 IP 形象动态展示",
  "母婴用品柔光特写",
  "户外露营生活方式片",
  "运动鞋慢动作特写",
  "美食探店开箱片",
  "数码新品发布预告",
  "节日礼盒开箱图",
  "宠物粮温馨场景",
  "厨房好物使用教程",
  "极简家居氛围海报",
];

const DESCS = [
  "高饱和蓝白主色,突出冰感与清凉氛围。",
  "红金搭配,呈现节日大促氛围,文案突出折扣力度。",
  "竖版 9:16,卡点剪辑,适合 TikTok / Reels 投流。",
  "海外真人出镜,英文叙事,品牌故事调性。",
  "近景特写产品质感,搭配口播种草文案。",
  "厨房场景使用演示,展现产品智能化亮点。",
  "Q 萌 IP 多机位旋转展示,可作开箱前贴片。",
  "柔光摄影,凸显婴幼儿用品的安全与舒适感。",
  "户外山野场景,品牌生活方式植入自然。",
  "240fps 慢动作,突出鞋款缓震科技。",
  "美食探店剪辑,口播 + 食物特写交替。",
  "新品预告,神秘黑金配色与倒计时元素。",
  "节日限定礼盒开箱图,礼品质感拉满。",
  "宠物家庭温馨场景,情感氛围铺垫。",
  "三步上手教程,黄金 6 秒抓眼球。",
  "极简日系家居氛围,留白舒适。",
];

const SELLING = [
  "冰感面料 · 持久清凉 · 6 色可选",
  "全场 5 折 · 满 199 减 30 · 12 期免息",
  "卡点剪辑 · 海外热门 BGM · 高完播率",
  "品牌出海 · 真人讲述 · 海外信任背书",
  "明星同款 · 持妆 12h · 敏感肌可用",
  "一键智能 · 静音设计 · 节能 30%",
  "联名限定 · 全球首发 · 收藏价值",
  "0 添加 · 食品级材质 · 妈妈放心",
  "防水 IPX7 · 续航 24h · 露营必备",
  "缓震科技 · 轻量 280g · 跑鞋首选",
  "城市探店 · 真实测评 · 美食榜单",
  "首发预约 · 限量赠品 · 错过等一年",
  "节日限定 · 高级礼盒 · 送礼有面",
  "天然食材 · 宠物友好 · 适口性强",
  "三步上手 · 厨房神器 · 解放双手",
  "日系极简 · 自然光感 · 高级氛围",
];

const TAG_POOL = [
  "出海",
  "TikTok",
  "618",
  "夏季",
  "种草",
  "短视频",
  "图文",
  "美妆",
  "家居",
  "运动",
  "美食",
  "节日",
];

const SOURCES: LibrarySource[] = [
  "text2image",
  "image2image",
  "text2video",
  "image2video",
  "replicate",
  "remix",
  "image_erase",
  "video_erase",
];

export function seedLibrary(): LibraryItem[] {
  const rows: LibraryItem[] = [];
  for (let i = 0; i < 16; i++) {
    const source = SOURCES[i % SOURCES.length];
    const type = SOURCE_META[source].type;
    const isVideo = type === "video";
    rows.push({
      id: `ai-${i + 1}`,
      name: NAMES[i % NAMES.length],
      description: DESCS[i % DESCS.length],
      sellingPoints: SELLING[i % SELLING.length],
      source,
      type,
      url: isVideo ? SAMPLE_VIDEO : IMG(i + 1),
      cover: isVideo ? IMG(i + 100) : undefined,
      createdAt: `2026-06-${String(((i * 2) % 11) + 1).padStart(2, "0")} ${String(
        9 + (i % 9),
      ).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
      tags:
        i % 4 === 0
          ? []
          : Array.from(
              { length: (i % 3) + 1 },
              (_, k) => TAG_POOL[(i + k * 3) % TAG_POOL.length],
            ),
      hasPostTask: i % 5 === 0,
      postPublished: i % 7 === 0,
      savedToMaterials: i % 4 === 0,
    });
  }
  return rows;
}

/* ============================================================ */
/* 主页面                                                        */
/* ============================================================ */

type SortMode = "newest" | "oldest" | "type";
type SaveFilter = "all" | "saved" | "unsaved";
type PostFilter = "all" | "published" | "task" | "none";
type ViewMode = "grid" | "list";

function LibraryPage() {
  const [rows, setRows] = useState<LibraryItem[]>(() => seedLibrary());

  const [keyword, setKeyword] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | LibrarySource>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | LibraryType>("all");
  const [saveFilter, setSaveFilter] = useState<SaveFilter>("all");
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [view, setView] = useState<ViewMode>("grid");

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (saveFilter === "saved" && !r.savedToMaterials) return false;
      if (saveFilter === "unsaved" && r.savedToMaterials) return false;
      if (postFilter === "published" && !r.postPublished) return false;
      if (postFilter === "task" && !(r.hasPostTask && !r.postPublished)) return false;
      if (postFilter === "none" && (r.hasPostTask || r.postPublished)) return false;
      if (keyword) {
        const k = keyword.toLowerCase();
        if (
          !r.name.toLowerCase().includes(k) &&
          !r.description.toLowerCase().includes(k) &&
          !r.sellingPoints.toLowerCase().includes(k) &&
          !r.tags.some((t) => t.toLowerCase().includes(k))
        )
          return false;
      }
      return true;
    });
    const sorted = list.slice();
    sorted.sort((a, b) => {
      if (sort === "type") return a.type.localeCompare(b.type) || b.createdAt.localeCompare(a.createdAt);
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return sorted;
  }, [rows, keyword, sourceFilter, typeFilter, saveFilter, postFilter, sort]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      image: rows.filter((r) => r.type === "image").length,
      video: rows.filter((r) => r.type === "video").length,
      saved: rows.filter((r) => r.savedToMaterials).length,
      published: rows.filter((r) => r.postPublished).length,
    }),
    [rows],
  );

  const sourceCounts = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { m[r.source] = (m[r.source] ?? 0) + 1; });
    return m;
  }, [rows]);

  const [pageSize] = useState(8);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const [selected, setSelected] = useState<string[]>([]);
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allPageChecked =
    pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const togglePageAll = () => {
    if (allPageChecked)
      setSelected((s) => s.filter((id) => !pageRows.some((r) => r.id === id)));
    else setSelected((s) => [...new Set([...s, ...pageRows.map((r) => r.id)])]);
  };
  const clearSelection = () => setSelected([]);

  const [previewing, setPreviewing] = useState<LibraryItem | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [savingItem, setSavingItem] = useState<LibraryItem | null>(null);
  const [postingItem, setPostingItem] = useState<LibraryItem | null>(null);

  const handleReset = () => {
    setKeyword("");
    setSourceFilter("all");
    setTypeFilter("all");
    setSaveFilter("all");
    setPostFilter("all");
    setSort("newest");
    setPage(1);
  };

  const handleBatchUpdateTags = (tags: string[]) => {
    setRows((prev) =>
      prev.map((x) =>
        selected.includes(x.id)
          ? { ...x, tags: Array.from(new Set([...x.tags, ...tags])) }
          : x,
      ),
    );
    toast.success("标签已更新", { description: `共 ${selected.length} 条成片` });
    setTagsOpen(false);
  };

  const handleSavedToMaterials = (id: string) => {
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, savedToMaterials: true } : x)));
    toast.success("已保存至成品素材");
    setSavingItem(null);
  };

  const handlePostTaskCreated = (id: string) => {
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, hasPostTask: true } : x)));
    toast.success("已创建发帖任务");
    setPostingItem(null);
  };

  const handleDownload = async (item: LibraryItem) => {
    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.name}.${item.type === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("已开始下载");
    } catch { toast.error("下载失败，请重试"); }
  };

  const handleBatchSave = () => {
    setRows((prev) => prev.map((x) => selected.includes(x.id) ? { ...x, savedToMaterials: true } : x));
    toast.success(`已批量保存 ${selected.length} 条至成品素材`);
  };
  const handleBatchDownload = async () => {
    const items = rows.filter((r) => selected.includes(r.id));
    toast.success(`开始下载 ${items.length} 个文件`);
    for (const it of items) await handleDownload(it);
  };
  const handleBatchPost = () => {
    setRows((prev) => prev.map((x) => selected.includes(x.id) ? { ...x, hasPostTask: true } : x));
    toast.success(`已批量创建 ${selected.length} 个发帖任务`);
  };
  const handleCopyLink = (item: LibraryItem) => {
    navigator.clipboard?.writeText(item.url).then(
      () => toast.success("已复制链接"),
      () => toast.error("复制失败"),
    );
  };
  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((x) => x.id !== id));
    setSelected((s) => s.filter((x) => x !== id));
    toast.success("已删除");
  };

  const filterActive =
    !!keyword || sourceFilter !== "all" || typeFilter !== "all" ||
    saveFilter !== "all" || postFilter !== "all" || sort !== "newest";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-w-0 space-y-5">
        {/* ============== 页头 ============== */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">AI 成片库</h1>
            <Badge variant="secondary" className="gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
              <Sparkles className="h-3.5 w-3.5" /> AI 生成
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            汇总所有 AI 模块生成的图片与视频成片，支持快速发帖、保存至成品素材与本地下载。
          </p>
        </div>


        {/* ============== 卡片统计区 ============== */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard title="成片总数" value={stats.total} icon={Layers} tone="primary" />
          <StatCard title="图片 / 视频" value={`${stats.image} / ${stats.video}`} icon={ImageIcon} tone="violet" />
          <StatCard title="已入成品素材" value={stats.saved} icon={Save} tone="success" />
          <StatCard title="已发布" value={stats.published} icon={Send} tone="warning" />
        </div>






        {/* ============== Filter bar ============== */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-72">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">关键词</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="名称 / 描述 / 卖点 / 标签"
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                />
              </div>
            </div>

            <div className="w-full sm:w-40">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">来源</Label>
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v as typeof sourceFilter); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部来源</SelectItem>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SOURCE_META[s].label}
                    </SelectItem>
                  ))}

                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-32">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">类型</Label>

              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as "all" | LibraryType); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="image">图片</SelectItem>
                  <SelectItem value="video">视频</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-36">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">入库状态</Label>
              <Select value={saveFilter} onValueChange={(v) => { setSaveFilter(v as SaveFilter); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="saved">已入成品库</SelectItem>
                  <SelectItem value="unsaved">未入库</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-36">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">发帖状态</Label>
              <Select value={postFilter} onValueChange={(v) => { setPostFilter(v as PostFilter); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                  <SelectItem value="task">已建任务</SelectItem>
                  <SelectItem value="none">未发帖</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-40">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">排序</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                <SelectTrigger className="gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">最新优先</SelectItem>
                  <SelectItem value="oldest">最早优先</SelectItem>
                  <SelectItem value="type">按类型</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto">
              <Button variant="outline" onClick={handleReset} disabled={!filterActive}>
                <RotateCcw className="h-4 w-4" /> 重置
              </Button>
            </div>

          </div>
        </div>

        {/* ============== List card ============== */}
        <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            {pageRows.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox checked={allPageChecked} onCheckedChange={togglePageAll} aria-label="全选本页" />
                <span className="text-xs text-muted-foreground">本页全选</span>
              </div>
            )}
            <div className="mx-2 h-4 w-px bg-border" />
            <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={() => setTagsOpen(true)}>
              <TagIcon className="h-3.5 w-3.5" /> 修改标签
            </Button>
            <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={handleBatchSave}>
              <Save className="h-3.5 w-3.5" /> 批量入库
            </Button>
            <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={handleBatchDownload}>
              <Download className="h-3.5 w-3.5" /> 批量下载
            </Button>
            <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={handleBatchPost}>
              <Send className="h-3.5 w-3.5" /> 批量发帖
            </Button>
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection} className="text-muted-foreground">
                清除选择 ({selected.length})
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <div className="inline-flex items-center rounded-md border bg-background p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setView("list")}
                    >
                      <Rows3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>列表模式</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setView("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>卡片模式</TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.success("已刷新")}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>刷新</TooltipContent>
              </Tooltip>
            </div>

          </div>

          <div className="p-4">
            {pageRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Layers className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {filterActive ? "无匹配结果，试试调整筛选条件" : "暂无成片数据"}
                </p>
                {filterActive && (
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-3.5 w-3.5" /> 清除筛选
                  </Button>
                )}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pageRows.map((item) => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    selected={selected.includes(item.id)}
                    onToggle={() => toggleOne(item.id)}
                    onPreview={() => setPreviewing(item)}
                    onPost={() => setPostingItem(item)}
                    onSave={() => setSavingItem(item)}
                    onDownload={() => handleDownload(item)}
                    onCopyLink={() => handleCopyLink(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[40px_64px_1.6fr_120px_80px_1fr_150px_140px] items-center gap-3 border-b bg-muted/30 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                  <div></div>
                  <div>预览</div>
                  <div>名称 / 描述</div>
                  <div>来源</div>
                  <div>类型</div>
                  <div>标签</div>
                  <div>状态 / 时间</div>
                  <div className="text-right">操作</div>
                </div>
                {pageRows.map((item) => (
                  <LibraryListRow
                    key={item.id}
                    item={item}
                    selected={selected.includes(item.id)}
                    onToggle={() => toggleOne(item.id)}
                    onPreview={() => setPreviewing(item)}
                    onPost={() => setPostingItem(item)}
                    onSave={() => setSavingItem(item)}
                    onDownload={() => handleDownload(item)}
                    onCopyLink={() => handleCopyLink(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {pageRows.length > 0 && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              setPage={setPage}
            />
          )}
        </div>

        {/* Sticky bulk bar */}
        {selected.length > 0 && (
          <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-2 rounded-full border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
            <Badge className="bg-primary text-primary-foreground">已选 {selected.length}</Badge>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setTagsOpen(true)}>
              <TagIcon className="h-3.5 w-3.5" /> 标签
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={handleBatchSave}>
              <Save className="h-3.5 w-3.5" /> 入库
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={handleBatchDownload}>
              <Download className="h-3.5 w-3.5" /> 下载
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={handleBatchPost}>
              <Send className="h-3.5 w-3.5" /> 发帖
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-muted-foreground" onClick={clearSelection}>
              清除
            </Button>
          </div>
        )}

        {/* 预览 */}
        <PreviewDialog item={previewing} onClose={() => setPreviewing(null)} />

        {/* 修改标签 */}
        <TagsDialog
          open={tagsOpen}
          onOpenChange={setTagsOpen}
          count={selected.length}
          onSubmit={handleBatchUpdateTags}
        />

        {/* 保存至成品素材 */}
        <SaveDialog
          item={savingItem}
          onClose={() => setSavingItem(null)}
          onSaved={(id) => handleSavedToMaterials(id)}
        />

        {/* 一键发帖 */}
        {postingItem && (
          <CreatePostTaskDialog
            open={!!postingItem}
            onOpenChange={(o) => !o && setPostingItem(null)}
            showPostEditor
            defaultPostTitle={postingItem.name}
            defaultPostContent={postingItem.sellingPoints}
            selectedPosts={[
              {
                id: `ai-lib-${postingItem.id}`,
                type: postingItem.type,
                title: postingItem.name,
                content: postingItem.sellingPoints,
                images: postingItem.type === "image" ? [postingItem.url] : [],
                videoUrl: postingItem.type === "video" ? postingItem.url : undefined,
                videoCover: postingItem.cover,
                platforms: ["Tiktok"] as Platform[],
                publishStatus: { Tiktok: "unpublished" },
                tags: postingItem.tags,
                enabled: true,
                createdAt: postingItem.createdAt,
                tenantId: "",
                tenantName: "",
              } satisfies PostItem,
            ]}
            onCreated={() => handlePostTaskCreated(postingItem.id)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ============================================================ */
/* 卡片                                                          */
/* ============================================================ */

type CardActionProps = {
  item: LibraryItem;
  selected: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onPost: () => void;
  onSave: () => void;
  onDownload: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
};

function StatusBadges({ item }: { item: LibraryItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {item.postPublished ? (
        <Badge variant="outline" className="h-5 gap-0.5 border-emerald-500/40 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-700">
          <CheckCircle2 className="h-2.5 w-2.5" /> 已发布
        </Badge>
      ) : item.hasPostTask ? (
        <Badge variant="outline" className="h-5 gap-0.5 border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] text-amber-700">
          <Send className="h-2.5 w-2.5" /> 已建任务
        </Badge>
      ) : null}
      {item.savedToMaterials && (
        <Badge variant="outline" className="h-5 gap-0.5 border-sky-500/40 bg-sky-500/10 px-1.5 text-[10px] text-sky-700">
          <Save className="h-2.5 w-2.5" /> 已入库
        </Badge>
      )}
    </div>
  );
}

function LibraryCard({
  item, selected, onToggle, onPreview, onPost, onSave, onDownload, onCopyLink, onDelete,
}: CardActionProps) {
  const src = SOURCE_META[item.source];
  const postDisabled = item.hasPostTask || item.postPublished;
  const postLabel = item.postPublished ? "已发布成功" : item.hasPostTask ? "已创建发帖任务" : "一键发帖";

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition-all hover:shadow-md",
        selected && "ring-2 ring-primary",
      )}
    >
      {/* checkbox: 已选常驻，未选 hover 出现 */}
      <div
        className={cn(
          "absolute left-3 top-3 z-10 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <div className="rounded-md bg-background/85 p-1 backdrop-blur">
          <Checkbox checked={selected} onCheckedChange={onToggle} aria-label="选择" />
        </div>
      </div>

      {/* 来源 + 类型 mini-icon */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <Badge variant="outline" className={cn("h-5 gap-0.5 rounded-full px-1.5 text-[10px]", src.tone)}>
          {item.type === "video" ? <VideoIcon className="h-2.5 w-2.5" /> : <ImageIcon className="h-2.5 w-2.5" />}
          {src.label}
        </Badge>
      </div>

      {/* 预览图 */}
      <button
        type="button"
        onClick={onPreview}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-muted"
      >
        {item.type === "image" ? (
          <img
            src={item.url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <>
            <img
              src={item.cover ?? IMG(1)}
              alt={item.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg">
                <Play className="h-5 w-5 translate-x-[1px]" />
              </div>
            </div>
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent py-2 text-white transition-transform duration-200 group-hover:translate-y-0">
          <Eye className="h-3.5 w-3.5" />
          <span className="text-xs">点击预览</span>
        </div>
      </button>

      {/* 信息 */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="line-clamp-1 text-sm font-medium text-foreground" title={item.name}>
            {item.name}
          </div>
          <StatusBadges item={item} />
        </div>
        <div className="line-clamp-2 text-xs text-muted-foreground">{item.description}</div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {item.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                {t}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
        <div className="mt-auto pt-1 text-[11px] text-muted-foreground">生成 {item.createdAt}</div>

        {/* 操作 */}
        <div className="flex items-center gap-1.5 pt-2">
          <Button
            size="sm"
            disabled={postDisabled}
            onClick={onPost}
            title={postLabel}
            className="h-8 flex-1 justify-center px-2 text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="truncate">{postLabel}</span>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                disabled={item.savedToMaterials}
                onClick={onSave}
                className="h-8 w-8 shrink-0"
                aria-label="保存至成品素材"
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{item.savedToMaterials ? "已保存至成品素材" : "保存至成品素材"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline" onClick={onDownload} className="h-8 w-8 shrink-0" aria-label="下载">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>下载到本地</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" aria-label="更多">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="h-3.5 w-3.5" /> 预览
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyLink}>
                <LinkIcon className="h-3.5 w-3.5" /> 复制链接
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function LibraryListRow({
  item, selected, onToggle, onPreview, onPost, onSave, onDownload, onCopyLink, onDelete,
}: CardActionProps) {
  const src = SOURCE_META[item.source];
  const postDisabled = item.hasPostTask || item.postPublished;
  return (
    <div
      className={cn(
        "grid grid-cols-[40px_64px_1.6fr_120px_80px_1fr_150px_140px] items-center gap-3 border-b px-3 py-2 text-xs transition-colors last:border-b-0 hover:bg-muted/30",
        selected && "bg-primary/5",
      )}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} aria-label="选择" />
      <button
        type="button"
        onClick={onPreview}
        className="relative h-12 w-16 overflow-hidden rounded border bg-muted"
      >
        <img
          src={item.type === "image" ? item.url : item.cover ?? IMG(1)}
          alt={item.name}
          className="h-full w-full object-cover"
        />
        {item.type === "video" && (
          <Play className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
        )}
      </button>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium" title={item.name}>{item.name}</div>
        <div className="truncate text-[11px] text-muted-foreground">{item.description}</div>
      </div>
      <Badge variant="outline" className={cn("h-5 w-fit rounded-full px-1.5 text-[10px]", src.tone)}>
        {src.label}
      </Badge>
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        {item.type === "video" ? <VideoIcon className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
        {item.type === "video" ? "视频" : "图片"}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {item.tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
            {t}
          </Badge>
        ))}
        {item.tags.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>
        )}
        {item.tags.length === 0 && <span className="text-[11px] text-muted-foreground">--</span>}
      </div>
      <div className="space-y-0.5">
        <StatusBadges item={item} />
        <div className="text-[10px] text-muted-foreground">{item.createdAt}</div>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onPost} disabled={postDisabled} aria-label="一键发帖">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{postDisabled ? "已建任务/已发布" : "一键发帖"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onSave} disabled={item.savedToMaterials} aria-label="保存至成品素材">
              <Save className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{item.savedToMaterials ? "已入成品库" : "保存至成品素材"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDownload} aria-label="下载">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>下载到本地</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="更多">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-3.5 w-3.5" /> 预览
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyLink}>
              <LinkIcon className="h-3.5 w-3.5" /> 复制链接
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ============================================================ */
/* 预览弹窗                                                      */
/* ============================================================ */

function PreviewDialog({
  item,
  onClose,
}: {
  item: LibraryItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item?.name}
            {item && (
              <Badge variant="outline" className={cn("rounded-full", SOURCE_META[item.source].tone)}>
                {SOURCE_META[item.source].label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{item?.description}</DialogDescription>
        </DialogHeader>
        {item && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg bg-black">
              {item.type === "image" ? (
                <img src={item.url} alt={item.name} className="mx-auto max-h-[60vh] object-contain" />
              ) : (
                <video
                  src={item.url}
                  controls
                  autoPlay
                  className="mx-auto max-h-[60vh] w-full object-contain"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">生成时间</div>
                <div>{item.createdAt}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">卖点</div>
                <div>{item.sellingPoints}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* 修改标签                                                      */
/* ============================================================ */

function TagsDialog({
  open,
  onOpenChange,
  count,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  count: number;
  onSubmit: (tags: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  useMemo(() => {
    if (open) setPicked([]);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改标签</DialogTitle>
          <DialogDescription>将为已选 {count} 条成片追加以下标签。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">标签</Label>
          <TagMultiSelect value={picked} onChange={setPicked} placeholder="选择或新增标签" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onSubmit(picked)} disabled={picked.length === 0}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* 保存至成品素材                                                */
/* ============================================================ */

function SaveDialog({
  item,
  onClose,
  onSaved,
}: {
  item: LibraryItem | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);

  useMemo(() => {
    if (item) {
      setTitle(item.name);
      setContent(item.sellingPoints);
      setTags(item.tags);
      setEnabled(true);
    }
  }, [item]);

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>保存至成品素材</DialogTitle>
          <DialogDescription>
            将该 AI 成片保存为贴文素材，可在「成品素材 - 贴文素材」中继续编辑使用。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">数据来源</Label>
              <Input value={SOURCE_META[item.source].label} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">贴文类型</Label>
              <Input value={item.type === "image" ? "图文" : "视频"} disabled />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">贴文标题</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入贴文标题"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">文案内容</Label>
            <Textarea
              value={content}
              rows={4}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入贴文文案内容"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">素材预览</Label>
            <div className="overflow-hidden rounded-md border bg-black">
              {item.type === "image" ? (
                <img src={item.url} className="mx-auto max-h-64 object-contain" />
              ) : (
                <video src={item.url} controls className="mx-auto max-h-64 w-full object-contain" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">标签</Label>
            <TagMultiSelect value={tags} onChange={setTags} placeholder="选择或新增标签" />
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">启用状态</p>
              <p className="text-xs text-muted-foreground">关闭后该贴文将不会出现在可选素材中</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (!title.trim()) {
                toast.error("请输入贴文标题");
                return;
              }
              onSaved(item.id);
            }}
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
