// 统一原料选择器 — 5 个 AI 创作页共用，数据来自 materials-store。
// 支持：按 type/purpose 过滤、单/多选、系统预设 tab、内置预览（音频试听 / 图片放大 / 视频首帧）。

import { useMemo, useRef, useState } from "react";
import {
  FolderOpen,
  Search,
  Play,
  Pause,
  Check,
  ImageIcon,
  Music2,
  Video as VideoIcon,
  Filter,
  X,
  Eye,
} from "lucide-react";

import {
  type Asset,
  type AssetType,
  type Purpose,
  PURPOSE_LABEL,
  PURPOSE_BY_TYPE,
  getAssetsByPurpose,
  useMaterialsStore,
} from "@/lib/materials-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PickedMaterial {
  /** asset id；选择系统预设时 id 形如 `preset:<id>` */
  id: string;
  name: string;
  /** 显示用 URL，可空 */
  url?: string;
  thumb?: string;
  type: AssetType;
  duration?: string;
  source: "material" | "preset";
}

export interface MaterialPresetItem {
  id: string;
  name: string;
  duration?: string;
  url?: string;
}

interface BaseProps {
  /** 允许的资产类型 */
  type: AssetType | AssetType[];
  /** 可选用途过滤，未提供则不限制 */
  purpose?: Purpose | Purpose[];
  /** 系统预设（如内置音色 / BGM），渲染为独立 tab */
  presets?: MaterialPresetItem[];
  presetLabel?: string;
  /** 触发按钮文案 */
  triggerLabel?: string;
  /** 自定义触发器，未提供则渲染默认按钮 */
  trigger?: React.ReactNode;
  /** 弹窗标题 */
  title?: string;
  description?: string;
}

interface SingleProps extends BaseProps {
  multi?: false;
  value?: PickedMaterial | null;
  onPick: (v: PickedMaterial) => void;
}

interface MultiProps extends BaseProps {
  multi: true;
  value?: PickedMaterial[];
  max?: number;
  onPick: (v: PickedMaterial[]) => void;
}

export type MaterialPickerProps = SingleProps | MultiProps;

export function MaterialPicker(props: MaterialPickerProps) {
  const { type, purpose, presets, presetLabel = "系统预设" } = props;
  const [open, setOpen] = useState(false);

  const assets = useMaterialsStore();
  const types = Array.isArray(type) ? type : [type];
  const purposes = purpose ? (Array.isArray(purpose) ? purpose : [purpose]) : undefined;

  const candidates = useMemo(
    () => filterAssets(assets, types, purposes),
    [assets, types.join(","), purposes?.join(",")],
  );

  const defaultLabel =
    props.multi && Array.isArray(props.value)
      ? props.value.length > 0
        ? `已选 ${props.value.length} 项`
        : props.triggerLabel ?? "从原料库选择"
      : props.value
        ? (props.value as PickedMaterial).name
        : props.triggerLabel ?? "从原料库选择";

  return (
    <>
      {props.trigger ? (
        <span onClick={() => setOpen(true)}>{props.trigger}</span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setOpen(true)}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          {defaultLabel}
        </Button>
      )}

      <PickerDialog
        open={open}
        onOpenChange={setOpen}
        candidates={candidates}
        presets={presets}
        presetLabel={presetLabel}
        types={types}
        purposes={purposes}
        title={props.title ?? "选择原料"}
        description={
          props.description ??
          (purposes && purposes.length > 0
            ? `用途：${purposes.map((p) => PURPOSE_LABEL[p]).join(" / ")}`
            : "从我的原料库选择匹配的素材")
        }
        multi={!!props.multi}
        max={"max" in props ? props.max : undefined}
        value={
          props.multi
            ? ((props as MultiProps).value ?? [])
            : (props as SingleProps).value
              ? [((props as SingleProps).value as PickedMaterial)]
              : []
        }
        onSubmit={(items) => {
          if (props.multi) {
            (props as MultiProps).onPick(items);
          } else if (items[0]) {
            (props as SingleProps).onPick(items[0]);
          }
          setOpen(false);
        }}
      />
    </>
  );
}

