import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Music2,
  Mic2,
  Volume2,
  UserSquare2,
  ImageIcon,
  Type,
  Wand2,
  Palette,
  Play,
  Pause,
  Power,
  Upload,
  Download,
  Globe2,
  Crown,
  Eye,
  HelpCircle,
  Layers,
  Shield,
  Coins,
  Calendar,
  Building2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";
import { PLAN_META, PLAN_TIERS, type PlanTier } from "@/lib/billing-plans";
import {
  PRESET_CATEGORIES,
  PRESET_CATEGORY_META,
  addPreset,
  deletePresets,
  genPresetId,
  togglePresetStatus,
  updatePreset,
  usePresetsStore,
  type PresetCategory,
  type PresetItem,
  type PresetVisibility,
  type SubtitleStyleKey,
} from "@/lib/ai-presets-mock";

/* ============================================================ */
/* 字幕样式 — CSS 实样预览                                       */
/* ============================================================ */
type StyleSpec = {
  bg: string;
  text: React.CSSProperties;
  className?: string;
};
const SUBTITLE_STYLES: Record<SubtitleStyleKey, StyleSpec> = {
  "shadow-3d": {
    bg: "linear-gradient(135deg,#cfd2ff,#a6abff)",
    text: {
      color: "#fff",
      fontWeight: 800,
      textShadow: "2px 2px 0 rgba(0,0,0,.55), 4px 4px 0 rgba(0,0,0,.25)",
    },
  },
  "block-emphasis": {
    bg: "linear-gradient(135deg,#d3d8e0,#b8bfca)",
    text: {
      color: "#fff",
      fontWeight: 700,
      background: "#e3204a",
      padding: "4px 12px",
      borderRadius: 4,
    },
  },
  "outline-box": {
    bg: "linear-gradient(135deg,#fff1c7,#ffe7a3)",
    text: {
      color: "#111",
      fontWeight: 700,
      background: "#fff",
      padding: "4px 12px",
      borderRadius: 4,
      border: "1.5px solid #111",
    },
  },
  "classic-black": {
    bg: "linear-gradient(135deg,#d9dbdf,#bfc3c8)",
    text: {
      color: "#fff",
      fontWeight: 700,
      background: "#111",
      padding: "4px 12px",
    },
  },
  "classic-white": {
    bg: "linear-gradient(135deg,#1f2b3b,#0f1a2a)",
    text: {
      color: "#111",
      fontWeight: 700,
      background: "#fff",
      padding: "4px 12px",
      borderRadius: 2,
    },
  },
  dark: {
    bg: "#0a0a0a",
    text: { color: "#fff", fontWeight: 700 },
  },
  fresh: {
    bg: "linear-gradient(135deg,#c8f5d8,#a8e5f5)",
    text: { color: "#1aa3e6", fontWeight: 800 },
  },
  italic: {
    bg: "linear-gradient(135deg,#fbd5dd,#f5b8c4)",
    text: {
      color: "#fff",
      fontWeight: 800,
      fontStyle: "italic",
      background: "#111",
      padding: "4px 14px",
      transform: "skewX(-10deg)",
      display: "inline-block",
    },
  },
  lemon: {
    bg: "linear-gradient(135deg,#ffe45e,#ffd83b)",
    text: {
      color: "#111",
      fontWeight: 900,
      WebkitTextStroke: "1.5px #111",
    } as React.CSSProperties,
  },
  neon: {
    bg: "linear-gradient(135deg,#2a0a3a,#10031a)",
    text: {
      color: "#fff",
      fontWeight: 800,
      textShadow:
        "0 0 6px #c084fc, 0 0 14px #a855f7, 0 0 22px #7e22ce",
    },
  },
  "outline-glow": {
    bg: "linear-gradient(135deg,#f3a7e8,#e07ad6)",
    text: {
      color: "#1a1a1a",
      fontWeight: 900,
      WebkitTextStroke: "1.5px #f7d34a",
      textShadow: "0 0 10px rgba(247,211,74,.55)",
    } as React.CSSProperties,
  },
  translucent: {
    bg: "linear-gradient(135deg,#6f7a8a,#4d5765)",
    text: {
      color: "#fff",
      fontWeight: 700,
      background: "rgba(0,0,0,.35)",
      padding: "4px 12px",
      borderRadius: 4,
      backdropFilter: "blur(2px)",
    },
  },
  "shadow-block": {
    bg: "linear-gradient(135deg,#ffd6a8,#ffbe7a)",
    text: {
      color: "#fff",
      fontWeight: 800,
      background: "#e76a1a",
      padding: "4px 12px",
      borderRadius: 4,
      boxShadow: "0 6px 0 rgba(0,0,0,.18)",
    },
  },
  "spotlight-block": {
    bg: "radial-gradient(circle at 50% 50%, #3a2a05 0%, #0a0a0a 70%)",
    text: {
      color: "#111",
      fontWeight: 800,
      background: "#ffd84a",
      padding: "4px 12px",
      borderRadius: 4,
      boxShadow:
        "0 0 18px #ffd84a, 0 0 36px rgba(255,216,74,.6)",
    },
  },
  "white-bar": {
    bg: "linear-gradient(135deg,#9fe9f5,#7ad8e8)",
    text: {
      color: "#111",
      fontWeight: 700,
      borderBottom: "6px solid #fff",
      paddingBottom: 1,
    },
  },
  "white-outline": {
    bg: "linear-gradient(135deg,#b69af0,#8c6ce0)",
    text: {
      color: "transparent",
      fontWeight: 900,
      WebkitTextStroke: "1.5px #fff",
    } as React.CSSProperties,
  },
};

