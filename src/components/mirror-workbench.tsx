import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import {
  ACCOUNT_LANGUAGES,
  ACCOUNT_REGIONS,
  
  ACCOUNT_STATUS_META,
  type ManagedAccount,
} from "@/lib/managed-account-mock";
import {
  HANDLE_METHODS,
  HANDLE_RESULTS,
  HANDLE_STATE_CLS,
  HANDLE_STATE_LABEL,
  healthActions,
  type AccountHealthRecord,
  type HandleMethod,
  type HandleResult,
  type HandleState,
} from "@/lib/account-health-mock";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

type Draft = {
  username: string;
  displayName: string;
  bio: string;
  language: string;
  region: string;
};

function toDraft(a: ManagedAccount): Draft {
  return {
    username: a.username,
    displayName: a.displayName ?? a.username,
    bio: a.bio ?? "",
    language: a.language ?? ACCOUNT_LANGUAGES[0],
    region: a.region ?? ACCOUNT_REGIONS[0],
  };
}

/** 各平台个人简介长度上限（对齐平台侧限制） */
const BIO_LIMIT: Record<string, number> = {
  Facebook: 101,
  Tiktok: 80,
  Instagram: 150,
  "Twitter/X": 160,
  WhatsApp: 139,
};

/**
 * 同屏工作台侧栏
 * Tab1：在社媒平台改完资料后，一键回填到系统账号数据
 * Tab2：同屏排障过程中直接登记待确认/处理事项
 */
