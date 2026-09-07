import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Upload, Image as ImageIcon, Type, Smartphone, Music2, Palette, Globe2,
  Smile, Play, Pause, Sparkles, ChevronRight, X, Zap, Cpu, ChevronDown, FolderOpen, Sparkle,
  Send, Save, Download, ChevronUp, RotateCcw, History, BookmarkPlus, Bookmark, Pencil, Package, Target, Wand2, Mic,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { PLATFORM_LIMITS, CreatePostTaskDialog, type Platform, type PostItem } from "@/routes/_app.materials.posts";
import { getActiveModelsByModules } from "@/lib/models-mock";
import { useMaterialsStore } from "@/lib/materials-store";
import { getPresets } from "@/lib/ai-presets-mock";
import { useBillingPricing } from "@/lib/use-billing-pricing";
import { PricingFooter } from "@/components/pricing-footer";
import { cn } from "@/lib/utils";
import { SUBTITLE_PRESETS, type SubtitlePreset } from "@/lib/subtitle-presets";
import { seedLibrary } from "@/routes/_app.ai.library";

export const Route = createFileRoute("/_app/ai/video")({
  component: VideoGenPage,
  head: () => ({ meta: [{ title: "视频生成 — BooPilot" }] }),
});

type Mode = "image" | "text";
type Status = "idle" | "loading" | "done";

const PLATFORMS = ["Facebook", "Tiktok", "Twitter/X", "Instagram", "WhatsApp"];
const REGIONS = ["中国大陆", "北美", "东南亚", "欧洲", "全球"];
const PACE = ["慢速 (氛围)", "中等 (叙事)", "快速 (爆点)"];
const STYLES = ["商务专业", "时尚潮流", "温馨治愈", "科技未来", "极简文艺", "活力青春"];
// 配音音色 / 背景音乐：从「AI 预设物料」拉取，admin 启用即上架
const VOICES = getPresets()
  .filter((p) => p.category === "voiceover" && p.status === "active")
  .map((p) => p.name);
const EMOTIONS = ["默认/平和", "热情活泼", "深情款款", "严肃正式", "幽默轻松"];
const VOICE_LANGUAGES = [
  "中文(简体)", "中文(繁体)", "粤语", "英语", "法语", "德语", "日语", "韩语",
  "西班牙语", "俄语", "意大利语", "阿拉伯语", "丹麦语", "希腊语", "芬兰语",
  "希伯来语", "印地语", "马来语", "荷兰语", "挪威语", "波兰语", "葡萄牙语",
  "瑞典语", "斯瓦西里语", "土耳其语", "印尼语", "泰语", "越南语", "菲律宾语",
];
const BGM = getPresets()
  .filter((p) => p.category === "bgm" && p.status === "active")
  .map((p) => p.name);



// 历史保留：当原料库为空时给一个最小后备库，避免空状态
const FALLBACK_LIBRARY_VOICES = [
  { id: "lib-v-1", name: "知性女声-小雅", duration: "0:12" },
  { id: "lib-v-2", name: "甜美女声-糖糖", duration: "0:10" },
];
const FALLBACK_LIBRARY_BGM = [
  { id: "lib-b-1", name: "城市夜晚-Lofi", duration: "1:24" },
  { id: "lib-b-2", name: "夏日海岸-Pop", duration: "1:48" },
];


// ----- Template & history types
type ParamSnapshot = {
  mode: Mode;
  productImg: string | null;
  productName: string;
  platform: string;
  sellingPoints: string;
  textPrompt: string;
  region: string;
  duration: number;
  pace: string;
  style: string;
  voice: string;
  voiceLang: string;
  emotion: string;
  bgm: string;
  aiModel: string;
  subtitleOn: boolean;
  subtitlePresetId: string;
  subPos: string;
  subSize: string;
};
type TemplateRecord = { id: string; name: string; createdAt: string; params: ParamSnapshot };
type RecentRecord = { id: string; createdAt: string; videoUrl: string; params: ParamSnapshot; thumbnail?: string };

const TPL_KEY = "ai_video_templates";
const RECENT_KEY = "ai_video_recent";