function filterAssets(assets: Asset[], types: AssetType[], purposes?: Purpose[]) {
  return assets.filter((a) => {
    if (!types.includes(a.type)) return false;
    if (purposes && purposes.length > 0 && !purposes.some((p) => a.purpose.includes(p))) return false;
    return true;
  });
}

interface PickerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidates: Asset[];
  presets?: MaterialPresetItem[];
  presetLabel: string;
  types: AssetType[];
  purposes?: Purpose[];
  title: string;
  description: string;
  multi: boolean;
  max?: number;
  value: PickedMaterial[];
  onSubmit: (v: PickedMaterial[]) => void;
}

function PickerDialog({
  open,
  onOpenChange,
  candidates,
  presets,
  presetLabel,
  types,
  purposes,
  title,
  description,
  multi,
  max,
  value,
  onSubmit,
}: PickerDialogProps) {
  const hasPresets = !!(presets && presets.length > 0);
  const primaryType = types[0];

  const [tab, setTab] = useState<"library" | "preset">(hasPresets && value[0]?.source === "preset" ? "preset" : "library");
  const [keyword, setKeyword] = useState("");
  const [purposeFilter, setPurposeFilter] = useState<Purpose[]>([]);
  const [selected, setSelected] = useState<PickedMaterial[]>(value);

  // 当 dialog 打开时同步 value
  const lastOpenRef = useRef(false);
  if (open && !lastOpenRef.current) {
    lastOpenRef.current = true;
    setSelected(value);
    setKeyword("");
    setPurposeFilter([]);
    setTab(hasPresets && value[0]?.source === "preset" ? "preset" : "library");
  } else if (!open && lastOpenRef.current) {
    lastOpenRef.current = false;
  }

  // 可选用途列表 = 候选项的并集（受 props.purposes 约束）
  const purposeOptions = useMemo(() => {
    const pool = purposes ?? types.flatMap((t) => PURPOSE_BY_TYPE[t]);
    return Array.from(new Set(pool));
  }, [purposes, types]);

  const filteredLibrary = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return candidates.filter((a) => {
      if (purposeFilter.length > 0 && !purposeFilter.some((p) => a.purpose.includes(p))) return false;
      if (!kw) return true;
      return (
        a.name.toLowerCase().includes(kw) ||
        a.description.toLowerCase().includes(kw) ||
        a.tags.some((t) => t.toLowerCase().includes(kw))
      );
    });
  }, [candidates, keyword, purposeFilter]);

  const toggleSelect = (item: PickedMaterial) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.id === item.id);
      if (exists) return prev.filter((p) => p.id !== item.id);
      if (!multi) return [item];
      if (max && prev.length >= max) return prev;
      return [...prev, item];
    });
  };

  const isPicked = (id: string) => selected.some((s) => s.id === id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <TooltipProvider delayDuration={200}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "library" | "preset")}>
            {hasPresets && (
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="preset">{presetLabel}</TabsTrigger>
                <TabsTrigger value="library">我的原料库</TabsTrigger>
              </TabsList>
            )}

            {hasPresets && (
              <TabsContent value="preset" className="mt-3">
                {primaryType === "image" ? (
                  <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
                    {presets!.map((p) => {
                      const picked = isPicked(`preset:${p.id}`);
                      const pm: PickedMaterial = {
                        id: `preset:${p.id}`,
                        name: p.name,
                        url: p.url,
                        type: primaryType,
                        duration: p.duration,
                        source: "preset",
                      };
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "group relative overflow-hidden rounded-lg border bg-card text-left transition",
                            picked
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border/60 hover:border-primary/60",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelect(pm)}
                            className="block w-full"
                          >
                            <div className="relative aspect-[3/4] bg-muted">
                              {p.url ? (
                                <img
                                  src={p.url}
                                  alt={p.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <ImageIcon className="h-8 w-8" />
                                </div>
                              )}
                              {picked && (
                                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                            <div className="p-2">
                              <div className="line-clamp-1 text-xs font-medium" title={p.name}>
                                {p.name}
                              </div>
                            </div>
                          </button>
                          {p.url && (
                            <ImagePreviewButton url={p.url} name={p.name} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                    {presets!.map((p) => {
                      const picked = isPicked(`preset:${p.id}`);
                      const pm: PickedMaterial = {
                        id: `preset:${p.id}`,
                        name: p.name,
                        url: p.url,
                        type: primaryType,
                        duration: p.duration,
                        source: "preset",
                      };
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleSelect(pm)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition hover:border-primary/60 hover:bg-muted/40",
                            picked ? "border-primary bg-primary/5" : "border-border/60",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <TypeIcon type={primaryType} />
                            <span className="font-medium">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {p.duration && <span>{p.duration}</span>}
                            {primaryType === "audio" && <PreviewAudioBtn label={p.name} />}
                            {picked && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="library" className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative max-w-xs flex-1 min-w-[200px]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索名称、描述或标签"
                    className="h-8 pl-8 pr-2 text-xs"
                  />
                </div>
                {purposeOptions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <Filter className="h-3 w-3 text-muted-foreground" />
                    {purposeOptions.map((p) => {
                      const on = purposeFilter.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setPurposeFilter((prev) =>
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
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  共 {filteredLibrary.length} 项
                </span>
              </div>

              {filteredLibrary.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-10 text-center text-xs text-muted-foreground">
                  原料库中没有匹配的素材
                </div>
              ) : (
                <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                  {filteredLibrary.map((asset) => {
                    const pm: PickedMaterial = {
                      id: asset.id,
                      name: asset.name,
                      url: asset.url,
                      thumb: asset.thumb,
                      type: asset.type,
                      duration: asset.duration,
                      source: "material",
                    };
                    const picked = isPicked(asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleSelect(pm)}
                        className={cn(
                          "group relative overflow-hidden rounded-lg border bg-card text-left transition",
                          picked
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/60 hover:border-primary/60",
                        )}
                      >
                        <div className="relative aspect-[4/3] bg-muted">
                          {asset.type === "audio" ? (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/40 dark:to-teal-900/30">
                              <Music2 className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                            </div>
                          ) : (
                            <img
                              src={asset.thumb ?? asset.url}
                              alt={asset.name}
                              className="h-full w-full object-cover"
                            />
                          )}
                          {asset.duration && (
                            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              {asset.duration}
                            </span>
                          )}
                          {picked && (
                            <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                          {asset.type === "audio" && (
                            <div className="absolute bottom-1 left-1" onClick={(e) => e.stopPropagation()}>
                              <PreviewAudioBtn label={asset.name} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 p-2">
                          <div className="line-clamp-1 text-xs font-medium" title={asset.name}>
                            {asset.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {asset.purpose.slice(0, 2).map((p) => (
                              <Badge
                                key={p}
                                variant="outline"
                                className="h-4 px-1 py-0 text-[10px] font-normal"
                              >
                                {PURPOSE_LABEL[p]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TooltipProvider>

        <DialogFooter className="items-center sm:items-center">
          <div className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            {selected.length > 0 ? (
              <>
                已选
                <span className="font-medium text-foreground">{selected.length}</span>
                {max ? <span>/ {max}</span> : null}
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="ml-1 inline-flex items-center gap-0.5 rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  清除
                </button>
              </>
            ) : (
              <span>未选择</span>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onSubmit(selected)} disabled={selected.length === 0}>
            确认{multi ? `（${selected.length}）` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypeIcon({ type }: { type: AssetType }) {
  if (type === "audio") return <Music2 className="h-4 w-4 text-emerald-600" />;
  if (type === "video") return <VideoIcon className="h-4 w-4 text-violet-600" />;
  return <ImageIcon className="h-4 w-4 text-sky-600" />;
}

function PreviewAudioBtn({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playing) {
      setPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    setPlaying(true);
    timerRef.current = setTimeout(() => setPlaying(false), 4000);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow ring-1 ring-border/60 hover:bg-background"
          aria-label={playing ? "停止试听" : "试听"}
        >
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 pl-0.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{playing ? "停止试听" : `试听 ${label}`}</TooltipContent>
    </Tooltip>
  );
}

function ImagePreviewButton({ url, name }: { url: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/85 text-foreground shadow ring-1 ring-border/60 opacity-0 transition group-hover:opacity-100 hover:bg-background"
        aria-label="预览"
        title="预览"
      >
        <Eye className="h-3 w-3" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted/40 rounded-md overflow-hidden">
            <img src={url} alt={name} className="max-h-[70vh] w-auto object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
