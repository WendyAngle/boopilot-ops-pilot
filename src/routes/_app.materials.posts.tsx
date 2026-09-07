import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Plus,
  Search,
  RotateCcw,
  RefreshCw,
  Pencil,
  Trash2,
  
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Tag as TagIcon,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Layers,
  
  Send,
  CheckCircle2,
  Clock,
  CircleDashed,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";



import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { getUsableTags } from "@/lib/systemTags";
import { TagMultiSelect } from "@/components/tag-multi-select";
import {
  ACTIVE_TENANTS,
  seedManagedAccounts,
  ACCOUNT_STATUS_META,
  type ManagedAccount,
  type AccountStatus,
} from "@/lib/managed-account-mock";
import {
  CURRENT_USER_TENANT_ID,
  CURRENT_USER_TENANT_NAME,
  useTenantScope,
} from "@/lib/tenant-scope";
import {
  tasksActions,
  genTaskId,
  fmtNow,
  pad,
  type TaskRow,
} from "@/lib/operations-store";




export const Route = createFileRoute("/_app/materials/posts")({
  component: PostsPage,
  head: () => ({
    meta: [
      { title: "贴文素材 — BooPilot" },
      { name: "description", content: "集中管理图文与视频贴文素材。" },
    ],
  }),
});

/* ============================================================ */
/* 类型 & Mock                                                  */
/* ============================================================ */

export type PostType = "image" | "video";
export type Platform = "Facebook" | "Tiktok" | "Instagram" | "Twitter/X" | "WhatsApp";

const PLATFORMS: Platform[] = [
  "Facebook",
  "Tiktok",
  "Instagram",
  "Twitter/X",
  "WhatsApp",
];

/**
 * 各平台贴文发布限制（按各平台官方规则整理）
 * titleMax: 若为 undefined 表示该平台该类型不需要单独的标题
 * contentMax: 正文/描述字数上限
 * maxImages: 图文贴最多图片数
 * videoMinSec / videoMaxSec: 视频时长范围（秒）
 * imageFormats / videoFormats: 支持的素材格式
 * imageSizes / videoSizes: 推荐尺寸（用于提示展示）
 * imageMaxFileText / videoMaxFileText: 单文件大小限制展示文案
 * imageCountText / videoDurationText: 数量 / 时长的友好展示文案（覆盖默认描述）
 */
type PlatformLimit = {
  titleMax?: number;
  contentMax: number;
  maxImages: number;
  videoMinSec: number;
  videoMaxSec: number;
  imageFormats: string[];
  videoFormats: string[];
  imageSizes: string[];
  videoSizes: string[];
  imageMaxFileText: string;
  videoMaxFileText: string;
  imageCountText?: string;
  videoDurationText?: string;
};

const COMMON_IMG_FORMATS = ["JPG", "PNG"];

export const PLATFORM_LIMITS: Record<Platform, { image: PlatformLimit; video: PlatformLimit }> = {
  Facebook: {
    image: {
      contentMax: 63206,
      maxImages: 10,
      videoMinSec: 1,
      videoMaxSec: 14400,
      imageFormats: COMMON_IMG_FORMATS,
      videoFormats: ["MP4", "MOV"],
      imageSizes: ["横版 1200×630 (1.91:1)", "方版 1080×1080 (1:1)", "竖版 1080×1350 (4:5)"],
      videoSizes: ["1080×1920 (9:16)", "1920×1080 (16:9)"],
      imageMaxFileText: "单张 10-15 MB",
      videoMaxFileText: "10 GB（API 100 MB）",
      videoDurationText: "1 秒 - 240 分钟",
    },
    video: {
      titleMax: 255,
      contentMax: 63206,
      maxImages: 10,
      videoMinSec: 1,
      videoMaxSec: 14400,
      imageFormats: COMMON_IMG_FORMATS,
      videoFormats: ["MP4", "MOV"],
      imageSizes: ["横版 1200×630 (1.91:1)", "方版 1080×1080 (1:1)", "竖版 1080×1350 (4:5)"],
      videoSizes: ["1080×1920 (9:16)", "1920×1080 (16:9)"],
      imageMaxFileText: "单张 10-15 MB",
      videoMaxFileText: "10 GB（API 100 MB）",
      videoDurationText: "1 秒 - 240 分钟",
    },
  },
  Tiktok: {
    image: {
      titleMax: 90,
      contentMax: 4000,
      maxImages: 35,
      videoMinSec: 15,
      videoMaxSec: 600,
      imageFormats: COMMON_IMG_FORMATS,
      videoFormats: ["MP4", "MOV"],
      imageSizes: ["1080×1920 (9:16)"],
      videoSizes: ["1080×1920 (9:16)"],
      imageMaxFileText: "单张 20 MB",
      videoMaxFileText: "287.6 MB - iOS / 72 MB - Android / 4 GB - 网页",
      imageCountText: "多张（轮播）",
      videoDurationText: "15 秒 - 10 分钟（最佳 21-34 秒）",
    },
    video: {
      titleMax: 90,
      contentMax: 4000,
      maxImages: 35,
      videoMinSec: 15,
      videoMaxSec: 600,
      imageFormats: COMMON_IMG_FORMATS,
      videoFormats: ["MP4", "MOV"],
      imageSizes: ["1080×1920 (9:16)"],
      videoSizes: ["1080×1920 (9:16)"],
      imageMaxFileText: "单张 20 MB",
      videoMaxFileText: "287.6 MB - iOS / 72 MB - Android / 4 GB - 网页",
      imageCountText: "多张（轮播）",
      videoDurationText: "15 秒 - 10 分钟（最佳 21-34 秒）",
    },
  },
  Instagram: {
    image: {
      contentMax: 2200,
      maxImages: 10,
      videoMinSec: 3,
      videoMaxSec: 900,
      imageFormats: COMMON_IMG_FORMATS,
      videoFormats: ["MP4", "MOV"],
      imageSizes: ["方版 1080×1080 (1:1)", "竖版 1080×1350 (4:5)", "横版 1080×608 (1.91:1)"],
      videoSizes: ["1080×1920 (9:16)"],
      imageMaxFileText: "单张 30 MB",
      videoMaxFileText: "4 GB（Reels API 1 GB）",
      videoDurationText: "Reels 3 秒 - 15 分钟 / Story 1-60 秒",
    },
    video: {
      contentMax: 2200,
      maxImages: 10,
      videoMinSec: 3,
      videoMaxSec: 900,
      imageFormats: COMMON_IMG_FORMATS,
      videoFormats: ["MP4", "MOV"],
      imageSizes: ["方版 1080×1080 (1:1)", "竖版 1080×1350 (4:5)", "横版 1080×608 (1.91:1)"],
      videoSizes: ["1080×1920 (9:16)"],
      imageMaxFileText: "单张 30 MB",
      videoMaxFileText: "4 GB（Reels API 1 GB）",
      videoDurationText: "Reels 3 秒 - 15 分钟 / Story 1-60 秒",
    },
  },
  "Twitter/X": {
    image: {
      contentMax: 280,
      maxImages: 4,
      videoMinSec: 1,
      videoMaxSec: 140,
      imageFormats: ["JPG", "PNG", "GIF", "WEBP"],
      videoFormats: ["MP4"],
      imageSizes: ["横版 1280×720", "竖版 720×1280", "方版 720×720"],
      videoSizes: ["横版 1280×720", "竖版 720×1280", "方版 720×720"],
      imageMaxFileText: "单张 5 MB",
      videoMaxFileText: "512 MB",
      videoDurationText: "0.5 秒 - 140 秒",
    },
    video: {
      contentMax: 280,
      maxImages: 4,
      videoMinSec: 1,
      videoMaxSec: 140,
      imageFormats: ["JPG", "PNG", "GIF", "WEBP"],
      videoFormats: ["MP4"],
      imageSizes: ["横版 1280×720", "竖版 720×1280", "方版 720×720"],
      videoSizes: ["横版 1280×720", "竖版 720×1280", "方版 720×720"],
      imageMaxFileText: "单张 5 MB",
      videoMaxFileText: "512 MB",
      videoDurationText: "0.5 秒 - 140 秒",
    },
  },
  WhatsApp: {
    image: {
      contentMax: 1024,
      maxImages: 1,
      videoMinSec: 1,
      videoMaxSec: 90,
      imageFormats: COMMON_IMG_FORMATS,
      videoFormats: ["MP4"],
      imageSizes: ["1080×1920 (9:16)"],
      videoSizes: ["1080×1920 (9:16)"],
      imageMaxFileText: "16 MB",
      videoMaxFileText: "16 MB",
      imageCountText: "单张",
      videoDurationText: "最多 90 秒",
    },
    video: {
      contentMax: 1024,
      maxImages: 1,
      videoMinSec: 1,
      videoMaxSec: 90,
      imageFormats: COMMON_IMG_FORMATS,
      videoFormats: ["MP4"],
      imageSizes: ["1080×1920 (9:16)"],
      videoSizes: ["1080×1920 (9:16)"],
      imageMaxFileText: "16 MB",
      videoMaxFileText: "16 MB",
      imageCountText: "单张",
      videoDurationText: "最多 90 秒",
    },
  },
};


