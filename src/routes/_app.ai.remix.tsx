import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, Music2, Smile, Globe2, Type, ChevronRight, ChevronDown, ChevronUp,
  Plus, Trash2, History, Eraser, Upload, ImageIcon, Video as VideoIcon, GripVertical,
  Copy, Sparkles, Play, Pause, Send, Save, Download, X, Cpu, FolderOpen,
  Clapperboard, HelpCircle, RotateCcw, RefreshCw, ArrowUp, ArrowDown, Settings2, Captions,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TagMultiSelect } from "@/components/tag-multi-select";
import {
  PLATFORM_LIMITS, CreatePostTaskDialog, type Platform, type PostItem,
} from "@/routes/_app.materials.posts";
import { getActiveModelsByModules } from "@/lib/models-mock";
import { MaterialPicker } from "@/components/material-picker";
import { useBillingPricing } from "@/lib/use-billing-pricing";
import { PricingFooter } from "@/components/pricing-footer";
import { cn } from "@/lib/utils";
import { getPresets } from "@/lib/ai-presets-mock";
import { SUBTITLE_PRESETS, type SubtitlePreset } from "@/lib/subtitle-presets";

export const Route = createFileRoute("/_app/ai/remix")({
  component: VideoRemixPage,
  head: () => ({ meta: [{ title: "视频混剪 — BooPilot" }] }),
});

type Status = "idle" | "loading" | "done";

// 配音音色 / 背景音乐 / 字幕样式：从「AI 预设物料」拉取
const VOICES = getPresets()
  .filter((p) => p.category === "voiceover" && p.status === "active")
  .map((p) => p.name);
const EMOTIONS = ["默认/平和", "热情活泼", "深情款款", "严肃正式", "幽默轻松"];
const BGM = getPresets()
  .filter((p) => p.category === "bgm" && p.status === "active")
  .map((p) => p.name);
const LANGS = ["中文(简体)", "中文(繁体)", "English", "日本語", "한국어", "Español"];

type Shot = {
  id: string;
  voiceover: string;
  description: string;
  materialType: "video" | "image";
  materialUrl?: string;
  materialName?: string;
};

type Segment = {
  id: string;
  duration: number;
  collapsed: boolean;
  shots: Shot[];
};

type ScriptTemplate = {
  id: string;
  name: string;
  desc: string;
  createdAt: string;
};

