import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Upload,
  X,
  Sparkles,
  Zap,
  Cpu,
  Image as ImageIcon,
  Download,
  Send,
  Save,
  RefreshCw,
  Wand2,
  User,
  Package,
  Type,
  Video as VideoIcon,
  History,
  Bookmark,
  BookmarkPlus,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Play,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { getActiveModelsByModules } from "@/lib/models-mock";
import { useBillingPricing } from "@/lib/use-billing-pricing";
import { PricingFooter } from "@/components/pricing-footer";
import { cn } from "@/lib/utils";
import { MaterialPicker, type MaterialPresetItem } from "@/components/material-picker";
import { getPresets } from "@/lib/ai-presets-mock";

export const Route = createFileRoute("/_app/ai/image")({
  component: ImageGenPage,
  head: () => ({ meta: [{ title: "图片生成 — BooPilot" }] }),
});

type Status = "idle" | "loading" | "done";
type Mode = "image2image" | "text2image";
type AspectRatio = "1:1" | "3:4" | "9:16" | "16:9";
type Quality = "standard" | "hd";

const PROMPT_MAX = 200;
const FILE_MAX_MB = 10;
const ACCEPT_TYPES = "image/jpeg,image/png,image/webp";
const ACCEPT_LABEL = "支持 JPG、JPEG、PNG、WEBP，单张不超过 10MB";

const STYLE_PRESETS = [
  { id: "ecom", label: "电商主图", text: "纯白背景，柔和光影，构图居中，电商主图风格，超高清细节，8K，商业级质感，无水印" },
  { id: "minimal", label: "极简白底", text: "极简风格，纯白背景，柔和均匀打光，居中悬浮构图，干净简洁，超高清，8K" },
  { id: "scene", label: "场景化", text: "高级生活场景，温暖自然光，氛围柔和，构图有故事感，超高清细节，电影级质感" },
  { id: "luxury", label: "高奢质感", text: "高奢质感，深色背景，戏剧化打光，金属与玻璃反射，电影级氛围，超高清，8K" },
];

const HISTORY_KEY = "boo.image.history.v1";
const TEMPLATE_KEY = "boo.image.templates.v1";

type Snapshot = {
  mode: Mode;
  aiModel: string;
  prompt: string;
  modelImg: string | null;
  productImg: string | null;
  aspect: AspectRatio;
  count: number;
  quality: Quality;
};

type HistoryRecord = {
  id: string;
  createdAt: number;
  thumb: string;
  params: Snapshot;
};

type TemplateRecord = {
  id: string;
  name: string;
  params: Snapshot;
};

const ASPECT_OPTIONS: { v: AspectRatio; label: string; box: string }[] = [
  { v: "1:1", label: "1:1", box: "aspect-square" },
  { v: "3:4", label: "3:4", box: "aspect-[3/4]" },
  { v: "9:16", label: "9:16", box: "aspect-[9/16]" },
  { v: "16:9", label: "16:9", box: "aspect-video" },
];

const COUNT_OPTIONS = [1, 2, 4];

// 系统预设·数字人模特 → 用作「模特图片」的预设选择
const AVATAR_PRESETS: MaterialPresetItem[] = getPresets()
  .filter((p) => p.category === "avatar" && p.status === "active")
  .map((p) => ({
    id: p.id,
    name: p.name,
    url: typeof p.cover === "string" ? p.cover : (p.cover as unknown as string),
  }));

function ImageGenPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("image2image");
  const [aiModel, setAiModel] = useState<string>("auto");
  const availableAiModels = useMemo(() => getActiveModelsByModules(mode), [mode]);

  const [modelImg, setModelImg] = useState<string | null>(null);
  const [productImg, setProductImg] = useState<string | null>(null);
  const modelFileRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<AspectRatio>("3:4");
  const [count, setCount] = useState<number>(4);
  const [quality, setQuality] = useState<Quality>("standard");

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(0);
  const [generated, setGenerated] = useState<string[]>([]);
  const [activeResult, setActiveResult] = useState<number>(0);

  // Sections
  const [openSec, setOpenSec] = useState({
    media: true,
    prompt: true,
    output: true,
    model: true,
  });
  const toggleSec = (k: keyof typeof openSec) =>
    setOpenSec((s) => ({ ...s, [k]: !s[k] }));

  // History + templates
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
      const t = localStorage.getItem(TEMPLATE_KEY);
      if (t) setTemplates(JSON.parse(t));
    } catch {}
  }, []);

  const persistHistory = (rs: HistoryRecord[]) => {
    setHistory(rs);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(rs)); } catch {}
  };
  const persistTemplates = (rs: TemplateRecord[]) => {
    setTemplates(rs);
    try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(rs)); } catch {}
  };

  function snapshot(): Snapshot {
    return { mode, aiModel, prompt, modelImg, productImg, aspect, count, quality };
  }
  function applySnapshot(s: Snapshot) {
    setMode(s.mode);
    setAiModel(s.aiModel);
    setPrompt(s.prompt);
    setModelImg(s.modelImg);
    setProductImg(s.productImg);
    setAspect(s.aspect);
    setCount(s.count);
    setQuality(s.quality);
  }
  function resetAll() {
    setMode("image2image");
    setAiModel("auto");
    setPrompt("");
    setModelImg(null);
    setProductImg(null);
    setAspect("3:4");
    setCount(4);
    setQuality("standard");
    setStatus("idle");
    setGenerated([]);
    setProgress(0);
    toast.success("已重置全部参数");
  }
  function saveTemplate() {
    const name = tplName.trim();
    if (!name) return toast.error("请填写模板名称");
    const t: TemplateRecord = { id: String(Date.now()), name, params: snapshot() };
    persistTemplates([t, ...templates].slice(0, 20));
    setTplOpen(false);
    setTplName("");
    toast.success(`已保存模板「${name}」`);
  }
  function deleteTemplate(id: string) {
    persistTemplates(templates.filter((t) => t.id !== id));
  }

  function pickImage(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
  ) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > FILE_MAX_MB * 1024 * 1024) {
      toast.error(`单张图片不超过 ${FILE_MAX_MB}MB`);
      e.target.value = "";
      return;
    }
    setter(URL.createObjectURL(f));
  }

  const blockReason = useMemo(() => {
    if (mode === "image2image" && !modelImg) return "请上传模特图片";
    if (mode === "image2image" && !productImg) return "请上传商品图片";
    if (!prompt.trim()) return "请填写提示词";
    return "";
  }, [mode, modelImg, productImg, prompt, aiModel]);

  function generate() {
    if (blockReason) return toast.error(blockReason);

    setStatus("loading");
    setProgress(0);
    setEta(8 + Math.round(count * 1.2) + (quality === "hd" ? 4 : 0));
    setGenerated([]);

    const startedAt = Date.now();
    const totalMs = 3500 + count * 600 + (quality === "hd" ? 1500 : 0);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const p = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setProgress(p);
      setEta(Math.max(0, Math.round((totalMs - elapsed) / 1000)));
      if (p >= 100) {
        clearInterval(timer);
        const seed = Date.now();
        const dim = aspect === "1:1" ? "800/800"
          : aspect === "3:4" ? "600/800"
          : aspect === "9:16" ? "540/960"
          : "960/540";
        const imgs = Array.from({ length: count }).map(
          (_, i) => `https://picsum.photos/seed/booimg-${seed}-${i}/${dim}`,
        );
        setGenerated(imgs);
        setActiveResult(0);
        setStatus("done");
        const rec: HistoryRecord = {
          id: String(seed),
          createdAt: seed,
          thumb: imgs[0],
          params: snapshot(),
        };
        persistHistory([rec, ...history].slice(0, 5));
      }
    }, 240);
  }

  // Summaries
  const mediaSummary = mode === "text2image"
    ? "文生图（无需上传）"
    : `模特${modelImg ? "✓" : "—"} · 商品${productImg ? "✓" : "—"}`;
  const promptSummary = prompt.trim()
    ? `${prompt.slice(0, 14)}${prompt.length > 14 ? "…" : ""}`
    : "未填写";
  const outputSummary = `${aspect} · ${count} 张 · ${quality === "hd" ? "高清" : "标准"}`;
  const modelSummary = aiModel === "auto"
    ? "系统自动推荐"
    : availableAiModels.find((m) => m.id === aiModel)?.name || "系统自动推荐";

  // Pricing — 按当前租户套餐折扣计算
  const qualityMultiplier = quality === "hd" ? 1.3 : 1;
  const units = Math.ceil(count * qualityMultiplier);
  const pricing = useBillingPricing(mode, units);
  const finalCost = pricing.final;
  const totalCost = pricing.original;
  const saved = pricing.saved;

  const activeBox = ASPECT_OPTIONS.find((a) => a.v === aspect)!.box;

  return (
    <div className="space-y-4">
      {/* ===== Top quick bar ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">图片生成工作台</span>
          <Badge variant="secondary" className="text-[10px]">
            {mode === "image2image" ? "图生图" : "文生图"}
          </Badge>
          <Popover>
            <PopoverTrigger asChild>
              <button className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" className="w-80 text-xs leading-relaxed">
              「图生图」上传模特 + 商品，AI 自动合成高质感电商主图；「文生图」纯文本描述即可生成商品概念图。所有结果可一键发帖 / 转视频 / 入库。
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Recent */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <History className="h-3.5 w-3.5" /> 最近生成
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                    {history.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs">最近 5 次生成</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {history.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  暂无历史记录
                </div>
              ) : (
                history.map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    className="flex items-start gap-2"
                    onClick={() => {
                      applySnapshot(r.params);
                      toast.success("已载入历史参数");
                    }}
                  >
                    <div
                      className="h-10 w-10 shrink-0 rounded bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${r.thumb})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">
                        {r.params.prompt.slice(0, 22) || "未命名"}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {r.params.mode === "image2image" ? "图生图" : "文生图"} · {r.params.aspect} · {r.params.count}张 · {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Templates */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Bookmark className="h-3.5 w-3.5" /> 模板
                {templates.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                    {templates.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs">我的参数模板</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {templates.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  还没有保存的模板
                </div>
              ) : (
                templates.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    className="flex items-center justify-between"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <button
                      className="flex-1 truncate text-left"
                      onClick={() => {
                        applySnapshot(t.params);
                        toast.success(`已应用模板「${t.name}」`);
                      }}
                    >
                      <div className="truncate text-xs font-medium">{t.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {t.params.mode === "image2image" ? "图生图" : "文生图"} · {t.params.aspect} · {t.params.count}张
                      </div>
                    </button>
                    <button
                      className="ml-2 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(t.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setTplOpen(true)}
          >
            <BookmarkPlus className="h-3.5 w-3.5" /> 保存为模板
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> 重置
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
        {/* Left config */}
        <Card className="flex flex-col overflow-hidden p-0 shadow-[var(--shadow-card)]">
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-base font-semibold">商品图一键生成</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              分组配置参数，下方查看实时摘要与积分
            </p>
          </div>

          {/* Mode tabs */}
          <div className="px-5 pt-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1">
              {([
                { v: "image2image", label: "图生图", icon: ImageIcon },
                { v: "text2image", label: "文生图", icon: Type },
              ] as const).map((t) => (
                <button
                  key={t.v}
                  onClick={() => {
                    setMode(t.v as Mode);
                    setAiModel("auto");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    mode === t.v
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

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {/* 素材 */}
            {mode === "image2image" && (
              <Section
                icon={<Upload className="h-3.5 w-3.5" />}
                title="素材"
                summary={mediaSummary}
                open={openSec.media}
                onToggle={() => toggleSec("media")}
                required
              >
                <Field label="上传模特图片" required>
                  <UploadBox
                    value={modelImg}
                    inputRef={modelFileRef}
                    onChange={(e) => pickImage(e, setModelImg)}
                    onClear={() => setModelImg(null)}
                    icon={<User className="h-5 w-5" />}
                  />
                  <MaterialPicker
                    type="image"
                    presets={AVATAR_PRESETS}
                    presetLabel="系统预设·数字人模特"
                    title="选择模特图片"
                    description="支持从我的物料或系统预设的数字人模特中选择"
                    onPick={(m) => m.url && setModelImg(m.url)}
                    trigger={
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border/70 bg-muted/20 py-1.5 text-[11px] text-primary hover:border-primary/60 hover:bg-primary/5"
                      >
                        <FolderOpen className="h-3 w-3" /> 从我的物料 / 系统预设选择
                      </button>
                    }
                  />
                </Field>
                <Field label="上传商品图片" required>
                  <UploadBox
                    value={productImg}
                    inputRef={productFileRef}
                    onChange={(e) => pickImage(e, setProductImg)}
                    onClear={() => setProductImg(null)}
                    icon={<Package className="h-5 w-5" />}
                  />
                  <MaterialPicker
                    type="image"
                    purpose="product"
                    title="选择商品图片"
                    description="从我的物料中选择「产品图」用途的素材"
                    onPick={(m) => m.url && setProductImg(m.url)}
                    trigger={
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border/70 bg-muted/20 py-1.5 text-[11px] text-primary hover:border-primary/60 hover:bg-primary/5"
                      >
                        <FolderOpen className="h-3 w-3" /> 从我的物料选择
                      </button>
                    }
                  />
                </Field>
              </Section>
            )}

            {/* 提示词 */}
            <Section
              icon={<Wand2 className="h-3.5 w-3.5" />}
              title="提示词"
              summary={promptSummary}
              open={openSec.prompt}
              onToggle={() => toggleSec("prompt")}
              required
            >
              <div className="flex flex-wrap gap-1.5">
                {STYLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPrompt(p.text);
                      toast.success(`已套用「${p.label}」预设`);
                    }}
                    className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Textarea
                  value={prompt}
                  maxLength={PROMPT_MAX}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === "image2image"
                      ? "请描述：模特 + 手持 / 佩戴 / 试穿 商品 + 场景 + 风格。\n例如：\n - 女模特手持护肤品，白色背景，高清电商主图\n - 男模特佩戴耳机，干净纯色背景，均匀柔光，突出产品细节"
                      : "请描述你想生成的画面：主体 + 场景 + 风格 + 细节。\n例如：\n - 一只在樱花树下喝抹茶的柴犬，日式浮世绘风格\n - 极简电商主图，纯白背景，悬浮的香水瓶，高级感，8K"
                  }
                  className="min-h-32 pb-6 text-sm"
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground">
                  {prompt.length}/{PROMPT_MAX}
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                onClick={() => {
                  setPrompt(
                    mode === "image2image"
                      ? "女模特手持产品，纯白背景，柔和光影，电商主图风格，超高清细节，8K，商业级质感，无水印"
                      : "极简电商主图，纯白背景，柔和光影，构图居中，超高清细节，8K，商业级质感",
                  );
                  toast.success("AI 已为你润色提示词");
                }}
              >
                <Wand2 className="h-3 w-3" /> AI 智能润色
              </button>
            </Section>

            {/* 输出设置 */}
            <Section
              icon={<ImageIcon className="h-3.5 w-3.5" />}
              title="输出设置"
              summary={outputSummary}
              open={openSec.output}
              onToggle={() => toggleSec("output")}
            >
              <Field label="画面比例">
                <div className="grid grid-cols-4 gap-1.5">
                  {ASPECT_OPTIONS.map((a) => (
                    <button
                      key={a.v}
                      type="button"
                      onClick={() => setAspect(a.v)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] transition",
                        aspect === a.v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "w-5 rounded-sm border",
                          aspect === a.v ? "border-primary" : "border-muted-foreground/60",
                          a.box,
                        )}
                      />
                      {a.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="出图数量">
                <div className="grid grid-cols-3 gap-1.5">
                  {COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm transition",
                        count === n
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                    >
                      {n} 张
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="画质">
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { v: "standard", label: "标准（更快）" },
                    { v: "hd", label: "高清（+1 积分/张）" },
                  ] as const).map((q) => (
                    <button
                      key={q.v}
                      type="button"
                      onClick={() => setQuality(q.v)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs transition",
                        quality === q.v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            {/* AI 模型 */}
            <Section
              icon={<Cpu className="h-3.5 w-3.5" />}
              title="AI 模型"
              summary={modelSummary}
              open={openSec.model}
              onToggle={() => toggleSec("model")}
              required
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
          </div>

          {/* Footer */}
          <div className="space-y-2 border-t border-border/60 bg-muted/20 px-5 py-4">
            <PricingFooter pricing={pricing} />

            <Button
              onClick={generate}
              disabled={status === "loading" || pricing.disabled}
              title={pricing.disabled ? pricing.disabledReason : undefined}
              className="h-11 w-full text-base font-medium"
            >
              <Sparkles className="h-4 w-4" />
              {pricing.disabled
                ? pricing.disabledReason ?? "当前套餐不可用"
                : status === "loading"
                  ? "AI 正在创作中…"
                  : blockReason
                    ? blockReason
                    : "开始生成"}
            </Button>
          </div>
        </Card>

        {/* Right preview */}
        <div className="space-y-4">
          {status === "idle" && (
            <Card className="flex min-h-[520px] flex-col items-center justify-center gap-4 border-dashed bg-muted/20 p-10 text-center">
              <div
                className={cn(
                  "relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border/60 bg-background/60",
                  activeBox,
                  aspect === "16:9" ? "w-80" : "w-56",
                )}
              >
                <ImageIcon className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <div className="text-base font-medium">图片预览区域</div>
              <div className="max-w-sm text-xs text-muted-foreground">
                完成左侧配置并点击「开始生成」，AI 将输出 {count} 张 {aspect} {quality === "hd" ? "高清" : "标准"} 商品图
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <Chip>{mode === "image2image" ? "图生图" : "文生图"}</Chip>
                <Chip>比例 {aspect}</Chip>
                <Chip>{count} 张</Chip>
                <Chip>{quality === "hd" ? "高清" : "标准"}</Chip>
                {aiModel && <Chip>{availableAiModels.find((m) => m.id === aiModel)?.name}</Chip>}
              </div>
            </Card>
          )}

          {status === "loading" && (
            <Card className="flex min-h-[520px] flex-col items-center justify-center gap-5 p-10">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
                  <circle
                    cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fill="none"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - progress / 100)}
                    className="text-primary transition-all"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
                  {progress}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-base font-semibold">AI 正在创作中…</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  预计剩余 {eta} 秒 · 正在合成 {count} 张 {aspect} 图
                </div>
              </div>
              <div
                className={cn(
                  "grid w-full max-w-md gap-2",
                  count === 1 ? "grid-cols-1" : count === 2 ? "grid-cols-2" : "grid-cols-4",
                )}
              >
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "animate-pulse rounded-md bg-gradient-to-br from-muted to-muted/40",
                      activeBox,
                    )}
                  />
                ))}
              </div>
            </Card>
          )}

          {status === "done" && (
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col lg:flex-row">
                <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
                  <img
                    src={generated[activeResult]}
                    alt="result"
                    className={cn(
                      "max-h-[520px] rounded-lg object-contain shadow-2xl",
                      activeBox,
                    )}
                  />
                </div>
                <div className="w-full shrink-0 space-y-3 border-t border-border/60 p-4 lg:w-64 lg:border-l lg:border-t-0">
                  <div>
                    <div className="text-sm font-semibold">生成结果</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      共 {generated.length} 张 · 已选第 {activeResult + 1} 张
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
                    {generated.map((src, i) => (
                      <div key={src} className="group relative">
                        <button
                          onClick={() => setActiveResult(i)}
                          className={cn(
                            "block w-full overflow-hidden rounded-md border-2 transition",
                            activeResult === i
                              ? "border-primary"
                              : "border-transparent hover:border-primary/40",
                          )}
                        >
                          <img src={src} alt="" className="aspect-square w-full object-cover" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadImage(src, i)}
                          className="absolute right-1 top-1 hidden rounded-full bg-background/85 p-1 shadow-sm backdrop-blur hover:bg-background group-hover:block"
                          title="下载该张"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => toast.success("已创建发帖任务")}>
                    <Send className="h-3.5 w-3.5" /> 一键发帖
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          "ai_image_to_video",
                          JSON.stringify({
                            imageUrl: generated[activeResult],
                            from: "image-gen",
                            ts: Date.now(),
                          }),
                        );
                      } catch {}
                      navigate({ to: "/ai/video" });
                    }}
                  >
                    <VideoIcon className="h-3.5 w-3.5" /> 生成视频
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toast.success("已保存至成品素材")}
                  >
                    <Save className="h-3.5 w-3.5" /> 保存至成品素材
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadImage(generated[activeResult], activeResult)}
                  >
                    <Download className="h-3.5 w-3.5" /> 下载到本地
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={generate}>
                    <RefreshCw className="h-3.5 w-3.5" /> 重新生成
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setStatus("idle");
                      toast.info("已回到编辑模式，可微调提示词后重新生成");
                    }}
                  >
                    <Play className="h-3.5 w-3.5 rotate-180" /> 继续编辑
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Save template dialog */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>保存为模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">模板名称</Label>
            <Input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="例如：白底主图 3:4 高清"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplOpen(false)}>取消</Button>
            <Button onClick={saveTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirm */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重置全部参数？</AlertDialogTitle>
            <AlertDialogDescription>
              将清空已上传素材、提示词、输出设置与生成结果，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setResetOpen(false); resetAll(); }}>
              确认重置
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

async function downloadImage(src: string, idx: number) {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-image-${idx + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("已开始下载");
  } catch {
    toast.error("下载失败，请重试");
  }
}

/* ---------- 子组件 ---------- */

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

function UploadBox({
  value,
  inputRef,
  onChange,
  onClear,
  icon,
}: {
  value: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  icon: React.ReactNode;
}) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_TYPES}
        className="hidden"
        onChange={onChange}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-primary/50">
          <img
            src={value}
            alt="upload"
            className="h-40 w-full bg-[conic-gradient(at_top_left,_var(--muted),_var(--background))] object-contain"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1 hover:bg-background"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur hover:bg-background"
          >
            <Upload className="h-3 w-3" /> 重新上传
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-muted/50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
            {icon}
          </span>
          <span className="text-sm font-medium text-foreground">点击或拖拽上传图片</span>
          <span className="px-3 text-center text-[11px] leading-relaxed">
            {ACCEPT_LABEL}
          </span>
        </button>
      )}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-sm font-medium">
        <span className="inline-block h-3.5 w-[3px] rounded-sm bg-primary" />
        <span className="text-foreground">{label}</span>
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