function SubtitleStylePreview({ k }: { k: SubtitleStyleKey }) {
  const spec = SUBTITLE_STYLES[k];
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: spec.bg }}
    >
      <span
        className="text-xl tracking-wide"
        style={{ fontFamily: "Inter, system-ui, sans-serif", ...spec.text }}
      >
        Cool Text
      </span>
    </div>
  );
}

/* ============================================================ */
/* 配音音色 — 性别 + 风格封面                                    */
/* ============================================================ */
const VOICE_THEME: Record<string, { bg: string; ring: string; fg: string; glyph: string }> = {
  女: {
    bg: "linear-gradient(135deg,#ffe1ec,#fcc4d8)",
    ring: "ring-pink-300/60",
    fg: "text-pink-600",
    glyph: "♀",
  },
  男: {
    bg: "linear-gradient(135deg,#dbe9ff,#b9d2ff)",
    ring: "ring-sky-300/60",
    fg: "text-sky-600",
    glyph: "♂",
  },
  童: {
    bg: "linear-gradient(135deg,#fff4cf,#ffe39a)",
    ring: "ring-amber-300/60",
    fg: "text-amber-600",
    glyph: "★",
  },
};

function VoiceCover({ item }: { item: PresetItem }) {
  const gender = item.attrs["性别"] ?? "女";
  const style = item.attrs["风格"] ?? "";
  const lang = item.attrs["语言"] ?? "";
  const theme = VOICE_THEME[gender] ?? VOICE_THEME["女"];
  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      style={{ background: theme.bg }}
    >
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-full bg-background/85 shadow-sm ring-2",
          theme.ring,
        )}
      >
        <span className={cn("text-3xl font-semibold", theme.fg)}>{theme.glyph}</span>
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        <span className="rounded-md bg-background/85 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur">
          {gender}声 · {style}
        </span>
        {lang && (
          <span className="rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
            {lang}
          </span>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */
/* 背景音乐 — 曲风主题封面                                        */
/* ============================================================ */
const BGM_THEME: Record<string, { bg: string; bar: string; chip: string }> = {
  Pop: { bg: "linear-gradient(135deg,#ffd6e7,#ffb3d1)", bar: "bg-pink-500", chip: "text-pink-700" },
  EDM: { bg: "linear-gradient(135deg,#c9b8ff,#9d83ff)", bar: "bg-violet-500", chip: "text-violet-700" },
  Piano: { bg: "linear-gradient(135deg,#e6efff,#c4d6ff)", bar: "bg-sky-500", chip: "text-sky-700" },
  National: { bg: "linear-gradient(135deg,#ffe6c4,#ffcd8f)", bar: "bg-amber-600", chip: "text-amber-700" },
  Cinematic: { bg: "linear-gradient(135deg,#1f2440,#0c0f24)", bar: "bg-amber-300", chip: "text-amber-200" },
  Lofi: { bg: "linear-gradient(135deg,#ffe8c2,#f6c79a)", bar: "bg-orange-500", chip: "text-orange-700" },
  Folk: { bg: "linear-gradient(135deg,#dff3d8,#b6e5b1)", bar: "bg-emerald-500", chip: "text-emerald-700" },
  Rock: { bg: "linear-gradient(135deg,#ffd1d1,#ff8a8a)", bar: "bg-rose-600", chip: "text-rose-700" },
};

const BARS = [3, 6, 4, 8, 5, 9, 4, 7, 3, 6, 5, 9, 4, 7, 5, 8, 3, 6];

function BgmCover({ item }: { item: PresetItem }) {
  const genre = item.attrs["曲风"] ?? "Pop";
  const bpm = item.attrs["BPM"] ?? "";
  const mood = item.attrs["情绪"] ?? "";
  const theme = BGM_THEME[genre] ?? BGM_THEME.Pop;
  const dark = genre === "Cinematic";
  return (
    <div
      className="relative flex h-full w-full items-center justify-center px-4"
      style={{ background: theme.bg }}
    >
      <div className="flex h-16 w-full items-end justify-center gap-[3px]">
        {BARS.map((h, i) => (
          <span
            key={i}
            className={cn("w-1 rounded-sm opacity-80", theme.bar)}
            style={{ height: `${h * 6}px` }}
          />
        ))}
      </div>
      <div className="absolute left-2 top-2">
        <span
          className={cn(
            "rounded-md bg-background/85 px-2 py-0.5 text-[11px] font-semibold backdrop-blur",
            theme.chip,
          )}
        >
          {genre}
        </span>
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-medium backdrop-blur",
            dark ? "bg-background/20 text-background" : "bg-background/85 text-foreground",
          )}
        >
          {mood}
        </span>
        {bpm && (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-mono text-[10px] backdrop-blur",
              dark ? "bg-background/20 text-background/90" : "bg-background/70 text-muted-foreground",
            )}
          >
            {bpm} BPM
          </span>
        )}
      </div>
    </div>
  );
}






export const Route = createFileRoute("/_app/system/ai-presets")({
  component: AiPresetsPage,
  head: () => ({
    meta: [
      { title: "AI 预设物料 — BooPilot" },
      {
        name: "description",
        content: "维护平台预置的背景音乐、配音音色、数字人模特等 AI 创作基础物料",
      },
    ],
  }),
});

const CATEGORY_ICON: Record<PresetCategory, React.ComponentType<{ className?: string }>> = {
  bgm: Music2,
  voiceover: Mic2,
  avatar: UserSquare2,
  "subtitle-style": Type,
};

type CatFilter = PresetCategory | "all";

