import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookmarkPlus, Sparkles, Share2, Trash2, EyeOff, UserCog, AlertTriangle } from "lucide-react";

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
import {
  seedManagedAccounts, ACCOUNT_LANGUAGES, ACCOUNT_REGIONS,
  PLATFORM_META, type ManagedAccount,
} from "@/lib/managed-account-mock";
import {
  AccountScopePicker,
  resolveScopeAccounts,
  EMPTY_ACCOUNT_SCOPE,
  type AccountScopeValue,
} from "@/components/account-scope-picker";

type ContentOpsAction = "sharePost" | "hidePost" | "deletePost" | "editProfile";
type ShareMode = "immediate" | "timeline" | "group";
type DeleteMode = "specific" | "batch";
type EditFieldKey = "nickname" | "displayName" | "bio" | "language" | "region";

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
    value: "hidePost",
    label: "隐藏贴文",
    icon: EyeOff,
    desc: "将账号主页上的贴文设为隐藏，对外不可见，可随时恢复",
    targetHint: "指定目标：待隐藏的贴文（贴文范围与筛选规则稍后补充）",
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
  group: "分享到群组",
};

const SHARE_MODE_DESC: Record<ShareMode, string> = {
  immediate: "一键转发，不编辑直接发布",
  timeline: "转发到自己的时间线，可附加自己的文字（即转发说明）",
  group: "转发到公开 / 自己所属的群组",
};

/** TikTok 平台的转发方式口径 */
const TIKTOK_SHARE_MODE_LABELS: Record<"immediate" | "group", string> = {
  immediate: "一键转发",
  group: "分享到群组",
};
const TIKTOK_SHARE_MODE_DESC: Record<"immediate" | "group", string> = {
  immediate: "推送到关注者的「为你推荐（For You）」信息流",
  group: "分享到自己的好友群或粉丝群",
};
const SHARE_NOTE_MAX = 500;


const DELETE_MODE_LABELS: Record<DeleteMode, string> = {
  specific: "指定贴文",
  batch: "按条件批量",
};

