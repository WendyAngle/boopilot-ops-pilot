import { useEffect, useMemo, useRef, useState } from "react";
import { getActiveModelsByModules } from "@/lib/models-mock";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FolderOpen,
  Sparkles,
  Link2,
  History,
  Copy,
  Plus,
  RefreshCw,
  Save,
  Download,
  Video,
  Zap,
  Wand2,
  Check,
  Music,
  Mic,
  Send,
  Image as ImageIcon,
  Flame,
  TrendingUp,
  ShieldCheck,
  Layers,
  PlayCircle,
  HelpCircle,
  Bookmark,
  BookmarkPlus,
  RotateCcw,
  Play,
  Pause,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { useBillingPricing, type BillingPricing } from "@/lib/use-billing-pricing";
import { PricingFooter } from "@/components/pricing-footer";
import { cn } from "@/lib/utils";
import { getPresets } from "@/lib/ai-presets-mock";

// 配音 / BGM 选项：来自「AI 预设物料」
const PRESET_BGM_OPTIONS = getPresets()
  .filter((p) => p.category === "bgm" && p.status === "active")
  .map((p) => ({ id: p.id, name: p.name }));
const PRESET_VOICE_OPTIONS = getPresets()
  .filter((p) => p.category === "voiceover" && p.status === "active")
  .map((p) => ({ id: p.id, name: p.name }));
const PRESET_AVATAR_OPTIONS = getPresets()
  .filter((p) => p.category === "avatar" && p.status === "active")
  .map((p) => ({ id: p.id, name: p.name }));


export const Route = createFileRoute("/_app/ai/replicate")({
  component: ReplicatePage,
  head: () => ({ meta: [{ title: "爆款复刻 — BooPilot" }] }),
});

/* ----------------------------------------------------------------------------
 * Types & mock data
 * -------------------------------------------------------------------------- */

type Step = 1 | 2 | 3 | 4;


type Segment = {
  id: string;
  name: string;
  start: string;
  end: string;
  duration: number; // seconds
  scene: string; // 场景描述
  shoot: string; // 拍摄技巧
  copy: string; // 原始口播
  logic: string;
  transition: string;
  customCopy?: string; // 定制后的口播
  assets: { name: string; thumb: string }[];
};

type BizInfo = {
  industry: string;
  brand: string;
  product: string;
  selling: string;
  audience: string;
  tone: string;
};

type Variant = {
  id: string;
  name: string;
  cover: string;
  duration: string;
  bgm: string;
  voice: string;
};

const PLATFORMS = ["抖音", "小红书", "快手", "TikTok", "Instagram"];

const HISTORY_TEMPLATES = [
  { id: "h1", name: "户外露营带货模板", time: "2026-06-08", score: 92 },
  { id: "h2", name: "护肤品种草模板", time: "2026-06-05", score: 88 },
  { id: "h3", name: "3C 数码开箱模板", time: "2026-05-30", score: 90 },
];

const RECENT_GENERATIONS = [
  {
    id: "g1",
    name: "便携咖啡机 · 强卖点版",
    cover: "https://picsum.photos/seed/rep-g1/320/180",
    duration: "00:22",
    source: "TikTok @coffee.daily",
    time: "2026-06-11 15:42",
    variants: 3,
  },
  {
    id: "g2",
    name: "户外帐篷 · 情感种草版",
    cover: "https://picsum.photos/seed/rep-g2/320/180",
    duration: "00:28",
    source: "抖音 @山野日记",
    time: "2026-06-10 09:18",
    variants: 3,
  },
  {
    id: "g3",
    name: "面膜礼盒 · 促单转化版",
    cover: "https://picsum.photos/seed/rep-g3/320/180",
    duration: "00:18",
    source: "小红书 @肌肤研究所",
    time: "2026-06-08 21:05",
    variants: 3,
  },
  {
    id: "g4",
    name: "智能手表 · 强卖点版",
    cover: "https://picsum.photos/seed/rep-g4/320/180",
    duration: "00:25",
    source: "抖音 @数码玩家",
    time: "2026-06-07 11:30",
    variants: 3,
  },
];

const TRENDING_REFS = [
  {
    id: "t1",
    title: "便携咖啡机 3 秒种草",
    platform: "TikTok",
    score: 96,
    views: "238 万",
    cover: "https://picsum.photos/seed/rep-t1/320/420",
  },
  {
    id: "t2",
    title: "亚马逊筋膜枪开箱测评",
    platform: "TikTok",
    score: 93,
    views: "182 万",
    cover: "https://picsum.photos/seed/rep-t2/320/420",
  },
  {
    id: "t3",
    title: "户外露营折叠桌椅安利",
    platform: "抖音",
    score: 91,
    views: "146 万",
    cover: "https://picsum.photos/seed/rep-t3/320/420",
  },
  {
    id: "t4",
    title: "韩系空气感卷发教程",
    platform: "小红书",
    score: 89,
    views: "98 万",
    cover: "https://picsum.photos/seed/rep-t4/320/420",
  },
];

const MOCK_SEGMENTS: Segment[] = [
  {
    id: "s1",
    name: "黄金钩子",
    start: "00:00",
    end: "00:03",
    duration: 3,
    scene: "近景 · 产品特写 + 主播挑眉",
    shoot: "手持低角度,快速推近",
    copy: "你绝对想不到,只要 3 秒钟,就能彻底改变你的体验!",
    logic: "痛点直击 + 悬念设置",
    transition: "快速切入",
    assets: [],
  },
  {
    id: "s2",
    name: "产品展示",
    start: "00:03",
    end: "00:08",
    duration: 5,
    scene: "中景 · 桌面摆拍 + 灯光打侧",
    shoot: "环绕运镜,卡点切镜",
    copy: "3 秒即热,专业级温控,无惧任何使用场景。",
    logic: "核心卖点 1 展示",
    transition: "淡入淡出",
    assets: [],
  },
  {
    id: "s3",
    name: "场景应用",
    start: "00:08",
    end: "00:12",
    duration: 4,
    scene: "多场景蒙太奇 · 办公 / 健身 / 户外",
    shoot: "三组定机位拼接",
    copy: "无论是办公室、健身房还是户外露营,都能轻松驾驭。",
    logic: "多场景适用性",
    transition: "叠化",
    assets: [],
  },
  {
    id: "s4",
    name: "信任背书",
    start: "00:12",
    end: "00:18",
    duration: 6,
    scene: "评论截图 + 数据弹窗",
    shoot: "屏幕录屏 + 缩放动效",
    copy: "已成为全球 10 万+ 用户的共同选择,五星好评如潮。",
    logic: "社交证明",
    transition: "缩放",
    assets: [],
  },
  {
    id: "s5",
    name: "行动号召",
    start: "00:18",
    end: "00:22",
    duration: 4,
    scene: "产品 + 倒计时贴纸 + 价格标签",
    shoot: "硬切到购物车特写",
    copy: "限时 5 折,点击下方立即抢购,错过再等一年!",
    logic: "促单成交",
    transition: "硬切",
    assets: [],
  },
];

