import { History, ShieldAlert, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCOUNT_STATUS_META } from "@/lib/managed-account-mock";
import {
  useAccountHealth,
  MARK_SOURCE_LABEL,
  HANDLE_STATE_LABEL,
  HANDLE_STATE_CLS,
} from "@/lib/account-health-mock";

/** 账号详情页「状态记录」时间线，与账号健康看板共用同一份数据 */
export function AccountStatusTimeline({ accountId }: { accountId: string }) {
  const records = useAccountHealth();
  const record = records.find((r) => r.accountId === accountId);

  if (!record) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
        暂无状态记录
      </div>
    );
  }

  const statusMeta = ACCOUNT_STATUS_META[record.status];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            当前系统登记状态
          </div>
          <Badge variant="outline" className={cn("text-xs", statusMeta.cls)}>
            {statusMeta.label}
          </Badge>

          <span className="text-xs text-muted-foreground">
            平台账号状态：{record.platformStatus}
          </span>
          <Badge variant="outline" className="text-[11px]">
            {MARK_SOURCE_LABEL[record.markSource]}
          </Badge>
          {record.needsManual && (
            <Badge
              variant="outline"
              className={cn("text-[11px]", HANDLE_STATE_CLS[record.handleState])}
            >
              {HANDLE_STATE_LABEL[record.handleState]}
            </Badge>
          )}
          <Button asChild size="sm" variant="ghost" className="ml-auto h-8 gap-1 text-xs">
            <Link to="/accounts/health">
              前往健康看板处置
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="状态说明" value={record.statusNote} />
          <Field label="标记时间" value={record.markedAt} />
          <Field label="处理方式" value={record.handleMethod ?? "-"} />
          <Field label="处理结果" value={record.handleResult ?? "-"} />
          <Field label="处理人" value={record.handler ?? "-"} />
          <Field label="处理时间" value={record.handledAt ?? "-"} />
        </dl>

        {record.issues.length > 0 && (
          <div className="mt-4 rounded-lg border p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              待处理事项（{record.issues.filter((i) => i.state !== "done").length}/
              {record.issues.length} 未闭环）
            </div>
            <div className="space-y-2">
              {record.issues.map((it) => (
                <div key={it.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{it.scope}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[11px]", HANDLE_STATE_CLS[it.state])}
                    >
                      {HANDLE_STATE_LABEL[it.state]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{it.desc}</span>
                  </div>
                  {it.method && (
                    <div className="text-xs text-muted-foreground">
                      {it.method} · {it.result} · {it.handler} · {it.handledAt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-muted-foreground" />
          状态变更时间线
        </div>
        <ol className="relative space-y-5 border-l border-border/70 pl-5">
          {[...record.timeline].reverse().map((item, i) => (
            <li key={`${item.at}-${i}`} className="relative">
              <span
                className={cn(
                  "absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card",
                  i === 0 ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
              <div className="text-sm">{item.text}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.at} · {item.by}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