/** 修改账号基础信息：可共用字段（一次填写，批量应用） */
const EDIT_COMMON_FIELDS: { key: EditFieldKey; label: string }[] = [
  { key: "language", label: "语言" },
  { key: "region", label: "地区" },
  { key: "bio", label: "个人简介" },
];
/** 修改账号基础信息：账号独有字段（需逐账号填写） */
const EDIT_UNIQUE_FIELDS: { key: EditFieldKey; label: string }[] = [
  { key: "nickname", label: "昵称" },
  { key: "displayName", label: "显示名" },
];
const EDIT_FIELD_LABELS: Record<EditFieldKey, string> = {
  nickname: "昵称",
  displayName: "显示名",
  bio: "个人简介",
  language: "语言",
  region: "地区",
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
  const [sharePostLinks, setSharePostLinks] = useState("");
  const [execMode, setExecMode] = useState<"now" | "scheduled">("now");
  const [scheduledMode, setScheduledMode] = useState<"datetime" | "active">("datetime");
  const [scheduledDate, setScheduledDate] = useState(todayStr());
  const [scheduledTime, setScheduledTime] = useState(nowTimeStr());

  // 删除贴文
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("specific");
  const [deleteExactScope, setDeleteExactScope] = useState<AccountScopeValue>(EMPTY_ACCOUNT_SCOPE);
  const deleteAccountId = deleteExactScope.accountIds[0] ?? "";
  const [deletePostLinks, setDeletePostLinks] = useState("");
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");
  const [deleteKeyword, setDeleteKeyword] = useState("");
  const [deletePostType, setDeletePostType] = useState<"all" | "original" | "repost">("all");
  const [deleteMaxCount, setDeleteMaxCount] = useState("50");
  const [deleteScope, setDeleteScope] = useState<AccountScopeValue>(EMPTY_ACCOUNT_SCOPE);

  // 修改账号基础信息
  const [editFields, setEditFields] = useState<EditFieldKey[]>(["language"]);
  const [editScope, setEditScope] = useState<AccountScopeValue>(EMPTY_ACCOUNT_SCOPE);
  const [editLanguage, setEditLanguage] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editUnique, setEditUnique] = useState<Record<string, { nickname: string; displayName: string }>>({});

  // 仅展示当前模版平台下的账号（Facebook）
  const platformAccounts = useMemo<ManagedAccount[]>(() => {
    if (!template) return [];
    const all = seedManagedAccounts();
    return all.filter((a) => template.platforms.includes(a.platform));
  }, [template]);

  useEffect(() => {
    if (!open || !template) return;
    setStep(1);
    setName(autoName(template));
    setAction("sharePost");
    setShareMode("immediate");
    setShareNote("");
    setGroupLinks("");
    setSharePostLinks("");
    setExecMode("now");
    setScheduledMode("datetime");
    setScheduledDate(todayStr());
    setScheduledTime(nowTimeStr());
    // 重置删除贴文
    setDeleteMode("specific");
    setDeleteExactScope(EMPTY_ACCOUNT_SCOPE);
    setDeletePostLinks("");
    setDeleteStartDate("");
    setDeleteEndDate("");
    setDeleteKeyword("");
    setDeletePostType("all");
    setDeleteMaxCount("50");
    setDeleteScope(EMPTY_ACCOUNT_SCOPE);
    // 重置修改账号基础信息
    setEditFields(["language"]);
    setEditScope(EMPTY_ACCOUNT_SCOPE);
    setEditLanguage("");
    setEditRegion("");
    setEditBio("");
    setEditUnique({});
  }, [open, template]);

  if (!template) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl" />
      </Dialog>
    );
  }
  const tpl = template;
  const tplPlatform = tpl.platforms[0] ?? "Facebook";
  const isTiktok = tplPlatform === "Tiktok";
  const shareModeList: ShareMode[] = isTiktok
    ? ["immediate", "group"]
    : ["immediate", "timeline", "group"];
  const shareModeLabel = (m: ShareMode) =>
    isTiktok && m !== "timeline" ? TIKTOK_SHARE_MODE_LABELS[m] : SHARE_MODE_LABELS[m];
  const shareModeDesc = (m: ShareMode) =>
    isTiktok && m !== "timeline" ? TIKTOK_SHARE_MODE_DESC[m] : SHARE_MODE_DESC[m];
  /** TikTok：两种转发方式均可填写转发附言 */
  const showShareNote = isTiktok || shareMode === "timeline";
  const shareNoteLabel = isTiktok ? "转发附言" : "转发说明";


  const deleteAccountIds = resolveScopeAccounts(deleteScope, platformAccounts).map((a) => a.id);
  const editAccountIds = resolveScopeAccounts(editScope, platformAccounts).map((a) => a.id);

  // 隐藏贴文与删除贴文共用同一套目标配置（指定贴文 / 按条件批量）
  const isPostManage = action === "hidePost" || action === "deletePost";
  const postVerb = action === "hidePost" ? "隐藏" : "删除";

  const toggleEditField = (f: EditFieldKey) =>
    setEditFields((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  const setUniqueField = (id: string, key: "nickname" | "displayName", value: string) =>
    setEditUnique((p) => ({
      ...p,
      [id]: { ...{ nickname: "", displayName: "" }, ...p[id], [key]: value },
    }));

  const hasUniqueField = editFields.some((f) => f === "nickname" || f === "displayName");
  const hasCommonField = editFields.some((f) => f === "bio" || f === "language" || f === "region");

  const composeDescription = () => {
    const actionLabel = CONTENT_OPS_ACTIONS.find((a) => a.value === action)?.label ?? "未指定";
    const lines = [
      `来源模版：${tpl.name}任务`,
      tpl.description,
      `指定动作：${actionLabel}`,
    ];
    if (action === "sharePost" && shareMode) {
      lines.push(`转发方式：${SHARE_MODE_LABELS[shareMode]}`);
      const postLinks = sharePostLinks.split("\n").map((s) => s.trim()).filter(Boolean);
      if (postLinks.length > 0) {
        lines.push(`指定贴文：${postLinks.length} 条`);
      }
      if (shareMode === "timeline" && shareNote.trim()) {
        lines.push(`转发说明：${shareNote.trim()}`);
      }
      if (shareMode === "group" && groupLinks.trim()) {
        lines.push(`指定群组链接：${groupLinks.trim()}`);
      }
    }
    if (isPostManage) {
      lines.push(`目标模式：${DELETE_MODE_LABELS[deleteMode]}`);
      if (deleteMode === "specific") {
        const acc = platformAccounts.find((a) => a.id === deleteAccountId);
        lines.push(`指定账号：${acc ? acc.username : "未选择"}`);
        const links = deletePostLinks.split("\n").map((s) => s.trim()).filter(Boolean);
        lines.push(`待${postVerb}贴文：${links.length} 条`);
      } else {
        lines.push(`${postVerb}范围：${deleteStartDate || "?"} 至 ${deleteEndDate || "?"}`);
        if (deleteKeyword.trim()) lines.push(`关键词：${deleteKeyword.trim()}`);
        lines.push(`贴文类型：${deletePostType === "all" ? "全部" : deletePostType === "original" ? "原创" : "转发"}`);
        lines.push(`条数上限：${deleteMaxCount}`);
        lines.push(`指定账号：${deleteAccountIds.length} 个`);
      }
    }
    if (action === "editProfile") {
      lines.push(`修改字段：${editFields.map((f) => EDIT_FIELD_LABELS[f]).join("、") || "未选择"}`);
      lines.push(`指定账号：${editAccountIds.length} 个`);
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
    if (action === "sharePost") {
      if (!shareMode) return toast.error("请选择转发方式");
      const postLinks = sharePostLinks.split("\n").map((s) => s.trim()).filter(Boolean);
      if (postLinks.length === 0) return toast.error("请至少填写 1 条指定贴文链接");
    }
    if (isPostManage) {
      if (deleteMode === "specific") {
        if (!deleteAccountId) return toast.error("请选择指定账号");
        const links = deletePostLinks.split("\n").map((s) => s.trim()).filter(Boolean);
        if (links.length === 0) return toast.error(`请至少填写 1 条待${postVerb}贴文链接`);
      } else {
        if (!deleteStartDate || !deleteEndDate) return toast.error(`请填写完整的${postVerb}时间范围`);
        if (deleteStartDate > deleteEndDate) return toast.error("开始时间不能晚于结束时间");
        if (deleteAccountIds.length === 0) return toast.error("请至少选择 1 个账号");
        const max = parseInt(deleteMaxCount, 10);
        if (!max || max < 1 || max > 200) return toast.error("条数上限需在 1-200 之间");
      }
    }
    if (action === "editProfile") {
      if (editFields.length === 0) return toast.error("请至少勾选 1 个修改字段");
      if (editAccountIds.length === 0) return toast.error("请至少选择 1 个账号");
      if (hasUniqueField) {
        const anyChange = editAccountIds.some((id) => {
          const u = editUnique[id];
          return u && (u.nickname.trim() || u.displayName.trim());
        });
        if (!anyChange) return toast.error("明细表至少需 1 行有实际变更");
      }
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

              {/* 转发贴文链接 */}
              {action === "sharePost" && (
                <div className="space-y-1.5">
                  <FieldLabel required>转发贴文链接</FieldLabel>
                  <Textarea
                    value={sharePostLinks}
                    onChange={(e) => setSharePostLinks(e.target.value)}
                    placeholder="每行一条贴文链接，可输入多个"
                    className="min-h-[80px] text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    每行输入一条待转发的贴文链接，支持多条
                  </p>
                </div>
              )}

              {/* 转发贴文：转发方式配置 */}
              {action === "sharePost" && (
                <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3">
                  <div className="space-y-1.5">
                    <FieldLabel required>转发方式</FieldLabel>
                    <RadioGroup
                      value={shareMode}
                      onValueChange={(v) => setShareMode(v as ShareMode)}
                      className="grid gap-2 sm:grid-cols-3"
                    >
                      {(["immediate", "timeline", "group"] as ShareMode[]).map((m) => (
                        <label
                          key={m}
                          htmlFor={`sm-${m}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2.5 transition-colors",
                            shareMode === m ? "border-primary bg-primary/5" : "hover:border-primary/40",
                          )}
                        >
                          <RadioGroupItem value={m} id={`sm-${m}`} className="mt-0.5" />
                          <span className="min-w-0">
                            <span className="block text-xs font-medium">{SHARE_MODE_LABELS[m]}</span>
                            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                              {SHARE_MODE_DESC[m]}
                            </span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* 分享到动态：转发说明 */}
                  {shareMode === "timeline" && (
                    <div className="space-y-1.5">
                      <FieldLabel>转发说明</FieldLabel>
                      <Textarea
                        value={shareNote}
                        onChange={(e) => setShareNote(e.target.value)}
                        placeholder="请输入转发说明..."
                        className="min-h-[60px] text-xs"
                      />
                    </div>
                  )}

                  {/* 分享到群组：指定群组链接 */}
                  {shareMode === "group" && (
                    <div className="space-y-1.5">
                      <FieldLabel>指定群组链接</FieldLabel>
                      <Textarea
                        value={groupLinks}
                        onChange={(e) => setGroupLinks(e.target.value)}
                        placeholder="输入群组链接，每行一个，可输入多个"
                        className="min-h-[80px] text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">每行输入一个群组链接，支持多个群组</p>
                    </div>
                  )}
                </div>
              )}

              {/* 隐藏贴文 / 删除贴文（共用目标配置） */}
              {isPostManage && (
                <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3">
                  <div className="space-y-1.5">
                    <FieldLabel required>目标模式</FieldLabel>
                    <RadioGroup
                      value={deleteMode}
                      onValueChange={(v) => setDeleteMode(v as DeleteMode)}
                      className="flex gap-4"
                    >
                      {(["specific", "batch"] as DeleteMode[]).map((m) => (
                        <label key={m} className="flex items-center gap-1.5 text-xs">
                          <RadioGroupItem value={m} id={`dm-${m}`} />
                          {DELETE_MODE_LABELS[m]}
                        </label>
                      ))}
                    </RadioGroup>
                    <p className="text-[11px] text-muted-foreground">
                      {deleteMode === "specific"
                        ? `精确${postVerb}指定贴文，仅支持单个账号`
                        : `按时间等条件批量${postVerb}，可同时指定多个账号`}
                    </p>
                  </div>

                  {deleteMode === "specific" ? (
                    <>
                      <div className="space-y-1.5">
                        <FieldLabel required>指定账号</FieldLabel>
                        <AccountScopePicker
                          single
                          accounts={platformAccounts}
                          value={deleteExactScope}
                          onChange={setDeleteExactScope}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel required>贴文链接 / ID</FieldLabel>
                        <Textarea
                          value={deletePostLinks}
                          onChange={(e) => setDeletePostLinks(e.target.value)}
                          placeholder="每行一条贴文链接或 ID，可输入多条"
                          className="min-h-[80px] text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          贴文须属于所选账号，执行时将逐条校验，不匹配的贴文会被跳过并记为失败
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <FieldLabel required>开始日期</FieldLabel>
                          <Input
                            type="date"
                            value={deleteStartDate}
                            onChange={(e) => setDeleteStartDate(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel required>结束日期</FieldLabel>
                          <Input
                            type="date"
                            value={deleteEndDate}
                            onChange={(e) => setDeleteEndDate(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <FieldLabel>关键词</FieldLabel>
                          <Input
                            value={deleteKeyword}
                            onChange={(e) => setDeleteKeyword(e.target.value)}
                            placeholder="请输入关键词..."
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>贴文类型</FieldLabel>
                          <Select
                            value={deletePostType}
                            onValueChange={(v) => setDeletePostType(v as typeof deletePostType)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">全部</SelectItem>
                              <SelectItem value="original">原创贴文</SelectItem>
                              <SelectItem value="repost">转发贴文</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel required>条数上限</FieldLabel>
                          <Input
                            type="number"
                            min={1}
                            max={200}
                            value={deleteMaxCount}
                            onChange={(e) => setDeleteMaxCount(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel required>指定账号</FieldLabel>
                        <AccountScopePicker
                          accounts={platformAccounts}
                          value={deleteScope}
                          onChange={setDeleteScope}
                        />
                      </div>
                      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          预估影响范围：{deleteAccountIds.length} 个账号，最多{postVerb}{" "}
                          {deleteAccountIds.length * (parseInt(deleteMaxCount, 10) || 0)} 条贴文。
                          {action === "hidePost" ? "隐藏后贴文对外不可见，可随时恢复。" : "删除后不可恢复，请确认条件无误。"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 修改账号基础信息 */}
              {action === "editProfile" && (
                <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3">
                  <div className="space-y-1.5">
                    <FieldLabel required>修改字段</FieldLabel>
                    <div className="flex flex-wrap gap-3">
                      {[...EDIT_COMMON_FIELDS, ...EDIT_UNIQUE_FIELDS].map((f) => (
                        <label key={f.key} className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={editFields.includes(f.key)}
                            onCheckedChange={() => toggleEditField(f.key)}
                          />
                          {f.label}
                          {EDIT_UNIQUE_FIELDS.some((u) => u.key === f.key) && (
                            <span className="text-[10px] text-muted-foreground">（账号独有）</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>指定账号</FieldLabel>
                    <AccountScopePicker
                      accounts={platformAccounts}
                      value={editScope}
                      onChange={setEditScope}
                    />
                  </div>

                  {hasCommonField && (
                    <div className="space-y-2 rounded-md border bg-background px-3 py-2">
                      <p className="text-xs font-medium">共用字段（统一应用到所选账号）</p>
                      <div className="grid grid-cols-2 gap-3">
                        {editFields.includes("language") && (
                          <div className="space-y-1.5">
                            <FieldLabel>语言</FieldLabel>
                            <Select value={editLanguage} onValueChange={setEditLanguage}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="请选择语言" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACCOUNT_LANGUAGES.map((l) => (
                                  <SelectItem key={l} value={l}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {editFields.includes("region") && (
                          <div className="space-y-1.5">
                            <FieldLabel>地区</FieldLabel>
                            <Select value={editRegion} onValueChange={setEditRegion}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="请选择地区" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACCOUNT_REGIONS.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {editFields.includes("bio") && (
                        <div className="space-y-1.5">
                          <FieldLabel>个人简介</FieldLabel>
                          <Textarea
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            placeholder="统一应用到所选账号的个人简介内容"
                            className="min-h-[60px] text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {hasUniqueField && (
                    <div className="space-y-2 rounded-md border bg-background px-3 py-2">
                      <p className="text-xs font-medium">
                        账号独有字段明细（留空表示该账号保持不变）
                      </p>
                      {editAccountIds.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">请先选择账号</p>
                      ) : (
                        <ScrollArea className="max-h-[180px]">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="py-1 font-normal">账号</th>
                                {editFields.includes("nickname") && (
                                  <th className="py-1 font-normal">昵称</th>
                                )}
                                {editFields.includes("displayName") && (
                                  <th className="py-1 font-normal">显示名</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {editAccountIds.map((id) => {
                                const a = platformAccounts.find((x) => x.id === id);
                                if (!a) return null;
                                const row = editUnique[id] ?? { nickname: "", displayName: "" };
                                return (
                                  <tr key={id} className="border-t">
                                    <td className="py-1 pr-2 align-middle">{a.username}</td>
                                    {editFields.includes("nickname") && (
                                      <td className="py-1 pr-2">
                                        <Input
                                          value={row.nickname}
                                          onChange={(e) => setUniqueField(id, "nickname", e.target.value)}
                                          placeholder={a.username}
                                          className="h-8 text-xs"
                                        />
                                      </td>
                                    )}
                                    {editFields.includes("displayName") && (
                                      <td className="py-1">
                                        <Input
                                          value={row.displayName}
                                          onChange={(e) =>
                                            setUniqueField(id, "displayName", e.target.value)
                                          }
                                          placeholder={a.displayName ?? "保持不变"}
                                          className="h-8 text-xs"
                                        />
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                    if (step === 2 && action === "sharePost") {
                      if (!shareMode) { toast.error("请选择转发方式"); return; }
                      if (!sharePostLinks.split("\n").some((s) => s.trim())) {
                        toast.error("请至少填写 1 条指定贴文链接"); return;
                      }
                    }
                    if (step === 2 && isPostManage) {
                      if (deleteMode === "specific") {
                        if (!deleteAccountId) { toast.error("请选择指定账号"); return; }
                        if (!deletePostLinks.split("\n").some((s) => s.trim())) {
                          toast.error(`请至少填写 1 条待${postVerb}贴文链接`); return;
                        }
                      } else {
                        if (!deleteStartDate || !deleteEndDate) { toast.error(`请填写完整的${postVerb}时间范围`); return; }
                        if (deleteStartDate > deleteEndDate) { toast.error("开始时间不能晚于结束时间"); return; }
                        if (deleteAccountIds.length === 0) { toast.error("请至少选择 1 个账号"); return; }
                        const max = parseInt(deleteMaxCount, 10);
                        if (!max || max < 1 || max > 200) { toast.error("条数上限需在 1-200 之间"); return; }
                      }
                    }
                    if (step === 2 && action === "editProfile") {
                      if (editFields.length === 0) { toast.error("请至少勾选 1 个修改字段"); return; }
                      if (editAccountIds.length === 0) { toast.error("请至少选择 1 个账号"); return; }
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