const MY_MATERIALS = [
  { id: "m1", name: "产品白底图 A", thumb: "https://picsum.photos/seed/repmat-a/240/240" },
  { id: "m2", name: "户外场景视频", thumb: "https://picsum.photos/seed/repmat-b/240/240" },
  { id: "m3", name: "模特展示", thumb: "https://picsum.photos/seed/repmat-c/240/240" },
  { id: "m4", name: "产品细节特写", thumb: "https://picsum.photos/seed/repmat-d/240/240" },
  { id: "m5", name: "办公室场景", thumb: "https://picsum.photos/seed/repmat-e/240/240" },
  { id: "m6", name: "用户证言截图", thumb: "https://picsum.photos/seed/repmat-f/240/240" },
  { id: "m7", name: "健身房片段", thumb: "https://picsum.photos/seed/repmat-g/240/240" },
  { id: "m8", name: "厨房使用片段", thumb: "https://picsum.photos/seed/repmat-h/240/240" },
];

const STEP_META: { id: Step; title: string; desc: string }[] = [
  { id: 1, title: "解析作品", desc: "粘贴爆款链接,AI 拆解节奏与卖点" },
  { id: 2, title: "定制脚本", desc: "填写业务信息,AI 生成专属口播" },
  { id: 3, title: "上传素材", desc: "为每个分镜匹配自有素材" },
  { id: 4, title: "生成预览", desc: "选择 BGM / 配音,导出成片" },
];

/* ----------------------------------------------------------------------------
 * Root
 * -------------------------------------------------------------------------- */

