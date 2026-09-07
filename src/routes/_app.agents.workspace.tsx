import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bot, ArrowLeft, CircleDot, User as UserIcon,
  Sparkles, Check, RotateCcw, Mic, Send, SkipForward,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PLATFORMS, PLATFORM_CHIP, SUBTYPE_LABEL, SUBTYPE_CLS,
  TEMPLATE_ACTIONS, TEMPLATE_ACTION_LABEL,
  type Platform, type TaskSubType, type TaskTemplate, type TemplateAction,
  templatesActions, fmtNow, shortTime, uid,
} from "@/lib/operations-store";

export const Route = createFileRoute("/_app/agents/workspace")({
  component: AgentWorkspacePage,
  head: () => ({ meta: [{ title: "智能体工作台 — BooPilot" }] }),
});

type Mode = "form" | "guided" | "freeform";

type CountMode = "range" | "fixed";
type NotifyPrefs = { success: boolean; failure: boolean };

interface Draft {
  scenario?: string;
  platforms: Platform[];
  actions: TemplateAction[];
  subtype: TaskSubType;       // action=单次, nurture=周期
  countMode: CountMode;
  countMin?: number;
  countMax?: number;
  countFixed?: number;
  timeStart?: string;         // HH:mm:ss
  timeEnd?: string;
  script?: string;
  constraints?: string;
  notify: NotifyPrefs;
  name?: string;
  extra?: string;             // 补充说明
}

const newDraft = (): Draft => ({
  platforms: [],
  actions: [],
  subtype: "action",
  countMode: "range",
  notify: { success: true, failure: false },
});

interface BubblePayload {
  id: string;
  role: "user" | "agent";
  content?: string;
  // 渲染附件 — 上一次对话流中的 inline 表单/选择器快照（已提交后冻结）
  card?: React.ReactNode;
  ts: string;
}

const greeting = (): BubblePayload => ({
  id: uid("m"),
  role: "agent",
  content:
    `你好，我是「账号运营助手」，将与你一起创建任务模版。\n请直接描述你的任务需求：目标业务场景、目标平台、目标动作、单次还是周期性、约束条件、通知偏好等，记得给模版指定一个名称。\n你可以用文字输入，也可以点击麦克风进行语音输入。`,
  ts: fmtNow(),
});

const PROGRESS_STEPS = ["描述需求", "确认创建"];

/* ============================================================ */
/* 解析与组装                                                   */
/* ============================================================ */

function suggestName(d: Draft): string {
  const scope = d.scenario?.slice(0, 12) || "运营任务";
  const plat = d.platforms[0] ?? "多平台";
  return `${scope}_${plat}_${SUBTYPE_LABEL[d.subtype]}`;
}

function parseFreeform(text: string): Draft {
  const d = newDraft();
  d.scenario = text.slice(0, 40);
  const lower = text.toLowerCase();
  const platMap: Record<string, Platform> = {
    facebook: "Facebook", fb: "Facebook", "脸书": "Facebook",
    tiktok: "Tiktok", "抖音": "Tiktok",
    whatsapp: "WhatsApp", wa: "WhatsApp",
    instagram: "Instagram", ins: "Instagram", ig: "Instagram",
    twitter: "Twitter/X", "推特": "Twitter/X",
  };
  for (const [k, v] of Object.entries(platMap)) {
    if ((lower.includes(k) || text.includes(k)) && !d.platforms.includes(v)) d.platforms.push(v);
  }
  if (d.platforms.length === 0) d.platforms.push("Facebook");

  const actionMap: Array<[RegExp, TemplateAction]> = [
    [/点赞|like/i, "like"], [/评论|comment/i, "comment"],
    [/关注|follow/i, "follow"], [/发帖|发布|post/i, "post"],
    [/加好友|添加好友|friend/i, "addFriend"], [/私信|dm/i, "dm"],
    [/转发|分享|share/i, "share"], [/浏览|观看|view/i, "view"],
  ];
  for (const [re, a] of actionMap) if (re.test(text) && !d.actions.includes(a)) d.actions.push(a);
  if (d.actions.length === 0) d.actions.push("like");

  d.subtype = /周期|养号|每天|每日|每周|循环|定时/.test(text) ? "nurture" : "action";

  const nm = text.match(/(\d+)\s*(?:条|次|个|账号)/);
  if (nm) { d.countMode = "fixed"; d.countFixed = parseInt(nm[1], 10); }
  else { d.countMode = "range"; d.countMin = 5; d.countMax = 10; }

  d.name = suggestName(d);
  d.extra = text;
  return d;
}

