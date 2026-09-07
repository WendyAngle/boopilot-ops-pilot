import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Upload,
  Trash2,
  Sparkles,
  Zap,
  
  Brush,
  MousePointerClick,
  Play,
  Pause,
  Download,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  FolderOpen,
  RotateCcw,
  Image as ImageIcon,
  Cpu,
  ChevronDown,
  ChevronUp,
  Undo2,
  Redo2,
  HelpCircle,
  History,
  X,
  SkipBack,
  SkipForward,
  Edit3,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getActiveModelsByModules } from "@/lib/models-mock";
import { useTenantDiscountFor } from "@/lib/use-billing-pricing";
import { PricingFooter } from "@/components/pricing-footer";
import { cn } from "@/lib/utils";

const SAMPLE_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export const Route = createFileRoute("/_app/ai/erase")({
  component: ContentErasePage,
  head: () => ({ meta: [{ title: "内容消除 — BooPilot" }] }),
});

type EraseMode = "smart" | "brush";
type Status = "idle" | "processing" | "done";
type MediaType = "video" | "image";

type Region = {
  id: string;
  index: number;
  mode: EraseMode;
  startTime: string;
  endTime: string;
  startSec?: number;
  endSec?: number;
  thumbColor: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const SAMPLE_THUMB =
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=70";
const SAMPLE_IMAGE_THUMB =
  "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=900&q=70";

const HISTORY_KEY = "erase.history.v1";

type HistoryRecord = {
  id: string;
  mediaType: MediaType;
  videoName: string;
  thumb: string;
  regionCount: number;
  createdAt: number;
};

function loadHistory(): HistoryRecord[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveHistory(list: HistoryRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 5)));
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(ms).padStart(3, "0")}`;
}

function ContentErasePage() {
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("auto");
  const [mode, setMode] = useState<EraseMode>("smart");
  const [brushSize, setBrushSize] = useState([34]);
  const [showRegions, setShowRegions] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(128.725);
  const [regions, setRegions] = useState<Region[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>("auto");

  // Undo/redo history
  const [undoStack, setUndoStack] = useState<Region[][]>([]);
  const [redoStack, setRedoStack] = useState<Region[][]>([]);

  // Collapsible sections
  const [openSec, setOpenSec] = useState({
    media: true,
    erase: true,
    model: true,
    regions: true,
  });

  // Canvas zoom (UI-only)
  const [zoom, setZoom] = useState(100);

  // Cursor preview
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  // Hover region for inline delete
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);

  // Before/After slider
  const [compareValue, setCompareValue] = useState([50]);

  // History
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  useEffect(() => setHistory(loadHistory()), []);

  const availableModels = useMemo(
    () => getActiveModelsByModules(mediaType === "image" ? "image_erase" : "video_erase"),
    [mediaType],
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const isImage = mediaType === "image";
  const previewBg = videoUrl || (isImage ? SAMPLE_IMAGE_THUMB : SAMPLE_THUMB);

  const pushHistory = (next: Region[]) => {
    setUndoStack((s) => [...s, regions]);
    setRedoStack([]);
    setRegions(next);
  };

  const undo = () => {
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setRedoStack((r) => [...r, regions]);
      setRegions(prev);
      return s.slice(0, -1);
    });
  };
  const redo = () => {
    setRedoStack((s) => {
      if (s.length === 0) return s;
      const next = s[s.length - 1];
      setUndoStack((u) => [...u, regions]);
      setRegions(next);
      return s.slice(0, -1);
    });
  };

  const handleUpload = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setRegions([]);
    setUndoStack([]);
    setRedoStack([]);
    setResultUrl(null);
    setStatus("idle");
    toast.success(`已上传：${file.name}`);
  };

  const switchMediaType = (t: MediaType) => {
    if (t === mediaType) return;
    setMediaType(t);
    setVideoUrl(null);
    setVideoName("");
    setRegions([]);
    setUndoStack([]);
    setRedoStack([]);
    setResultUrl(null);
    setStatus("idle");
    setMode("smart");
    setPlaying(false);
    setCurrentTime(0);
    setModelId("auto");
  };

  const handleUseSample = () => {
    setVideoUrl(isImage ? SAMPLE_IMAGE_THUMB : SAMPLE_THUMB);
    setVideoName(isImage ? "sample-photo.jpg" : "sample-clip.mp4");
    setRegions([]);
    setUndoStack([]);
    setRedoStack([]);
    setResultUrl(null);
    setStatus("idle");
  };

  const removeVideo = () => {
    setVideoUrl(null);
    setVideoName("");
    setRegions([]);
    setUndoStack([]);
    setRedoStack([]);
    setResultUrl(null);
    setStatus("idle");
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 100;
    const cy = ((e.clientY - rect.top) / rect.height) * 100;
    const sizePct = (brushSize[0] / rect.width) * 100;
    const w = mode === "brush" ? Math.max(sizePct * 2, 10) : Math.max(sizePct * 1.4, 8);
    const h = mode === "brush" ? Math.max(sizePct * 0.8, 6) : Math.max(sizePct * 1.4, 8);
    const palette = [
      "bg-orange-500/70",
      "bg-rose-500/70",
      "bg-sky-500/70",
      "bg-emerald-500/70",
      "bg-violet-500/70",
    ];
    const endSec = Math.min(currentTime + 2.5, duration);
    pushHistory([
      ...regions,
      {
        id: `r-${Date.now()}`,
        index: regions.length + 1,
        mode,
        startTime: isImage ? "—" : fmtTime(currentTime),
        endTime: isImage ? "—" : fmtTime(endSec),
        startSec: isImage ? undefined : currentTime,
        endSec: isImage ? undefined : endSec,
        thumbColor: palette[regions.length % palette.length],
        x: Math.max(0, Math.min(100 - w, cx - w / 2)),
        y: Math.max(0, Math.min(100 - h, cy - h / 2)),
        w,
        h,
      },
    ]);
  };

  const removeRegion = (id: string) => {
    pushHistory(
      regions.filter((r) => r.id !== id).map((r, i) => ({ ...r, index: i + 1 })),
    );
  };

  const resetAll = () => {
    if (regions.length === 0) return;
    pushHistory([]);
    setResultUrl(null);
    setStatus("idle");
    toast.info("已清空所有标注");
  };

  // 模拟播放
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setCurrentTime((c) => {
        const n = c + 0.1;
        if (n >= duration) {
          setPlaying(false);
          return 0;
        }
        return n;
      });
    }, 100);
    return () => clearInterval(t);
  }, [playing, duration]);

  // 积分预估 — 按当前租户套餐折扣
  const baseCost = 5;
  const perRegion = 3;
  const rawCost = baseCost + regions.length * perRegion;
  const pricing = useTenantDiscountFor(isImage ? "image_erase" : "video_erase", rawCost);
  const memberCost = pricing.final;
  const saved = pricing.saved;

  // 处理中 ETA
  const etaSec = status === "processing" ? Math.max(1, Math.ceil(((100 - progress) / 100) * 12)) : 0;

  // 按钮 disabled 原因
  const blockReason = !videoUrl
    ? `请先上传${isImage ? "图片" : "视频"}`
    : regions.length === 0
      ? "请至少标注一个消除区域"
      : null;

  const recordHistory = () => {
    const rec: HistoryRecord = {
      id: `h-${Date.now()}`,
      mediaType,
      videoName: videoName || (isImage ? "image" : "video"),
      thumb: previewBg,
      regionCount: regions.length,
      createdAt: Date.now(),
    };
    const next = [rec, ...history].slice(0, 5);
    setHistory(next);
    saveHistory(next);
  };

  const quickRemoveWatermark = () => {
    let url = videoUrl;
    if (!url) {
      url = isImage ? SAMPLE_IMAGE_THUMB : SAMPLE_THUMB;
      setVideoUrl(url);
      setVideoName(isImage ? "sample-photo.jpg" : "sample-clip.mp4");
      toast.info("已自动载入示例素材用于演示");
    }
    const w = 22;
    const h = 10;
    const watermarkRegion: Region = {
      id: `r-${Date.now()}`,
      index: 1,
      mode: "smart",
      startTime: isImage ? "—" : "00:00",
      endTime: isImage ? "—" : fmtTime(duration),
      startSec: isImage ? undefined : 0,
      endSec: isImage ? undefined : duration,
      thumbColor: "bg-orange-500/70",
      x: 100 - w - 3,
      y: 100 - h - 4,
      w,
      h,
    };
    setMode("smart");
    pushHistory([watermarkRegion]);
    setResultUrl(null);
    setStatus("processing");
    setProgress(0);
    toast.success("已识别水印区域，开始一键消除");
    const t = setInterval(() => {
      setProgress((p) => {
        const n = p + Math.random() * 10 + 4;
        if (n >= 100) {
          clearInterval(t);
          setStatus("done");
          setResultUrl(url);
          recordHistory();
          toast.success("水印消除完成");
          return 100;
        }
        return n;
      });
    }, 300);
  };

  const startProcess = () => {
    if (blockReason) {
      toast.error(blockReason);
      return;
    }
    setStatus("processing");
    setProgress(0);
    setResultUrl(null);
    const t = setInterval(() => {
      setProgress((p) => {
        const n = p + Math.random() * 8 + 3;
        if (n >= 100) {
          clearInterval(t);
          setStatus("done");
          setResultUrl(videoUrl);
          recordHistory();
          toast.success("内容消除完成");
          return 100;
        }
        return n;
      });
    }, 320);
  };

  const restoreHistory = (h: HistoryRecord) => {
    switchMediaType(h.mediaType);
    setTimeout(() => {
      setVideoUrl(h.thumb);
      setVideoName(h.videoName);
      toast.success(`已回填：${h.videoName}`);
    }, 0);
  };

  const sectionToggle = (k: keyof typeof openSec) =>
    setOpenSec((s) => ({ ...s, [k]: !s[k] }));

  const eraseSummary = `${mode === "smart" ? "智能笔" : "涂抹笔"} · 画笔 ${brushSize[0]}`;
  const regionsSummary = regions.length === 0 ? "尚未标注" : `共 ${regions.length} 个区域`;
  const modelSummary = modelId === "auto"
    ? "系统自动推荐"
    : availableModels.find((m) => m.id === modelId)?.name || "系统自动推荐";
  const mediaSummary = videoUrl ? videoName : "未上传";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* ===== Top quick bar (对齐视频生成模块) ===== */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">内容消除工作台</span>
            <Badge variant="secondary" className="text-[10px]">
              {isImage ? "图片消除" : "视频消除"}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" className="w-80 text-xs leading-relaxed">
                {isImage
                  ? "一键去除图片中的水印、文字、Logo 或多余物体，AI 智能填充背景。「智能笔」自动识别主体，「涂抹笔」精细涂抹任意区域。"
                  : "一键去除视频中的水印、字幕、Logo 或穿帮物体。「智能笔」追踪移动物体，「涂抹笔」涂抹固定区域，AI 自动逐帧重绘补全。"}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <History className="h-3.5 w-3.5" /> 历史记录
                  {history.length > 0 && (
                    <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                      {history.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                {history.length === 0 ? (
                  <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                    暂无历史记录
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {history.map((h) => (
                      <li key={h.id}>
                        <button
                          onClick={() => restoreHistory(h)}
                          className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-muted"
                        >
                          <div
                            className="h-10 w-14 shrink-0 rounded bg-cover bg-center"
                            style={{ backgroundImage: `url(${h.thumb})` }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{h.videoName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {h.mediaType === "image" ? "图片" : "视频"} · {h.regionCount} 区域 ·{" "}
                              {new Date(h.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              onClick={quickRemoveWatermark}
              className="h-8 gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm hover:opacity-90"
            >
              <Sparkles className="h-3.5 w-3.5" />
              一键消除水印
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={resetAll}
              disabled={regions.length === 0}
            >
              <RotateCcw className="h-3.5 w-3.5" /> 重置标注
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[400px_1fr]">
          {/* Left panel */}
          <Card className="flex flex-col overflow-hidden p-0 shadow-[var(--shadow-card)]">
            <div className="border-b border-border/60 px-5 py-4">
              <h2 className="text-base font-semibold">内容消除</h2>
              <p className="mt-1 text-xs text-muted-foreground">分组配置标注参数，下方查看实时摘要</p>
            </div>

            {/* Media type tabs (与视频生成模块的模式切换风格一致) */}
            <div className="px-5 pt-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1">
                {([
                  { v: "video", label: "视频消除", icon: Play },
                  { v: "image", label: "图片消除", icon: ImageIcon },
                ] as const).map((t) => (
                  <button
                    key={t.v}
                    onClick={() => switchMediaType(t.v)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      mediaType === t.v
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-3 p-3">
              {/* 素材 */}
              <Section
                icon={<Upload className="h-3.5 w-3.5" />}
                title={isImage ? "素材（图片）" : "素材（视频）"}
                summary={mediaSummary}
                open={openSec.media}
                onToggle={() => sectionToggle("media")}
                required
              >
                {!videoUrl ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className="group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/70 bg-muted/40 px-4 py-6 text-center transition hover:border-primary/60 hover:bg-primary/5"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                    <span className="text-sm font-medium">
                      {isImage ? "点击上传图片" : "点击上传视频"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {isImage
                        ? "JPG / PNG / WEBP / BMP · ≤ 30MB · 推荐 ≤ 4096px"
                        : "MP4 / MOV / MKV / FLV / WMV / WEBM · ≤ 500MB"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseSample();
                      }}
                      className="mt-1 text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {isImage ? "或使用示例图片" : "或使用示例视频"}
                    </button>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-lg border border-border/60 bg-black">
                    <div
                      className={cn(
                        "relative w-full bg-cover bg-center",
                        isImage ? "aspect-[4/3]" : "aspect-video",
                      )}
                      style={{ backgroundImage: `url(${previewBg})` }}
                    >
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-white">
                        <span className="line-clamp-1 max-w-[60%]">{videoName}</span>
                        <span>{isImage ? "1920 × 1280" : fmtTime(duration)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={isImage ? "image/*" : "video/*"}
                  hidden
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              </Section>

              {/* 消除设置 */}
              <Section
                icon={<Brush className="h-3.5 w-3.5" />}
                title="消除设置"
                summary={eraseSummary}
                open={openSec.erase}
                onToggle={() => sectionToggle("erase")}
              >
                <div className="grid grid-cols-2 gap-2">
                  <ModeCard
                    active={mode === "smart"}
                    onClick={() => setMode("smart")}
                    icon={MousePointerClick}
                    title="智能笔"
                    desc={isImage ? "点选主体，AI 自动勾边" : "点选移动物体，自动追踪"}
                  />
                  <ModeCard
                    active={mode === "brush"}
                    onClick={() => setMode("brush")}
                    icon={Brush}
                    title="涂抹笔"
                    desc={isImage ? "自由涂抹任意区域" : "涂抹固定区域，如字幕"}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">画笔大小</Label>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {brushSize[0]}
                    </span>
                  </div>
                  <Slider
                    value={brushSize}
                    onValueChange={setBrushSize}
                    min={8}
                    max={120}
                    step={1}
                  />
                </div>
              </Section>

              {/* AI 模型 */}
              <Section
                icon={<Cpu className="h-3.5 w-3.5" />}
                title="AI 模型"
                summary={modelSummary}
                open={openSec.model}
                onToggle={() => sectionToggle("model")}
                required
              >
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger className="h-9">
                    <div className="flex items-center gap-2 truncate">
                      <Cpu className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">系统自动推荐</span>
                        <span className="text-[11px] text-muted-foreground">· 智能匹配最优模型</span>
                      </div>
                    </SelectItem>
                    {availableModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.name}</span>
                          {m.vendor && (
                            <span className="text-[11px] text-muted-foreground">
                              · {m.vendor}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Section>

              {/* 已选区域 */}
              <Section
                icon={<Edit3 className="h-3.5 w-3.5" />}
                title="已选区域"
                summary={regionsSummary}
                open={openSec.regions}
                onToggle={() => sectionToggle("regions")}
              >
                {regions.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>共 {regions.length} 个</span>
                    <button
                      onClick={resetAll}
                      className="text-destructive hover:underline"
                    >
                      全部清空
                    </button>
                  </div>
                )}
                <div className="min-h-[160px] rounded-lg border border-dashed border-border/70 bg-muted/30 p-2">
                  {regions.length === 0 ? (
                    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-center">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-background shadow-sm">
                        {isImage ? (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
                        ) : (
                          <Play className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        在右侧画面上{mode === "smart" ? "点选" : "涂抹"}需要消除的对象
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {regions.map((r) => (
                        <li
                          key={r.id}
                          onMouseEnter={() => setHoverRegion(r.id)}
                          onMouseLeave={() => setHoverRegion(null)}
                          className={cn(
                            "flex items-center gap-2 rounded-md border bg-background p-1.5 transition",
                            hoverRegion === r.id
                              ? "border-primary/60 shadow-sm"
                              : "border-border/60",
                          )}
                        >
                          <div
                            className="relative h-9 w-12 shrink-0 overflow-hidden rounded-sm bg-cover bg-center"
                            style={{ backgroundImage: `url(${previewBg})` }}
                          >
                            <span className={cn("absolute inset-0 mix-blend-multiply", r.thumbColor)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-xs font-medium">
                              区域{r.index}
                              <span className="text-[10px] font-normal text-muted-foreground">
                                ({r.mode === "smart" ? "点选" : "涂抹"})
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {isImage
                                ? `位置 ${Math.round(r.x)}, ${Math.round(r.y)}`
                                : `${r.startTime} → ${r.endTime}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRegion(r.id)}
                            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className="space-y-2 border-t border-border/60 px-4 py-3">
              <PricingFooter pricing={pricing} />

              <Button
                onClick={startProcess}
                disabled={status === "processing" || !!blockReason || pricing.disabled}
                title={pricing.disabled ? pricing.disabledReason : undefined}
                className="h-11 w-full text-base font-medium"
              >
                {pricing.disabled ? (
                  pricing.disabledReason ?? "当前套餐不可用"
                ) : status === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 处理中… {Math.floor(progress)}%
                  </>
                ) : blockReason ? (
                  blockReason
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    开始处理
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Right preview */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              {/* 画布工具栏 */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 px-3 py-2">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={undo}
                        disabled={undoStack.length === 0}
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>撤销</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={redo}
                        disabled={redoStack.length === 0}
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>重做</TooltipContent>
                  </Tooltip>
                </div>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showRegions}
                    onCheckedChange={setShowRegions}
                    id="show-regions"
                  />
                  <Label htmlFor="show-regions" className="cursor-pointer text-xs">
                    {showRegions ? <Eye className="inline h-3.5 w-3.5" /> : <EyeOff className="inline h-3.5 w-3.5" />}
                    <span className="ml-1">显示区域</span>
                  </Label>
                </div>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom((z) => Math.max(50, z - 10))}
                  >
                    <span className="text-sm">−</span>
                  </Button>
                  <span className="w-12 text-center text-xs tabular-nums">{zoom}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom((z) => Math.min(200, z + 10))}
                  >
                    <span className="text-sm">+</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setZoom(100)}
                  >
                    适应
                  </Button>
                </div>
                <div className="ml-auto text-[11px] text-muted-foreground">
                  {mode === "smart"
                    ? isImage ? "智能笔：点选主体，AI 自动识别" : "智能笔：点选移动物体"
                    : isImage ? "涂抹笔：自由涂抹任意区域" : "涂抹笔：涂抹固定区域"}
                </div>
              </div>

              {/* 处理中：顶部细进度条 */}
              {status === "processing" && (
                <div className="h-1 w-full overflow-hidden bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* 画布 */}
              <div className="bg-black">
                <div className="mx-auto overflow-hidden" style={{ width: `${zoom}%` }}>
                  <div
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    onMouseMove={(e) => {
                      if (!videoUrl) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setCursor({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }}
                    onMouseLeave={() => setCursor(null)}
                    className={cn(
                      "relative mx-auto w-full max-w-[820px] select-none bg-cover bg-center",
                      isImage ? "aspect-[4/3]" : "aspect-video",
                      videoUrl
                        ? mode === "brush"
                          ? "cursor-crosshair"
                          : "cursor-pointer"
                        : "cursor-default",
                    )}
                    style={
                      videoUrl
                        ? { backgroundImage: `url(${previewBg})` }
                        : { background: "linear-gradient(135deg,#1a1a1a,#0a0a0a)" }
                    }
                  >
                    {!videoUrl && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white/80">
                        <Upload className="h-10 w-10" />
                        <p className="text-sm">请先上传{isImage ? "图片" : "视频"}</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4" />
                            上传素材
                          </Button>
                          <Button size="sm" variant="secondary" onClick={handleUseSample}>
                            使用示例
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* 画笔光标预览 */}
                    {videoUrl && cursor && status !== "processing" && (
                      <div
                        className="pointer-events-none absolute rounded-full border-2 border-white/80 mix-blend-difference"
                        style={{
                          left: cursor.x - brushSize[0] / 2,
                          top: cursor.y - brushSize[0] / 2,
                          width: brushSize[0],
                          height: brushSize[0],
                        }}
                      />
                    )}

                    {/* 区域标记 */}
                    {videoUrl && showRegions &&
                      regions.map((r) => (
                        <div
                          key={r.id}
                          className={cn(
                            "group absolute",
                            hoverRegion === r.id && "z-10",
                          )}
                          style={{
                            left: `${r.x}%`,
                            top: `${r.y}%`,
                            width: `${r.w}%`,
                            height: `${r.h}%`,
                          }}
                          onMouseEnter={() => setHoverRegion(r.id)}
                          onMouseLeave={() => setHoverRegion(null)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className={cn(
                              "absolute inset-0 border-2 border-white/90 shadow transition",
                              r.mode === "brush" ? "rounded-md" : "rounded-full",
                              r.thumbColor,
                              hoverRegion === r.id && "ring-2 ring-primary",
                            )}
                          />
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow">
                            区域{r.index}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRegion(r.id);
                            }}
                            className={cn(
                              "absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow transition",
                              hoverRegion === r.id ? "opacity-100" : "opacity-0",
                            )}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                    {/* 处理中遮罩（半透明卡片） */}
                    {status === "processing" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-3 rounded-xl bg-background/95 px-6 py-5 shadow-xl">
                          <div className="relative h-16 w-16">
                            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                              <circle
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                strokeWidth="3"
                                className="stroke-muted"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                strokeWidth="3"
                                strokeDasharray={`${(progress / 100) * 94.25} 94.25`}
                                className="stroke-primary transition-all"
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 grid place-items-center text-sm font-semibold">
                              {Math.floor(progress)}%
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              {isImage ? "AI 智能填充背景中" : "AI 正在逐帧重绘补全"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              预计剩余 {etaSec} 秒
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info("已转后台处理，可在历史记录查看")}
                          >
                            后台处理
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 时间轴（仅视频） */}
                {!isImage && (
                  <div className="flex items-center gap-3 border-t border-white/10 bg-black px-4 py-3 text-white">
                    <button
                      type="button"
                      onClick={() => setCurrentTime((t) => Math.max(0, t - 5))}
                      disabled={!videoUrl}
                      className="grid h-7 w-7 place-items-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-40"
                    >
                      <SkipBack className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaying((p) => !p)}
                      disabled={!videoUrl}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentTime((t) => Math.min(duration, t + 5))}
                      disabled={!videoUrl}
                      className="grid h-7 w-7 place-items-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-40"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-xs tabular-nums text-white/80">
                      {fmtTime(currentTime)} / {fmtTime(duration)}
                    </span>
                    <div className="relative flex-1">
                      <div className="h-1.5 w-full rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                      {regions.map((r) => {
                        const start = r.startSec ?? 0;
                        const end = r.endSec ?? duration;
                        const left = (start / duration) * 100;
                        const width = ((end - start) / duration) * 100;
                        return (
                          <span
                            key={r.id}
                            className={cn(
                              "absolute top-1/2 h-2 -translate-y-1/2 rounded-sm border border-white/50",
                              r.thumbColor,
                            )}
                            style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                            title={`区域${r.index}：${r.startTime} → ${r.endTime}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 结果区 */}
            {status === "done" && resultUrl && (
              <Card className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <h2 className="text-base font-semibold">处理完成</h2>
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      消除 {regions.length} 处
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => toast.success("已创建发帖任务")}>
                      <Send className="h-4 w-4" />
                      一键发帖
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success("已保存至成片素材")}
                    >
                      <FolderOpen className="h-4 w-4" />
                      保存至成片素材
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success(isImage ? "图片已下载" : "视频已下载")}
                    >
                      <Download className="h-4 w-4" />
                      下载到本地
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatus("idle");
                        setResultUrl(null);
                        startProcess();
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      重新处理
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatus("idle");
                        setResultUrl(null);
                        toast.info("已返回编辑，可继续标注");
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                      继续编辑
                    </Button>
                  </div>
                </div>

                {/* Before/After 拖动对比 */}
                <BeforeAfterCompare
                  beforeSrc={previewBg}
                  afterSrc={resultUrl}
                  mediaType={mediaType}
                  value={compareValue[0]}
                  onChange={(v) => setCompareValue([v])}
                />

                <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span>
                    {isImage ? "1920 × 1280 · PNG" : "1080P · MP4"}
                  </span>
                  <span>拖动中间分隔条查看「处理前」与「处理后」对比</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ---------- 子组件 ---------- */


function Section({
  icon,
  title,
  summary,
  open,
  onToggle,
  required,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-sm font-medium leading-tight">
              {title}
              {required && <span className="text-destructive">*</span>}
            </div>
            {!open && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{summary}</div>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <div className="space-y-2.5 border-t border-border/40 px-3 pb-3 pt-3">{children}</div>}
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border-2 p-2.5 text-left transition active:scale-[0.98]",
        active
          ? "border-primary bg-primary/5"
          : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold",
          active && "text-primary",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">{desc}</p>
    </button>
  );
}

function BeforeAfterCompare({
  beforeSrc,
  afterSrc,
  mediaType,
  value,
  onChange,
}: {
  beforeSrc: string;
  afterSrc: string;
  mediaType: MediaType;
  value: number;
  onChange: (v: number) => void;
}) {
  const isImage = mediaType === "image";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange(pct);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none overflow-hidden rounded-lg border border-border/60 bg-black",
        isImage ? "aspect-[4/3]" : "aspect-video",
      )}
      onMouseDown={(e) => {
        draggingRef.current = true;
        setFromClientX(e.clientX);
      }}
      onMouseMove={(e) => {
        if (draggingRef.current) setFromClientX(e.clientX);
      }}
      onMouseUp={() => (draggingRef.current = false)}
      onMouseLeave={() => (draggingRef.current = false)}
    >
      {/* After (full) */}
      {isImage ? (
        <div
          className="absolute inset-0 cursor-zoom-in bg-cover bg-center"
          style={{ backgroundImage: `url(${afterSrc})` }}
          onDoubleClick={() => setOpen(true)}
        />
      ) : (
        <video
          src={afterSrc || SAMPLE_VIDEO_URL}
          poster={SAMPLE_THUMB}
          className="absolute inset-0 h-full w-full bg-black object-contain"
          controls
        />
      )}
      {/* Before clipped */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${value}%` }}
      >
        {isImage ? (
          <div
            className="h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${beforeSrc})`, width: containerRef.current?.clientWidth }}
          />
        ) : (
          <div
            className="h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${beforeSrc})`, width: containerRef.current?.clientWidth }}
          />
        )}
      </div>

      {/* Divider */}
      <div
        className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-white"
        style={{ left: `${value}%` }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-8 w-8 cursor-ew-resize place-items-center rounded-full bg-white shadow-lg">
            <span className="text-foreground">⇄</span>
          </div>
        </div>
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
        处理前
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-primary/90 px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
        处理后
      </span>

      {isImage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl p-4">
            <DialogHeader>
              <DialogTitle>处理后预览</DialogTitle>
            </DialogHeader>
            <img src={afterSrc} alt="result" className="w-full rounded-md" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