export function MirrorWorkbench({
  account,
  health,
  onApply,
}: {
  account: ManagedAccount;
  health: AccountHealthRecord | null;
  onApply: (patch: Partial<ManagedAccount>) => void;
}) {
  const who = getCurrentUser()?.displayName ?? "当前用户";
  const [draft, setDraft] = useState<Draft>(() => toDraft(account));
  const bioLimit = BIO_LIMIT[account.platform] ?? 150;

  useEffect(() => {
    setDraft(toDraft(account));
  }, [account.id]);

  const dirty = useMemo(() => {
    const base = toDraft(account);
    return (
      base.username !== draft.username ||
      base.displayName !== draft.displayName ||
      base.bio !== draft.bio ||
      base.language !== draft.language ||
      base.region !== draft.region
    );
  }, [account, draft]);


  /* ---------- 事项登记 ---------- */
  const openIssues = health?.issues.filter((i) => i.state !== "done") ?? [];
  const [picked, setPicked] = useState<string[] | null>(null);
  const pickedIds = picked ?? openIssues.map((i) => i.id);
  const [state, setState] = useState<HandleState>("done");
  const [method, setMethod] = useState<HandleMethod>("发起申诉");
  const [result, setResult] = useState<HandleResult>("已恢复");
  const [note, setNote] = useState("");
  const isConfirmOnly = method === "确认账号状态";

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l bg-background">
      <Tabs defaultValue="profile" className="flex h-full flex-col">
        <div className="border-b px-3 pt-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">资料回填</TabsTrigger>
            <TabsTrigger value="handle">
              待确认/处理
              {openIssues.length > 0 && (
                <span className="ml-1 rounded-full bg-warning/15 px-1.5 text-[10px] text-warning">
                  {openIssues.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ---------- 资料回填 ---------- */}
        <TabsContent
          value="profile"
          className="m-0 flex-1 overflow-y-auto px-4 py-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              在左侧同屏画面中于 {account.platform} 修改资料后，在此录入并一键回填，
              系统账号数据同步更新。
            </p>
          </div>

          <div className="space-y-3">
            <Field label="账号昵称（平台用户名）">
              <Input
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                placeholder="如 boo.daily"
              />
            </Field>
            <Field label="账号显示名">
              <Input
                value={draft.displayName}
                onChange={(e) =>
                  setDraft({ ...draft, displayName: e.target.value })
                }
                placeholder="平台主页展示的名称"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="语言">
                <Select
                  value={draft.language}
                  onValueChange={(v) => setDraft({ ...draft, language: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="地区">
                <Select
                  value={draft.region}
                  onValueChange={(v) => setDraft({ ...draft, region: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_REGIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field
              label={`个人简介（${account.platform} Bio）`}
              hint={`最多 ${bioLimit} 字符，与平台侧简介保持一致。`}
            >
              <Textarea
                rows={3}
                maxLength={bioLimit}
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                placeholder="平台主页展示的简介，如 Daily picks for smart living · DM for wholesale"
              />
              <div className="mt-1 text-right text-[11px] text-muted-foreground">
                {draft.bio.length}/{bioLimit}
              </div>
            </Field>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t pt-3">
            <Button
              className="flex-1"
              disabled={!dirty || !draft.username.trim()}
              onClick={() => {
                onApply({
                  username: draft.username.trim(),
                  displayName: draft.displayName.trim(),
                  bio: draft.bio.trim(),
                  language: draft.language,
                  region: draft.region,
                });
                toast.success("已回填并同步到账号列表", {
                  description: draft.username.trim(),
                });
              }}
            >
              <Save className="mr-1 h-3.5 w-3.5" />
              一键保存回填
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="撤销修改"
              onClick={() => setDraft(toDraft(account))}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          {dirty && (
            <p className="mt-2 text-[11px] text-warning">
              有未保存的回填内容
            </p>
          )}
        </TabsContent>

        {/* ---------- 待确认/处理 ---------- */}
        <TabsContent
          value="handle"
          className="m-0 flex-1 overflow-y-auto px-4 py-4"
        >
          {!health ? (
            <p className="text-xs text-muted-foreground">暂无健康记录</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {ACCOUNT_STATUS_META[health.status].label}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-[11px]", HANDLE_STATE_CLS[health.handleState])}
                  >
                    {HANDLE_STATE_LABEL[health.handleState]}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {account.platform} 平台侧：{health.platformStatus}
                </p>
              </div>

              {openIssues.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  当前无未闭环事项
                </div>
              ) : (
                <>
                  <Field label={`本次处理的事项 *（${openIssues.length} 项未闭环）`}>
                    <div className="space-y-2 rounded-md border p-3">
                      {openIssues.map((it) => (
                        <label
                          key={it.id}
                          className="flex cursor-pointer items-start gap-2 text-xs"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={pickedIds.includes(it.id)}
                            onCheckedChange={(v) =>
                              setPicked(
                                v
                                  ? [...pickedIds, it.id]
                                  : pickedIds.filter((x) => x !== it.id),
                              )
                            }
                          />
                          <span className="flex-1">
                            <span className="font-medium">{it.scope}</span>
                            <span className="mt-0.5 block text-muted-foreground">
                              {it.desc}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </Field>

                  <Field label="处理状态 *">
                    <Select
                      value={state}
                      onValueChange={(v) => setState(v as HandleState)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doing">处理中</SelectItem>
                        <SelectItem value="done">已处理</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="处理方式 *">
                    <Select
                      value={method}
                      onValueChange={(v) => {
                        setMethod(v as HandleMethod);
                        if (v === "确认账号状态") setResult("状态已核实");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HANDLE_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="处理结果 *">
                    <Select
                      value={isConfirmOnly ? "状态已核实" : result}
                      disabled={isConfirmOnly}
                      onValueChange={(v) => setResult(v as HandleResult)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HANDLE_RESULTS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="处理说明">
                    <Textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="如：同屏完成身份验证，已恢复私信能力"
                    />
                  </Field>

                  <Button
                    className="w-full"
                    disabled={pickedIds.length === 0}
                    onClick={() => {
                      healthActions.registerHandling([health.accountId], {
                        handleState: state,
                        method,
                        result: isConfirmOnly ? "状态已核实" : result,
                        note: note.trim(),
                        by: who,
                        issueIds: pickedIds,
                      });
                      setPicked([]);
                      setNote("");
                      toast.success(`已登记 ${pickedIds.length} 项处置记录`);
                    }}
                  >
                    登记处理
                  </Button>
                  <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    登记结果会写入该账号的「状态与处置记录」时间线，全部事项闭环后账号变为「已处理」。
                  </p>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
