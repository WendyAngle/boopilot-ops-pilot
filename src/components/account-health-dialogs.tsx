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
  recommendMethods,
  type AccountHealthRecord,
  type HandleMethod,
  type HandleResult,
  type HandleState,
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

/** 人工确认账号状态 */
export function ConfirmStatusDialog({
  rec,
  onClose,
}: {
  rec: AccountHealthRecord | null;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AccountStatus>("normal");
  const [note, setNote] = useState("");
  const who = getCurrentUser()?.displayName ?? "当前用户";
  if (!rec) return null;
  const platformStatus = PLATFORM_STATUS_MAP[status][rec.platform];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>人工确认账号状态</DialogTitle>
          <DialogDescription>
            {rec.username}（{rec.platformId}）· {rec.platform}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormItem label="确认状态 *">
            <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.filter((s) => s !== "pending").map((s) => (
                  <SelectItem key={s} value={s}>
                    {ACCOUNT_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            平台侧状态：<span className="text-foreground">{platformStatus}</span>
            <br />
            {STATUS_EXPLAIN[status]}
          </div>
          <FormItem label="状态说明 *">
            <Textarea
              rows={3}
              placeholder="如：功能受限-不可发帖"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormItem>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={!note.trim()}
            onClick={() => {
              healthActions.confirmStatus(rec.accountId, {
                status,
                platformStatus,
                note: note.trim(),
                by: who,
              });
              toast.success("已人工确认账号状态");
              onClose();
            }}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 登记人工处理（支持批量） */
export function HandleDialog({
  recs,
  onClose,
}: {
  recs: AccountHealthRecord[] | null;
  onClose: (done?: boolean) => void;
}) {
  const [state, setState] = useState<HandleState>("done");
  const [method, setMethod] = useState<HandleMethod>("发起申诉");
  const [result, setResult] = useState<HandleResult>("已恢复");
  const [note, setNote] = useState("");
  const who = getCurrentUser()?.displayName ?? "当前用户";
  if (!recs) return null;
  if (recs.length === 0) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>无可处理账号</DialogTitle>
            <DialogDescription>
              所选账号均无需人工介入（仅「功能受限」「风控」状态需要人工处理）。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onClose()}>知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  const single = recs.length === 1 ? recs[0] : null;
  const recommended = single ? recommendMethods(single.platform, single.status) : [];
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>登记人工处理</DialogTitle>
          <DialogDescription>
            {single
              ? `${single.username}（${single.platformId}）· ${single.platformStatus}`
              : `共 ${recs.length} 个需人工介入的账号`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {recommended.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              建议恢复方式：
              <span className="text-foreground">{recommended.join(" / ")}</span>
            </div>
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
            <Select value={method} onValueChange={(v) => setMethod(v as HandleMethod)}>
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
            <Select value={result} onValueChange={(v) => setResult(v as HandleResult)}>
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
          </FormItem>
          <FormItem label="处理说明">
            <Textarea
              rows={3}
              placeholder="如：已提交身份验证，等待平台审核"
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
              healthActions.registerHandling(
                recs.map((r) => r.accountId),
                { handleState: state, method, result, note: note.trim(), by: who },
              );
              toast.success(`已登记 ${recs.length} 个账号的处理记录`);
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
