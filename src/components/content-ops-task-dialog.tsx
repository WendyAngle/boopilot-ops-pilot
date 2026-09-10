import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookmarkPlus, Sparkles, Share2, Trash2, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  fmtNow, genTaskId, pad, tasksActions, templatesActions, executeTask,
  type TaskRow, type TaskTemplate,
} from "@/lib/operations-store";

type ContentOpsAction = "sharePost" | "deletePost" | "editProfile";
type ShareMode = "immediate" | "timeline" | "group";

const CONTENT_OPS_ACTIONS: Array<{
  value: ContentOpsAction;
  label: string;
  icon: typeof Share2;
  desc: string;
  targetHint: string;
}> = [
  {
    value: "sharePost",
    label: "转发贴文",
    icon: Share2,
    desc: "将指定贴文转发到账号主页",
    targetHint: "指定目标：待转发的贴文（贴文来源与筛选规则稍后补充）",
  },
  {
    value: "deletePost",
    label: "删除贴文",
    icon: Trash2,
    desc: "清理账号主页上的历史贴文",
    targetHint: "指定目标：待删除的贴文（贴文范围与筛选规则稍后补充）",
  },
  {
    value: "editProfile",
    label: "修改账号基础信息",
    icon: UserCog,
    desc: "更新昵称、显示名、个人简介等基础资料",
    targetHint: "指定目标：待修改的账号资料项（可修改字段稍后补充）",
  },
];

const SHARE_MODE_LABELS: Record<ShareMode, string> = {
  immediate: "立即分享",
  timeline: "分享到动态",
  group: "分享到小组",
};