function buildDescription(d: Draft): string {
  const parts: string[] = [];
  if (d.scenario) parts.push(`【业务场景】${d.scenario}`);
  if (d.actions.length) parts.push(`【操作类型】${d.actions.map((a) => TEMPLATE_ACTION_LABEL[a]).join("·")}`);
  if (d.countMode === "fixed" && d.countFixed != null) parts.push(`【执行次数】每账号 ${d.countFixed} 次`);
  else if (d.countMin != null || d.countMax != null) parts.push(`【执行次数】每账号 ${d.countMin ?? "-"} ~ ${d.countMax ?? "-"} 次`);
  if (d.timeStart || d.timeEnd) parts.push(`【执行时段】${d.timeStart ?? "--:--:--"} ~ ${d.timeEnd ?? "--:--:--"}`);
  if (d.script?.trim()) parts.push(`【默认话术】${d.script.trim()}`);
  if (d.constraints?.trim()) parts.push(`【自定义约束】${d.constraints.trim()}`);
  parts.push(`【通知偏好】${[d.notify.success && "完成通知", d.notify.failure && "失败通知"].filter(Boolean).join("、") || "无"}`);
  if (d.extra?.trim()) parts.push(`【补充说明】${d.extra.trim()}`);
  return parts.join("\n");
}

function totalFromDraft(d: Draft): number {
  if (d.countMode === "fixed" && d.countFixed) return d.countFixed;
  if (d.countMax) return d.countMax;
  if (d.countMin) return d.countMin;
  return 10;
}

/* ============================================================ */
/* 主组件                                                       */
/* ============================================================ */