const PLATFORM_META: Record<Platform, { cls: string; letter: string }> = {
  Facebook: { cls: "bg-blue-600 text-white", letter: "F" },
  Tiktok: { cls: "bg-foreground text-background", letter: "T" },
  Instagram: {
    cls: "bg-gradient-to-br from-pink-500 to-yellow-400 text-white",
    letter: "I",
  },
  "Twitter/X": { cls: "bg-sky-500 text-white", letter: "X" },
  WhatsApp: { cls: "bg-emerald-500 text-white", letter: "W" },
};

export type PublishStatus = "published" | "pending" | "unpublished";

export interface PostItem {
  id: string;
  type: PostType;
  title: string;
  content: string;
  images: string[]; // URLs (or object URLs)
  videoUrl?: string;
  videoCover?: string;
  platforms: Platform[];
  /** 各平台的发布状态。缺省视为「未发」。 */
  publishStatus?: Partial<Record<Platform, PublishStatus>>;
  tags: string[];
  enabled: boolean;
  createdAt: string;
  tenantId: string;
  tenantName: string;
}

const SAMPLE_IMG = (seed: number) =>
  `https://picsum.photos/seed/post-${seed}/640/640`;

const SAMPLE_TITLES = [
  "新品上市:夏季清凉系列开箱",
  "618 大促预告 | 限时折扣抢先看",
  "用户好评合集 | 真实分享",
  "幕后花絮:拍摄日的一天",
  "节日问候 | 中秋祝福海报",
  "教程:三步搞定出片技巧",
  "品牌故事 | 从 0 到 1",
  "热门 BGM 跟拍挑战",
  "客户案例:出海品牌增长 200%",
  "周末好物推荐",
  "上新预热 | 神秘新品倒计时",
  "海外团队 vlog",
];