interface Props {
  template: TaskTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTimeStr() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function autoName(tpl: TaskTemplate) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${tpl.name}_${stamp}`;
}

const STEP_LABELS = ["任务基本信息", "指定动作和目标", "执行方式"];

export function ContentOpsTaskDialog({ template, open, onOpenChange }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [action, setAction] = useState<ContentOpsAction>("sharePost");
  const [shareMode, setShareMode] = useState<ShareMode>("immediate");
  const [shareNote, setShareNote] = useState("");
  const [groupLinks, setGroupLinks] = useState("");
  const [execMode, setExecMode] = useState<"now" | "scheduled">("now");
  const [scheduledMode, setScheduledMode] = useState<"datetime" | "active">("datetime");
  const [scheduledDate, setScheduledDate] = useState(todayStr());
  const [scheduledTime, setScheduledTime] = useState(nowTimeStr());

  useEffect(() => {
    if (!open || !template) return;
    setStep(1);
    setName(autoName(template));
    setAction("sharePost");
    setShareMode("immediate");
    setShareNote("");
    setGroupLinks("");
    setExecMode("now");
    setScheduledMode("datetime");
    setScheduledDate(todayStr());
    setScheduledTime(nowTimeStr());
  }, [open, template]);

  if (!template) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl" />
      </Dialog>
    );
  }
  const tpl = template;


  const composeDescription = () => {
    const actionLabel = CONTENT_OPS_ACTIONS.find((a) => a.value === action)?.label ?? "未指定";
    const lines = [
      `来源模版：${tpl.name}任务`,
      tpl.description,
      `指定动作：${actionLabel}`,
    ];
    if (action === "sharePost" && shareMode) {
      lines.push(`转发方式：${SHARE_MODE_LABELS[shareMode]}`);
      if (shareMode === "timeline" && shareNote.trim()) {
        lines.push(`转发说明：${shareNote.trim()}`);
      }
      if (shareMode === "group" && groupLinks.trim()) {
        lines.push(`指定小组链接：${groupLinks.trim()}`);
      }
    }
    lines.push(
      execMode === "now"
        ? "执行方式：立即执行"
        : scheduledMode === "active"
          ? "执行方式：指定时间开始执行（账号活跃时间）"
          : `执行方式：指定时间开始执行 ${scheduledDate} ${scheduledTime}`,
    );
    return lines.join("\n");
  };

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("请输入任务名称");
    if (!action) return toast.error("请选择动作类型");
    if (action === "sharePost" && shareModes.length === 0) {
      return toast.error("请至少选择一种转发方式");
    }

    const task: TaskRow = {
      id: genTaskId(),
      name: name.trim(),
      subtype: "action",
      platforms: [...tpl.platforms],
      total: Math.max(1, tpl.total),
      done: 0,
      failed: 0,
      status: "pending",
      description: composeDescription(),
      createdBy: "黄雪",
      createdAt: fmtNow(),
      fromTemplate: tpl.name,
    };
    tasksActions.add(task);
    templatesActions.update(tpl.id, {
      uses: tpl.uses + 1,
      monthlyUses: (tpl.monthlyUses ?? 0) + 1,
    });
    if (execMode === "now") {
      setTimeout(() => executeTask(task.id), 400);
      toast.success(`已根据模版「${tpl.name}」创建任务并开始执行`);
    } else {
      toast.success("任务已创建（等待定时执行）");
    }
    onOpenChange(false);
  };

  const currentAction = CONTENT_OPS_ACTIONS.find((a) => a.value === action);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="space-y-2 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookmarkPlus className="h-4 w-4 text-violet-600" />创建Facebook账号内容运营任务
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              来源模版：<span className="font-medium text-foreground">{tpl.name}任务</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            <span className="text-foreground/70">方法论：</span>{tpl.description}
          </p>
        </DialogHeader>

        <div className="border-b px-6 py-3">
          <ol className="flex items-center gap-2">
            {STEP_LABELS.map((label, idx) => {
              const n = idx + 1;
              const active = step === n;
              const done = step > n;
              return (
                <li key={label} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { if (done) setStep(n); }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition",
                      active && "bg-primary text-primary-foreground",
                      done && "text-primary hover:bg-primary/5 cursor-pointer",
                      !active && !done && "text-muted-foreground",
                    )}
                  >
                    <span className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                      active && "border-primary-foreground bg-primary-foreground/20",
                      done && "border-primary bg-primary/10",
                      !active && !done && "border-border",
                    )}>{n}</span>
                    <span className="font-medium">{label}</span>
                  </button>
                  {n < STEP_LABELS.length && (
                    <span className={cn("h-px w-6", done ? "bg-primary/40" : "bg-border")} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-5 px-6 py-5">
            {/* 步骤1 任务基本信息 */}
            <section className={cn("space-y-3", step !== 1 && "hidden")}>
              <SectionTitle index="1/3" title="任务基本信息" />
              <div className="space-y-1.5">
                <FieldLabel required>任务名称</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="自动根据模版名_日期时间 生成"
                />
                <p className="text-[11px] text-muted-foreground">自动根据"模版名_日期时间"生成，可手动修改</p>
              </div>
            </section>

            {/* 步骤2 指定动作和目标 */}
            <section className={cn("space-y-4", step !== 2 && "hidden")}>
              <SectionTitle index="2/3" title="指定动作和目标" />
              <div className="space-y-1.5">
                <FieldLabel required>指定动作类型</FieldLabel>
                <Select value={action} onValueChange={(v) => setAction(v as ContentOpsAction)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="请选择动作类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_OPS_ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        <span className="flex items-center gap-2">
                          <a.icon className="h-3.5 w-3.5 text-primary" />
                          {a.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentAction && (
                  <p className="text-[11px] text-muted-foreground">{currentAction.desc}</p>
                )}
              </div>

              {/* 转发贴文：转发方式配置 */}
              {action === "sharePost" && (
                <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3">
                  <FieldLabel required>转发方式</FieldLabel>
                  <div className="space-y-2">
                    {(["immediate", "timeline", "group"] as ShareMode[]).map((m) => {
                      const checked = shareModes.includes(m);
                      return (
                        <label
                          key={m}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors cursor-pointer",
                            checked ? "border-primary/60 bg-primary/5" : "hover:border-primary/30",
                          )}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleShareMode(m)} />
                          <span className="text-xs font-medium">{SHARE_MODE_LABELS[m]}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* 分享到动态：转发说明 */}
                  {shareModes.includes("timeline") && (
                    <div className="space-y-1.5">
                      <FieldLabel>转发说明</FieldLabel>
                      <Textarea
                        value={shareNote}
                        onChange={(e) => setShareNote(e.target.value)}
                        placeholder="选填，添加转发说明文字"
                        className="min-h-[60px] text-xs"
                      />
                    </div>
                  )}

                  {/* 分享到小组：指定小组链接 */}
                  {shareModes.includes("group") && (
                    <div className="space-y-1.5">
                      <FieldLabel>指定小组链接</FieldLabel>
                      <Textarea
                        value={groupLinks}
                        onChange={(e) => setGroupLinks(e.target.value)}
                        placeholder="输入小组链接，每行一个，可输入多个"
                        className="min-h-[80px] text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">每行输入一个小组链接，支持多个小组</p>
                    </div>
                  )}
                </div>
              )}

              {/* 删除贴文 / 修改账号基础信息：目标占位 */}
              {action !== "sharePost" && currentAction && (
                <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  {currentAction.targetHint}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                指定目标将根据所选动作类型动态展示，具体配置项待补充。
              </p>
            </section>

            {/* 步骤3 执行方式 */}
            <section className={cn("space-y-3", step !== 3 && "hidden")}>
              <SectionTitle index="3/3" title="执行方式" />
              <div className="space-y-1.5">
                <FieldLabel required>执行方式</FieldLabel>
                <RadioGroup
                  value={execMode}
                  onValueChange={(v) => setExecMode(v as "now" | "scheduled")}
                  className="space-y-2"
                >
                  <label
                    htmlFor="co-now"
                    className={cn(
                      "block cursor-pointer rounded-lg border p-3 transition-colors",
                      execMode === "now" ? "border-primary/60 bg-primary/5" : "hover:border-primary/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="now" id="co-now" className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">立即执行</span>
                    </div>
                    <p className="ml-6 mt-1 text-[11px] text-muted-foreground">提交后立即开始执行任务</p>
                  </label>

                  <label
                    htmlFor="co-sch"
                    className={cn(
                      "block cursor-pointer rounded-lg border p-3 transition-colors",
                      execMode === "scheduled" ? "border-primary/60 bg-primary/5" : "hover:border-primary/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="scheduled" id="co-sch" className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">指定时间开始执行</span>
                    </div>
                    {execMode === "scheduled" && (
                      <div className="ml-6 mt-2 space-y-2">
                        <RadioGroup
                          value={scheduledMode}
                          onValueChange={(v) => setScheduledMode(v as "datetime" | "active")}
                          className="space-y-1.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="active" id="co-sch-active" className="h-3.5 w-3.5" />
                              <Label htmlFor="co-sch-active" className="cursor-pointer text-xs">账号活跃时间</Label>
                            </div>
                            {scheduledMode === "active" && (
                              <p className="ml-6 text-[11px] text-muted-foreground">
                                系统将在每个账号下一个活跃时间窗口开始执行，系统会根据账号国家地区自动转化为当地相应时段
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="datetime" id="co-sch-dt" className="h-3.5 w-3.5" />
                              <Label htmlFor="co-sch-dt" className="cursor-pointer text-xs">指定日期和时间点</Label>
                            </div>
                            {scheduledMode === "datetime" && (
                              <div className="ml-6 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="h-7 w-36 text-xs"
                                  />
                                  <Input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="h-7 w-24 text-xs"
                                  />
                                </div>
                                <p className="text-[11px] text-muted-foreground">任务将在指定时间开始执行（北京时间）</p>
                              </div>
                            )}
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </label>
                </RadioGroup>
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="border-t bg-muted/20 px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">第 {step} / 3 步</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
              {step > 1 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(1, s - 1))}>上一步</Button>
              )}
              {step < 3 && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (step === 1 && !name.trim()) { toast.error("请填写任务名称"); return; }
                    if (step === 2 && !action) { toast.error("请选择动作类型"); return; }
                    if (step === 2 && action === "sharePost" && shareModes.length === 0) {
                      toast.error("请至少选择一种转发方式"); return;
                    }
                    setStep((s) => Math.min(3, s + 1));
                  }}
                >
                  下一步
                </Button>
              )}
              {step === 3 && (
                <Button size="sm" className="gap-1" onClick={handleSubmit}>
                  <Sparkles className="h-3.5 w-3.5" />确认创建
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{index}</span>
      <h4 className="text-sm font-semibold">{title}</h4>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs">
      {children}{required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
  );
}