function loadTemplates(): TemplateRecord[] {
  try { return JSON.parse(localStorage.getItem(TPL_KEY) || "[]"); } catch { return []; }
}
function saveTemplates(list: TemplateRecord[]) {
  try { localStorage.setItem(TPL_KEY, JSON.stringify(list)); } catch {}
}
function loadRecent(): RecentRecord[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function saveRecent(list: RecentRecord[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5))); } catch {}
}

function VideoGenPage() {
  // 从原料库实时读取，按用途过滤为音色库 / BGM 库
  const allAssets = useMaterialsStore();
  const [pickerOpen, setPickerOpen] = useState<null | "library" | "materials">(null);
  const pickerItems = useMemo(() => {
    if (pickerOpen === "library") {
      return seedLibrary()
        .filter((r) => r.type === "image")
        .map((r) => ({ id: r.id, name: r.name, url: r.url }));
    }
    if (pickerOpen === "materials") {
      return allAssets
        .filter((a) => a.type === "image")
        .map((a) => ({ id: a.id, name: a.name, url: a.thumb ?? a.url }));
    }
    return [];
  }, [pickerOpen, allAssets]);
  const libraryVoices = useMemo(() => {
    const list = allAssets
      .filter((a) => a.type === "audio" && a.purpose.includes("voiceover"))
      .map((a) => ({ id: a.id, name: a.name, duration: a.duration ?? "" }));
    return list.length > 0 ? list : FALLBACK_LIBRARY_VOICES;
  }, [allAssets]);
  const libraryBgm = useMemo(() => {
    const list = allAssets
      .filter((a) => a.type === "audio" && a.purpose.includes("bgm"))
      .map((a) => ({ id: a.id, name: a.name, duration: a.duration ?? "" }));
    return list.length > 0 ? list : FALLBACK_LIBRARY_BGM;
  }, [allAssets]);

  const [mode, setMode] = useState<Mode>("image");
  const [productImg, setProductImg] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [platform, setPlatform] = useState("Tiktok");
  const [sellingPoints, setSellingPoints] = useState("");
  const [textPrompt, setTextPrompt] = useState("");
  const [region, setRegion] = useState("中国大陆");
  const [duration, setDuration] = useState(15);
  const pricing = useBillingPricing(mode === "text" ? "text2video" : "image2video", duration);
  const [pace, setPace] = useState(PACE[1]);
  const [style, setStyle] = useState(STYLES[0]);
  const [voice, setVoice] = useState<string>("auto");
  const [voiceLang, setVoiceLang] = useState<string>("中文(简体)");
  const [emotion, setEmotion] = useState(EMOTIONS[0]);
  const [bgm, setBgm] = useState<string>("auto");
  const [aiModel, setAiModel] = useState<string>("auto");
  const availableAiModels = useMemo(
    () => getActiveModelsByModules(mode === "image" ? "image2video" : "text2video"),
    [mode],
  );
  const [subtitleOn, setSubtitleOn] = useState(true);
  const [subtitlePreset, setSubtitlePreset] = useState(SUBTITLE_PRESETS[2]);
  const [subPos, setSubPos] = useState("底部");
  const [subSize, setSubSize] = useState("32px");
  const [subtitleOpen, setSubtitleOpen] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [postTaskOpen, setPostTaskOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [recognizing, setRecognizing] = useState(false);

  // Section collapse state — basics open by default, advanced collapsed
  const [openSections, setOpenSections] = useState({
    content: true,
    target: true,
    visual: false,
    audio: false,
  });
  const toggle = (k: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));

  // Template & recent
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [recent, setRecent] = useState<RecentRecord[]>([]);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    setTemplates(loadTemplates());
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ai_image_to_video");
      if (!raw) return;
      const data = JSON.parse(raw) as { imageUrl?: string };
      if (data?.imageUrl) {
        setMode("image");
        setProductImg(data.imageUrl);
        toast.success("已载入图片生成结果作为产品图");
      }
      sessionStorage.removeItem("ai_image_to_video");
    } catch {}
  }, []);

  function snapshot(): ParamSnapshot {
    return {
      mode, productImg, productName, platform, sellingPoints, textPrompt, region,
      duration, pace, style, voice, voiceLang, emotion, bgm, aiModel,
      subtitleOn, subtitlePresetId: subtitlePreset.id, subPos, subSize,
    };
  }
  function applySnapshot(p: ParamSnapshot) {
    setMode(p.mode);
    setProductImg(p.productImg);
    setProductName(p.productName);
    setPlatform(p.platform);
    setSellingPoints(p.sellingPoints);
    setTextPrompt(p.textPrompt);
    setRegion(p.region);
    setDuration(p.duration);
    setPace(p.pace);
    setStyle(p.style);
    setVoice(p.voice);
    setVoiceLang(p.voiceLang);
    setEmotion(p.emotion);
    setBgm(p.bgm);
    setAiModel(p.aiModel);
    setSubtitleOn(p.subtitleOn);
    const preset = SUBTITLE_PRESETS.find((x) => x.id === p.subtitlePresetId);
    if (preset) setSubtitlePreset(preset);
    setSubPos(p.subPos);
    setSubSize(p.subSize);
  }

  function recognizeProduct() {
    setRecognizing(true);
    toast.info("AI 正在识别产品信息…");
    setTimeout(() => {
      setProductName("智能无线降噪耳机 Pro");
      setSellingPoints("主动降噪 42dB | 单次续航 12 小时 | 蓝牙 5.3 低延迟 | IPX5 防水 | 入耳贴合设计");
      setRecognizing(false);
      toast.success("已自动填充产品名称与核心卖点");
    }, 1200);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setProductImg(URL.createObjectURL(f));
    recognizeProduct();
  }

  function generate() {
    if (mode === "image" && !productImg) return toast.error("请先上传产品图");
    if (mode === "text" && !textPrompt.trim()) return toast.error("请输入创意文案");
    if (!sellingPoints.trim() && mode === "image") return toast.error("请填写核心卖点");
    setStatus("loading");
    setProgress(0);
    setGeneratedVideoUrl(null);
    const timer = setInterval(() => {
      setProgress((p) => {
        const np = p + Math.round(6 + Math.random() * 10);
        if (np >= 100) {
          clearInterval(timer);
          setStatus("done");
          const url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
          setGeneratedVideoUrl(url);
          // push to recent
          const snap = snapshot();
          const rec: RecentRecord = {
            id: `rec-${Date.now()}`,
            createdAt: new Date().toISOString(),
            videoUrl: url,
            params: snap,
            thumbnail: snap.productImg ?? undefined,
          };
          const next = [rec, ...loadRecent()].slice(0, 5);
          saveRecent(next);
          setRecent(next);
          return 100;
        }
        return np;
      });
    }, 350);
  }

  function regenerate() {
    generate();
  }
  function editAgain() {
    setStatus("idle");
    setGeneratedVideoUrl(null);
  }
  function resetAll() {
    setMode("image");
    setProductImg(null);
    setProductName("");
    setPlatform("Tiktok");
    setSellingPoints("");
    setTextPrompt("");
    setRegion("中国大陆");
    setDuration(15);
    setPace(PACE[1]);
    setStyle(STYLES[0]);
    setVoice("");
    setVoiceLang("中文(简体)");
    setEmotion(EMOTIONS[0]);
    setBgm("");
    setAiModel("auto");
    setSubtitleOn(true);
    setSubtitlePreset(SUBTITLE_PRESETS[2]);
    setSubPos("底部");
    setSubSize("32px");
    setStatus("idle");
    setGeneratedVideoUrl(null);
    setResetConfirmOpen(false);
    toast.success("已重置全部参数");
  }
  function saveAsTemplate() {
    if (!tplName.trim()) return toast.error("请填写模板名称");
    const t: TemplateRecord = { id: `tpl-${Date.now()}`, name: tplName.trim(), createdAt: new Date().toISOString(), params: snapshot() };
    const next = [t, ...templates];
    saveTemplates(next);
    setTemplates(next);
    setTplDialogOpen(false);
    setTplName("");
    toast.success(`模板「${t.name}」已保存`);
  }
  function deleteTemplate(id: string) {
    const next = templates.filter((t) => t.id !== id);
    saveTemplates(next);
    setTemplates(next);
    toast.success("已删除模板");
  }

  // Section summaries
  const visualSummary = `${pace} · ${style}${subtitleOn ? ` · 字幕${subtitlePreset.name}` : " · 字幕关"}`;
  const audioSummary = `${voice || "未选音色"} · ${voiceLang} · ${bgm || "未选 BGM"}`;
  const contentSummary = mode === "image"
    ? `图生 · ${productName || "未填产品"}`
    : `文生 · ${textPrompt ? textPrompt.slice(0, 12) + (textPrompt.length > 12 ? "…" : "") : "未填文案"}`;
  const targetSummary = `${platform} · ${region} · ${duration}s`;

  return (
    <div className="space-y-4">
      {/* ===== Top quick bar ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">视频生成工作台</span>
          <Badge variant="secondary" className="text-[10px]">{mode === "image" ? "图生视频" : "文生视频"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Recent */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <History className="h-3.5 w-3.5" /> 最近生成
                {recent.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">{recent.length}</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs">最近 5 次生成</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {recent.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">暂无历史记录</div>
              ) : recent.map((r) => (
                <DropdownMenuItem key={r.id} className="flex items-start gap-2" onClick={() => { applySnapshot(r.params); setGeneratedVideoUrl(r.videoUrl); setStatus("done"); toast.success("已载入历史生成"); }}>
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                    {r.thumbnail ? <img src={r.thumbnail} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Play className="h-3 w-3 text-muted-foreground" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-medium">{r.params.productName || (r.params.mode === "text" ? "文生视频" : "未命名")}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{r.params.platform} · {r.params.duration}s · {new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Templates */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Bookmark className="h-3.5 w-3.5" /> 模板
                {templates.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">{templates.length}</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs">我的参数模板</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {templates.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">还没有保存的模板</div>
              ) : templates.map((t) => (
                <DropdownMenuItem key={t.id} className="flex items-center justify-between" onSelect={(e) => { e.preventDefault(); }}>
                  <button className="flex-1 truncate text-left" onClick={() => { applySnapshot(t.params); toast.success(`已应用模板「${t.name}」`); }}>
                    <div className="truncate text-xs font-medium">{t.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{t.params.platform} · {t.params.duration}s</div>
                  </button>
                  <button className="ml-2 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setTplDialogOpen(true)}>
            <BookmarkPlus className="h-3.5 w-3.5" /> 保存为模板
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={() => setResetConfirmOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5" /> 重置
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        {/* Left config */}
        <Card className="flex flex-col overflow-hidden p-0 shadow-[var(--shadow-card)]">
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-base font-semibold">视频一键生成</h2>
            <p className="mt-1 text-xs text-muted-foreground">分组配置参数，下方查看实时摘要</p>
          </div>

          {/* Mode tabs */}
          <div className="px-5 pt-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1">
              {([
                { v: "image", label: "图生视频", icon: ImageIcon },
                { v: "text", label: "文生视频", icon: Type },
              ] as const).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setMode(t.v as Mode)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    mode === t.v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {/* === Section 1: 内容来源 === */}
            <Section
              icon={<Package className="h-3.5 w-3.5" />}
              title="内容来源"
              summary={contentSummary}
              open={openSections.content}
              onToggle={() => toggle("content")}
            >
              {mode === "image" ? (
                <Field label="上传或选择产品图" required>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
                  {productImg ? (
                    <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-primary/50">
                      <img src={productImg} alt="product" className="h-48 w-full object-cover" />
                      <Badge className={cn("absolute right-2 top-2 gap-1", recognizing ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground")}>
                        <Zap className="h-3 w-3" /> {recognizing ? "AI 识别中…" : "识别完成"}
                      </Badge>
                      <button onClick={() => setProductImg(null)} className="absolute left-2 top-2 rounded-full bg-background/80 p-1 hover:bg-background">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button onClick={() => fileRef.current?.click()} className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-muted/50">
                        <Upload className="h-5 w-5" />
                        <span className="text-sm font-medium text-foreground">点击或拖拽上传产品图</span>
                        <span className="text-xs">系统将自动识别产品信息</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-9 w-full justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                              从已有素材中选择
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                          <DropdownMenuItem onClick={() => setPickerOpen("library")}>
                            <Sparkle className="mr-2 h-4 w-4" /> 从 AI 成片库选择
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPickerOpen("materials")}>
                            <ImageIcon className="mr-2 h-4 w-4" /> 从我的原料选择
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </Field>
              ) : (
                <Field label="创意文案" required>
                  <Textarea value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)} placeholder="请输入您的创意文案或脚本" className="min-h-32" />
                </Field>
              )}

              <Field label="产品名称" required={mode === "image"}>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="例如：智能无线降噪耳机" className="h-9" />
              </Field>

              <Field label="核心卖点" required={mode === "image"}>
                <Textarea value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} placeholder="请输入产品的核心卖点，多个卖点用 | 分隔" className="min-h-20" />
              </Field>
            </Section>

            {/* === Section 2: 投放设定 === */}
            <Section
              icon={<Target className="h-3.5 w-3.5" />}
              title="投放设定"
              summary={targetSummary}
              open={openSections.target}
              onToggle={() => toggle("target")}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="目标平台">
                  <IconSelect icon={<Smartphone className="h-4 w-4" />} value={platform} onChange={setPlatform} options={PLATFORMS} />
                </Field>
                <Field label="目标地域">
                  <IconSelect icon={<Globe2 className="h-4 w-4" />} value={region} onChange={setRegion} options={REGIONS} />
                </Field>
              </div>
              <Field
                label={
                  <span className="flex items-center justify-between">
                    <span>视频时长</span>
                    <span className="text-xs text-muted-foreground">{duration}S</span>
                  </span>
                }
              >
                <div className="flex h-9 items-center">
                  <Slider value={[duration]} min={5} max={60} step={5} onValueChange={(v) => setDuration(v[0])} />
                </div>
              </Field>
            </Section>

            {/* === Section 3: 视觉表现 === */}
            <Section
              icon={<Wand2 className="h-3.5 w-3.5" />}
              title="视觉表现"
              summary={visualSummary}
              open={openSections.visual}
              onToggle={() => toggle("visual")}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="视频节奏">
                  <IconSelect icon={<Music2 className="h-4 w-4" />} value={pace} onChange={setPace} options={PACE} />
                </Field>
                <Field label="视觉风格">
                  <IconSelect icon={<Palette className="h-4 w-4" />} value={style} onChange={setStyle} options={STYLES} />
                </Field>
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">字幕效果</Label>
                  <Switch checked={subtitleOn} onCheckedChange={setSubtitleOn} />
                </div>
                {subtitleOn && (
                  <>
                    <button
                      onClick={() => setSubtitleOpen(true)}
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:border-primary/60"
                    >
                      <span className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{subtitlePreset.name}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={subPos} onValueChange={setSubPos}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="位置" />
                        </SelectTrigger>
                        <SelectContent>
                          {["顶部", "中部", "底部"].map((p) => (<SelectItem key={p} value={p}>位置 {p}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Select value={subSize} onValueChange={setSubSize}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="字号" />
                        </SelectTrigger>
                        <SelectContent>
                          {["24px", "28px", "32px", "36px", "40px"].map((s) => (<SelectItem key={s} value={s}>字号 {s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

            </Section>


            {/* === Section 4: 音频设定 === */}
            <Section
              icon={<Mic className="h-3.5 w-3.5" />}
              title="音频设定"
              summary={audioSummary}
              open={openSections.audio}
              onToggle={() => toggle("audio")}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="配音音色" required>
                  <AudioPicker value={voice} onChange={setVoice} presets={VOICES} library={libraryVoices} placeholder="请选择配音音色" uploadAccept="audio/*" libraryTitle="从我的原料库选择配音音色" />
                </Field>
                <Field label="配音语种" required>
                  <IconSelect icon={<Globe2 className="h-4 w-4" />} value={voiceLang} onChange={setVoiceLang} options={VOICE_LANGUAGES} />
                </Field>
              </div>
              <Field label="配音情绪">
                <IconSelect icon={<Smile className="h-4 w-4" />} value={emotion} onChange={setEmotion} options={EMOTIONS} />
              </Field>
              <Field label="背景音乐" required>
                <AudioPicker value={bgm} onChange={setBgm} presets={BGM} library={libraryBgm} placeholder="请选择背景音乐" uploadAccept="audio/*" libraryTitle="从我的原料库选择背景音乐" />
              </Field>
            </Section>


            {/* === Section 5: AI Model (compact) === */}
            <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
              <Label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">AI 模型</Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-muted-foreground"><Cpu className="h-4 w-4" /></span>
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
            </div>
          </div>

          {/* Footer */}
          <div className="space-y-3 border-t border-border/60 bg-muted/10 px-5 py-4">
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
                  : "立即一键生成视频"}
            </Button>
          </div>
        </Card>

        {/* Right preview */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 px-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI 视频生成预览</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">配置左侧参数 · 一键生成 · 直接发帖或保存</p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="flex aspect-[9/16] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300 shadow-[var(--shadow-card)]">
              {status === "loading" ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                  <div className="relative h-24 w-24">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-700" />
                      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fill="none"
                        strokeDasharray={2 * Math.PI * 44}
                        strokeDashoffset={2 * Math.PI * 44 * (1 - progress / 100)}
                        className="text-primary transition-all" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white">{progress}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-semibold text-white">AI 正在创作中…</div>
                    <div className="mt-1 text-xs text-slate-400">正在渲染视觉素材 · 预计剩余 {Math.max(1, Math.ceil((100 - progress) / 20))} 秒</div>
                  </div>
                </div>
              ) : status === "done" ? (
                <video src={generatedVideoUrl ?? undefined} controls className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-1 flex-col">
                  {productImg ? (
                    <div className="relative flex-1 overflow-hidden">
                      <img src={productImg} className="h-full w-full object-cover opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-slate-900/90" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                          <Play className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-sm font-semibold text-white">预览生成效果</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                        <Play className="h-7 w-7 text-slate-500" />
                      </div>
                      <div className="text-base font-medium text-slate-200">视频预览区域</div>
                      <div className="text-xs text-slate-400">配置左侧参数并点击生成，AI 将为您实时渲染高保真营销视频</div>
                    </div>
                  )}
                  {/* Parameter recap card */}
                  <div className="space-y-1.5 border-t border-white/10 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-300 backdrop-blur">
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">即将生成</div>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip>{mode === "image" ? "图生视频" : "文生视频"}</Chip>
                      <Chip>{platform}</Chip>
                      <Chip>{duration}s</Chip>
                      <Chip>{pace}</Chip>
                      <Chip>{style}</Chip>
                      {voice && <Chip>{voice}</Chip>}
                      <Chip>{voiceLang}</Chip>
                      {bgm && <Chip>BGM: {bgm}</Chip>}
                      {subtitleOn && <Chip>字幕</Chip>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action toolbar (below preview) */}
          {status === "done" && (
            <div className="mx-auto flex w-full max-w-sm flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
              <Button onClick={() => setPostTaskOpen(true)} className="h-10 w-full">
                <Send className="h-4 w-4" /> 一键发帖
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="h-9" onClick={() => setSaveOpen(true)}>
                  <Save className="h-4 w-4" /> 保存素材
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9"
                  onClick={async () => {
                    if (!generatedVideoUrl) return;
                    try {
                      const res = await fetch(generatedVideoUrl);
                      if (!res.ok) throw new Error("下载失败");
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${productName || "video"}.mp4`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      toast.success("已开始下载");
                    } catch {
                      toast.error("下载失败，请重试");
                    }
                  }}
                >
                  <Download className="h-4 w-4" /> 下载本地
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-9" onClick={regenerate}>
                  <RotateCcw className="h-4 w-4" /> 重新生成
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={editAgain}>
                  <Pencil className="h-4 w-4" /> 微调再生成
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtitle preset dialog */}
      <Dialog open={subtitleOpen} onOpenChange={setSubtitleOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>字幕效果</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SUBTITLE_PRESETS.map((p) => {
              const active = subtitlePreset.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSubtitlePreset(p)}
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

      {/* Save-as-template dialog */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>保存为模板</DialogTitle>
            <DialogDescription>把当前所有参数另存为模板，下次一键载入</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="模板名称">
              <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="例如：Tiktok 商务专业 15s" className="h-9" />
            </Field>
            <div className="rounded-md border border-border/60 bg-muted/30 p-2 text-[11px] text-muted-foreground space-y-0.5">
              <div>模式：{mode === "image" ? "图生视频" : "文生视频"}</div>
              <div>平台：{platform} · 地域：{region} · 时长：{duration}s</div>
              <div>视觉：{pace} · {style}</div>
              <div>音频：{voice || "未选"} · {voiceLang} · {bgm || "未选"}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplDialogOpen(false)}>取消</Button>
            <Button onClick={saveAsTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirm */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>重置全部参数？</DialogTitle>
            <DialogDescription>当前左侧所有配置将被恢复为默认值，已生成的视频结果不受影响。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={resetAll}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 从已有素材中选择 */}
      <Dialog open={pickerOpen !== null} onOpenChange={(o) => !o && setPickerOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {pickerOpen === "library" ? "从 AI 成片库选择" : "从我的原料选择"}
            </DialogTitle>
            <DialogDescription>选择一张图片作为产品图，用于生成视频。</DialogDescription>
          </DialogHeader>
          {pickerItems.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
              暂无可用图片素材
            </div>
          ) : (
            <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
              {pickerItems.map((it) => (
                <button
                  key={it.id}
                  onClick={() => {
                    setProductImg(it.url);
                    if (!productName) setProductName(it.name);
                    setPickerOpen(null);
                    toast.success(`已选择「${it.name}」`);
                  }}
                  className="group overflow-hidden rounded-lg border border-border text-left transition-colors hover:border-primary"
                >
                  <img src={it.url} alt={it.name} className="h-24 w-full object-cover" />
                  <p className="truncate px-2 py-1.5 text-xs text-foreground">{it.name}</p>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(null)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <SaveToMaterialDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        videoUrl={generatedVideoUrl}
        platform={platform as Platform}
        defaultTitle={productName}
        defaultContent={sellingPoints}
      />

      <CreatePostTaskDialog
        open={postTaskOpen}
        onOpenChange={setPostTaskOpen}
        lockedPlatform={platform as Platform}
        showPostEditor
        defaultPostTitle={productName}
        defaultPostContent={sellingPoints}
        selectedPosts={[
          {
            id: "video-gen-temp",
            type: "video",
            title: productName || "AI 生成视频",
            content: sellingPoints,
            images: [],
            videoUrl: generatedVideoUrl ?? undefined,
            platforms: [platform as Platform],
            publishStatus: { [platform as Platform]: "unpublished" },
            tags: [],
            enabled: true,
            createdAt: new Date().toISOString(),
            tenantId: "",
            tenantName: "",
          } satisfies PostItem,
        ]}
        onCreated={() => { setPostTaskOpen(false); }}
      />
    </div>
  );
}

// ===== Collapsible section =====
function Section({
  icon, title, summary, open, onToggle, children,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
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
            <div className="text-sm font-medium leading-tight">{title}</div>
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
    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200">
      {children}
    </span>
  );
}

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
      setTitle(defaultTitle);
      setContent(defaultContent);
      setTags([]);
      setEnabled(true);
    }
  }, [open, defaultTitle, defaultContent]);

  const handleSubmit = () => {
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
          <DialogDescription>将刚生成的视频保存为贴文素材。目标平台与贴文类型已锁定，其他信息可继续编辑。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="目标平台"><Input value={lockedPlatform} disabled className="h-9" /></Field>
            <Field label="贴文类型"><Input value="视频" disabled className="h-9" /></Field>
          </div>

          {hasTitle && (
            <Field label={`贴文标题 * (${title.length}/${limit.titleMax})`}>
              <Input value={title} maxLength={limit.titleMax} onChange={(e) => setTitle(e.target.value)} placeholder="请输入贴文标题" className="h-9" />
            </Field>
          )}

          <Field label={`文案内容 (${content.length}/${limit.contentMax})`}>
            <Textarea value={content} maxLength={limit.contentMax} rows={4} onChange={(e) => setContent(e.target.value)} placeholder="请输入贴文文案内容" />
          </Field>

          <Field label="上传视频 *">
            {videoUrl ? (
              <video src={videoUrl} controls className="max-h-72 w-full rounded-md bg-black" />
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/30 py-10 text-center text-xs text-muted-foreground">暂无视频</div>
            )}
            <p className="text-xs text-muted-foreground">
              视频时长建议受 {lockedPlatform} 限制：格式 {limit.videoFormats.join(", ")}，文件大小 {limit.videoMaxFileText}
            </p>
          </Field>

          <Field label="标签"><TagMultiSelect value={tags} onChange={setTags} placeholder="选择或新增标签" /></Field>

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
          <Button onClick={handleSubmit}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
      <SelectTrigger className="h-9">
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <SelectValue placeholder={placeholder ?? "请选择"} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
      </SelectContent>
    </Select>
  );
}

type LibraryAudio = { id: string; name: string; duration: string };
type AudioSource = "preset" | "upload" | "library";

function AudioPicker({
  value, onChange, presets, library, placeholder, uploadAccept, libraryTitle,
}: {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  library: LibraryAudio[];
  placeholder?: string;
  uploadAccept?: string;
  libraryTitle?: string;
}) {
  // Derive source from value
  const initialSource: AudioSource =
    value.startsWith("本地：") ? "upload" : value.startsWith("原料库：") ? "library" : "preset";
  const [source, setSource] = useState<AudioSource>(initialSource);
  const [libOpen, setLibOpen] = useState(false);
  const [uploadName, setUploadName] = useState<string>("auto");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSource(value.startsWith("本地：") ? "upload" : value.startsWith("原料库：") ? "library" : "preset");
  }, [value]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadName(f.name);
    onChange(`本地：${f.name}`);
    toast.success(`已选择本地文件 ${f.name}`);
  };

  const sourceLabel = { preset: "系统预设", upload: "本地上传", library: "原料库" }[source];

  return (
    <div className="space-y-1.5">
      {/* Source chips */}
      <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5 text-[10px]">
        {([
          { k: "preset", label: "预设" },
          { k: "upload", label: "上传" },
          { k: "library", label: "原料库" },
        ] as const).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => { setSource(t.k); if (t.k !== initialSource) onChange(""); }}
            className={cn(
              "rounded-[4px] px-2 py-0.5 transition",
              source === t.k ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {source === "preset" && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <IconSelect value={value.startsWith("本地：") || value.startsWith("原料库：") ? "" : value} onChange={onChange} options={presets} placeholder={placeholder} />
          </div>
          <PreviewButton label={value && !value.startsWith("本地：") && !value.startsWith("原料库：") ? value : ""} />
        </div>
      )}

      {source === "upload" && (
        <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
          <input ref={inputRef} type="file" accept={uploadAccept} className="hidden" onChange={handleUpload} />
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => inputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> 选择文件
          </Button>
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {value.startsWith("本地：") ? value.replace("本地：", "") : uploadName || "MP3/WAV/M4A"}
          </span>
          <PreviewButton label={value.startsWith("本地：") ? value.replace("本地：", "") : ""} />
        </div>
      )}

      {source === "library" && (
        <>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLibOpen(true)}
              className="flex h-9 flex-1 min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:border-primary/60"
            >
              <span className="flex items-center gap-2 truncate">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className={cn("truncate", !value.startsWith("原料库：") && "text-muted-foreground")}>
                  {value.startsWith("原料库：") ? value.replace("原料库：", "") : "从原料库选择"}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <PreviewButton label={value.startsWith("原料库：") ? value.replace("原料库：", "") : ""} />
          </div>
          <Dialog open={libOpen} onOpenChange={setLibOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{libraryTitle ?? "从我的原料库选择"}</DialogTitle>
                <DialogDescription>从已上传到原料库的音频中选择一项使用</DialogDescription>
              </DialogHeader>
              <div className="max-h-80 space-y-1.5 overflow-y-auto">
                {library.map((item) => {
                  const selected = value === `原料库：${item.name}`;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition hover:border-primary/60 hover:bg-muted/40",
                        selected ? "border-primary bg-primary/5" : "border-border/60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => { onChange(`原料库：${item.name}`); setLibOpen(false); }}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <Music2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.duration}</span>
                        <PreviewButton label={item.name} />
                      </div>
                    </div>
                  );
                })}
                {library.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">原料库暂无音频</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLibOpen(false)}>取消</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      <div className="text-[10px] text-muted-foreground">来源：{sourceLabel}</div>
    </div>
  );
}

function PreviewButton({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const toggle = () => {
    if (!label) {
      toast.info("请先选择一项后再试听");
      return;
    }
    if (playing) {
      setPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    setPlaying(true);
    toast.success(`正在试听：${label}`);
    timerRef.current = setTimeout(() => {
      setPlaying(false);
      toast.info("试听结束");
    }, 4000);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 shrink-0", !label && "opacity-40")}
      onClick={toggle}
      title={playing ? "停止试听" : "试听"}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
    </Button>
  );
}