function ReplicatePage() {
  const [step, setStep] = useState<Step>(1);

  // step 1 state
  const [url, setUrl] = useState("");
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("正在识别:镜头节奏");
  const [analyzed, setAnalyzed] = useState(false);

  // step 2 state
  const [biz, setBiz] = useState<BizInfo>({
    industry: "户外装备",
    brand: "",
    product: "",
    selling: "",
    audience: "25-35 岁城市白领,周末户外爱好者",
    tone: "口语化 / 强引导",
  });
  const [customizing, setCustomizing] = useState(false);

  // shared segments
  const [segments, setSegments] = useState<Segment[]>(MOCK_SEGMENTS);

  // step 4 state
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeVariant, setActiveVariant] = useState<string | null>(null);
  const [bgm, setBgm] = useState(PRESET_BGM_OPTIONS[0]?.id ?? "");
  const [voice, setVoice] = useState(PRESET_VOICE_OPTIONS[0]?.id ?? "");
  const [avatarId, setAvatarId] = useState<string>("none");
  const [aiModel, setAiModel] = useState("auto");
  const availableAiModels = useMemo(() => getActiveModelsByModules("replicate"), []);
  const pricing = useBillingPricing("replicate", 1);

  // dialogs
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [trendingOpen, setTrendingOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [pickingSegId, setPickingSegId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 与其它 AI 模块对齐的工作台状态：模板 / 重置 / ETA
  type UserTpl = { id: string; name: string; createdAt: number; url: string; biz: BizInfo };
  const TPL_KEY = "boo.replicate.tpl.v1";
  const [userTpls, setUserTpls] = useState<UserTpl[]>([]);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [analyzeEta, setAnalyzeEta] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TPL_KEY);
      if (raw) setUserTpls(JSON.parse(raw));
    } catch {}
  }, []);
  const persistTpls = (rs: UserTpl[]) => {
    setUserTpls(rs);
    try { localStorage.setItem(TPL_KEY, JSON.stringify(rs)); } catch {}
  };

  function saveCurrentAsTpl() {
    const name = tplName.trim();
    if (!name) return toast.error("请填写模板名称");
    const tpl: UserTpl = { id: String(Date.now()), name, createdAt: Date.now(), url, biz };
    persistTpls([tpl, ...userTpls].slice(0, 20));
    setTplDialogOpen(false);
    setTplName("");
    toast.success(`已保存模板「${name}」`);
  }
  function deleteUserTpl(id: string) {
    persistTpls(userTpls.filter((t) => t.id !== id));
  }
  function resetAllFlow() {
    setStep(1);
    setUrl("");
    setUploaded(null);
    setAnalyzing(false);
    setAnalyzed(false);
    setProgress(0);
    setSegments(MOCK_SEGMENTS);
    setVariants([]);
    setActiveVariant(null);
    setBiz({
      industry: "户外装备",
      brand: "",
      product: "",
      selling: "",
      audience: "25-35 岁城市白领,周末户外爱好者",
      tone: "口语化 / 强引导",
    });
    toast.success("已重置全流程");
  }


  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/video\//.test(f.type)) {
      toast.error("请上传视频文件");
      e.target.value = "";
      return;
    }
    setUploaded(f.name);
  }

  function startAnalyze() {
    if (!url.trim() && !uploaded) {
      return toast.error("请粘贴爆款视频链接或上传视频");
    }
    setAnalyzing(true);
    setAnalyzed(false);
    setProgress(0);
    setAnalyzeEta(22);
    const labels = [
      "正在识别:镜头节奏",
      "正在识别:转场点",
      "正在识别:关键文案",
      "正在提取:卖点逻辑",
      "正在生成:复刻模板",
    ];
    let idx = 0;
    setProgressLabel(labels[0]);
    const startedAt = Date.now();
    const totalMs = 22000;
    const timer = setInterval(() => {
      setProgress((p) => {
        const elapsed = Date.now() - startedAt;
        const np = Math.min(100, Math.max(p + 1, Math.round((elapsed / totalMs) * 100)));
        setAnalyzeEta(Math.max(0, Math.round((totalMs - elapsed) / 1000)));
        const phase = Math.min(labels.length - 1, Math.floor(np / 20));
        if (phase !== idx) {
          idx = phase;
          setProgressLabel(labels[phase]);
        }
        if (np >= 100) {
          clearInterval(timer);
          setAnalyzing(false);
          setAnalyzed(true);
          return 100;
        }
        return np;
      });
    }, 220);
  }


  function customizeScript() {
    if (!biz.product.trim() || !biz.selling.trim()) {
      return toast.error("请至少填写商品名称与核心卖点");
    }
    setCustomizing(true);
    setTimeout(() => {
      setSegments((prev) =>
        prev.map((s) => ({
          ...s,
          customCopy: rewriteCopy(s, biz),
        })),
      );
      setCustomizing(false);
      toast.success("AI 已生成定制脚本");
      setStep(3);
    }, 1200);
  }

  function openMaterialPicker(segId: string) {
    setPickingSegId(segId);
    setMaterialOpen(true);
  }

  function assignMaterial(mat: { name: string; thumb: string }) {
    if (!pickingSegId) {
      setUploaded(mat.name);
      setMaterialOpen(false);
      toast.success(`已选择:${mat.name}`);
      return;
    }
    setSegments((prev) =>
      prev.map((s) =>
        s.id === pickingSegId
          ? { ...s, assets: [...s.assets, mat] }
          : s,
      ),
    );
    setMaterialOpen(false);
    setPickingSegId(null);
    toast.success("已匹配素材");
  }

  function startGenerate() {
    const missing = segments.filter((s) => s.assets.length === 0);
    if (missing.length > 0) {
      return toast.error(`还有 ${missing.length} 个分镜未匹配素材`);
    }
    setGenerating(true);
    setVariants([]);
    setActiveVariant(null);
    setTimeout(() => {
      const list: Variant[] = [
        {
          id: "v1",
          name: "强卖点版",
          cover: "https://picsum.photos/seed/rep-v1/640/360",
          duration: "00:22",
          bgm: "Upbeat Pop · Sunset Drive",
          voice: "女声 · 标准清新",
        },
        {
          id: "v2",
          name: "情感种草版",
          cover: "https://picsum.photos/seed/rep-v2/640/360",
          duration: "00:24",
          bgm: "Lo-fi · Coffee Loop",
          voice: "女声 · 温柔治愈",
        },
        {
          id: "v3",
          name: "促单转化版",
          cover: "https://picsum.photos/seed/rep-v3/640/360",
          duration: "00:20",
          bgm: "EDM · Drop Beat",
          voice: "男声 · 主播热血",
        },
      ];
      setVariants(list);
      setActiveVariant(list[0].id);
      setGenerating(false);
      toast.success("已生成 3 个复刻版本");
    }, 1500);
  }

  /* ---------------- render ---------------- */

  return (
    <div className="space-y-4">
      {/* ===== 顶部工作台快捷栏（对齐其它 AI 模块） ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-sm">
          <Flame className="h-4 w-4 text-primary" />
          <span className="font-medium">爆款复刻工作台</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" className="w-80 text-xs leading-relaxed">
              基于爆款猎人产品理念:输入对标视频 → AI 拆解结构 → 一键生成同款脚本 → 匹配自有素材自动合成 → 导出成片。
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setTrendingOpen(true)}>
            <TrendingUp className="h-3.5 w-3.5" /> 热门爆款
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setRecentOpen(true)}>
            <History className="h-3.5 w-3.5" /> 最近生成
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setHistoryOpen(true)}>
            <Layers className="h-3.5 w-3.5" /> 历史拆解
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Bookmark className="h-3.5 w-3.5" /> 我的模板
                {userTpls.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                    {userTpls.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs">我的复刻模板</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userTpls.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  还没有保存的模板
                </div>
              ) : (
                userTpls.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    className="flex items-center justify-between"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <button
                      className="flex-1 truncate text-left"
                      onClick={() => {
                        setUrl(t.url);
                        setBiz(t.biz);
                        toast.success(`已应用模板「${t.name}」`);
                      }}
                    >
                      <div className="truncate text-xs font-medium">{t.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </button>
                    <button
                      className="ml-2 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteUserTpl(t.id); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setTplDialogOpen(true)}>
            <BookmarkPlus className="h-3.5 w-3.5" /> 保存模板
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={() => setResetConfirmOpen(true)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> 重置
          </Button>
        </div>
      </div>

      {/* Steps */}
      <StepIndicator
        step={step}
        setStep={setStep}
        canJumpTo={getMaxReachable(analyzed, segments, variants)}
        segments={segments}
      />


      {/* Body */}
      {step === 1 && (
        <Step1Analyze
          url={url}
          setUrl={setUrl}
          uploaded={uploaded}
          setUploaded={setUploaded}
          analyzing={analyzing}
          analyzed={analyzed}
          progress={progress}
          progressLabel={progressLabel}
          eta={analyzeEta}

          segments={segments}
          onUpload={() => fileRef.current?.click()}
          onPickLibrary={() => {
            setPickingSegId(null);
            setMaterialOpen(true);
          }}
          onStart={startAnalyze}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenTrending={() => setTrendingOpen(true)}
          onNext={() => setStep(2)}
          onReset={() => {
            setAnalyzed(false);
            setUploaded(null);
            setUrl("");
          }}
          pricing={pricing}
        />
      )}

      {step === 2 && (
        <Step2Customize
          biz={biz}
          setBiz={setBiz}
          segments={segments}
          customizing={customizing}
          onPrev={() => setStep(1)}
          onCustomize={customizeScript}
        />
      )}

      {step === 3 && (
        <Step3Upload
          segments={segments}
          onPickMaterial={openMaterialPicker}
          onRemoveAsset={(segId, idx) =>
            setSegments((prev) =>
              prev.map((s) =>
                s.id === segId
                  ? { ...s, assets: s.assets.filter((_, i) => i !== idx) }
                  : s,
              ),
            )
          }
          onEditCopy={(segId, value) =>
            setSegments((prev) =>
              prev.map((s) =>
                s.id === segId ? { ...s, customCopy: value } : s,
              ),
            )
          }
          onUploadAssets={(segId, files) => {
            const items = Array.from(files).map((f) => ({
              name: f.name,
              thumb: URL.createObjectURL(f),
            }));
            if (items.length === 0) return;
            setSegments((prev) =>
              prev.map((s) =>
                s.id === segId ? { ...s, assets: [...s.assets, ...items] } : s,
              ),
            );
            toast.success(`已上传 ${items.length} 个素材`);
          }}
          onPrev={() => setStep(2)}
          onNext={() => {
            const missing = segments.filter((s) => s.assets.length === 0);
            if (missing.length > 0) {
              return toast.error(`还有 ${missing.length} 个分镜未匹配素材`);
            }
            setStep(4);
          }}
        />
      )}

      {step === 4 && (
        <Step4Generate
          segments={segments}
          generating={generating}
          variants={variants}
          activeVariant={activeVariant}
          setActiveVariant={setActiveVariant}
          bgm={bgm}
          setBgm={setBgm}
          voice={voice}
          setVoice={setVoice}
          avatarId={avatarId}
          setAvatarId={setAvatarId}
          aiModel={aiModel}
          setAiModel={setAiModel}
          availableAiModels={availableAiModels}
          onPrev={() => setStep(3)}
          onGenerate={startGenerate}
          generateDisabled={pricing.disabled}
          generateDisabledReason={pricing.disabledReason}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={pickFile}
      />

      {/* Dialogs */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>历史拆解</DialogTitle>
            <div className="text-[11px] text-muted-foreground">
              选择一份已拆解过的脚本，直接进入「业务定制」步骤复用
            </div>
          </DialogHeader>
          <div className="space-y-2">
            {HISTORY_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  toast.success(`已载入拆解:${t.name}`);
                  setHistoryOpen(false);
                  setAnalyzed(true);
                  setStep(2);
                }}
                className="flex w-full items-center justify-between rounded-md border border-border/60 px-3 py-2.5 text-left hover:border-primary/50 hover:bg-muted/40"
              >
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.time}</div>
                </div>
                <Badge
                  variant="secondary"
                  className="gap-1 bg-primary/10 text-primary"
                >
                  <Flame className="h-3 w-3" />
                  {t.score}
                </Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recentOpen} onOpenChange={setRecentOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>最近生成</DialogTitle>
            <div className="text-[11px] text-muted-foreground">
              最近完成的复刻成片，可一键预览 / 下载 / 发帖
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {RECENT_GENERATIONS.map((g) => (
              <div
                key={g.id}
                className="overflow-hidden rounded-md border border-border/60 transition hover:border-primary/50"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <img src={g.cover} alt={g.name} className="h-full w-full object-cover" />
                  <Badge
                    variant="secondary"
                    className="absolute bottom-1.5 right-1.5 h-5 gap-1 bg-black/60 px-1.5 text-[10px] text-white"
                  >
                    <PlayCircle className="h-3 w-3" /> {g.duration}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="absolute left-1.5 top-1.5 h-5 px-1.5 text-[10px]"
                  >
                    {g.variants} 个版本
                  </Badge>
                </div>
                <div className="space-y-2 p-2.5">
                  <div>
                    <div className="truncate text-sm font-medium">{g.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      对标 · {g.source}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{g.time}</div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        toast.success(`已开始下载:${g.name}`);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" /> 下载
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        toast.success(`已加入发帖任务:${g.name}`);
                      }}
                    >
                      <Send className="h-3.5 w-3.5" /> 发帖
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        setRecentOpen(false);
                        toast.success(`已打开成片:${g.name}`);
                      }}
                    >
                      <PlayCircle className="h-3.5 w-3.5" /> 打开
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={trendingOpen} onOpenChange={setTrendingOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>近 7 天热门爆款</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TRENDING_REFS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setUrl(`https://example.com/v/${t.id}`);
                  setUploaded(null);
                  setTrendingOpen(false);
                  toast.success(`已载入对标:${t.title}`);
                }}
                className="group overflow-hidden rounded-md border border-border/60 text-left transition hover:border-primary"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <img
                    src={t.cover}
                    alt={t.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-primary backdrop-blur">
                    <Flame className="h-3 w-3" />
                    {t.score}
                  </div>
                </div>
                <div className="space-y-0.5 px-2 py-2">
                  <div className="truncate text-xs font-medium">{t.title}</div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{t.platform}</span>
                    <span>{t.views} 播放</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>我的原料</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {MY_MATERIALS.map((m) => (
              <button
                key={m.id}
                onClick={() => assignMaterial(m)}
                className="group overflow-hidden rounded-md border border-border/60 text-left transition hover:border-primary"
              >
                <img
                  src={m.thumb}
                  alt={m.name}
                  className="aspect-square w-full object-cover transition group-hover:scale-105"
                />
                <div className="truncate px-2 py-1.5 text-xs">{m.name}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 保存为模板 */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>保存为模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">模板名称</Label>
            <Input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="例如:户外露营带货模板"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplDialogOpen(false)}>取消</Button>
            <Button onClick={saveCurrentAsTpl}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置确认 */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重置全流程?</AlertDialogTitle>
            <AlertDialogDescription>
              将清空已输入的链接、上传素材、业务信息与生成结果,此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setResetConfirmOpen(false); resetAllFlow(); }}>
              确认重置
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}

/* ----------------------------------------------------------------------------
 * Step Indicator
 * -------------------------------------------------------------------------- */

function getMaxReachable(
  analyzed: boolean,
  segments: Segment[],
  variants: Variant[],
): Step {
  if (variants.length > 0) return 4;
  if (segments.some((s) => s.assets.length > 0)) return 4;
  if (segments.some((s) => s.customCopy)) return 3;
  if (analyzed) return 2;
  return 1;
}

function StepIndicator({
  step,
  setStep,
  canJumpTo,
  segments,
}: {
  step: Step;
  setStep: (s: Step) => void;
  canJumpTo: Step;
  segments: Segment[];
}) {
  const overall = Math.round(((Math.min(step, canJumpTo) - 1) / (STEP_META.length - 1)) * 100);
  const matched = segments.filter((s) => s.assets.length > 0).length;
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
      {/* 总进度条 */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-medium text-muted-foreground">总进度</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
            style={{ width: `${overall}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold text-foreground">{overall}%</span>
      </div>

      <div className="flex items-center gap-1">
        {STEP_META.map((s, i) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          const reachable = s.id <= canJumpTo;
          const tip =
            s.id === 3 ? `已匹配 ${matched}/${segments.length} 分镜` : s.desc;
          return (
            <div key={s.id} className="flex flex-1 items-center gap-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && setStep(s.id)}
                title={tip}
                className={cn(
                  "group flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-left transition",
                  isActive && "bg-primary/10",
                  !isActive && reachable && "hover:bg-muted/60",
                  !reachable && "cursor-not-allowed opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition",
                    isActive && "border-primary bg-primary text-primary-foreground shadow-sm",
                    isDone && "border-success bg-success/10 text-success",
                    !isActive && !isDone && "border-border text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium leading-tight",
                      isActive ? "text-foreground" : "text-foreground/80",
                    )}
                  >
                    {s.title}
                  </div>
                  <div className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block">
                    {tip}
                  </div>
                </div>
              </button>
              {i < STEP_META.length - 1 && (
                <div className="hidden h-px w-4 shrink-0 border-t border-dashed border-border/60 sm:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ----------------------------------------------------------------------------
 * Step 1: Analyze
 * -------------------------------------------------------------------------- */

function Step1Analyze({
  url,
  setUrl,
  uploaded,
  setUploaded,
  analyzing,
  analyzed,
  progress,
  progressLabel,
  eta,
  segments,
  onUpload,
  onPickLibrary,
  onStart,
  onOpenHistory,
  onOpenTrending,
  onNext,
  onReset,
  pricing,
}: {
  url: string;
  setUrl: (v: string) => void;
  uploaded: string | null;
  setUploaded: (v: string | null) => void;
  analyzing: boolean;
  analyzed: boolean;
  progress: number;
  progressLabel: string;
  eta: number;

  segments: Segment[];
  onUpload: () => void;
  onPickLibrary: () => void;
  onStart: () => void;
  onOpenHistory: () => void;
  onOpenTrending: () => void;
  onNext: () => void;
  onReset: () => void;
  pricing: BillingPricing;
}) {
  type SrcTab = "link" | "upload" | "library";
  const [srcTab, setSrcTab] = useState<SrcTab>("link");
  const blockReason = !url.trim() && !uploaded ? "请粘贴爆款链接或上传视频" : "";
  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      {/* Left: input */}
      <Card className="flex flex-col overflow-hidden p-0 shadow-[var(--shadow-card)]">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">输入爆款作品</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            粘贴链接、上传视频或从素材库选择,AI 自动拆解结构
          </p>
        </div>

        {/* Source tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1">
            {([
              { v: "link", label: "粘贴链接", icon: Link2 },
              { v: "upload", label: "上传视频", icon: Upload },
              { v: "library", label: "我的原料", icon: FolderOpen },
            ] as const).map((t) => (
              <button
                key={t.v}
                onClick={() => setSrcTab(t.v as SrcTab)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                  srcTab === t.v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4 px-5 py-5">
          {srcTab === "link" && (
            <>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1 text-sm font-medium">
                  <span className="inline-block h-3.5 w-[3px] rounded-sm bg-primary" />
                  爆款视频链接
                  <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={onOpenTrending}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <TrendingUp className="h-3 w-3" /> 热门
                  </button>
                  <button
                    type="button"
                    onClick={onOpenHistory}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <History className="h-3 w-3" /> 历史
                  </button>
                </div>
              </div>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); if (e.target.value) setUploaded(null); }}
                  placeholder="粘贴抖音 / 小红书 / 快手 / TikTok 链接"
                  className="h-10 pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-success" /> 支持:
                {PLATFORMS.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground/80"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </>
          )}

          {srcTab === "upload" && (
            <button
              type="button"
              onClick={onUpload}
              className={cn(
                "flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition",
                uploaded
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
              )}
            >
              <Upload className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">
                {uploaded ? "重新上传视频" : "点击上传视频"}
              </span>
              {uploaded ? (
                <span className="max-w-[260px] truncate text-[11px] text-muted-foreground">
                  {uploaded}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  支持 MP4 / MOV / MKV · 单文件 ≤ 500MB
                </span>
              )}
            </button>
          )}

          {srcTab === "library" && (
            <button
              type="button"
              onClick={onPickLibrary}
              className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 transition hover:border-primary/50 hover:bg-muted/50"
            >
              <FolderOpen className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">从我的原料中选择</span>
              <span className="text-[11px] text-muted-foreground">浏览已上传 / 历史素材</span>
            </button>
          )}

          <div className="rounded-md bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <div className="mb-1 flex items-center gap-1 text-foreground">
              <Layers className="h-3 w-3 text-primary" />
              多模型智能调度
            </div>
            系统会根据内容特征自动匹配 <b>Sora / Veo / Kling / Wan / Seedance</b> 等模型,无需手动选择。
          </div>
        </div>

        {/* Footer: 统一定价样式 */}
        <div className="space-y-2 border-t border-border/60 bg-muted/20 px-5 py-4">
          <PricingFooter pricing={pricing} />

          <Button
            onClick={onStart}
            disabled={analyzing}
            className="h-11 w-full text-base font-medium"
          >
            {analyzing ? (
              <>
                <Sparkles className="h-4 w-4 animate-pulse" /> 解析中…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {blockReason || "开始智能拆解"}
              </>
            )}
          </Button>
        </div>
      </Card>



      {/* Right: result / placeholder */}
      <div className="space-y-4">
        {analyzing && (
          <Card className="flex min-h-[420px] flex-col items-center justify-center gap-6 p-10">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
                <circle
                  cx="50" cy="50" r="44"
                  stroke="currentColor" strokeWidth="6" fill="none"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - progress / 100)}
                  className="text-primary transition-all"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold">
                {progress}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-base font-semibold">AI 正在深度拆解爆款基因…</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {progressLabel} · 预计剩余 {eta} 秒
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["镜头节奏", "转场点", "关键文案", "卖点逻辑"].map((t, i) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className={cn(
                    "gap-1",
                    progress > i * 25
                      ? "bg-success/10 text-success"
                      : "text-muted-foreground",
                  )}
                >
                  {progress > i * 25 && <Check className="h-3 w-3" />}
                  {t}
                </Badge>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("已转后台拆解,可在历史拆解查看")}
            >
              后台拆解
            </Button>
          </Card>
        )}


        {!analyzing && !analyzed && (
          <Card className="flex min-h-[420px] flex-col items-center justify-center gap-3 border-dashed bg-muted/20 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Video className="h-7 w-7 text-primary" />
            </div>
            <div className="text-base font-medium">等待输入爆款视频</div>
            <div className="max-w-md text-xs text-muted-foreground">
              AI 将自动拆解视频的节奏、转场、文案与卖点逻辑,为您生成可直接复用的模板。
            </div>
          </Card>
        )}

        {analyzed && (
          <>
            <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">爆款基因分析报告</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    AI 已识别出本视频的核心节奏、卖点逻辑与文案风格
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5">
                  <Flame className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">爆款指数</span>
                  <span className="text-lg font-bold text-primary">92</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <GeneCard label="节奏感" value="高频快剪" hint="平均 2.4s / 切" tone="primary" />
                <GeneCard label="核心逻辑" value="痛点 → 方案 → 证言 → 促单" hint="经典 PSPC 模型" tone="success" />
                <GeneCard label="BGM 风格" value="Upbeat / 鼓点对齐" hint="动感节拍" tone="warning" />
                <GeneCard label="文案风格" value="口语化 / 强引导" hint="高情绪密度" tone="accent" />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-6 py-3">
                <Button variant="ghost" size="sm" onClick={onReset}>
                  <RefreshCw className="h-4 w-4" /> 重新解析
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("模板已保存")}>
                  <Save className="h-4 w-4" /> 保存模板
                </Button>
                <Button size="sm" onClick={onNext}>
                  下一步:定制脚本 <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Decomposition table */}
            <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
              <div className="border-b border-border/60 px-6 py-4">
                <h2 className="text-lg font-semibold">逐段拆解表</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  脚本结构 · 时间区间 · 场景描述 · 拍摄技巧 · 口播文案
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="w-40 px-6 py-3 font-medium">脚本结构</th>
                      <th className="w-32 px-4 py-3 font-medium">时间区间</th>
                      <th className="px-4 py-3 font-medium">场景描述</th>
                      <th className="w-44 px-4 py-3 font-medium">拍摄技巧</th>
                      <th className="px-6 py-3 font-medium">口播文案</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((s, i) => (
                      <tr
                        key={s.id}
                        className={cn(
                          "border-b border-border/40 align-top",
                          i % 2 === 1 && "bg-muted/10",
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold">{s.name}</div>
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] text-success">
                            <Sparkles className="h-3 w-3" /> {s.logic}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">
                            {s.start} - {s.end}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            时长 {s.duration}s
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">
                          {s.scene}
                        </td>
                        <td className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">
                          {s.shoot}
                          <div className="mt-1 text-[11px]">
                            转场:<span className="text-foreground">{s.transition}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="group relative rounded-md border border-border/60 bg-background p-3 text-sm leading-relaxed">
                            <p className="pr-7">{s.copy}</p>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(s.copy);
                                toast.success("已复制文案");
                              }}
                              className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Step 2: Customize
 * -------------------------------------------------------------------------- */

function Step2Customize({
  biz,
  setBiz,
  segments,
  customizing,
  onPrev,
  onCustomize,
}: {
  biz: BizInfo;
  setBiz: (b: BizInfo) => void;
  segments: Segment[];
  customizing: boolean;
  onPrev: () => void;
  onCustomize: () => void;
}) {
  const update = (k: keyof BizInfo, v: string) => setBiz({ ...biz, [k]: v });
  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      {/* Left: biz info */}
      <Card className="p-5 shadow-[var(--shadow-card)]">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">填写你的业务信息</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI 将基于参考视频结构,为你的商品/卖点生成专属脚本。
            </p>
          </div>

          <Field label="所属行业" required>
            <Select value={biz.industry} onValueChange={(v) => update("industry", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["户外装备", "美妆护肤", "3C 数码", "家居生活", "食品饮料", "服饰鞋包", "母婴用品"].map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="品牌 / 店铺名称">
            <Input value={biz.brand} onChange={(e) => update("brand", e.target.value)} placeholder="如:BooPilot Outdoor" className="h-10" />
          </Field>

          <Field label="商品 / 服务名称" required>
            <Input value={biz.product} onChange={(e) => update("product", e.target.value)} placeholder="如:便携咖啡机 Mini Pro" className="h-10" />
          </Field>

          <Field label="核心卖点" required>
            <Textarea value={biz.selling} onChange={(e) => update("selling", e.target.value)} placeholder="如:3 秒即热 / 一键自清洁 / 户外续航 8 小时" rows={3} />
          </Field>

          <Field label="目标受众">
            <Input value={biz.audience} onChange={(e) => update("audience", e.target.value)} className="h-10" />
          </Field>

          <Field label="语言风格">
            <Select value={biz.tone} onValueChange={(v) => update("tone", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["口语化 / 强引导", "专业测评", "情感种草", "幽默梗向", "高冷高级"].map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={onPrev}>
              <ArrowLeft className="h-4 w-4" /> 上一步
            </Button>
            <Button onClick={onCustomize} disabled={customizing}>
              {customizing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-pulse" /> 生成中…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> 开始定制脚本
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Right: preview of script reference */}
      <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
        <div className="border-b border-border/60 px-6 py-4">
          <h2 className="text-lg font-semibold">参考脚本结构</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            下方是从爆款视频提取的脚本骨架,生成时将替换为你的产品信息。
          </p>
        </div>
        <div className="space-y-3 p-6">
          {segments.map((s) => (
            <div
              key={s.id}
              className="rounded-md border border-border/60 bg-background p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">
                  {s.start} - {s.end}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  · {s.duration}s
                </span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] text-success">
                  <Sparkles className="h-3 w-3" /> {s.logic}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="text-xs text-muted-foreground">
                  <div className="text-[11px] uppercase tracking-wide">原始口播</div>
                  <div className="mt-1 text-foreground/90">{s.copy}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="text-[11px] uppercase tracking-wide">场景 / 拍摄</div>
                  <div className="mt-1 text-foreground/90">{s.scene}</div>
                  <div className="mt-0.5 text-foreground/70">{s.shoot}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Step 3: Upload Materials
 * -------------------------------------------------------------------------- */

function Step3Upload({
  segments,
  onPickMaterial,
  onRemoveAsset,
  onEditCopy,
  onUploadAssets,
  onPrev,
  onNext,
}: {
  segments: Segment[];
  onPickMaterial: (id: string) => void;
  onRemoveAsset: (segId: string, idx: number) => void;
  onEditCopy: (segId: string, value: string) => void;
  onUploadAssets: (segId: string, files: FileList) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const matched = segments.filter((s) => s.assets.length > 0).length;
  return (
    <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">为每个分镜匹配素材</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            提示:每段上传的视频素材总时长需要 ≥ 该段脚本时长。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.success("已批量匹配自有素材")}
        >
          <Wand2 className="h-4 w-4" /> AI 智能匹配
        </Button>
      </div>

      <div className="divide-y divide-border/40">
        {segments.map((s) => {
          const total = s.assets.length * 4; // mocked seconds per asset
          const ok = total >= s.duration;
          return (
            <div key={s.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1.4fr]">
              {/* left: segment info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">
                    {s.start} - {s.end}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    · 需 {s.duration}s
                  </span>
                </div>
                <Textarea
                  value={s.customCopy ?? s.copy}
                  onChange={(e) => onEditCopy(s.id, e.target.value)}
                  rows={3}
                  className="resize-none text-sm leading-relaxed"
                  placeholder="编辑该分镜的口播文案"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{(s.customCopy ?? s.copy).length} 字</span>
                  {s.customCopy !== undefined && s.customCopy !== s.copy && (
                    <button
                      onClick={() => onEditCopy(s.id, s.copy)}
                      className="text-primary hover:underline"
                    >
                      还原
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  场景:{s.scene} · 拍摄:{s.shoot}
                </div>
              </div>

              {/* right: assets */}
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      ok ? "text-success" : "text-warning",
                    )}
                  >
                    {ok ? <Check className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
                    已上传 {s.assets.length} 段 · 约 {total}s / 需 {s.duration}s
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-[11px] text-primary hover:underline">
                      <input
                        type="file"
                        multiple
                        accept="video/*,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            onUploadAssets(s.id, e.target.files);
                            e.target.value = "";
                          }
                        }}
                      />
                      + 本地上传
                    </label>
                    <button
                      onClick={() => onPickMaterial(s.id)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      + 从原料库添加
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {s.assets.map((a, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-md border border-border/60"
                    >
                      <img
                        src={a.thumb}
                        alt={a.name}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="truncate px-1.5 py-1 text-[10px]">{a.name}</div>
                      <button
                        onClick={() => onRemoveAsset(s.id, i)}
                        className="absolute right-1 top-1 rounded bg-background/85 px-1 text-[10px] text-destructive opacity-0 backdrop-blur transition group-hover:opacity-100"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-[10px] text-muted-foreground transition hover:border-primary/60 hover:text-foreground">
                    <input
                      type="file"
                      multiple
                      accept="video/*,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          onUploadAssets(s.id, e.target.files);
                          e.target.value = "";
                        }
                      }}
                    />
                    <Upload className="h-4 w-4" />
                    <span>本地上传</span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-6 py-3">
        <div className="text-xs text-muted-foreground">
          共 {segments.length} 个分镜 · 已匹配
          <span className="px-1 font-medium text-foreground">{matched}</span>
          个
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrev}>
            <ArrowLeft className="h-4 w-4" /> 上一步
          </Button>
          <Button size="sm" onClick={onNext}>
            下一步:生成预览 <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------------------
 * Step 4: Generate & Preview
 * -------------------------------------------------------------------------- */

function Step4Generate({
  segments,
  generating,
  variants,
  activeVariant,
  setActiveVariant,
  bgm,
  setBgm,
  voice,
  setVoice,
  avatarId,
  setAvatarId,
  aiModel,
  setAiModel,
  availableAiModels,
  onPrev,
  onGenerate,
  generateDisabled,
  generateDisabledReason,
}: {
  segments: Segment[];
  generating: boolean;
  variants: Variant[];
  activeVariant: string | null;
  setActiveVariant: (v: string) => void;
  bgm: string;
  setBgm: (v: string) => void;
  voice: string;
  setVoice: (v: string) => void;
  avatarId: string;
  setAvatarId: (v: string) => void;
  aiModel: string;
  setAiModel: (v: string) => void;
  availableAiModels: ReturnType<typeof getActiveModelsByModules>;
  onPrev: () => void;
  onGenerate: () => void;
  generateDisabled?: boolean;
  generateDisabledReason?: string;
}) {
  const current = variants.find((v) => v.id === activeVariant);


  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr_320px]">
      {/* Left: variant list */}
      <Card className="p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">作品列表</div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onGenerate}
            disabled={generating || generateDisabled}
            title={generateDisabled ? generateDisabledReason : undefined}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
          </Button>
        </div>
        {variants.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            尚未生成,点击右下角「开始生成」。
          </div>
        ) : (
          <div className="space-y-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVariant(v.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-2 text-left transition",
                  activeVariant === v.id
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-primary/40",
                )}
              >
                <img src={v.cover} alt={v.name} className="h-12 w-20 rounded object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{v.name}</div>
                  <div className="text-[11px] text-muted-foreground">{v.duration}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Center: preview */}
      <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div>
            <div className="text-sm font-semibold">
              {current ? current.name : "视频预览"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {current ? `时长 ${current.duration}` : "选择或生成一个版本以预览"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => toast.success("已保存到 AI 成片库")}>
              <Save className="h-4 w-4" /> 保存
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.success("已开始下载")}>
              <Download className="h-4 w-4" /> 下载
            </Button>
            <Button size="sm" onClick={() => toast.success("已加入发帖任务")}>
              <Send className="h-4 w-4" /> 一键发帖
            </Button>
          </div>
        </div>

        <div className="relative flex aspect-video items-center justify-center bg-black">
          {generating ? (
            <div className="flex flex-col items-center gap-3 text-primary-foreground">
              <Sparkles className="h-10 w-10 animate-pulse" />
              <div className="text-sm">AI 正在合成成片…</div>
            </div>
          ) : current ? (
            <>
              <img src={current.cover} alt={current.name} className="h-full w-full object-cover opacity-90" />
              <button className="absolute inset-0 flex items-center justify-center transition hover:bg-black/20">
                <PlayCircle className="h-16 w-16 text-white/90 drop-shadow-lg" />
              </button>
            </>
          ) : (
            <div className="text-sm text-white/60">
              <ImageIcon className="mx-auto mb-2 h-10 w-10 opacity-60" />
              暂无预览
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onPrev}>
            <ArrowLeft className="h-4 w-4" /> 上一步
          </Button>
          <Button
            onClick={onGenerate}
            disabled={generating || generateDisabled}
            title={generateDisabled ? generateDisabledReason : undefined}
          >
            {generateDisabled ? (
              <>
                <Sparkles className="h-4 w-4" /> {generateDisabledReason ?? "当前套餐不可用"}
              </>
            ) : generating ? (
              <>
                <Sparkles className="h-4 w-4 animate-pulse" /> 生成中…
              </>
            ) : variants.length > 0 ? (
              <>
                <RefreshCw className="h-4 w-4" /> 重新生成
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> 开始生成 3 个版本
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Right: script + BGM/voice */}
      <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
        <div className="border-b border-border/60 px-4 py-3">
          <div className="text-sm font-semibold">脚本详情</div>
        </div>
        <div className="max-h-[260px] space-y-2 overflow-y-auto px-4 py-3">
          {segments.map((s) => (
            <div key={s.id} className="rounded-md border border-border/60 bg-background p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold">{s.name}</span>
                <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[10px] text-primary">
                  {s.start}-{s.end}
                </span>
              </div>
              <div className="mt-1 text-[12px] leading-relaxed text-foreground/85">
                {s.customCopy ?? s.copy}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-border/60 p-4">
          <Field
            label={
              <span className="inline-flex items-center gap-1">
                <Music className="h-3.5 w-3.5 text-primary" /> 背景音乐
              </span>
            }
          >
            <div className="flex items-center gap-2">
              <Select value={bgm} onValueChange={setBgm}>
                <SelectTrigger className="h-9"><SelectValue placeholder="请选择 BGM" /></SelectTrigger>
                <SelectContent>
                  {PRESET_BGM_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PreviewButton label="BGM 试听" />
            </div>
          </Field>

          <Field
            label={
              <span className="inline-flex items-center gap-1">
                <Mic className="h-3.5 w-3.5 text-primary" /> AI 配音
              </span>
            }
          >
            <div className="flex items-center gap-2">
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger className="h-9"><SelectValue placeholder="请选择音色" /></SelectTrigger>
                <SelectContent>
                  {PRESET_VOICE_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PreviewButton label="音色试听" />
            </div>
          </Field>

          <Field label={<span className="inline-flex items-center gap-1">数字人模特</span>}>
            <Select value={avatarId} onValueChange={setAvatarId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="不使用数字人" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不使用</SelectItem>
                {PRESET_AVATAR_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>





          <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
            <div className="flex w-full items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Cpu className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">AI 模型</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {aiModel === "auto"
                      ? "系统自动推荐 · 智能匹配最优模型"
                      : availableAiModels.find((m) => m.id === aiModel)?.name ?? "系统自动推荐"}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 px-3 pb-3 pt-3">
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
                          <span className="text-[11px] text-muted-foreground">· {m.vendor}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Shared building blocks
 * -------------------------------------------------------------------------- */

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
      <Label className="flex items-center gap-1 text-xs font-medium">
        <span className="inline-block h-3 w-[3px] rounded-sm bg-primary" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function GeneCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "accent";
}) {
  const toneMap: Record<typeof tone, string> = {
    primary: "from-primary/10 to-primary/5 text-primary",
    success: "from-success/10 to-success/5 text-success",
    warning: "from-warning/10 to-warning/5 text-warning",
    accent: "from-accent/30 to-accent/10 text-accent-foreground",
  };
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-gradient-to-br p-4",
        toneMap[tone],
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-base font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

function PreviewButton({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 shrink-0 gap-1"
      onClick={() => {
        setPlaying((p) => !p);
        toast.success(playing ? `已停止${label}` : `正在${label}…`);
      }}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      <span className="text-xs">试听</span>
    </Button>
  );
}

function rewriteCopy(seg: Segment, biz: BizInfo): string {
  const product = biz.product || "你的产品";
  const sell = biz.selling || "核心卖点";
  switch (seg.name) {
    case "黄金钩子":
      return `你绝对想不到,只要 3 秒,${product}就能让${biz.audience || "你"}彻底告别旧体验!`;
    case "产品展示":
      return `${product} —— ${sell},专业级体验,品质看得见。`;
    case "场景应用":
      return `不管是${biz.industry}场景,还是日常通勤,${product}都能轻松驾驭。`;
    case "信任背书":
      return `已被 ${biz.brand || "众多品牌"} 的 10 万+ 用户验证,口碑炸裂。`;
    case "行动号召":
      return `限时优惠,点击下方立即带走${product},错过等一年!`;
    default:
      return seg.copy;
  }
}
