import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import {
  ACCOUNT_STATUS_META,
  type AccountStatus,
} from "@/lib/managed-account-mock";
import {
  HANDLE_METHODS,
  HANDLE_RESULTS,
  PLATFORM_STATUS_MAP,
  STATUS_EXPLAIN,
  STATUS_ORDER,
  healthActions,
  type AccountHealthRecord,
  type HandleMethod,
  type HandleResult,
  type HandleState,
  HANDLE_STATE_LABEL,
  HANDLE_STATE_CLS,
} from "@/lib/account-health-mock";

function FormItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/**
 * 人工确认 + 登记处理合并弹窗
 * - 单个账号：展示当前状态（只读），可人工确认状态（默认同当前状态），并登记处理
 * - 批量：仅登记处理
 */
export function HandleDialog({
  recs,
  onClose,
}: {
  recs: AccountHealthRecord[] | null;
  onClose: (done?: boolean) => void;
}) {
  const single = recs && recs.length === 1 ? recs[0] : null;
  const [state, setState] = useState<HandleState>("done");
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [method, setMethod] = useState<HandleMethod | null>(null);
  const [result, setResult] = useState<HandleResult | null>(null);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string[] | null>(null);
  const who = getCurrentUser()?.displayName ?? "当前用户";

  if (!recs) return null;
  if (recs.length === 0) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>无可处理账号</DialogTitle>
            <DialogDescription>
              所选账号均无需人工介入（仅「待确认」「功能受限」「风控」「登录失败」状态需要人工确认/处理）。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onClose()}>知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const curStatus = single?.status ?? "normal";
  // 人工确认状态默认与当前账号状态一致
  const confirmStatusValue = status ?? curStatus;
  const defaultMethod: HandleMethod =
    single && single.status === "pending" ? "确认账号状态" : "发起申诉";
  const methodValue = method ?? defaultMethod;
  const isConfirmOnly = methodValue === "确认账号状态";
  const defaultResult: HandleResult = isConfirmOnly ? "状态已核实" : "已恢复";
  const resultValue = isConfirmOnly ? "状态已核实" : (result ?? defaultResult);
  const pickedIds =
    picked ??
    (single ? single.issues.filter((it) => it.state !== "done").map((it) => it.id) : []);
  const platformStatus = single
    ? PLATFORM_STATUS_MAP[confirmStatusValue][single.platform]
    : "";


  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>确认 / 登记人工处理</DialogTitle>
          <DialogDescription>
            {single
              ? `${single.username}（${single.platformId}）· ${single.platform}`
              : `共 ${recs.length} 个需人工确认/处理的账号`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {single && (
            <>
              <FormItem label="当前账号状态">
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <span>{ACCOUNT_STATUS_META[curStatus].label}</span>
                  <span className="text-xs text-muted-foreground">
                    {single.platform} 平台侧：{single.platformStatus}
                  </span>
                </div>
              </FormItem>
              <FormItem label="人工确认账号状态 *">
                <Select
                  value={confirmStatusValue}
                  onValueChange={(v) => setStatus(v as AccountStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ACCOUNT_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
              {single.issues.length > 0 && (
                <FormItem label={`本次处理的待处理事项 *（共 ${single.issues.length} 项）`}>
                  <div className="space-y-2 rounded-md border p-3">
                    {single.issues.map((it) => {
                      const checked = pickedIds.includes(it.id);
                      return (
                        <label
                          key={it.id}
                          className="flex cursor-pointer items-start gap-2 text-sm"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={checked}
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
                            <Badge
                              variant="outline"
                              className={cn("ml-2 text-[11px]", HANDLE_STATE_CLS[it.state])}
                            >
                              {HANDLE_STATE_LABEL[it.state]}
                            </Badge>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {it.desc}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    同一状态下可能存在多个受限项，可分次处置；全部事项闭环后账号才会变为「已处理」。
                  </p>
                </FormItem>
              )}
            </>
          )}
          <FormItem label="处理状态 *">
            <Select value={state} onValueChange={(v) => setState(v as HandleState)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doing">处理中</SelectItem>
                <SelectItem value="done">已处理</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem label="处理方式 *">
            <Select
              value={methodValue}
              onValueChange={(v) => setMethod(v as HandleMethod)}
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
          </FormItem>
          <FormItem label="处理结果 *">
            <Select
              value={resultValue}
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
            {isConfirmOnly && (
              <p className="mt-1 text-xs text-muted-foreground">
                处理方式为「确认账号状态」时，结果固定为「状态已核实」，状态变更会自动写入时间线。
              </p>
            )}
          </FormItem>

          <FormItem label="处理说明">
            <Textarea
              rows={3}
              placeholder="如：已提交身份验证，等待平台审核 / 已核实平台真实状态"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormItem>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            取消
          </Button>
          <Button
            onClick={() => {
              // 单个账号：状态有变化或处理方式为「确认账号状态」时，先写入人工确认
              if (
                single &&
                (confirmStatusValue !== single.status ||
                  methodValue === "确认账号状态")
              ) {
                healthActions.confirmStatus(single.accountId, {
                  status: confirmStatusValue,
                  platformStatus,
                  note: note.trim() || STATUS_EXPLAIN[confirmStatusValue],
                  by: who,
                });
              }
              healthActions.registerHandling(
                recs.map((r) => r.accountId),
                {
                  handleState: state,
                  method: methodValue,
                  result: resultValue,
                  note: note.trim(),
                  by: who,
                  ...(single && single.issues.length > 0
                    ? { issueIds: pickedIds }
                    : {}),
                },
              );
              toast.success(
                single && single.issues.length > 0
                  ? `已登记 ${pickedIds.length} 项待处理事项的处置记录`
                  : `已登记 ${recs.length} 个账号的确认/处理记录`,
              );
              onClose(true);
            }}
          >
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 状态与处置记录时间线抽屉 */
export function TimelineSheet({
  rec,
  onClose,
}: {
  rec: AccountHealthRecord | null;
  onClose: () => void;
}) {
  if (!rec) return null;
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:max-w-md">
        <SheetHeader>
          <SheetTitle>状态与处置记录</SheetTitle>
          <SheetDescription>
            {rec.username}（{rec.platformId}）· {rec.platform}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {rec.timeline.map((t, i) => (
            <div key={i} className="relative pl-6">
              <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
              {i < rec.timeline.length - 1 && (
                <span className="absolute left-[3px] top-4 h-full w-px bg-border" />
              )}
              <p className="text-sm">{t.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.at} · {t.by}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