export function seedPosts(): PostItem[] {
  const tagPool = getUsableTags().map((t) => t.name);
  const rows: PostItem[] = [];
  for (let i = 1; i <= 14; i++) {
    const isVideo = i % 3 === 0;
    const imgCount = (i % 4) + 1;
    const tenant = ACTIVE_TENANTS[i % Math.max(1, ACTIVE_TENANTS.length)];
    rows.push({
      id: `post-${i}`,
      type: isVideo ? "video" : "image",
      title: SAMPLE_TITLES[i % SAMPLE_TITLES.length],
      content: `这是第 ${i} 条贴文文案,用于展示贴文素材的内容预览。可以包含活动信息、产品亮点、互动话术等。#出海 #品牌 #种草`,
      images: isVideo
        ? []
        : Array.from({ length: imgCount }, (_, k) => SAMPLE_IMG(i * 10 + k)),
      videoUrl: isVideo
        ? "https://www.w3schools.com/html/mov_bbb.mp4"
        : undefined,
      videoCover: isVideo ? SAMPLE_IMG(i * 10) : undefined,
      platforms: PLATFORMS.filter((_, idx) => (i + idx) % 2 === 0).slice(0, 3),
      publishStatus: Object.fromEntries(
        PLATFORMS.filter((_, idx) => (i + idx) % 2 === 0)
          .slice(0, 3)
          .map((p, idx) => {
            const s: PublishStatus =
              (i + idx) % 3 === 0
                ? "published"
                : (i + idx) % 3 === 1
                  ? "pending"
                  : "unpublished";
            return [p, s];
          }),
      ) as Partial<Record<Platform, PublishStatus>>,
      tags:
        tagPool.length > 0
          ? Array.from(
              { length: (i % 2) + 1 },
              (_, k) => tagPool[(i + k * 3) % tagPool.length],
            )
          : [],
      enabled: i % 5 !== 0,
      createdAt: `2026-05-${String((i % 27) + 1).padStart(2, "0")} ${String(
        20 - (i % 12),
      ).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
      tenantId: tenant?.id ?? "",
      tenantName: tenant?.name ?? "",
    });
  }
  // 多平台 · 全部未发 的示例数据（用于发帖任务测试）
  const allUnpubPlatforms: Platform[] = ["Facebook", "Tiktok", "Instagram", "Twitter/X"];
  const tenant0 = ACTIVE_TENANTS[0];
  rows.unshift({
    id: `post-multi-unpub`,
    type: "image",
    title: "多平台联合发布 | 全新季节系列预热",
    content:
      "一条覆盖 Facebook / Tiktok / Instagram / Twitter 的多平台贴文，所有平台均为「未发」状态，可用于快速创建发帖任务。#多平台 #预热",
    images: [SAMPLE_IMG(901), SAMPLE_IMG(902), SAMPLE_IMG(903)],
    platforms: allUnpubPlatforms,
    publishStatus: Object.fromEntries(
      allUnpubPlatforms.map((p) => [p, "unpublished" as PublishStatus]),
    ) as Partial<Record<Platform, PublishStatus>>,
    tags: tagPool.length > 0 ? [tagPool[0]] : [],
    enabled: true,
    createdAt: "2026-05-28 10:00",
    tenantId: tenant0?.id ?? "",
    tenantName: tenant0?.name ?? "",
  });
  return rows;
}


/* ============================================================ */
/* 主页面                                                        */
/* ============================================================ */

function PostsPage() {
  const [rows, setRows] = useState<PostItem[]>(() => seedPosts());
  const [tenantScope] = useTenantScope();

  // 筛选
  const [keyword, setKeyword] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PublishStatus>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tenantScope !== "all" && r.tenantId !== tenantScope) return false;
      if (platformFilter !== "all" && !r.platforms.includes(platformFilter))
        return false;
      if (statusFilter !== "all") {
        const hasStatus = r.platforms.some(
          (p) => (r.publishStatus?.[p] ?? "unpublished") === statusFilter,
        );
        if (!hasStatus) return false;
      }
      if (keyword) {
        const k = keyword.toLowerCase();
        if (
          !r.title.toLowerCase().includes(k) &&
          !r.content.toLowerCase().includes(k) &&
          !r.tags.some((t) => t.toLowerCase().includes(k))
        )
          return false;
      }
      if (dateFrom || dateTo) {
        const d = new Date(r.createdAt.replace(" ", "T"));
        if (dateFrom && d < new Date(dateFrom.setHours(0, 0, 0, 0)))
          return false;
        if (dateTo && d > new Date(new Date(dateTo).setHours(23, 59, 59, 999)))
          return false;
      }
      return true;
    });
  }, [rows, tenantScope, keyword, platformFilter, statusFilter, dateFrom, dateTo]);


  // 分页
  const [pageSize] = useState(8);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // 统计
  const stats = useMemo(
    () => ({
      total: rows.length,
      image: rows.filter((r) => r.type === "image").length,
      video: rows.filter((r) => r.type === "video").length,
    }),
    [rows],
  );

  // 选择
  const [selected, setSelected] = useState<string[]>([]);
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allPageChecked =
    pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const togglePageAll = () => {
    if (allPageChecked)
      setSelected((s) => s.filter((id) => !pageRows.some((r) => r.id === id)));
    else
      setSelected((s) => [
        ...new Set([...s, ...pageRows.map((r) => r.id)]),
      ]);
  };

  // 弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PostItem | null>(null);
  
  const [previewing, setPreviewing] = useState<{
    post: PostItem;
    index: number;
  } | null>(null);
  const [deleting, setDeleting] = useState<PostItem | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [singleTaskPost, setSingleTaskPost] = useState<PostItem | null>(null);

  const isAllTenants = tenantScope === "all";
  const activeTenant = ACTIVE_TENANTS.find((t) => t.id === tenantScope);



  const handleReset = () => {
    setKeyword("");
    setPlatformFilter("all");
    setStatusFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };


  const openAdd = () => {
    if (isAllTenants || !activeTenant) {
      toast.warning("请先在右上角切换到具体租户后再新增贴文");
      return;
    }
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (r: PostItem) => {
    setEditing(r);
    setFormOpen(true);
  };

  const handleSave = (
    data: Omit<PostItem, "id" | "createdAt" | "tenantId" | "tenantName">,
  ) => {
    if (editing) {
      setRows((prev) =>
        prev.map((x) => (x.id === editing.id ? { ...x, ...data } : x)),
      );
      toast.success("已保存", { description: data.title });
    } else {
      const item: PostItem = {
        ...data,
        id: `post-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        tenantId: activeTenant?.id ?? CURRENT_USER_TENANT_ID,
        tenantName: activeTenant?.name ?? CURRENT_USER_TENANT_NAME,

      };
      setRows((prev) => [item, ...prev]);
      toast.success("新增成功", { description: item.title });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setRows((prev) => prev.filter((x) => x.id !== deleting.id));
    toast.success("已删除", { description: deleting.title });
    setDeleting(null);
  };
  const handleBatchDelete = () => {
    setRows((prev) => prev.filter((x) => !selected.includes(x.id)));
    toast.success("批量删除完成", { description: `共 ${selected.length} 条` });
    setSelected([]);
    setBatchDeleteOpen(false);
  };

  const handleBatchUpdateTags = (tags: string[]) => {
    setRows((prev) =>
      prev.map((x) =>
        selected.includes(x.id)
          ? { ...x, tags: Array.from(new Set([...x.tags, ...tags])) }
          : x,
      ),
    );
    toast.success("标签已更新", {
      description: `共 ${selected.length} 条贴文`,
    });
    setTagsOpen(false);
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* 标题 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            贴文素材
          </h2>
          <Badge
            variant="outline"
            className="rounded-full bg-primary/10 text-primary border-primary/30"
          >
            <FileText className="mr-1 h-3 w-3" />
            素材库
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          集中管理图文与视频贴文素材,支持多平台发布配置、标签管理与批量操作。
        </p>
      </div>

      {/* 统计 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="贴文总数" value={stats.total} icon={FileText} tone="primary" />
        <StatCard title="图文贴数" value={stats.image} icon={ImageIcon} tone="success" />
        <StatCard title="视频贴数" value={stats.video} icon={VideoIcon} tone="violet" />
      </div>

      {/* 筛选区 */}
      <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-end gap-3">
          <FormItem label="贴文描述关键词" className="w-full sm:w-64">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="标题 / 文案 / 标签"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </FormItem>

          <FormItem label="使用平台" className="w-full sm:w-40">
            <Select
              value={platformFilter}
              onValueChange={(v) => {
                setPlatformFilter(v as "all" | Platform);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem label="发帖状态" className="w-full sm:w-36">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "all" | PublishStatus);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="unpublished">未发</SelectItem>
                <SelectItem value="pending">待发</SelectItem>
                <SelectItem value="published">已发</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem label="上传日期" className="w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <DatePickerField value={dateFrom} onChange={setDateFrom} placeholder="开始日期" />
              <span className="text-muted-foreground">~</span>
              <DatePickerField value={dateTo} onChange={setDateTo} placeholder="结束日期" />
            </div>
          </FormItem>
          <div className="ml-auto flex items-end gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
            <Button onClick={() => setPage(1)}>
              <Search className="h-4 w-4" />
              搜索
            </Button>
          </div>
        </div>
      </div>


      {/* 数据卡片 */}
      <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        {/* 功能操作区 */}
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={isAllTenants ? "cursor-not-allowed" : undefined}>
                  <Button onClick={openAdd} disabled={isAllTenants}>
                    <Plus className="h-4 w-4" />
                    新增贴文
                  </Button>
                </span>
              </TooltipTrigger>
              {isAllTenants && (
                <TooltipContent>
                  请先在右上角切换到具体租户后再新增贴文
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>


          <Button
            variant="outline"
            disabled={selected.length === 0}
            onClick={() => setTagsOpen(true)}
          >
            <TagIcon className="h-4 w-4" />
            修改标签{selected.length > 0 && ` (${selected.length})`}
          </Button>

          {selected.length > 0 && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setBatchDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              批量删除 ({selected.length})
            </Button>
          )}
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toast.success("已刷新")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 列表 - 卡片网格 */}
        <div className="p-4">
          {pageRows.length > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <Checkbox
                checked={allPageChecked}
                onCheckedChange={togglePageAll}
                aria-label="全选本页"
              />
              <span className="text-sm text-muted-foreground">
                本页全选{selected.length > 0 && ` · 已选 ${selected.length} 条`}
              </span>
            </div>
          )}
          {pageRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Layers className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                暂无贴文素材,点击"新增贴文"开始创建
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageRows.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  selected={selected.includes(post.id)}
                  onToggle={() => toggleOne(post.id)}
                  onPreview={(idx) => setPreviewing({ post, index: idx })}
                  onEdit={() => openEdit(post)}
                  onDelete={() => setDeleting(post)}
                  onCreateTask={() => setSingleTaskPost(post)}
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

      {/* 新增/编辑 */}
      <PostFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSubmit={handleSave}
      />


      {/* 预览图片/视频 */}
      <PreviewDialog
        data={previewing}
        onChange={setPreviewing}
        onClose={() => setPreviewing(null)}
      />

      {/* 修改标签 */}
      <BatchTagsDialog
        open={tagsOpen}
        onOpenChange={setTagsOpen}
        count={selected.length}
        onSubmit={handleBatchUpdateTags}
      />

      {/* 单删 */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该贴文?</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleting?.title}」,该操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除?</AlertDialogTitle>
            <AlertDialogDescription>
              将删除 {selected.length} 条贴文,该操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBatchDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>





      {/* 新增发帖任务（单条） */}
      <CreatePostTaskDialog
        open={!!singleTaskPost}
        onOpenChange={(o) => !o && setSingleTaskPost(null)}
        selectedPosts={singleTaskPost ? [singleTaskPost] : []}
        onCreated={() => setSingleTaskPost(null)}
      />

    </div>

  );
}

/* ============================================================ */
/* 子组件                                                        */
/* ============================================================ */

function FormItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const parts = label.split(/(\*)/g);
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">
        {parts.map((seg, i) =>
          seg === "*" ? (
            <span key={i} className="text-destructive">
              *
            </span>
          ) : (
            <span key={i}>{seg}</span>
          ),
        )}
      </Label>
      {children}
    </div>
  );
}

