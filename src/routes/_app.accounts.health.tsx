import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarIcon,
  CheckCircle2,
  Clock,
  Power,
  ShieldAlert,
  ShieldCheck,
  Users2,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { useTenantScope } from "@/lib/tenant-scope";
import {
  ACCOUNT_STATUS_META,
  PLATFORMS,
  PLATFORM_META,
  type AccountStatus,
  type Platform,
} from "@/lib/managed-account-mock";
import {
  RANGE_LABEL,
  STATUS_COLOR,
  STATUS_ORDER,
  buildTrend,
  daysOfRange,
  useAccountHealth,
  type TrendRange,
} from "@/lib/account-health-mock";

export const Route = createFileRoute("/_app/accounts/health")({
  component: AccountHealthPage,
  head: () => ({
    meta: [
      { title: "账号健康看板 — BooPilot" },
      {
        name: "description",
        content:
          "监控各社媒平台账号状态分布与变化趋势，跟踪功能受限、风控账号的人工处置进展。",
      },
      { property: "og:title", content: "账号健康看板 — BooPilot" },
      {
        property: "og:description",
        content: "账号状态统计与趋势分析看板，处置操作在账号列表中完成。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});


function AccountHealthPage() {
  const records = useAccountHealth();
  const [scope] = useTenantScope();
  const allowed = getCurrentUser()?.allowedTenantNames;

  const scoped = useMemo(
    () =>
      records.filter(
        (r) =>
          (scope === "all" || r.tenantId === scope) &&
          (!allowed || allowed.includes(r.tenantName)),
      ),
    [records, scope, allowed],
  );

  /* ---- 趋势 ---- */
  const [range, setRange] = useState<TrendRange>("7d");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const days = daysOfRange(
    range,
    from ? format(from, "yyyy-MM-dd") : undefined,
    to ? format(to, "yyyy-MM-dd") : undefined,
  );
  const trend = useMemo(() => buildTrend(scoped, days), [scoped, days]);

  const [platformTab, setPlatformTab] = useState<Platform>("Facebook");
  const platformRecords = useMemo(
    () => scoped.filter((r) => r.platform === platformTab),
    [scoped, platformTab],
  );
  const platformTrend = useMemo(
    () => buildTrend(platformRecords, days, PLATFORMS.indexOf(platformTab) + 1),
    [platformRecords, days, platformTab],
  );


  const stats = useMemo(() => {
    const c = (s: AccountStatus) => scoped.filter((r) => r.status === s).length;
    return {
      total: scoped.length,
      pending: c("pending"),
      normal: c("normal"),
      disabled: c("disabled"),
      risk: c("risk"),
      fail: c("fail"),
      todo: scoped.filter((r) => r.needsManual && r.handleState !== "done").length,
    };
  }, [scoped]);


  return (
    <>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
            <Link to="/accounts/managed">
              <ArrowLeft className="h-4 w-4" />
              返回账号列表
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">账号健康看板</h1>
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/10 text-primary"
            >
              <ShieldAlert className="mr-1 h-3 w-3" />
              状态监控
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            汇总各平台账号状态分布与变化趋势；功能受限、风控账号需人工介入，处置操作统一在「账号列表」中完成并留痕。
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard title="账号总数" value={stats.total} icon={Users2} tone="primary" />
          <StatCard title="正常" value={stats.normal} icon={CheckCircle2} tone="success" />
          <StatCard title="待确认" value={stats.pending} icon={Clock} tone="warning" />
          <StatCard title="功能受限" value={stats.disabled} icon={Power} tone="warning" />
          <StatCard title="风控" value={stats.risk} icon={AlertTriangle} tone="violet" />
          <StatCard title="账号被封" value={stats.fail} icon={XCircle} tone="destructive" />
          <StatCard title="待人工处理" value={stats.todo} icon={ShieldAlert} tone="destructive" />
        </div>

        {/* 时间范围 */}
        <Card className="p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">趋势时间范围</span>
            <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
              {(["7d", "14d", "30d", "custom"] as TrendRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded px-3 py-1 transition-colors",
                    range === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {RANGE_LABEL[r]}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="flex items-center gap-2">
                <DatePick value={from} onChange={setFrom} placeholder="开始日期" />
                <span className="text-muted-foreground">至</span>
                <DatePick value={to} onChange={setTo} placeholder="结束日期" />
                <span className="text-xs text-muted-foreground">共 {days} 天</span>
              </div>
            )}
          </div>
        </Card>

        {/* 状态趋势 */}
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">各状态账号数量变化趋势</h2>
            <span className="text-xs text-muted-foreground">
              {RANGE_LABEL[range]} · {days} 天
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <ReTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                {STATUS_ORDER.map((s) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    name={ACCOUNT_STATUS_META[s].label}
                    stroke={STATUS_COLOR[s]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 平台趋势 */}
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">各平台账号状态变化趋势</h2>
            </div>
            <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformTab(p)}
                  className={cn(
                    "rounded px-3 py-1 transition-colors",
                    platformTab === p
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <ReTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                {STATUS_ORDER.map((s) => (
                  <Area
                    key={s}
                    type="monotone"
                    dataKey={s}
                    name={ACCOUNT_STATUS_META[s].label}
                    stackId="1"
                    stroke={STATUS_COLOR[s]}
                    fill={STATUS_COLOR[s]}
                    fillOpacity={0.25}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 平台 × 状态 当期矩阵 */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">平台</th>
                  {STATUS_ORDER.map((s) => (
                    <th key={s} className="px-3 py-2 text-left font-medium">
                      {ACCOUNT_STATUS_META[s].label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium">合计</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((p) => {
                  const rs = scoped.filter((r) => r.platform === p);
                  return (
                    <tr key={p} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                              PLATFORM_META[p].cls,
                            )}
                          >
                            {PLATFORM_META[p].letter}
                          </span>
                          {p}
                        </span>
                      </td>
                      {STATUS_ORDER.map((s) => (
                        <td key={s} className="px-3 py-2 tabular-nums">
                          {rs.filter((r) => r.status === s).length}
                        </td>
                      ))}
                      <td className="px-3 py-2 font-medium tabular-nums">{rs.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function DatePick({
  value,
  onChange,
  placeholder,
}: {
  value?: Date;
  onChange: (d?: Date) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4" />
          {value ? format(value, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