function AgentWorkspacePage() {
  const navigate = useNavigate();
  const [chat, setChat] = useState<BubblePayload[]>([greeting()]);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(newDraft());
  const [freeText, setFreeText] = useState("");
  const [extraText, setExtraText] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, confirming, showExtra]);

  const pushAgent = (content: string, card?: React.ReactNode) =>
    setChat((p) => [...p, { id: uid("m"), role: "agent", content, card, ts: fmtNow() }]);
  const pushUser = (content: string) =>
    setChat((p) => [...p, { id: uid("m"), role: "user", content, ts: fmtNow() }]);

  const stopListening = () => {
    try { recogRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  };

  const toggleVoice = () => {
    if (listening) { stopListening(); return; }
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("当前浏览器不支持语音输入，请使用 Chrome 或 Edge");
      return;
    }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    const base = freeText;
    rec.onresult = (e: any) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setFreeText(((base ? base + " " : "") + finalText + interim).trim());
    };
    rec.onerror = (e: any) => {
      toast.error(`语音识别错误：${e.error ?? "未知"}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recogRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const resetAll = () => {
    stopListening();
    setChat([greeting()]);
    setStep(0);
    setDraft(newDraft());
    setFreeText("");
    setExtraText("");
    setShowExtra(false);
    setConfirming(false);
  };

  const submitFreeform = () => {
    const t = freeText.trim();
    if (!t) return;
    stopListening();
    pushUser(t);
    const parsed = parseFreeform(t);
    setDraft(parsed);
    setFreeText("");
    setStep(1);
    enterConfirm(parsed);
  };

  const enterConfirm = (d: Draft) => {
    setConfirming(true);
    pushAgent(
      `已收集完成，以下是即将创建的任务模版：\n• 模版名称：${d.name ?? suggestName(d)}\n• 业务场景：${d.scenario ?? "-"}\n• 任务类型：${SUBTYPE_LABEL[d.subtype]}\n• 覆盖平台：${d.platforms.join(" / ") || "-"}\n• 操作类型：${d.actions.map((a) => TEMPLATE_ACTION_LABEL[a]).join("·") || "-"}\n• 默认数量：${totalFromDraft(d)}\n\n请确认创建，或补充信息后再创建。`,
    );
  };

  const doCreate = (withExtra = false) => {
    const finalDraft: Draft = withExtra && extraText.trim()
      ? { ...draft, extra: [draft.extra, extraText.trim()].filter(Boolean).join("\n") }
      : draft;
    const name = finalDraft.name?.trim() || suggestName(finalDraft);
    if (finalDraft.platforms.length === 0) {
      toast.error("至少需要选择一个目标平台");
      return;
    }
    const tpl: TaskTemplate = {
      id: uid("tpl"),
      name,
      subtype: finalDraft.subtype,
      platforms: finalDraft.platforms,
      total: totalFromDraft(finalDraft),
      description: buildDescription(finalDraft),
      createdAt: fmtNow(),
      uses: 0,
      status: "draft",
      agentName: "账号运营助手",
      actions: finalDraft.actions,
      tags: finalDraft.scenario ? [finalDraft.scenario.slice(0, 8)] : [],
      monthlyUses: 0,
    };
    templatesActions.add(tpl);
    toast.success(`已创建任务模版「${tpl.name}」`);
    navigate({ to: "/tasks/templates" });
  };

  const progressSteps = PROGRESS_STEPS;
  const progressIdx = step;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">智能体工作台</h1>
            <Badge variant="outline" className="gap-1 border-violet-300/40 bg-violet-500/10 text-violet-600">
              <Sparkles className="h-3 w-3" />任务模版创建
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            通过与「账号运营助手」对话，直接描述需求即可一键创建任务模版，支持文字与语音输入。
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/tasks/templates"><ArrowLeft className="h-4 w-4" />返回任务模版</Link>
        </Button>
      </header>

      {/* Chat */}
      <div className="flex h-[760px] min-w-0 flex-col rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">账号运营助手</h3>
              <span className="flex items-center gap-1 text-[10px] text-success">
                <CircleDot className="h-2.5 w-2.5 fill-current" />在线
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              直接描述需求，协助你完成任务模版创建
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={resetAll} className="h-8 gap-1 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />重新开始
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="space-y-4 p-4">
            {chat.map((m) => <ChatBubble key={m.id} msg={m} />)}

            {/* 汇总确认 */}
            {confirming && (
              <div className="ml-9 space-y-3">
                {showExtra && (
                  <InlineCard>
                    <Textarea
                      value={extraText}
                      onChange={(e) => setExtraText(e.target.value)}
                      placeholder="补充内容将追加到模版描述中..."
                      className="min-h-[80px]"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowExtra(false)}>取消</Button>
                      <Button size="sm" onClick={() => doCreate(true)} disabled={!extraText.trim()}>
                        补充并创建
                      </Button>
                    </div>
                  </InlineCard>
                )}
                {!showExtra && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => doCreate(false)} className="h-8 gap-1 text-xs">
                      <Check className="h-3.5 w-3.5" />确认创建
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowExtra(true)} className="h-8 gap-1 text-xs">
                      补充信息后创建
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetAll} className="h-8 gap-1 text-xs">
                      <RotateCcw className="h-3.5 w-3.5" />重新开始
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 输入区 */}
        {!confirming && (
          <div className="border-t bg-background/60 p-3">
            <div className="relative flex items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30">
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitFreeform();
                  }
                }}
                placeholder={listening ? "正在聆听，请开始说话…" : "描述任务模版的业务场景..."}
                className="min-h-[56px] flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <div className="flex shrink-0 items-center gap-1">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={toggleVoice}
                        aria-label="语音输入"
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full transition",
                          listening
                            ? "bg-rose-500 text-white hover:bg-rose-600"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {listening ? (
                          <span className="relative flex h-4 w-4 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-300 opacity-75" />
                            <Mic className="relative h-4 w-4" />
                          </span>
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{listening ? "停止录音" : "语音输入"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <button
                  type="button"
                  onClick={submitFreeform}
                  disabled={!freeText.trim()}
                  aria-label="发送"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition",
                    freeText.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground/60",
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */
/* 通用组件                                                     */
/* ============================================================ */

function ModeButton({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} className="h-8 gap-1.5 text-xs">
      {icon}{children}
    </Button>
  );
}

function InlineCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[640px] space-y-2 rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-3">
      {title && <h4 className="text-[11px] font-medium text-muted-foreground">{title}</h4>}
      {children}
    </div>
  );
}

function PlatformPicker({ value, onChange }: { value: Platform[]; onChange: (v: Platform[]) => void }) {
  const toggle = (p: Platform) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map((p) => {
        const on = value.includes(p);
        return (
          <button
            type="button"
            key={p}
            onClick={() => toggle(p)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] transition",
              on ? cn(PLATFORM_CHIP[p], "ring-2 ring-primary/40") : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function ActionPicker({ value, onChange }: { value: TemplateAction[]; onChange: (v: TemplateAction[]) => void }) {
  const toggle = (a: TemplateAction) => onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  return (
    <div className="flex flex-wrap gap-2">
      {TEMPLATE_ACTIONS.map((a) => {
        const on = value.includes(a);
        return (
          <button
            type="button"
            key={a}
            onClick={() => toggle(a)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] transition",
              on ? "border-primary/40 bg-primary/10 text-primary ring-2 ring-primary/30" : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {TEMPLATE_ACTION_LABEL[a]}
          </button>
        );
      })}
    </div>
  );
}

function CountInput({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  return (
    <div className="space-y-2">
      <RadioGroup
        value={draft.countMode}
        onValueChange={(v) => onChange({ countMode: v as CountMode })}
        className="flex gap-4"
      >
        <label className="flex items-center gap-1.5 text-xs">
          <RadioGroupItem value="range" id="range" />范围
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <RadioGroupItem value="fixed" id="fixed" />限定
        </label>
      </RadioGroup>
      {draft.countMode === "range" ? (
        <div className="flex items-center gap-2 text-xs">
          最少
          <Input
            type="number" min={1}
            value={draft.countMin ?? ""}
            onChange={(e) => onChange({ countMin: e.target.value ? Number(e.target.value) : undefined })}
            className="h-8 w-20"
          />
          -
          <Input
            type="number" min={1}
            value={draft.countMax ?? ""}
            onChange={(e) => onChange({ countMax: e.target.value ? Number(e.target.value) : undefined })}
            className="h-8 w-20"
          />
          次
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs">
          限定
          <Input
            type="number" min={1}
            value={draft.countFixed ?? ""}
            onChange={(e) => onChange({ countFixed: e.target.value ? Number(e.target.value) : undefined })}
            className="h-8 w-24"
          />
          次
        </div>
      )}
    </div>
  );
}

function TimeRange({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Input
        type="time" step={1}
        value={draft.timeStart ?? ""}
        onChange={(e) => onChange({ timeStart: e.target.value })}
        className="h-8 w-32"
      />
      ~
      <Input
        type="time" step={1}
        value={draft.timeEnd ?? ""}
        onChange={(e) => onChange({ timeEnd: e.target.value })}
        className="h-8 w-32"
      />
    </div>
  );
}

function NotifyPicker({ value, onChange }: { value: NotifyPrefs; onChange: (v: NotifyPrefs) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <label className="flex items-center gap-1.5">
        <Checkbox checked={value.success} onCheckedChange={(c) => onChange({ ...value, success: !!c })} />
        任务完成通知
      </label>
      <label className="flex items-center gap-1.5">
        <Checkbox checked={value.failure} onCheckedChange={(c) => onChange({ ...value, failure: !!c })} />
        任务失败通知
      </label>
    </div>
  );
}

/* ============================================================ */
/* 模式 A：完整表单                                             */
/* ============================================================ */

function FullFormCard({ initial, onSubmit }: { initial: Draft; onSubmit: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));
  const ready = d.scenario && d.platforms.length > 0 && d.actions.length > 0;

  return (
    <InlineCard>
      <div className="grid max-h-[480px] gap-4 overflow-auto pr-1">
        <Block label="业务场景">
          <Textarea
            value={d.scenario ?? ""}
            onChange={(e) => patch({ scenario: e.target.value })}
            placeholder="例如：节日营销触达 / 日常养号 / 新品种草"
            className="min-h-[60px]"
          />
        </Block>
        <Block label="目标平台（可多选）">
          <PlatformPicker value={d.platforms} onChange={(v) => patch({ platforms: v })} />
        </Block>
        <Block label="操作类型（可多选）">
          <ActionPicker value={d.actions} onChange={(v) => patch({ actions: v })} />
        </Block>
        <Block label="执行模式">
          <RadioGroup
            value={d.subtype}
            onValueChange={(v) => patch({ subtype: v as TaskSubType })}
            className="flex gap-4"
          >
            <label className="flex items-center gap-1.5 text-xs">
              <RadioGroupItem value="action" id="sub-a" />单次执行
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <RadioGroupItem value="nurture" id="sub-n" />周期性执行
            </label>
          </RadioGroup>
        </Block>
        <Block label="每账号建议执行次数">
          <CountInput draft={d} onChange={patch} />
        </Block>
        <Block label="建议执行时段">
          <TimeRange draft={d} onChange={patch} />
        </Block>
        <Block label="默认评论话术/互动内容（可选）">
          <Textarea
            value={d.script ?? ""}
            onChange={(e) => patch({ script: e.target.value })}
            placeholder="可后续再配"
            className="min-h-[60px]"
          />
        </Block>
        <Block label="自定义约束条件">
          <Textarea
            value={d.constraints ?? ""}
            onChange={(e) => patch({ constraints: e.target.value })}
            placeholder="例如：仅在工作日执行 / 同一账号 24h 内不重复触达"
            className="min-h-[60px]"
          />
        </Block>
        <Block label="通知偏好">
          <NotifyPicker value={d.notify} onChange={(v) => patch({ notify: v })} />
        </Block>
        <Block label="模版名称">
          <Input
            value={d.name ?? ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={suggestName(d)}
            className="h-8"
          />
        </Block>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => onSubmit({ ...d, name: d.name?.trim() || suggestName(d) })} disabled={!ready}>
          提交
        </Button>
      </div>
    </InlineCard>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ============================================================ */
/* 模式 B：分步表单卡片                                         */
/* ============================================================ */

function CoreCard({ draft, onSubmit }: { draft: Draft; onSubmit: (p: Partial<Draft>) => void }) {
  const [platforms, setPlatforms] = useState<Platform[]>(draft.platforms);
  const [actions, setActions] = useState<TemplateAction[]>(draft.actions);
  const [subtype, setSubtype] = useState<TaskSubType>(draft.subtype);
  return (
    <InlineCard>
      <div className="space-y-4">
        <Block label="目标平台（可多选）">
          <PlatformPicker value={platforms} onChange={setPlatforms} />
        </Block>
        <Block label="操作类型（可多选）">
          <ActionPicker value={actions} onChange={setActions} />
        </Block>
        <Block label="执行模式">
          <RadioGroup value={subtype} onValueChange={(v) => setSubtype(v as TaskSubType)} className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs">
              <RadioGroupItem value="action" id="g-a" />单次执行
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <RadioGroupItem value="nurture" id="g-n" />周期性执行
            </label>
          </RadioGroup>
        </Block>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" disabled={!platforms.length || !actions.length}
          onClick={() => onSubmit({ platforms, actions, subtype })}>
          下一步
        </Button>
      </div>
    </InlineCard>
  );
}

function ParamsCard({ draft, onSubmit }: { draft: Draft; onSubmit: (p: Partial<Draft>) => void }) {
  const [local, setLocal] = useState<Draft>(draft);
  const patch = (p: Partial<Draft>) => setLocal((prev) => ({ ...prev, ...p }));
  return (
    <InlineCard>
      <div className="space-y-4">
        <Block label="每账号建议执行次数">
          <CountInput draft={local} onChange={patch} />
        </Block>
        <Block label="建议执行时段">
          <TimeRange draft={local} onChange={patch} />
        </Block>
        <Block label="默认评论话术/互动内容（可选）">
          <Textarea
            value={local.script ?? ""}
            onChange={(e) => patch({ script: e.target.value })}
            placeholder="可后续再配"
            className="min-h-[60px]"
          />
        </Block>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => onSubmit({
          countMode: local.countMode, countMin: local.countMin, countMax: local.countMax, countFixed: local.countFixed,
          timeStart: local.timeStart, timeEnd: local.timeEnd, script: local.script,
        })}>确定</Button>
      </div>
    </InlineCard>
  );
}

function AdvancedCard({ draft, onSubmit, onSkip }: { draft: Draft; onSubmit: (p: Partial<Draft>) => void; onSkip: () => void }) {
  const [constraints, setConstraints] = useState(draft.constraints ?? "");
  const [notify, setNotify] = useState<NotifyPrefs>(draft.notify);
  return (
    <InlineCard>
      <div className="space-y-4">
        <Block label="自定义约束条件">
          <Textarea
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="例如：仅在工作日执行 / 同一账号 24h 内不重复触达"
            className="min-h-[60px]"
          />
        </Block>
        <Block label="通知偏好">
          <NotifyPicker value={notify} onChange={setNotify} />
        </Block>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onSkip} className="gap-1">
          <SkipForward className="h-3.5 w-3.5" />跳过
        </Button>
        <Button size="sm" onClick={() => onSubmit({ constraints, notify })}>确定</Button>
      </div>
    </InlineCard>
  );
}

function NameCard({ initial, onSubmit }: { initial: string; onSubmit: (name: string) => void }) {
  const [name, setName] = useState(initial);
  return (
    <InlineCard>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={initial} className="h-8" />
      <p className="mt-1 text-[11px] text-muted-foreground">推荐名称：{initial}</p>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => onSubmit(name)}>确定</Button>
      </div>
    </InlineCard>
  );
}

/* ============================================================ */
/* 通用                                                         */
/* ============================================================ */

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-right">
        {value ?? <span className="text-muted-foreground/60">待补充</span>}
      </dd>
    </div>
  );
}

function ChatBubble({ msg }: { msg: BubblePayload }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
      )}>
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("max-w-[80%] space-y-1.5", isUser && "items-end text-right")}>
        {msg.content && (
          <div className={cn(
            "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
            isUser ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted text-foreground",
          )}>
            {msg.content}
          </div>
        )}
        <div className={cn("text-[10px] text-muted-foreground", isUser && "text-right")}>{shortTime(msg.ts)}</div>
      </div>
    </div>
  );
}