function DatePickerField({
  value,
  onChange,
  placeholder,
}: {
  value?: Date;
  onChange: (d?: Date) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex-1 justify-start font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {value ? format(value, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}


const PUBLISH_STATUS_META: Record<
  PublishStatus,
  { label: string; icon: typeof CheckCircle2; cls: string }
> = {
  published: {
    label: "已发",
    icon: CheckCircle2,
    cls: "bg-emerald-500 text-white",
  },
  pending: {
    label: "待发",
    icon: Clock,
    cls: "bg-amber-500 text-white",
  },
  unpublished: {
    label: "未发",
    icon: CircleDashed,
    cls: "bg-muted text-muted-foreground",
  },
};

function PlatformBadge({
  p,
  status,
}: {
  p: Platform;
  status?: PublishStatus;
}) {
  const meta = PLATFORM_META[p];
  const statusMeta = status ? PUBLISH_STATUS_META[status] : null;
  const StatusIcon = statusMeta?.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="relative inline-flex">
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold cursor-default",
              meta.cls,
            )}
          >
            {meta.letter}
          </span>
          {statusMeta && StatusIcon && (
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full ring-1 ring-background",
                statusMeta.cls,
              )}
            >
              <StatusIcon className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>
          {p}
          {statusMeta ? ` · ${statusMeta.label}` : ""}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function PostCard({
  post,
  selected,
  onToggle,
  onPreview,
  onEdit,
  onDelete,
  onCreateTask,
}: {
  post: PostItem;
  selected: boolean;
  onToggle: () => void;
  onPreview: (idx: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateTask: () => void;
}) {
  // 有「未发」状态的平台时才允许发帖
  const canCreateTask = post.platforms.some(
    (p) => (post.publishStatus?.[p] ?? "unpublished") === "unpublished",
  );

  const cover =
    post.type === "image"
      ? post.images[0]
      : post.videoCover ?? post.images[0];

  return (
    <div
      onClick={onToggle}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md",
        selected && "ring-2 ring-primary/60",
      )}
    >

      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={post.title}
            className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(0);
            }}
          />

        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        {/* 类型角标 */}
        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <Badge
            variant="outline"
            className={cn(
              "rounded-md border-0 backdrop-blur-sm",
              post.type === "video"
                ? "bg-violet-500/80 text-white"
                : "bg-primary/80 text-primary-foreground",
            )}
          >
            {post.type === "video" ? (
              <>
                <VideoIcon className="mr-1 h-3 w-3" />
                视频
              </>
            ) : (
              <>
                <ImageIcon className="mr-1 h-3 w-3" />
                图文 · {post.images.length}
              </>
            )}
          </Badge>
        </div>
        {/* 选择框（透明，跟随卡片选中态） */}
        <div
          className="absolute right-2 top-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className={cn(
              "border-white/80 bg-transparent shadow-sm backdrop-blur-sm transition-opacity",
              "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
              !selected && "opacity-70 group-hover:opacity-100",
            )}
          />
        </div>

        {/* 视频播放按钮 */}
        {post.type === "video" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(0);
            }}

            className="absolute inset-0 flex items-center justify-center"
            aria-label="播放视频"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-110">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
        {/* 启用状态 */}
        {!post.enabled && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="outline" className="border-0 bg-muted/90 text-muted-foreground">
              已停用
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3
          className="line-clamp-1 cursor-pointer text-sm font-semibold text-foreground hover:text-primary"
          title={post.title}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}

        >
          {post.title}
        </h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {post.content}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <TooltipProvider delayDuration={200}>
            {post.platforms.map((p) => (
              <PlatformBadge
                key={p}
                p={p}
                status={post.publishStatus?.[p] ?? "unpublished"}
              />
            ))}
          </TooltipProvider>
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {post.tags.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="rounded-md bg-muted/50 text-[11px] font-normal"
              >
                {t}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
          <span>{post.createdAt}</span>
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
                      onClick={onCreateTask}
                      disabled={!canCreateTask}
                    >
                      <Send className="h-3.5 w-3.5" />
                      发帖任务
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canCreateTask && (
                  <TooltipContent side="top">
                    <p>该贴文所有平台均已发布或待发，无可发帖平台</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />查看/编辑
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>

        </div>
      </div>
    </div>
  );
}