function visibilityLabel(v: PresetVisibility) {
  if (v.kind === "all") return "全部租户";
  return `${PLAN_META[v.minPlan].label} 及以上`;
}

/* ============================================================ */
/* 预览：音频行内播放                                            */
/* ============================================================ */
function AudioPreview({ url }: { url?: string }) {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => (typeof window !== "undefined" ? new Audio() : null));
  if (!audio || !url) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border/60 px-3 text-xs text-muted-foreground">
        暂无试听
      </div>
    );
  }
  const toggle = () => {
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.src = url;
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      audio.onended = () => setPlaying(false);
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="group flex h-9 w-full items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
    >
      {playing ? (
        <Pause className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Play className="h-3.5 w-3.5 text-primary" />
      )}
      <span className="flex-1 text-left">{playing ? "正在播放…" : "点击试听"}</span>
      <span className="flex items-end gap-0.5">
        {[3, 5, 4, 6, 3].map((h, i) => (
          <span
            key={i}
            className={cn(
              "w-0.5 rounded-sm bg-primary/40 transition-all",
              playing && "bg-primary",
            )}
            style={{
              height: `${h * 2}px`,
              animation: playing ? `pulse 1.2s ${i * 0.1}s ease-in-out infinite` : undefined,
            }}
          />
        ))}
      </span>
    </button>
  );
}

/* ============================================================ */
/* 预设卡片                                                      */
/* ============================================================ */
function PresetCard({
  item,
  onEdit,
  onDelete,
  onToggle,
  onPreview,
}: {
  item: PresetItem;
  onEdit: (p: PresetItem) => void;
  onDelete: (p: PresetItem) => void;
  onToggle: (p: PresetItem) => void;
  onPreview: (p: PresetItem) => void;
}) {
  const meta = PRESET_CATEGORY_META[item.category];
  const Icon = CATEGORY_ICON[item.category];
  const inactive = item.status === "inactive";

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]",
        inactive && "opacity-70",
      )}
    >
      {/* 封面 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {item.category === "subtitle-style" && item.previewStyle ? (
          <SubtitleStylePreview k={item.previewStyle} />
        ) : item.category === "voiceover" ? (
          <VoiceCover item={item} />
        ) : item.category === "bgm" ? (
          <BgmCover item={item} />
        ) : item.cover ? (
          <img
            src={item.cover}
            alt={item.name}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Icon className="h-10 w-10 text-muted-foreground/60" />
          </div>
        )}
        {/* 左上：分类 */}
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 gap-1 bg-background/85 backdrop-blur"
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </Badge>
        {/* 右上：可见范围 */}
        <Badge
          variant="outline"
          className="absolute right-2 top-2 gap-1 bg-background/85 backdrop-blur"
        >
          {item.visibility.kind === "all" ? (
            <>
              <Globe2 className="h-3 w-3" />全部
            </>
          ) : (
            <>
              <Crown className="h-3 w-3" />
              {PLAN_META[item.visibility.minPlan].label}+
            </>
          )}
        </Badge>
        {/* 右下：时长 */}
        {item.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-background/80 px-1.5 py-0.5 text-[11px] font-mono text-foreground/80 backdrop-blur">
            {item.duration}
          </span>
        )}
        {/* 停用遮罩 */}
        {inactive && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <Badge variant="secondary" className="border-border bg-background/95">
              已停用
            </Badge>
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-medium">{item.name}</h3>
        </div>
        <p className="line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">
          {item.description}
        </p>

        {/* 音频试听 */}
        {meta.assetKind === "audio" && <AudioPreview url={item.url} />}

        {/* 关键属性（隐藏 _meta_ 前缀的元数据字段） */}
        <div className="flex flex-wrap gap-1">
          {Object.entries(item.attrs)
            .filter(([k]) => !k.startsWith("_meta_"))
            .slice(0, 3)
            .map(([k, v]) => (
              <span
                key={k}
                className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {k} · {v}
              </span>
            ))}
        </div>

        {/* 底部操作 */}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={item.status === "active"}
              onCheckedChange={() => onToggle(item)}
              aria-label="启用/停用"
            />
            <span className="text-[11px] text-muted-foreground">
              {item.status === "active" ? "启用中" : "停用"}
            </span>
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onPreview(item)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>预览</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(item)}
                  >
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
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/* 表单                                                          */
/* ============================================================ */
interface FormValue {
  id: string;
  name: string;
  category: PresetCategory;
  cover: string;
  url: string;
  duration: string;
  tags: string;
  description: string;
  attrs: Record<string, string>;
  previewStyle: SubtitleStyleKey | "";
  status: "active" | "inactive";
  visKind: "all" | "plan";
  visPlan: PlanTier;
  createdBy?: string;
  updatedAt?: string;
}

/* —— 各分类字段 schema —— */
type FieldDef = {
  key: string;
  label: string;
  type: "input" | "select";
  options?: readonly string[];
  placeholder?: string;
  required?: boolean;
};

/* —— 各分类推荐标签库 —— */
const RECOMMENDED_TAGS: Record<PresetCategory, readonly string[]> = {
  bgm: ["轻快", "舒缓", "治愈", "燃", "古风", "复古", "都市", "节奏感", "电影感"],
  voiceover: ["知性", "温柔", "沉稳", "浑厚", "活泼", "童声", "新闻播报", "广告"],
  avatar: ["写实", "Q版", "全身", "半身", "商务", "元气", "二次元", "吉祥物"],
  "subtitle-style": ["经典", "高亮", "霓虹", "极简", "电商", "综艺", "口播"],
};