const MOCK_HISTORY: ScriptTemplate[] = [
  { id: "h-1", name: "降噪耳机·爆款脚本 v3", desc: "通勤场景三段式：痛点-展示-行动召唤", createdAt: "2026-05-28 14:40:47" },
  { id: "h-2", name: "智能水杯·内容种草", desc: "晨练-办公-夜跑全天候演绎", createdAt: "2026-05-22 09:18:12" },
  { id: "h-3", name: "便携投影·开箱测评", desc: "强调对比效果与多场景适配", createdAt: "2026-05-15 16:02:35" },
  { id: "h-4", name: "美瞳·情绪化短剧", desc: "暧昧光影 + 大眼特写，强情绪带货", createdAt: "2026-04-30 11:25:08" },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function newShot(): Shot {
  return { id: uid("sh"), voiceover: "", description: "", materialType: "video" };
}

function newSegment(): Segment {
  return { id: uid("seg"), duration: 5, collapsed: false, shots: [newShot()] };
}

type RecentItem = { id: string; title: string; createdAt: string; segmentsCount: number; totalShots: number; duration: number };
type LocalTpl = { id: string; name: string; desc: string; createdAt: string; segments: Segment[] };

const RECENT_KEY = "remix:recent";
const TPL_KEY = "remix:templates";

function readLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function writeLS<T>(key: string, v: T) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

function VideoRemixPage() {
  const [segments, setSegments] = useState<Segment[]>([newSegment()]);
  const [voice, setVoice] = useState("");
  const [lang, setLang] = useState(LANGS[0]);
  const [emotion, setEmotion] = useState(EMOTIONS[0]);
  const [bgm, setBgm] = useState("");
  const [subtitleOn, setSubtitleOn] = useState(true);
  const [subStyle, setSubStyle] = useState<SubtitlePreset>(SUBTITLE_PRESETS[0]);
  const [subtitleOpen, setSubtitleOpen] = useState(false);
  const [subPos, setSubPos] = useState("底部");
  const [subSize, setSubSize] = useState("32px");
  const [platform, setPlatform] = useState<Platform>("Tiktok");
  const [aiModel, setAiModel] = useState("auto");
  const availableAiModels = useMemo(() => getActiveModelsByModules("remix"), []);

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [etaSec, setEtaSec] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveScriptOpen, setSaveScriptOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [postTaskOpen, setPostTaskOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // Section collapse states
  const [openScript, setOpenScript] = useState(true);
  const [openVoice, setOpenVoice] = useState(true);
  const [openAudio, setOpenAudio] = useState(true);
  const [openOutput, setOpenOutput] = useState(true);
  const [openModel, setOpenModel] = useState(true);

  // localStorage-driven workbench data
  const [recent, setRecent] = useState<RecentItem[]>(() => readLS<RecentItem[]>(RECENT_KEY, []));
  const [tpls, setTpls] = useState<LocalTpl[]>(() => readLS<LocalTpl[]>(TPL_KEY, []));
  useEffect(() => writeLS(RECENT_KEY, recent), [recent]);
  useEffect(() => writeLS(TPL_KEY, tpls), [tpls]);

  const totalDuration = segments.reduce((acc, s) => acc + s.duration, 0);
  const totalShots = segments.reduce((acc, s) => acc + s.shots.length, 0);

  const updateSegment = (id: string, patch: Partial<Segment>) =>
    setSegments((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateShot = (segId: string, shotId: string, patch: Partial<Shot>) =>
    setSegments((arr) =>
      arr.map((s) =>
        s.id === segId
          ? { ...s, shots: s.shots.map((sh) => (sh.id === shotId ? { ...sh, ...patch } : sh)) }
          : s,
      ),
    );
  const addSegment = () => setSegments((arr) => [...arr, newSegment()]);
  const removeSegment = (id: string) =>
    setSegments((arr) => (arr.length > 1 ? arr.filter((s) => s.id !== id) : arr));
  const moveSegment = (id: string, dir: -1 | 1) =>
    setSegments((arr) => {
      const i = arr.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return arr;
      const next = arr.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const addShot = (segId: string) =>
    updateSegment(segId, { shots: [...(segments.find((s) => s.id === segId)?.shots ?? []), newShot()] });
  const removeShot = (segId: string, shotId: string) => {
    const seg = segments.find((s) => s.id === segId);
    if (!seg || seg.shots.length <= 1) return;
    updateSegment(segId, { shots: seg.shots.filter((sh) => sh.id !== shotId) });
  };
  const clearAll = () => {
    setSegments([newSegment()]);
    toast.success("已清空脚本");
  };
  const resetAll = () => {
    setSegments([newSegment()]);
    setVoice(""); setBgm(""); setLang(LANGS[0]); setEmotion(EMOTIONS[0]);
    setSubtitleOn(true); setSubStyle(SUBTITLE_PRESETS[0]); setSubPos("底部"); setSubSize("32px");
    setPlatform("Tiktok"); setAiModel("auto");
    setStatus("idle"); setProgress(0); setGeneratedVideoUrl(null);
    setResetOpen(false);
    toast.success("已重置全流程");
  };

  const loadHistory = (h: ScriptTemplate) => {
    setSegments([
      {
        id: uid("seg"), duration: 8, collapsed: false,
        shots: [
          { id: uid("sh"), voiceover: `场景一：${h.name} —— 痛点引入`, description: "城市夜归人群特写,镜头快速推进", materialType: "video", materialName: "city_night.mp4" },
          { id: uid("sh"), voiceover: "产品出现,聚焦特写，光影对比", description: "桌面摆设特写,环境光从冷转暖", materialType: "video", materialName: "product_close.mp4" },
        ],
      },
      {
        id: uid("seg"), duration: 6, collapsed: false,
        shots: [
          { id: uid("sh"), voiceover: "三大核心卖点逐条展示", description: "卖点字幕弹出 + 使用场景剪辑", materialType: "video", materialName: "selling_points.mp4" },
        ],
      },
      {
        id: uid("seg"), duration: 4, collapsed: false,
        shots: [
          { id: uid("sh"), voiceover: "立即下单,享首发福利", description: "结尾价格卡片 + 品牌 Logo 上扬", materialType: "image", materialName: "cta_card.png" },
        ],
      },
    ]);
    setHistoryOpen(false);
    toast.success(`已载入模板「${h.name}」`);
  };

  const saveCurrentAsTpl = () => {
    const name = window.prompt("模板名称", `混剪模板 ${tpls.length + 1}`);
    if (!name) return;
    const t: LocalTpl = {
      id: uid("tpl"), name, desc: `${segments.length} 段 · ${totalShots} 个分镜 · ${totalDuration}s`,
      createdAt: new Date().toLocaleString(),
      segments: JSON.parse(JSON.stringify(segments)),
    };
    setTpls((arr) => [t, ...arr].slice(0, 20));
    toast.success("已保存为本地模板");
  };
  const applyTpl = (t: LocalTpl) => {
    setSegments(JSON.parse(JSON.stringify(t.segments)));
    toast.success(`已载入「${t.name}」`);
  };
  const deleteTpl = (id: string) => setTpls((arr) => arr.filter((t) => t.id !== id));

  // Block reasons
  const blockReasons: string[] = [];
  if (!voice) blockReasons.push("请选择配音音色");
  if (!bgm) blockReasons.push("请选择背景音乐");
  if (totalShots === 0) blockReasons.push("请至少添加一个分镜");
  if (availableAiModels.length > 0 && !aiModel) blockReasons.push("请选择 AI 模型");
  const blocked = blockReasons.length > 0 || status === "loading";

  const pricing = useBillingPricing("remix", Math.max(1, totalShots));
  const estCredits = pricing.original;
  const finalCredits = pricing.final;

  const generate = () => {
    if (blockReasons.length > 0) return toast.error(blockReasons[0]);
    setStatus("loading");
    setProgress(0);
    const totalSec = Math.max(8, totalShots * 3);
    setEtaSec(totalSec);
    setGeneratedVideoUrl(null);
    const startedAt = Date.now();
    const t = setInterval(() => {
      setProgress((p) => {
        const np = p + Math.round(6 + Math.random() * 10);
        const remain = Math.max(0, totalSec - Math.floor((Date.now() - startedAt) / 1000));
        setEtaSec(remain);
        if (np >= 100) {
          clearInterval(t);
          setStatus("done");
          setEtaSec(0);
          setGeneratedVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
          const r: RecentItem = {
            id: uid("rec"), title: `混剪 · ${platform}`, createdAt: new Date().toLocaleString(),
            segmentsCount: segments.length, totalShots, duration: totalDuration,
          };
          setRecent((arr) => [r, ...arr].slice(0, 5));
          return 100;
        }
        return np;
      });
    }, 320);
  };

  const subtitleSummary = subtitleOn ? `${subStyle.name} · ${subPos} · ${subSize}` : "已关闭";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        {/* ============== Workbench top bar ============== */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clapperboard className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold">视频混剪工作台</h1>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {status === "loading" ? "生成中" : status === "done" ? "已完成" : "草稿"}
                </Badge>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground" aria-label="说明">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-xs leading-relaxed">
                    按分镜组织视频脚本,AI 自动匹配镜头、配音、字幕与节奏。支持载入历史模板与一键复用,大幅提升内容生产效率。
                  </PopoverContent>
                </Popover>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                当前 {segments.length} 段 · {totalShots} 个分镜 · 总时长 {totalDuration}s
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <History className="h-3.5 w-3.5" /> 最近生成
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <div className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">最近 5 条</div>
                {recent.length === 0 ? (
                  <div className="px-2 py-6 text-center text-xs text-muted-foreground">暂无生成记录</div>
                ) : (
                  <div className="space-y-1">
                    {recent.map((r) => (
                      <div key={r.id} className="rounded-md px-2 py-1.5 hover:bg-muted/50">
                        <div className="text-xs font-medium">{r.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.segmentsCount} 段 · {r.totalShots} 分镜 · {r.duration}s · {r.createdAt}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <FileText className="h-3.5 w-3.5" /> 脚本模板
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-2">
                <div className="flex items-center justify-between px-1 pb-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">本地模板</span>
                  <button onClick={saveCurrentAsTpl} className="text-[11px] text-primary hover:underline">
                    + 保存当前
                  </button>
                </div>
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="mb-1 flex w-full items-center justify-between rounded-md border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/40"
                >
                  <span>浏览系统脚本库</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                {tpls.length === 0 ? (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">暂无本地模板</div>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {tpls.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium">{t.name}</div>
                          <div className="truncate text-[10px] text-muted-foreground">{t.desc}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={() => applyTpl(t)} className="text-[11px] text-primary hover:underline">应用</button>
                          <button onClick={() => deleteTpl(t.id)} className="text-[11px] text-destructive hover:underline">删除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-3.5 w-3.5" /> 重置全流程
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          {/* ============== Left config ============== */}
          <Card className="flex flex-col overflow-hidden p-0 shadow-[var(--shadow-card)]">
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <Section
                icon={<FileText className="h-3.5 w-3.5" />}
                title="脚本概览"
                summary={`${segments.length} 段 · ${totalShots} 个分镜 · ${totalDuration}s`}
                open={openScript}
                onToggle={() => setOpenScript((v) => !v)}
                required
              >
                <button
                  type="button"
                  onClick={() => document.getElementById("remix-script-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-left hover:border-primary/60 hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium">
                        {segments.length} 段脚本 · {totalShots} 个分镜
                      </div>
                      <div className="text-[10px] text-muted-foreground">点击右侧编辑脚本内容</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <div className="flex flex-wrap gap-1.5">
                  <Chip>共 {segments.length} 段</Chip>
                  <Chip>{totalShots} 个分镜</Chip>
                  <Chip>总时长 {totalDuration}s</Chip>
                </div>
              </Section>

              <Section
                icon={<Music2 className="h-3.5 w-3.5" />}
                title="配音设置"
                summary={`${voice || "未选音色"} · ${lang} · ${emotion}`}
                open={openVoice}
                onToggle={() => setOpenVoice((v) => !v)}
                required
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="配音音色" required>
                    <div className="flex items-center gap-1.5">
                      <IconSelect icon={<Music2 className="h-4 w-4" />} value={voice} onChange={setVoice} options={VOICES} placeholder="请选择" />
                      {voice && <PreviewButton label="音色试听" />}
                    </div>
                  </Field>
                  <Field label="配音语种" required>
                    <IconSelect icon={<Globe2 className="h-4 w-4" />} value={lang} onChange={setLang} options={LANGS} />
                  </Field>
                </div>
                <Field label="配音情绪" required>
                  <IconSelect icon={<Smile className="h-4 w-4" />} value={emotion} onChange={setEmotion} options={EMOTIONS} />
                </Field>
              </Section>

              <Section
                icon={<Captions className="h-3.5 w-3.5" />}
                title="音乐与字幕"
                summary={`BGM ${bgm || "未选"} · 字幕 ${subtitleSummary}`}
                open={openAudio}
                onToggle={() => setOpenAudio((v) => !v)}
                required
              >
                <Field label="视频背景音乐" required>
                  <div className="flex items-center gap-1.5">
                    <IconSelect icon={<Music2 className="h-4 w-4" />} value={bgm} onChange={setBgm} options={BGM} placeholder="请选择" />
                    {bgm && <PreviewButton label="BGM 试听" />}
                  </div>
                </Field>
                <div className="space-y-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">字幕效果</Label>
                    <Switch checked={subtitleOn} onCheckedChange={setSubtitleOn} />
                  </div>
                  {subtitleOn && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setSubtitleOpen(true)}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:border-primary/60"
                      >
                        <span className="flex items-center gap-2">
                          <Type className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{subStyle.name}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={subPos} onValueChange={setSubPos}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["顶部", "中部", "底部"].map((p) => (
                              <SelectItem key={p} value={p}>位置 {p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={subSize} onValueChange={setSubSize}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["24px", "28px", "32px", "36px", "40px"].map((s) => (
                              <SelectItem key={s} value={s}>字号 {s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section
                icon={<Settings2 className="h-3.5 w-3.5" />}
                title="输出设置"
                summary={`${platform} · ${totalDuration}s`}
                open={openOutput}
                onToggle={() => setOpenOutput((v) => !v)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="目标平台">
                    <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["Tiktok", "Instagram", "Facebook", "Twitter/X", "WhatsApp"] as Platform[]).map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="总时长">
                    <div className="flex h-9 items-center rounded-md border border-input bg-muted/20 px-3 text-sm">
                      <span className="font-semibold text-foreground">{totalDuration}</span>
                      <span className="ml-1 text-muted-foreground">秒</span>
                    </div>
                  </Field>
                </div>
              </Section>

              <Section
                icon={<Cpu className="h-3.5 w-3.5" />}
                title="AI 模型"
                summary={aiModel === "auto" ? "系统自动推荐" : availableAiModels.find((m) => m.id === aiModel)?.name ?? "系统自动推荐"}
                open={openModel}
                onToggle={() => setOpenModel((v) => !v)}
                required={false}
              >
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger className="h-9">
                    <div className="flex items-center gap-2 truncate">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
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
                    {availableAiModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.name}</span>
                          {m.vendor && <span className="text-[11px] text-muted-foreground">· {m.vendor}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Section>
            </div>

            {/* Footer */}
            <div className="space-y-2 border-t border-border/60 bg-muted/10 px-4 py-3">
              <div className="flex items-end justify-between gap-3">
                <PricingFooter pricing={pricing} />
                <div className="text-right text-[10px] text-muted-foreground whitespace-nowrap">
                  约 {Math.max(8, totalShots * 3)}s 出片
                </div>
              </div>
              {blockReasons.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/5 px-2 py-1.5 text-[11px] text-warning">
                  无法生成：{blockReasons.join(" · ")}
                </div>
              )}
              <Button
                onClick={generate}
                disabled={blocked || pricing.disabled}
                title={pricing.disabled ? pricing.disabledReason : undefined}
                className="h-11 w-full text-base font-medium"
              >
                <Sparkles className="h-4 w-4" />
                {pricing.disabled
                  ? pricing.disabledReason ?? "当前套餐不可用"
                  : status === "loading"
                    ? "AI 正在混剪中…"
                    : "开始生成"}
              </Button>
            </div>
          </Card>

          {/* ============== Right: script editor + preview ============== */}
          <div className="space-y-5">
            {/* Script editor */}
            <Card id="remix-script-anchor" className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setHistoryOpen(true)}>
                    <History className="h-4 w-4" /> 载入模板
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setSaveScriptOpen(true)}>
                    <Save className="h-4 w-4" /> 保存脚本
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={clearAll}>
                    <Eraser className="h-4 w-4" /> 清空
                  </Button>
                </div>
                <div className="flex items-center gap-1.5">
                  <Chip>共 {segments.length} 段</Chip>
                  <Chip>{totalShots} 个分镜</Chip>
                  <Chip>总时长 {totalDuration}s</Chip>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                {segments.map((seg, idx) => (
                  <SegmentCard
                    key={seg.id}
                    index={idx + 1}
                    segment={seg}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < segments.length - 1}
                    onMoveUp={() => moveSegment(seg.id, -1)}
                    onMoveDown={() => moveSegment(seg.id, 1)}
                    onChange={(p) => updateSegment(seg.id, p)}
                    onRemove={() => removeSegment(seg.id)}
                    canRemove={segments.length > 1}
                    onAddShot={() => addShot(seg.id)}
                    onUpdateShot={(shotId, p) => updateShot(seg.id, shotId, p)}
                    onRemoveShot={(shotId) => removeShot(seg.id, shotId)}
                  />
                ))}

                <button
                  onClick={addSegment}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" /> 添加脚本片段
                </button>
              </div>
            </Card>

            {/* Preview area */}
            <Card className="p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">混剪预览</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {status === "loading"
                      ? `预计剩余 ${etaSec}s · 合成第 ${Math.min(segments.length, Math.ceil((progress / 100) * segments.length))} / ${segments.length} 段`
                      : status === "done"
                      ? "已生成,使用下方工具发布或保存"
                      : "完成左侧配置后点击「开始生成」"}
                  </p>
                </div>
                {status === "done" && (
                  <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                    <Sparkles className="h-3 w-3" /> 生成完成
                  </Badge>
                )}
              </div>
              <div className="flex justify-center">
                <div className="relative flex aspect-[9/16] w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300">
                  {status === "loading" ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative h-24 w-24">
                        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                          <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-700" />
                          <circle
                            cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fill="none"
                            strokeDasharray={2 * Math.PI * 44}
                            strokeDashoffset={2 * Math.PI * 44 * (1 - progress / 100)}
                            className="text-primary transition-all"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white">
                          {progress}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-base font-semibold text-white">AI 正在混剪中…</div>
                        <div className="mt-1 text-xs text-slate-400">
                          预计剩余 {etaSec}s · 第 {Math.min(segments.length, Math.ceil((progress / 100) * segments.length))} / {segments.length} 段
                        </div>
                      </div>
                    </div>
                  ) : status === "done" ? (
                    <div className="relative h-full w-full">
                      <video src={generatedVideoUrl ?? undefined} controls className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1.5 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10">
                        <PreviewIconBtn label="一键发帖" icon={<Send className="h-3.5 w-3.5" />} onClick={() => setPostTaskOpen(true)} primary />
                        <PreviewIconBtn label="保存至成品" icon={<Save className="h-3.5 w-3.5" />} onClick={() => setSaveOpen(true)} />
                        <PreviewIconBtn
                          label="下载到本地"
                          icon={<Download className="h-3.5 w-3.5" />}
                          onClick={async () => {
                            if (!generatedVideoUrl) return;
                            try {
                              const res = await fetch(generatedVideoUrl);
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url; a.download = `remix-${Date.now()}.mp4`;
                              document.body.appendChild(a); a.click(); a.remove();
                              URL.revokeObjectURL(url);
                              toast.success("已开始下载");
                            } catch { toast.error("下载失败,请重试"); }
                          }}
                        />
                        <PreviewIconBtn label="重新生成" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={generate} />
                        
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col items-center gap-3 px-6 text-center">
                      <Play className="h-10 w-10 text-slate-500" />
                      <div className="text-sm">尚未生成,完成左侧配置后开始</div>
                      <div className="flex flex-wrap justify-center gap-1">
                        <PreviewChip>{platform}</PreviewChip>
                        <PreviewChip>{voice || "未选音色"}</PreviewChip>
                        <PreviewChip>{bgm || "未选 BGM"}</PreviewChip>
                        <PreviewChip>字幕{subtitleOn ? "开" : "关"}</PreviewChip>
                        <PreviewChip>{totalDuration}s</PreviewChip>
                        <PreviewChip>{totalShots} 分镜</PreviewChip>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Reset confirm */}
        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认重置全流程?</AlertDialogTitle>
              <AlertDialogDescription>
                将清空脚本、配音、字幕、模型与生成结果,此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={resetAll}>确认重置</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Subtitle preset dialog */}
        <Dialog open={subtitleOpen} onOpenChange={setSubtitleOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>字幕效果</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SUBTITLE_PRESETS.map((p) => {
                const active = subStyle.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSubStyle(p)}
                    className={cn(
                      "group overflow-hidden rounded-lg border bg-card text-left transition-all hover:shadow-md",
                      active ? "border-primary ring-2 ring-primary/30" : "border-border",
                    )}
                  >
                    <div className={cn("flex h-20 items-center justify-center px-2", p.bgClass)}>
                      <span style={p.textStyle}>Cool Text</span>
                    </div>
                    <div className="border-t border-border px-3 py-2 text-xs font-medium">{p.name}</div>
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubtitleOpen(false)}>取消</Button>
              <Button onClick={() => setSubtitleOpen(false)}>确定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* History dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>历史脚本列表</DialogTitle>
              <DialogDescription>从已保存的脚本模板中快速复用</DialogDescription>
            </DialogHeader>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>脚本名称</TableHead>
                    <TableHead>脚本描述</TableHead>
                    <TableHead className="w-44">创建时间</TableHead>
                    <TableHead className="w-32 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_HISTORY.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" /> {h.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{h.desc || "--"}</TableCell>
                      <TableCell className="text-muted-foreground">{h.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-primary" onClick={() => loadHistory(h)}>
                          <Copy className="h-3.5 w-3.5" /> 复制
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => toast.success("已删除")}>
                          <Trash2 className="h-3.5 w-3.5" /> 删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <SaveScriptDialog open={saveScriptOpen} onOpenChange={setSaveScriptOpen} />

        <SaveToMaterialDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          videoUrl={generatedVideoUrl}
          platform={platform}
          defaultTitle="AI 混剪视频"
          defaultContent={segments.flatMap((s) => s.shots.map((sh) => sh.voiceover)).filter(Boolean).join(" ")}
        />

        <CreatePostTaskDialog
          open={postTaskOpen}
          onOpenChange={setPostTaskOpen}
          lockedPlatform={platform}
          showPostEditor
          defaultPostTitle="AI 混剪视频"
          defaultPostContent={segments.flatMap((s) => s.shots.map((sh) => sh.voiceover)).filter(Boolean).join(" ")}
          selectedPosts={[
            {
              id: "remix-temp",
              type: "video",
              title: "AI 混剪视频",
              content: segments.flatMap((s) => s.shots.map((sh) => sh.voiceover)).filter(Boolean).join(" "),
              images: [],
              videoUrl: generatedVideoUrl ?? undefined,
              platforms: [platform],
              publishStatus: { [platform]: "unpublished" },
              tags: [],
              enabled: true,
              createdAt: new Date().toISOString(),
              tenantId: "",
              tenantName: "",
            } satisfies PostItem,
          ]}
          onCreated={() => setPostTaskOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
}

// ============= Segment card =============
function SegmentCard({
  index, segment, onChange, onRemove, canRemove, onAddShot, onUpdateShot, onRemoveShot,
  canMoveUp, canMoveDown, onMoveUp, onMoveDown,
}: {
  index: number;
  segment: Segment;
  onChange: (p: Partial<Segment>) => void;
  onRemove: () => void;
  canRemove: boolean;
  onAddShot: () => void;
  onUpdateShot: (shotId: string, p: Partial<Shot>) => void;
  onRemoveShot: (shotId: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-gradient-to-br from-primary/[0.03] to-transparent">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
            {index}
          </div>
          <span className="text-sm font-semibold">脚本片段 {index}</span>
          <button
            onClick={() => onChange({ collapsed: !segment.collapsed })}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", !segment.collapsed && "rotate-90")} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">画面时长</span>
            <Input
              type="number"
              min={1}
              value={segment.duration}
              onChange={(e) => onChange({ duration: Math.max(1, Number(e.target.value) || 1) })}
              className="h-7 w-16 text-center text-xs"
            />
            <span className="text-muted-foreground">s</span>
          </div>
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="上移"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="下移"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          {canRemove && (
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!segment.collapsed && (
        <div className="space-y-3 px-4 py-4">
          {segment.shots.map((sh, i) => (
            <ShotRow
              key={sh.id}
              index={i + 1}
              shot={sh}
              onChange={(p) => onUpdateShot(sh.id, p)}
              onRemove={() => onRemoveShot(sh.id)}
              canRemove={segment.shots.length > 1}
            />
          ))}
          <button
            onClick={onAddShot}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/[0.04] py-2 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5" /> 添加分镜画面
          </button>
        </div>
      )}
    </div>
  );
}

// ============= Shot row =============
function ShotRow({
  index, shot, onChange, onRemove, canRemove,
}: {
  index: number;
  shot: Shot;
  onChange: (p: Partial<Shot>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onChange({ materialUrl: URL.createObjectURL(f), materialName: f.name });
  };
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px]">
            {index}
          </div>
          <span>分镜头画面 {index}</span>
          <Select value={shot.materialType} onValueChange={(v) => onChange({ materialType: v as Shot["materialType"] })}>
            <SelectTrigger className="ml-2 h-7 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">视频</SelectItem>
              <SelectItem value="image">图片</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_120px]">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">中文旁白 / 台词</Label>
          <Textarea
            value={shot.voiceover}
            onChange={(e) => onChange({ voiceover: e.target.value })}
            placeholder="请输入中文旁白 / 台词"
            maxLength={500}
            className="min-h-24 resize-none text-sm"
          />
          <div className="text-right text-[10px] text-muted-foreground">{shot.voiceover.length}/500</div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">画面内容描述</Label>
          <Textarea
            value={shot.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="请输入画面内容描述"
            maxLength={500}
            className="min-h-24 resize-none text-sm"
          />
          <div className="text-right text-[10px] text-muted-foreground">{shot.description.length}/500</div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">画面素材</Label>
          <input
            ref={inputRef} type="file"
            accept={shot.materialType === "video" ? "video/mp4,video/quicktime" : "image/*"}
            className="hidden" onChange={handleUpload}
          />
          {shot.materialName ? (
            <div className="relative flex h-24 flex-col items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 text-center">
              {shot.materialType === "video" ? (
                <VideoIcon className="h-5 w-5 text-primary" />
              ) : (
                <ImageIcon className="h-5 w-5 text-primary" />
              )}
              <span className="truncate text-[10px] font-medium" title={shot.materialName}>
                {shot.materialName}
              </span>
              <button
                onClick={() => onChange({ materialName: undefined, materialUrl: undefined })}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-muted/20 px-2 text-center text-[10px] text-muted-foreground hover:border-primary/60 hover:bg-muted/40"
            >
              <Upload className="h-4 w-4" />
              <span>上传{shot.materialType === "video" ? "视频" : "图片"}</span>
              <span className="text-[9px]">{shot.materialType === "video" ? "MP4/MOV" : "JPG/PNG"}</span>
            </button>
          )}
          <MaterialPicker
            type={shot.materialType === "video" ? "video" : "image"}
            onPick={(m) =>
              onChange({
                materialName: m.name,
                materialUrl: m.url,
              })
            }
            trigger={
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 text-[10px] text-primary hover:underline"
              >
                <FolderOpen className="h-3 w-3" /> 从原料库选择
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}

// ============= Save script template dialog =============
function SaveScriptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("auto");
  const [desc, setDesc] = useState("auto");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>保存脚本模板</DialogTitle>
          <DialogDescription>将当前脚本保存为模板,后续可在历史脚本中快速复用。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="脚本名称" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：耳机·爆款脚本 v1" />
          </Field>
          <Field label="脚本描述">
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="简要描述脚本结构与适用场景" rows={3} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => {
            if (!name.trim()) return toast.error("请输入脚本名称");
            toast.success("已保存到历史脚本");
            setName(""); setDesc("");
            onOpenChange(false);
          }}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Save to material dialog (same shape as video module) =============
function SaveToMaterialDialog({
  open, onOpenChange, videoUrl, platform, defaultTitle, defaultContent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  videoUrl: string | null;
  platform: Platform;
  defaultTitle: string;
  defaultContent: string;
}) {
  const SUPPORTED: Platform[] = ["Facebook", "Tiktok", "Instagram", "Twitter/X", "WhatsApp"];
  const lockedPlatform: Platform = SUPPORTED.includes(platform) ? platform : "Tiktok";
  const limit = PLATFORM_LIMITS[lockedPlatform].video;
  const hasTitle = limit.titleMax !== undefined;

  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [tags, setTags] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);

  useMemo(() => {
    if (open) {
      setTitle(defaultTitle); setContent(defaultContent); setTags([]); setEnabled(true);
    }
  }, [open, defaultTitle, defaultContent]);

  const submit = () => {
    if (hasTitle && !title.trim()) return toast.error("请输入贴文标题");
    if (hasTitle && title.length > (limit.titleMax ?? 0)) return toast.error(`标题最长 ${limit.titleMax} 字`);
    if (content.length > limit.contentMax) return toast.error(`文案内容最长 ${limit.contentMax} 字`);
    if (!videoUrl) return toast.error("缺少视频文件");
    toast.success("已保存至成品素材");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>保存至成品素材</DialogTitle>
          <DialogDescription>将刚生成的混剪视频保存为贴文素材。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="目标平台"><Input value={lockedPlatform} disabled /></Field>
            <Field label="贴文类型"><Input value="视频" disabled /></Field>
          </div>
          {hasTitle && (
            <Field label={`贴文标题 * (${title.length}/${limit.titleMax})`}>
              <Input value={title} maxLength={limit.titleMax} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          )}
          <Field label={`文案内容 (${content.length}/${limit.contentMax})`}>
            <Textarea value={content} maxLength={limit.contentMax} rows={4} onChange={(e) => setContent(e.target.value)} />
          </Field>
          <Field label="视频预览">
            {videoUrl ? (
              <video src={videoUrl} controls className="max-h-72 w-full rounded-md bg-black" />
            ) : (
              <div className="rounded-md border border-dashed py-10 text-center text-xs text-muted-foreground">暂无视频</div>
            )}
          </Field>
          <Field label="标签">
            <TagMultiSelect value={tags} onChange={setTags} placeholder="选择或新增标签" />
          </Field>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">启用状态</p>
              <p className="text-xs text-muted-foreground">关闭后该贴文将不会出现在可选素材中</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Shared small components =============
function Field({
  label, required, children,
}: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function IconSelect({
  icon, value, onChange, options, placeholder,
}: {
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10">
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <SelectValue placeholder={placeholder ?? "请选择"} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============= Workbench helpers =============
function Section({
  icon, title, summary, open, onToggle, required, children,
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
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <div className="space-y-3 border-t border-border/40 px-3 pb-3 pt-3">{children}</div>}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}

function PreviewChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-600/60 bg-slate-700/40 px-2 py-0.5 text-[10px] text-slate-200">
      {children}
    </span>
  );
}

function PreviewButton({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 shrink-0 gap-1 px-2"
      onClick={() => {
        setPlaying((p) => !p);
        toast.success(playing ? `已停止${label}` : `正在${label}…`);
        if (!playing) setTimeout(() => setPlaying(false), 4000);
      }}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
    </Button>
  );
}

function PreviewIconBtn({
  label, icon, onClick, primary,
}: { label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={primary ? "default" : "secondary"}
          onClick={onClick}
          className="h-8 w-8"
          aria-label={label}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