/* ---------- 预览弹窗 ---------- */
function PreviewDialog({
  data,
  onChange,
  onClose,
}: {
  data: { post: PostItem; index: number } | null;
  onChange: (d: { post: PostItem; index: number } | null) => void;
  onClose: () => void;
}) {
  if (!data) return null;
  const { post, index } = data;
  const isVideo = post.type === "video";
  const total = isVideo ? 1 : post.images.length;
  const prev = () =>
    onChange({ post, index: (index - 1 + total) % total });
  const next = () => onChange({ post, index: (index + 1) % total });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl border-0 bg-background/95 p-2">
        <DialogHeader className="sr-only">
          <DialogTitle>{post.title}</DialogTitle>
        </DialogHeader>
        <div className="relative flex items-center justify-center">
          {isVideo ? (
            <video
              src={post.videoUrl}
              poster={post.videoCover}
              controls
              autoPlay
              className="max-h-[78vh] w-full rounded-md bg-black"
            />
          ) : (
            <img
              src={post.images[index]}
              alt={`${post.title}-${index + 1}`}
              className="max-h-[78vh] w-auto rounded-md object-contain"
            />
          )}
          {!isVideo && total > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                aria-label="上一张"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                aria-label="下一张"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                {index + 1} / {total}
              </span>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


/* ---------- 表单弹窗 ---------- */
function PostFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: PostItem | null;
  onSubmit: (data: Omit<PostItem, "id" | "createdAt" | "tenantId" | "tenantName">) => void;
}) {
  const usableTags = useMemo(() => getUsableTags(), []);
  const isNew = !editing;
  const [mode, setMode] = useState<"view" | "edit">(isNew ? "edit" : "view");
  const readOnly = mode === "view";
  const [type, setType] = useState<PostType>(editing?.type ?? "image");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [images, setImages] = useState<string[]>(editing?.images ?? []);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(editing?.videoUrl);
  const [videoCover, setVideoCover] = useState<string | undefined>(
    editing?.videoCover,
  );
  const [platforms, setPlatforms] = useState<Platform[]>(
    editing?.platforms ?? [],
  );
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 重置表单
  const resetFromEditing = () => {
    setType(editing?.type ?? "image");
    setTitle(editing?.title ?? "");
    setContent(editing?.content ?? "");
    setImages(editing?.images ?? []);
    setVideoUrl(editing?.videoUrl);
    setVideoCover(editing?.videoCover);
    setPlatforms(editing?.platforms ?? []);
    setEnabled(editing?.enabled ?? true);
    setTags(editing?.tags ?? []);
  };
  useMemo(() => {
    if (open) {
      resetFromEditing();
      setMode(editing ? "view" : "edit");
    }
  }, [open, editing]);

  const handleImagePick = (files: FileList | null, cap = 9) => {
    if (!files) return;
    const accepted = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const arr = Array.from(files).filter((f) => accepted.includes(f.type));
    if (arr.length === 0) {
      toast.error("仅支持 jpg / png / webp / gif 格式");
      return;
    }
    const urls = arr.map((f) => URL.createObjectURL(f));
    setImages((prev) => {
      const merged = [...prev, ...urls].slice(0, cap);
      if (prev.length + urls.length > cap)
        toast.warning(`最多上传 ${cap} 张图片`);
      return merged;
    });
  };


  const handleVideoPick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const accepted = ["video/mp4", "video/quicktime"];
    if (!accepted.includes(f.type) && !/\.(mp4|mov)$/i.test(f.name)) {
      toast.error("仅支持 MP4 / MOV 格式");
      return;
    }
    setVideoUrl(URL.createObjectURL(f));
  };

  const removeImage = (idx: number) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const toggleTag = (t: string) =>
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  // 根据所选平台 + 类型聚合限制
  const agg = useMemo(() => {
    if (platforms.length === 0) {
      return {
        hasTitle: false,
        titleMax: 0,
        titleMinPlatform: null as Platform | null,
        contentMax: 0,
        contentMinPlatform: null as Platform | null,
        maxImages: 0,
        imageMinPlatform: null as Platform | null,
        videoMinSec: 0,
        videoMaxSec: 0,
        videoMaxPlatform: null as Platform | null,
      };
    }
    const limits = platforms.map((p) => ({ p, l: PLATFORM_LIMITS[p][type] }));
    const withTitle = limits.filter((x) => x.l.titleMax !== undefined);
    const titlePick = withTitle.reduce<{ p: Platform; v: number } | null>(
      (acc, x) =>
        !acc || x.l.titleMax! < acc.v ? { p: x.p, v: x.l.titleMax! } : acc,
      null,
    );
    const contentPick = limits.reduce<{ p: Platform; v: number }>(
      (acc, x) => (x.l.contentMax < acc.v ? { p: x.p, v: x.l.contentMax } : acc),
      { p: limits[0].p, v: limits[0].l.contentMax },
    );
    const imagePick = limits.reduce<{ p: Platform; v: number }>(
      (acc, x) => (x.l.maxImages < acc.v ? { p: x.p, v: x.l.maxImages } : acc),
      { p: limits[0].p, v: limits[0].l.maxImages },
    );
    const videoMinSec = Math.max(...limits.map((x) => x.l.videoMinSec));
    const videoPick = limits.reduce<{ p: Platform; v: number }>(
      (acc, x) => (x.l.videoMaxSec < acc.v ? { p: x.p, v: x.l.videoMaxSec } : acc),
      { p: limits[0].p, v: limits[0].l.videoMaxSec },
    );
    return {
      hasTitle: withTitle.length > 0,
      titleMax: titlePick?.v ?? 0,
      titleMinPlatform: titlePick?.p ?? null,
      contentMax: contentPick.v,
      contentMinPlatform: contentPick.p,
      maxImages: imagePick.v,
      imageMinPlatform: imagePick.p,
      videoMinSec,
      videoMaxSec: videoPick.v,
      videoMaxPlatform: videoPick.p,
    };
  }, [platforms, type]);

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}秒`;
    if (sec < 3600) return `${Math.floor(sec / 60)}分钟`;
    return `${Math.floor(sec / 3600)}小时`;
  };

  const handleSubmit = () => {
    if (platforms.length === 0) {
      toast.error("请选择至少一个使用平台");
      return;
    }
    if (agg.hasTitle) {
      if (!title.trim()) {
        toast.error("请输入贴文标题");
        return;
      }
      if (title.length > agg.titleMax) {
        toast.error(`标题最长 ${agg.titleMax} 字（受 ${agg.titleMinPlatform} 限制）`);
        return;
      }
    }
    if (content.length > agg.contentMax) {
      toast.error(`文案内容最长 ${agg.contentMax} 字（受 ${agg.contentMinPlatform} 限制）`);
      return;
    }
    if (type === "image") {
      if (images.length === 0) {
        toast.error("请上传至少一张图片");
        return;
      }
      if (images.length > agg.maxImages) {
        toast.error(`最多上传 ${agg.maxImages} 张图片（受 ${agg.imageMinPlatform} 限制）`);
        return;
      }
    }
    if (type === "video" && !videoUrl) {
      toast.error("请上传视频文件");
      return;
    }
    onSubmit({
      type,
      title: agg.hasTitle ? title.trim() : "",
      content,
      images: type === "image" ? images : [],
      videoUrl: type === "video" ? videoUrl : undefined,
      videoCover: type === "video" ? videoCover : undefined,
      platforms,
      tags,
      enabled,
    });
  };

  const noPlatform = platforms.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "新增贴文" : readOnly ? "查看贴文" : "编辑贴文"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "当前为查看模式，点击右下角「编辑」可切换为编辑模式。"
              : "先选择使用平台与贴文类型，系统会根据所选平台的免费发布规则动态调整字数和素材限制。"}
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-95">
          {/* 1. 使用平台 */}
          <FormItem label="使用平台 *">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const active = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    <PlatformBadge p={p} />
                    {p}
                  </button>
                );
              })}
            </div>
          </FormItem>

          {/* 2. 贴文类型 */}
          <FormItem label="贴文类型 *">
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as PostType);
                if (v === "image") setVideoUrl(undefined);
                else setImages([]);
              }}
            >
              <SelectTrigger className="w-full sm:w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">图文</SelectItem>
                <SelectItem value="video">视频</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>

          {noPlatform ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              请先选择至少一个使用平台，以便根据平台规则展示标题、内容及素材限制。
            </div>
          ) : (
            <>
              {/* 平台素材规则速查 */}
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  平台{type === "image" ? "图片" : "视频"}规格参考
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="px-2 py-1.5 text-left font-medium">平台</th>
                        <th className="px-2 py-1.5 text-left font-medium">
                          {type === "image" ? "图片数量" : "时长限制"}
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium">推荐尺寸</th>
                        <th className="px-2 py-1.5 text-left font-medium">格式</th>
                        <th className="px-2 py-1.5 text-left font-medium">文件大小</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platforms.map((p) => {
                        const l = PLATFORM_LIMITS[p][type];
                        const countOrDuration =
                          type === "image"
                            ? (l.imageCountText ?? `最多 ${l.maxImages} 张`)
                            : (l.videoDurationText ?? `${formatDuration(l.videoMinSec)} - ${formatDuration(l.videoMaxSec)}`);
                        const sizes = type === "image" ? l.imageSizes : l.videoSizes;
                        const formats = type === "image" ? l.imageFormats : l.videoFormats;
                        const fileText = type === "image" ? l.imageMaxFileText : l.videoMaxFileText;
                        return (
                          <tr key={p} className="border-t border-border/60 align-top">
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5 text-foreground">
                                <PlatformBadge p={p} />
                                <span>{p === "WhatsApp" && type === "image" ? "WhatsApp Status" : p}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground">{countOrDuration}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {sizes.map((s, i) => (
                                <div key={i}>{s}</div>
                              ))}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground">{formats.join(", ")}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{fileText}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  系统已按所选平台中最严格的规则聚合限制；不同平台规则差异较大时建议拆分贴文。
                </p>
              </div>


              {/* 3. 标题（按需展示） */}
              {agg.hasTitle && (
                <FormItem
                  label={`贴文标题 * (${title.length}/${agg.titleMax})`}
                >
                  <Input
                    value={title}
                    maxLength={agg.titleMax}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="请输入贴文标题"
                  />
                  <p className="text-xs text-muted-foreground">
                    字数上限受 {agg.titleMinPlatform} 限制
                  </p>
                </FormItem>
              )}

              {/* 4. 文案内容 */}
              <FormItem label={`文案内容 (${content.length}/${agg.contentMax})`}>
                <Textarea
                  value={content}
                  maxLength={agg.contentMax}
                  rows={5}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请输入贴文文案内容"
                />
                <p className="text-xs text-muted-foreground">
                  字数上限 {agg.contentMax} 字（受 {agg.contentMinPlatform} 限制，已按所选平台中最小值聚合）
                </p>
              </FormItem>

              {/* 5. 素材上传 */}
              {type === "image" ? (
                <FormItem
                  label={`上传图片 * (${images.length}/${agg.maxImages})`}
                >
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    hidden
                    onChange={(e) => {
                      handleImagePick(e.target.files, agg.maxImages);
                      e.target.value = "";
                    }}
                  />
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {images.map((src, i) => (
                      <div
                        key={i}
                        className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                      >
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {images.length < agg.maxImages && (
                      <button
                        type="button"
                        onClick={() => imgInputRef.current?.click()}
                        className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-xs">添加图片</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    最多上传 {agg.maxImages} 张图片（受 {agg.imageMinPlatform} 限制），具体尺寸 / 格式 / 大小请参考上方平台规格表
                  </p>

                </FormItem>
              ) : (
                <FormItem label="上传视频 *">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    hidden
                    onChange={(e) => {
                      handleVideoPick(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  {videoUrl ? (
                    <div className="relative">
                      <video
                        src={videoUrl}
                        controls
                        className="max-h-80 w-full rounded-md bg-black"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setVideoUrl(undefined)}
                      >
                        <Trash2 className="h-4 w-4" />
                        移除视频
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/30 py-10 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Upload className="h-6 w-6" />
                      <span className="text-sm">点击上传视频</span>
                      <span className="text-xs">
                        仅支持 MP4 / MOV，单个文件
                      </span>
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    视频时长建议 {formatDuration(agg.videoMinSec)} - {formatDuration(agg.videoMaxSec)}（受 {agg.videoMaxPlatform} 限制），具体尺寸 / 格式 / 大小请参考上方平台规格表
                  </p>

                </FormItem>
              )}
            </>
          )}

          <FormItem label="标签">
            <TagMultiSelect
              value={tags}
              onChange={setTags}
              placeholder="选择或新增标签"
            />
          </FormItem>

          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">启用状态</p>
              <p className="text-xs text-muted-foreground">
                关闭后该贴文将不会出现在可选素材中
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </fieldset>

        <DialogFooter>
          {readOnly ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              <Button onClick={() => setMode("edit")}>
                <Pencil className="h-4 w-4" />
                编辑
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (isNew) {
                    onOpenChange(false);
                  } else {
                    resetFromEditing();
                    setMode("view");
                  }
                }}
              >
                取消
              </Button>
              <Button onClick={handleSubmit}>确定</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/* ---------- 批量改标签 ---------- */
function BatchTagsDialog({
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
          <DialogDescription>
            将为已选 {count} 条贴文追加以下标签。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">标签</Label>
          <TagMultiSelect
            value={picked}
            onChange={setPicked}
            placeholder="选择或新增标签"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => onSubmit(picked)}
            disabled={picked.length === 0}
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 新增发帖任务 ---------- */
const ALL_MANAGED_ACCOUNTS: ManagedAccount[] = seedManagedAccounts();

function defaultTaskName() {
  const d = new Date();
  return `快捷发帖 ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTimeStr() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreatePostTaskDialog({
  open,
  onOpenChange,
  selectedPosts,
  onCreated,
  lockedPlatform,
  showPostEditor,
  defaultPostTitle,
  defaultPostContent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedPosts: PostItem[];
  onCreated: () => void;
  lockedPlatform?: Platform;
  showPostEditor?: boolean;
  defaultPostTitle?: string;
  defaultPostContent?: string;
}) {
  const [taskName, setTaskName] = useState(defaultTaskName());
  const [acctKeyword, setAcctKeyword] = useState("");
  const [acctStatus, setAcctStatus] = useState<"all" | AccountStatus>("normal");
  const [activePlatform, setActivePlatform] = useState<Platform | "">("");
  const [acctPage, setAcctPage] = useState(1);
  const ACCT_PAGE_SIZE = 5;
  // 每个平台仅可选择一个账号（平台内互斥）
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [execTime, setExecTime] = useState<"now" | "scheduled">("now");
  const [schDate, setSchDate] = useState(todayStr());
  const [schTime, setSchTime] = useState(nowTimeStr());
  const [postTitle, setPostTitle] = useState(defaultPostTitle ?? "");
  const [postContent, setPostContent] = useState(defaultPostContent ?? "");


  // 贴文中「发帖状态为未发」的平台集合，账号只能从这些平台中选
  const postPlatforms = useMemo(() => {
    if (lockedPlatform) return [lockedPlatform] as Platform[];
    const set = new Set<Platform>();
    selectedPosts.forEach((p) => {
      p.platforms.forEach((plat) => {
        const st = p.publishStatus?.[plat] ?? "unpublished";
        if (st === "unpublished") set.add(plat);
      });
    });
    return Array.from(set) as Platform[];
  }, [selectedPosts, lockedPlatform]);

  // 重置
  useMemo(() => {
    if (open) {
      setTaskName(defaultTaskName());
      setAcctKeyword("");
      setAcctStatus("normal");
      setPicked({});
      setExecTime("now");
      setSchDate(todayStr());
      setSchTime(nowTimeStr());
      setActivePlatform(postPlatforms[0] ?? "");
      setAcctPage(1);
      setPostTitle(defaultPostTitle ?? "");
      setPostContent(defaultPostContent ?? "");
    }
  }, [open]);


  const candidateAccounts = useMemo(() => {
    if (!activePlatform) return [] as ManagedAccount[];
    return ALL_MANAGED_ACCOUNTS.filter((a) => {
      if (a.platform !== activePlatform) return false;
      if (acctStatus !== "all" && a.accountStatus !== acctStatus) return false;
      if (acctKeyword) {
        const k = acctKeyword.toLowerCase();
        if (
          !a.username.toLowerCase().includes(k) &&
          !a.platformId.toLowerCase().includes(k)
        )
          return false;
      }
      return true;
    });
  }, [activePlatform, acctStatus, acctKeyword]);

  const acctTotalPages = Math.max(
    1,
    Math.ceil(candidateAccounts.length / ACCT_PAGE_SIZE),
  );
  const pagedAccounts = useMemo(
    () =>
      candidateAccounts.slice(
        (acctPage - 1) * ACCT_PAGE_SIZE,
        acctPage * ACCT_PAGE_SIZE,
      ),
    [candidateAccounts, acctPage],
  );

  // 已选择的账号（跨平台）
  const pickedAccounts = useMemo(() => {
    const ids = Object.values(picked).filter(Boolean) as string[];
    return ALL_MANAGED_ACCOUNTS.filter((a) => ids.includes(a.id));
  }, [picked]);


  const pickedIds = useMemo(
    () => Object.values(picked).filter(Boolean) as string[],
    [picked],
  );

  const selectAccount = (platform: Platform, id: string) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (next[platform] === id) {
        delete next[platform];
      } else {
        next[platform] = id;
      }
      return next;
    });

  const handleConfirm = () => {
    if (!taskName.trim()) {
      toast.error("请输入任务名称");
      return;
    }
    if (pickedIds.length === 0) {
      toast.error("请至少为一个平台选择账号");
      return;
    }
    const pickedAccs = ALL_MANAGED_ACCOUNTS.filter((a) =>
      pickedIds.includes(a.id),
    );
    const platforms = Array.from(
      new Set(pickedAccs.map((a) => a.platform as Platform)),
    );
    const total = pickedIds.length * selectedPosts.length;
    const desc = [
      `贴文素材发帖任务：${selectedPosts.length} 条贴文 × ${pickedIds.length} 个账号`,
      `贴文：${selectedPosts.map((p) => p.title).slice(0, 5).join("、")}${selectedPosts.length > 5 ? " 等" : ""}`,
      `执行时间：${execTime === "now" ? "立即执行" : `指定时间开始执行 ${schDate} ${schTime}`}`,
    ].join("\n");
    const task: TaskRow = {
      id: genTaskId(),
      name: taskName.trim(),
      subtype: "action",
      platforms,
      total,
      done: 0,
      failed: 0,
      status: "pending",
      description: desc,
      createdBy: "黄雪",
      createdAt: fmtNow(),
    };
    tasksActions.add(task);
    toast.success("发帖任务已创建", {
      description: `${task.name} · 可前往「任务列表」查看`,
    });
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            新增发帖任务
          </DialogTitle>
          <DialogDescription>
            已选择 {selectedPosts.length} 条贴文，未发平台：
            {postPlatforms.join(" / ") || "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormItem label="任务名称 *">
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="请输入任务名称"
            />
          </FormItem>

          {showPostEditor && (
            <>
              <FormItem label="贴文标题 *">
                <Input
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="请输入贴文标题"
                />
              </FormItem>
              <FormItem label="贴文文案 *">
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="请输入文案内容"
                  rows={4}
                />
              </FormItem>
            </>
          )}


          <FormItem
            label={`选择账号 * (已选 ${pickedIds.length} / 共 ${postPlatforms.length} 个平台，每个平台限选一个)`}
          >
            <div className="space-y-3 rounded-md border p-3">
              {/* 筛选条件 */}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={activePlatform || undefined}
                  onValueChange={(v) => {
                    setActivePlatform(v as Platform);
                    setAcctPage(1);
                  }}
                  disabled={postPlatforms.length === 0 || !!lockedPlatform}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="选择平台" />
                  </SelectTrigger>
                  <SelectContent>
                    {postPlatforms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-52">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-9 text-xs"
                    placeholder="账号名 / ID"
                    value={acctKeyword}
                    onChange={(e) => {
                      setAcctKeyword(e.target.value);
                      setAcctPage(1);
                    }}
                  />
                </div>
                <Select
                  value={acctStatus}
                  onValueChange={(v) => {
                    setAcctStatus(v as "all" | AccountStatus);
                    setAcctPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {(
                      Object.keys(ACCOUNT_STATUS_META) as AccountStatus[]
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {ACCOUNT_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 常显提示 */}
              <p className="text-[11px] text-muted-foreground">
                通过切换平台或设置其他条件过滤可选择的账号信息供选择
              </p>

              {/* 已选账号 */}
              {pickedAccounts.length > 0 && (
                <div className="rounded-md bg-muted/40 px-2 py-2">
                  <div className="mb-1.5 text-[11px] text-muted-foreground">
                    已选账号 ({pickedAccounts.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pickedAccounts.map((a) => (
                      <Badge
                        key={a.id}
                        variant="outline"
                        className="flex items-center gap-1 bg-background pr-1 text-[11px] font-normal"
                      >
                        <PlatformBadge p={a.platform as Platform} />
                        <span className="max-w-[140px] truncate">
                          {a.username}
                        </span>
                        <button
                          type="button"
                          className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() =>
                            setPicked((prev) => {
                              const n = { ...prev };
                              delete n[a.platform];
                              return n;
                            })
                          }
                          aria-label="移除"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 列表 */}
              {!activePlatform ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  无可发帖的平台
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="h-8 w-10 text-xs"></TableHead>
                        <TableHead className="h-8 text-xs">账号</TableHead>
                        <TableHead className="h-8 text-xs">平台ID</TableHead>
                        <TableHead className="h-8 text-xs">状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedAccounts.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-6 text-center text-xs text-muted-foreground"
                          >
                            无符合条件的账号
                          </TableCell>
                        </TableRow>
                      ) : (
                        pagedAccounts.map((a) => {
                          const platform = a.platform as Platform;
                          const checked = picked[platform] === a.id;
                          return (
                            <TableRow
                              key={a.id}
                              className="cursor-pointer"
                              onClick={() => selectAccount(platform, a.id)}
                            >
                              <TableCell className="py-2">
                                <input
                                  type="radio"
                                  name={`acct-${platform}`}
                                  checked={checked}
                                  onChange={() => {}}
                                  className="h-3.5 w-3.5 cursor-pointer"
                                />
                              </TableCell>
                              <TableCell className="py-2 text-xs font-medium text-foreground">
                                {a.username}
                              </TableCell>
                              <TableCell className="py-2 font-mono text-[11px] text-muted-foreground">
                                {a.platformId}
                              </TableCell>
                              <TableCell className="py-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-normal",
                                    ACCOUNT_STATUS_META[a.accountStatus].cls,
                                  )}
                                >
                                  {ACCOUNT_STATUS_META[a.accountStatus].label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  {candidateAccounts.length > ACCT_PAGE_SIZE && (
                    <PaginationBar
                      page={acctPage}
                      totalPages={acctTotalPages}
                      total={candidateAccounts.length}
                      setPage={setAcctPage}
                    />
                  )}
                </div>
              )}
            </div>
          </FormItem>



          <FormItem label="执行时间 *">
            <div className="space-y-2 rounded-md border p-3 text-xs">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={execTime === "now"}
                  onChange={() => setExecTime("now")}
                />
                立即执行
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={execTime === "scheduled"}
                    onChange={() => setExecTime("scheduled")}
                  />
                  指定时间开始执行
                </label>
                <Input
                  type="date"
                  value={schDate}
                  onChange={(e) => setSchDate(e.target.value)}
                  disabled={execTime !== "scheduled"}
                  className="h-7 w-36 text-xs"
                />
                <Input
                  type="time"
                  value={schTime}
                  onChange={(e) => setSchTime(e.target.value)}
                  disabled={execTime !== "scheduled"}
                  className="h-7 w-24 text-xs"
                />
              </div>
            </div>
          </FormItem>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