/* —— 版权与计费的"伪属性"key（落库到 attrs，UI 端从主属性列表隐藏） —— */
const META_KEYS = {
  COPYRIGHT_SOURCE: "_meta_copyright_source",
  LICENSE_SCOPE: "_meta_license_scope",
  LICENSE_EXPIRE: "_meta_license_expire",
  BILLING_UNIT: "_meta_billing_unit",
  COUNTS_QUOTA: "_meta_counts_quota",
  TENANT_WHITELIST: "_meta_tenant_whitelist",
  EFFECTIVE_FROM: "_meta_effective_from",
  EFFECTIVE_TO: "_meta_effective_to",
} as const;

const CATEGORY_FIELDS: Record<PresetCategory, FieldDef[]> = {
  bgm: [
    { key: "曲风", label: "曲风", type: "select", required: true,
      options: ["Pop", "EDM", "Piano", "National", "Cinematic", "Lofi", "Folk", "Rock"] },
    { key: "情绪", label: "情绪", type: "select",
      options: ["轻快", "动感", "舒缓", "震撼", "放松", "治愈", "燃", "古韵"] },
    { key: "BPM", label: "BPM", type: "input", placeholder: "如：92" },
    { key: "时长", label: "时长", type: "input", placeholder: "如：01:32" },
  ],
  voiceover: [
    { key: "性别", label: "性别", type: "select", required: true, options: ["女", "男", "童"] },
    { key: "风格", label: "风格", type: "select",
      options: ["知性", "甜美", "温柔", "沉稳", "阳光", "浑厚", "活泼", "Pro"] },
    { key: "语言", label: "语言", type: "select",
      options: ["中文(普通话)", "中文(粤语)", "English (US)", "English (UK)", "日本語"] },
    { key: "年龄", label: "年龄", type: "select",
      options: ["儿童", "青年", "中年", "老年"] },
    { key: "采样率", label: "采样率", type: "select", options: ["16kHz", "24kHz", "48kHz"] },
  ],
  avatar: [
    { key: "类型", label: "类型", type: "select", required: true, options: ["写实3D", "Q版IP", "吉祥物"] },
    { key: "形象", label: "形象", type: "input", placeholder: "如：女、男、柴犬、橘猫" },
    { key: "风格", label: "风格", type: "input", placeholder: "如：商务、阳光、呆萌" },
    { key: "口型驱动", label: "口型驱动", type: "select", options: ["支持", "不支持"] },
    { key: "分辨率", label: "分辨率", type: "select", options: ["1920×1080", "1080×1920", "1080×1080"] },
  ],
  "subtitle-style": [
    { key: "字体", label: "字体", type: "select",
      options: ["PingFang SC", "站酷快乐体", "思源黑体", "思源宋体", "霞鹜文楷"] },
    { key: "字号", label: "字号", type: "input", placeholder: "如：48" },
    { key: "适配", label: "适配", type: "select", options: ["通用", "短视频", "口播", "综艺"] },
  ],
};

function defaultAttrs(cat: PresetCategory): Record<string, string> {
  const out: Record<string, string> = {};
  CATEGORY_FIELDS[cat].forEach((f) => {
    if (f.type === "select" && f.options?.length) out[f.key] = f.options[0];
    else out[f.key] = "";
  });
  return out;
}

function emptyForm(cat: PresetCategory = "bgm"): FormValue {
  return {
    id: genPresetId(cat),
    name: "",
    category: cat,
    cover: "",
    url: "",
    duration: "",
    tags: "",
    description: "",
    attrs: defaultAttrs(cat),
    previewStyle: cat === "subtitle-style" ? "shadow-3d" : "",
    status: "active",
    visKind: "all",
    visPlan: "basic",
  };
}

function toForm(p: PresetItem): FormValue {
  const base = defaultAttrs(p.category);
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    cover: p.cover ?? "",
    url: p.url ?? "",
    duration: p.duration ?? "",
    tags: p.tags.join(", "),
    description: p.description,
    attrs: { ...base, ...p.attrs },
    previewStyle: p.previewStyle ?? (p.category === "subtitle-style" ? "shadow-3d" : ""),
    status: p.status,
    visKind: p.visibility.kind,
    visPlan: p.visibility.kind === "plan" ? p.visibility.minPlan : "basic",
    createdBy: p.createdBy,
    updatedAt: p.updatedAt,
  };
}


function PresetFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: FormValue;
  onSubmit: (v: FormValue) => void;
}) {
  const [form, setForm] = useState<FormValue>(initial ?? emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  useMemo(() => {
    if (open) {
      setForm(initial ?? emptyForm());
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const meta = PRESET_CATEGORY_META[form.category];
  const fields = CATEGORY_FIELDS[form.category];
  const setAttr = (k: string, v: string) =>
    setForm((f) => ({ ...f, attrs: { ...f.attrs, [k]: v } }));
  const toggleTag = (t: string) => {
    const list = form.tags.split(",").map((s) => s.trim()).filter(Boolean);
    const next = list.includes(t) ? list.filter((x) => x !== t) : [...list, t];
    setForm({ ...form, tags: next.join(", ") });
  };
  const currentTags = form.tags.split(",").map((s) => s.trim()).filter(Boolean);

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "请输入名称";
    if (meta.assetKind !== "preset" && !form.url.trim() && mode === "create")
      errs.url = `请提供${meta.label}的资源链接或上传文件`;
    fields.forEach((fd) => {
      if (fd.required && !(form.attrs[fd.key] ?? "").trim())
        errs[`attr_${fd.key}`] = `请填写${fd.label}`;
    });
    if (form.category === "subtitle-style" && !form.previewStyle)
      errs.previewStyle = "请选择字幕样式预览";
    if (form.visKind === "plan") {
      const planOptions = PLAN_TIERS.filter((p): p is Exclude<PlanTier, "free"> => p !== "free");
      if (!(planOptions as PlanTier[]).includes(form.visPlan))
        errs.visPlan = "请选择最低套餐";
    }
    const expire = form.attrs[META_KEYS.LICENSE_EXPIRE];
    if (expire && Number.isNaN(Date.parse(expire)))
      errs.licenseExpire = "授权到期日格式不正确";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    onSubmit(form);
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新增预设物料" : "编辑预设物料"}</DialogTitle>
          <DialogDescription>
            预设物料对所有指定租户可见，AI 创作模块将自动读取。
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-2 pr-1">
          {/* 编号 + 分类 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">编号</Label>
              <div className="flex h-9 items-center rounded-md bg-muted/50 px-3 font-mono text-xs text-muted-foreground">
                {form.id}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                分类 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    category: v as PresetCategory,
                    id: genPresetId(v as PresetCategory),
                    attrs: defaultAttrs(v as PresetCategory),
                    previewStyle: v === "subtitle-style" ? "shadow-3d" : "",
                  })
                }
                disabled={mode === "edit"}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_CATEGORIES.map((c) => {
                    const Icon = CATEGORY_ICON[c];
                    return (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          {PRESET_CATEGORY_META[c].label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 名称 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              maxLength={80}
              placeholder={`如：${form.category === "bgm" ? "都市轻快 · Lofi" : "示例名称"}`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={cn(errors.name && "border-destructive focus-visible:ring-destructive/40")}
            />
            {errors.name && (
              <p className="flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* 资源（音频/视频/图片类） + 内联预览 */}
          {meta.assetKind !== "preset" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    资源链接 <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      className={cn(errors.url && "border-destructive focus-visible:ring-destructive/40")}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      title="上传文件"
                      onClick={() =>
                        toast.info("上传后将自动解析时长 / 采样率 / 分辨率等元数据（接入对象存储后开放）")
                      }
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    支持直接粘贴 URL 或上传文件，上传后将自动解析元数据回填只读字段。
                  </p>
                  {errors.url && (
                    <p className="flex items-center gap-1 text-[11px] text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {errors.url}
                    </p>
                  )}
                </div>
                {meta.assetKind !== "audio" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">封面 URL</Label>
                    <Input
                      placeholder="https://..."
                      value={form.cover}
                      onChange={(e) => setForm({ ...form, cover: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* 内联预览：音频播放 / 视频试播 / 图片缩略 */}
              {form.url && (
                <div className="rounded-md border border-border bg-muted/30 p-2">
                  <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    预览
                  </div>
                  {meta.assetKind === "audio" && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio controls src={form.url} className="h-9 w-full" />
                  )}
                  {meta.assetKind === "video" && (
                    <video
                      controls
                      src={form.url}
                      poster={form.cover || undefined}
                      className="max-h-48 w-full rounded bg-black object-contain"
                    />
                  )}
                  {meta.assetKind === "image" && (
                    <img
                      src={form.url}
                      alt="预览"
                      className="max-h-48 w-full rounded object-contain"
                      onError={(e) => ((e.currentTarget.style.display = "none"))}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* 字幕样式：可视化预览选择器 */}
          {form.category === "subtitle-style" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                字幕样式 <span className="text-destructive">*</span>
              </Label>
              <div
                className={cn(
                  "grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-md border p-2",
                  errors.previewStyle ? "border-destructive" : "border-border",
                )}
              >
                {(Object.keys(SUBTITLE_STYLES) as SubtitleStyleKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm({ ...form, previewStyle: k })}
                    className={cn(
                      "aspect-[4/3] overflow-hidden rounded-md border-2 transition",
                      form.previewStyle === k
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-border",
                    )}
                  >
                    <SubtitleStylePreview k={k} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 分类专属属性 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {PRESET_CATEGORY_META[form.category].label}属性
            </Label>
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/20 p-3">
              {fields.map((fd) => {
                const errKey = `attr_${fd.key}`;
                const hasErr = !!errors[errKey];
                return (
                  <div key={fd.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {fd.label}
                      {fd.required && <span className="ml-0.5 text-destructive">*</span>}
                    </Label>
                    {fd.type === "select" ? (
                      <Select
                        value={form.attrs[fd.key] ?? ""}
                        onValueChange={(v) => setAttr(fd.key, v)}
                      >
                        <SelectTrigger
                          className={cn("h-8", hasErr && "border-destructive")}
                        >
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                          {fd.options?.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className={cn("h-8", hasErr && "border-destructive")}
                        placeholder={fd.placeholder}
                        value={form.attrs[fd.key] ?? ""}
                        onChange={(e) => setAttr(fd.key, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 标签 + 时长 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">标签（逗号分隔）</Label>
              <Input
                placeholder="如：轻快, Lofi, 都市"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-muted-foreground/70">常用：</span>
                {RECOMMENDED_TAGS[form.category].map((t) => {
                  const active = currentTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[10px] transition",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {active ? "✓ " : "+ "}
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            {(meta.assetKind === "audio" || meta.assetKind === "video") && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">时长</Label>
                <Input
                  placeholder="如：01:32"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground/70">
                  上传文件后将自动识别
                </p>
              </div>
            )}
          </div>

          {/* 描述 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">描述</Label>
            <Textarea
              rows={2}
              maxLength={200}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="简要描述用途与适配场景"
            />
          </div>

          {/* 版权与授权 */}
          <div className="space-y-2 rounded-md border border-border bg-muted/10 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              版权与授权
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">版权来源</Label>
                <Input
                  className="h-8"
                  placeholder="如：Artlist / 自研 / 第三方授权"
                  value={form.attrs[META_KEYS.COPYRIGHT_SOURCE] ?? ""}
                  onChange={(e) => setAttr(META_KEYS.COPYRIGHT_SOURCE, e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">授权范围</Label>
                <Select
                  value={form.attrs[META_KEYS.LICENSE_SCOPE] ?? ""}
                  onValueChange={(v) => setAttr(META_KEYS.LICENSE_SCOPE, v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="商用">商用</SelectItem>
                    <SelectItem value="仅自用">仅自用</SelectItem>
                    <SelectItem value="内部使用">内部使用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">授权到期日</Label>
                <Input
                  type="date"
                  className={cn("h-8", errors.licenseExpire && "border-destructive")}
                  value={form.attrs[META_KEYS.LICENSE_EXPIRE] ?? ""}
                  onChange={(e) => setAttr(META_KEYS.LICENSE_EXPIRE, e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 计费维度 */}
          <div className="space-y-2 rounded-md border border-border bg-muted/10 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              计费维度
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">单次消耗单位</Label>
                <Select
                  value={form.attrs[META_KEYS.BILLING_UNIT] ?? ""}
                  onValueChange={(v) => setAttr(META_KEYS.BILLING_UNIT, v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="次">次</SelectItem>
                    <SelectItem value="秒">秒</SelectItem>
                    <SelectItem value="分钟">分钟</SelectItem>
                    <SelectItem value="千字符">千字符</SelectItem>
                    <SelectItem value="不计费">不计费</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">是否计入租户额度</Label>
                <div className="flex h-8 items-center gap-2 rounded-md border border-border px-3">
                  <Switch
                    checked={form.attrs[META_KEYS.COUNTS_QUOTA] === "true"}
                    onCheckedChange={(v) =>
                      setAttr(META_KEYS.COUNTS_QUOTA, v ? "true" : "false")
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {form.attrs[META_KEYS.COUNTS_QUOTA] === "true" ? "计入" : "不计入"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 可见范围 + 状态 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">可见范围</Label>
              <Select
                value={form.visKind}
                onValueChange={(v) => setForm({ ...form, visKind: v as "all" | "plan" })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部租户</SelectItem>
                  <SelectItem value="plan">指定套餐及以上</SelectItem>
                </SelectContent>
              </Select>
              {form.visKind === "plan" && (() => {
                const planOptions = PLAN_TIERS.filter((p): p is Exclude<PlanTier, "free"> => p !== "free");
                if (planOptions.length === 0) {
                  return (
                    <div className="mt-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                      暂无可选付费套餐，请先前往「套餐管理」配置套餐后再设置可见范围。
                    </div>
                  );
                }
                const currentValid = (planOptions as PlanTier[]).includes(form.visPlan);
                return (
                  <>
                    <Select
                      value={currentValid ? form.visPlan : ""}
                      onValueChange={(v) => setForm({ ...form, visPlan: v as PlanTier })}
                    >
                      <SelectTrigger
                        className={cn(
                          "mt-2 h-9",
                          errors.visPlan && "border-destructive focus:ring-destructive/40",
                        )}
                      >
                        <SelectValue placeholder="请选择最低套餐" />
                      </SelectTrigger>
                      <SelectContent>
                        {planOptions.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PLAN_META[p].label} 及以上
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.visPlan ? (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {errors.visPlan}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        仅所选套餐及更高等级的租户可在 AI 创作模块中使用此预设。
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">状态</Label>
              <div className="flex h-9 items-center gap-3 rounded-md border border-border px-3">
                <Switch
                  checked={form.status === "active"}
                  onCheckedChange={(v) =>
                    setForm({ ...form, status: v ? "active" : "inactive" })
                  }
                />
                <span className="text-sm">
                  {form.status === "active" ? "启用" : "停用"}
                </span>
              </div>
            </div>
          </div>

          {/* 高级可见控制：租户白名单 + 生效时间窗 */}
          <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/10 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              高级可见控制
              <span className="text-[10px] font-normal text-muted-foreground">（选填）</span>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">租户白名单（租户 ID，逗号分隔）</Label>
              <Input
                className="h-8"
                placeholder="如：t-1001, t-1002（留空表示按上方可见范围分发）"
                value={form.attrs[META_KEYS.TENANT_WHITELIST] ?? ""}
                onChange={(e) => setAttr(META_KEYS.TENANT_WHITELIST, e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  生效起始
                </Label>
                <Input
                  type="date"
                  className="h-8"
                  value={form.attrs[META_KEYS.EFFECTIVE_FROM] ?? ""}
                  onChange={(e) => setAttr(META_KEYS.EFFECTIVE_FROM, e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  生效截止
                </Label>
                <Input
                  type="date"
                  className="h-8"
                  value={form.attrs[META_KEYS.EFFECTIVE_TO] ?? ""}
                  onChange={(e) => setAttr(META_KEYS.EFFECTIVE_TO, e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              留空时按上方可见范围分发；设置后，将以白名单与时间窗的交集生效。
            </p>
          </div>

          {/* 编辑模式：创建人 / 更新时间 只读追溯信息 */}
          {mode === "edit" && (form.createdBy || form.updatedAt) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              {form.createdBy && <span>创建人：{form.createdBy}</span>}
              {form.updatedAt && <span>最近更新：{form.updatedAt}</span>}
            </div>
          )}
        </div>



        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>{mode === "create" ? "创建" : "保存"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* 预览对话框                                                    */
/* ============================================================ */
function PreviewDialog({
  item,
  onOpenChange,
}: {
  item: PresetItem | null;
  onOpenChange: (v: boolean) => void;
}) {
  if (!item) return null;
  const meta = PRESET_CATEGORY_META[item.category];
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.name}
            <Badge variant="secondary">{meta.label}</Badge>
          </DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {meta.assetKind === "image" && item.url && (
            <img src={item.url} alt={item.name} className="w-full rounded-md" />
          )}
          {meta.assetKind === "video" && item.url && (
            <video src={item.url} controls className="w-full rounded-md bg-black" />
          )}
          {meta.assetKind === "audio" && <AudioPreview url={item.url} />}
          {item.category === "subtitle-style" && item.previewStyle && (
            <div className="aspect-[16/7] w-full overflow-hidden rounded-md">
              <SubtitleStylePreview k={item.previewStyle} />
            </div>
          )}
          {meta.assetKind === "preset" && item.category !== "subtitle-style" && item.cover && (
            <img src={item.cover} alt={item.name} className="w-full rounded-md" />
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(item.attrs).map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-md bg-muted/40 px-2 py-1.5">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>可见范围：{visibilityLabel(item.visibility)}</span>
            <span>更新于 {item.updatedAt}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* 主页面                                                        */
/* ============================================================ */
function AiPresetsPage() {
  const items = usePresetsStore();
  const [cat, setCat] = useState<CatFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [visibility, setVisibility] = useState<"all" | "all-tenants" | "plan">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitial, setFormInitial] = useState<FormValue | undefined>();

  const [delTarget, setDelTarget] = useState<PresetItem | null>(null);
  const [toggleTarget, setToggleTarget] = useState<PresetItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PresetItem | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<1 | 2>(1);
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    PRESET_CATEGORIES.forEach((c) => (map[c] = 0));
    items.forEach((i) => (map[i.category] += 1));
    return map;
  }, [items]);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === "active").length;
    const restricted = items.filter((i) => i.visibility.kind === "plan").length;
    const categories = new Set(items.map((i) => i.category)).size;
    return { total: items.length, active, restricted, categories };
  }, [items]);

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (status !== "all" && i.status !== status) return false;
      if (visibility === "all-tenants" && i.visibility.kind !== "all") return false;
      if (visibility === "plan" && i.visibility.kind !== "plan") return false;
      if (kw) {
        const hay = `${i.name} ${i.description} ${i.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [items, cat, status, visibility, keyword]);

  const openCreate = () => {
    setFormMode("create");
    setFormInitial(emptyForm(cat === "all" ? "bgm" : cat));
    setFormOpen(true);
  };
  const openEdit = (p: PresetItem) => {
    setFormMode("edit");
    setFormInitial(toForm(p));
    setFormOpen(true);
  };

  const submitForm = (v: FormValue) => {
    const visibility: PresetVisibility =
      v.visKind === "all" ? { kind: "all" } : { kind: "plan", minPlan: v.visPlan };
    const attrs: Record<string, string> = {};
    Object.entries(v.attrs).forEach(([k, val]) => {
      if (k.trim() && (val ?? "").trim()) attrs[k.trim()] = val;
    });
    const payload: PresetItem = {
      id: v.id,
      name: v.name.trim(),
      category: v.category,
      cover: v.cover || undefined,
      url: v.url || undefined,
      duration: v.duration || undefined,
      tags: v.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      description: v.description,
      attrs,
      previewStyle:
        v.category === "subtitle-style" && v.previewStyle ? v.previewStyle : undefined,
      status: v.status,
      visibility,
      createdBy: "系统",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-"),
    };
    if (formMode === "create") {
      addPreset(payload);
      toast.success("已新增预设物料");
    } else {
      updatePreset(payload.id, payload);
      toast.success("已保存修改");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (!delTarget) return;
    deletePresets([delTarget.id]);
    toast.success(`已删除「${delTarget.name}」`);
    setDelTarget(null);
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* 标题 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">AI 预设物料</h1>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-xs leading-relaxed">
                平台预置的基础物料库，包含背景音乐、配音音色、数字人模特、场景模板、字幕样式、转场与滤镜等。
                启用后将在 AI 创作模块（视频生成、爆款复刻、混剪…）的素材选择器中作为「平台预设」Tab 提供给所有目标租户使用。
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-muted-foreground">
            统一维护 AI 创作所需的基础物料，开箱即用，按套餐档位差异化授权。
          </p>
        </div>
      </div>

      {/* 概览 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="预设总数" value={stats.total} icon={Layers} />
        <StatCard title="启用中" value={stats.active} icon={Power} tone="success" />
        <StatCard title="覆盖分类" value={stats.categories} icon={Palette} tone="violet" />
        <StatCard title="按档位授权" value={stats.restricted} icon={Crown} tone="warning" />
      </div>


      {/* 主体：分类侧栏 + 列表 */}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* 分类侧栏 */}
        <aside className="rounded-xl border border-border bg-card p-2">
          <button
            type="button"
            onClick={() => setCat("all")}
            className={cn(
              "mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition",
              cat === "all"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" />全部
            </span>
            <span className="text-[11px]">{counts.all}</span>
          </button>
          <div className="h-px bg-border" />
          {(
            [
              { key: "audio", label: "音频", cats: ["bgm", "voiceover"] as PresetCategory[] },
              { key: "avatar", label: "数字人", cats: ["avatar"] as PresetCategory[] },
              { key: "style", label: "样式预设", cats: ["subtitle-style"] as PresetCategory[] },
            ] as const
          ).map((group) => {
            const groupCount = group.cats.reduce((s, c) => s + counts[c], 0);
            return (
              <div key={group.key} className="mt-2">
                <div className="flex items-center justify-between px-3 pb-1 pt-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">{groupCount}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.cats.map((c) => {
                    const Icon = CATEGORY_ICON[c];
                    const active = cat === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCat(c)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {PRESET_CATEGORY_META[c].label}
                        </span>
                        <span className="text-[11px]">{counts[c]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>


        {/* 右侧 */}
        <section className="space-y-3">
          {/* 工具条 */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />新增预设
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkStep(1);
                setBulkFile(null);
                setBulkImportOpen(true);
              }}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />批量导入
            </Button>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索名称、标签、描述"
                className="h-9 pl-8"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">启用中</SelectItem>
                <SelectItem value="inactive">已停用</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部可见范围</SelectItem>
                <SelectItem value="all-tenants">全部租户</SelectItem>
                <SelectItem value="plan">按套餐授权</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                共 <span className="font-medium text-foreground">{list.length}</span> 项
              </span>
            </div>
          </div>


          {/* 网格 */}
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-sm text-muted-foreground">
              <Layers className="h-8 w-8 opacity-40" />
              暂无匹配的预设物料
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="mr-1 h-3.5 w-3.5" />新增预设
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((item) => (
                <PresetCard
                  key={item.id}
                  item={item}
                  onEdit={openEdit}
                  onDelete={setDelTarget}
                  onToggle={(p) => setToggleTarget(p)}
                  onPreview={setPreviewTarget}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 弹窗 */}
      <PresetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={formInitial}
        onSubmit={submitForm}
      />
      <PreviewDialog item={previewTarget} onOpenChange={(v) => !v && setPreviewTarget(null)} />
      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除预设物料</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{delTarget?.name}」吗？该操作不可撤销，已引用此预设的 AI 创作记录不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!toggleTarget} onOpenChange={(v) => !v && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.status === "active" ? "停用预设物料" : "启用预设物料"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.status === "active"
                ? `确定停用「${toggleTarget?.name}」吗？停用后，该预设将不再出现在 AI 创作模块的「平台预设」中，已使用此预设的历史记录不受影响。`
                : `确定启用「${toggleTarget?.name}」吗？启用后，该预设将出现在 AI 创作模块的「平台预设」中，供目标租户使用。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!toggleTarget) return;
                togglePresetStatus(toggleTarget.id);
                toast.success(toggleTarget.status === "active" ? "已停用" : "已启用");
                setToggleTarget(null);
              }}
            >
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量导入 */}
      <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>批量导入预设物料</DialogTitle>
            <DialogDescription>
              按两步完成：先下载与当前分类匹配的 CSV 模板，按模板填好后再上传导入。
            </DialogDescription>
          </DialogHeader>

          {/* 步骤指示 */}
          <div className="flex items-center gap-2 text-xs">
            {[
              { n: 1 as const, label: "下载模板" },
              { n: 2 as const, label: "上传文件" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium ${
                    bulkStep >= s.n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {s.n}
                </div>
                <span
                  className={
                    bulkStep >= s.n ? "font-medium text-foreground" : "text-muted-foreground"
                  }
                >
                  {s.label}
                </span>
                {i === 0 && <div className="mx-2 h-px w-10 bg-border" />}
              </div>
            ))}
          </div>

          {bulkStep === 1 ? (
            <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
              <div className="text-sm">
                目标分类：
                <span className="font-medium text-foreground">
                  {PRESET_CATEGORY_META[cat === "all" ? "bgm" : cat].label}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  （切换左侧分类可下载对应模板）
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                模板列与单条新增表单保持一致：基础信息 + 该分类专属属性 + 版权与计费元数据。请勿修改表头。
              </p>
              <Button
                size="sm"
                onClick={() => {
                  const target: PresetCategory = cat === "all" ? "bgm" : cat;
                  const baseCols = ["名称", "描述", "标签", "资源链接", "封面URL", "时长"];
                  const attrCols = CATEGORY_FIELDS[target].map((f) => f.label);
                  const metaCols = ["版权来源", "授权范围", "授权到期日", "计费单位", "计入额度"];
                  const header = [...baseCols, ...attrCols, ...metaCols].join(",");
                  const blob = new Blob(["\uFEFF" + header + "\n"], {
                    type: "text/csv;charset=utf-8",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `预设物料模板-${PRESET_CATEGORY_META[target].label}.csv`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                  toast.success(`已下载「${PRESET_CATEGORY_META[target].label}」导入模板`);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />下载 CSV 模板
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground hover:bg-muted/50">
                <Upload className="h-6 w-6 opacity-60" />
                {bulkFile ? (
                  <>
                    <span className="font-medium text-foreground">{bulkFile.name}</span>
                    <span className="text-xs">{(bulkFile.size / 1024).toFixed(1)} KB · 点击替换</span>
                  </>
                ) : (
                  <>
                    <span>点击选择 CSV 文件上传</span>
                    <span className="text-xs">仅支持模板生成的 .csv 文件，单次最多 500 行</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                上传后系统将解析并预校验数据，存在错误的行可在结果页下载修订模板。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            {bulkStep === 2 && (
              <Button variant="ghost" size="sm" onClick={() => setBulkStep(1)}>
                上一步
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setBulkImportOpen(false)}>
              取消
            </Button>
            {bulkStep === 1 ? (
              <Button size="sm" onClick={() => setBulkStep(2)}>
                下一步：上传文件
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!bulkFile}
                onClick={() => {
                  toast.success(`已提交「${bulkFile?.name}」，导入将在接入对象存储后开放`);
                  setBulkImportOpen(false);
                }}
              >
                开始导入
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
