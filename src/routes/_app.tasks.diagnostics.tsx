import { useMemo, useState } from "react";
import { useTenantScope } from "@/lib/tenant-scope";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Bug,
  Cpu,
  Download,
  Gauge,
  Globe2,
  ListChecks,
  RotateCcw,
  Search,
  ShieldAlert,
  Target,

  TrendingDown,
  TrendingUp,
  Users2,
  Zap,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { PaginationBar } from "@/components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PLATFORM_CHIP,
  PLATFORMS,
  TASK_CATEGORY_CLS,
  TASK_CATEGORY_LABEL,
  type Platform,
  type TaskCategory,
} from "@/lib/operations-store";
import {
  CAUSE_META,
  CAUSE_ORDER,
  DIAG_CATEGORIES,
  DIM_LABEL,
  EMPTY_FILTER,
  GOAL_RESULT_LABEL,
  HIGH_RISK_RATE,
  KEYWORDS,
  RANGE_LABEL,
  applyScope,
  buildAccountRank,
  buildCauseCluster,
  buildDistribution,
  buildGoalRows,
  buildHiddenRiskTasks,
  buildMachineRank,
  buildProxyRank,
  buildRecoveredCauseCluster,
  buildRecoveredStepDist,
  buildRecoveryModeDist,
  buildTrend,
  computeKpi,
  failuresOf,
  recoveredOf,
  fmtDuration,

  fmtTs,
  getSubTasks,
  filterByTenant,
  type CauseKey,
  type DiagFilter,
  type DimKey,
  type RangeKey,
  type RankRow,
} from "@/lib/task-diagnostics-mock";

export const Route = createFileRoute("/_app/tasks/diagnostics")({
  component: TaskDiagnosticsPage,
  head: () => ({
    meta: [
      { title: "任务诊断中心 — BooPilot" },
      {
        name: "description",
        content:
          "聚合任务、子任务与执行日志，按趋势、原因聚类、账号/代理/执行机维度定位任务失败根因。",
      },
      { property: "og:title", content: "任务诊断中心 — BooPilot" },
      {
        property: "og:description",
        content: "一站式任务失败诊断：宏观趋势 → 失败聚集 → 根因明细。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const PAGE_SIZE = 10;

function rateTone(rate: number) {
  if (rate > 50) return "text-destructive";
  if (rate >= 20) return "text-warning";
  return "text-success";
}

function KpiCard({
  title,
  value,
  unit,
  delta,
  deltaGoodWhenDown = true,
  accent,
}: {
  title: string;
  value: string;
  unit?: string;
  delta?: number;
  deltaGoodWhenDown?: boolean;
  accent?: boolean;
}) {
  const up = (delta ?? 0) > 0;
  const bad = delta === undefined ? false : deltaGoodWhenDown ? up : !up;
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]",
        accent && "border-destructive/40 bg-destructive/5",
      )}
    >
      <p className="truncate text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
        {value}
        {unit && <span className="ml-0.5 text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
      {delta !== undefined && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-[11px]",
            bad ? "text-destructive" : "text-success",
          )}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% 较上一周期
        </p>
      )}
    </div>
  );
}

function MiniStat({ t, v, tone }: { t: string; v: string; tone?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{t}</p>
      <p className={cn("text-lg font-semibold tabular-nums", tone)}>{v}</p>
    </div>
  );
}

function SectionHead({
  icon: Icon,
  title,
  sub,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function RankTable({
  rows,
  keyHeader,
  extraHeader,
  extra2Header,
  statusHeader,
  onPick,
  activeKey,
}: {
  rows: RankRow[];
  keyHeader: string;
  extraHeader: string;
  extra2Header?: string;
  statusHeader?: string;
  onPick: (key: string) => void;
  activeKey?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">{keyHeader}</th>
            <th className="px-3 py-2 text-left font-medium">{extraHeader}</th>
            {extra2Header && <th className="px-3 py-2 text-left font-medium">{extra2Header}</th>}
            <th className="px-3 py-2 text-right font-medium">执行子任务数</th>
            <th className="px-3 py-2 text-right font-medium">成功</th>
            <th className="px-3 py-2 text-right font-medium">失败</th>
            <th className="px-3 py-2 text-right font-medium">失败率</th>
            <th className="px-3 py-2 text-left font-medium">主要失败原因</th>
            {statusHeader && <th className="px-3 py-2 text-left font-medium">{statusHeader}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                当前筛选条件下暂无数据
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const risky = r.failRate > HIGH_RISK_RATE && r.failed >= 3;
            return (
              <tr
                key={r.key}
                onClick={() => onPick(r.key)}
                className={cn(
                  "cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40",
                  activeKey === r.key && "bg-primary/5",
                )}
              >
                <td className="px-3 py-2">
                  <span className="font-medium">{r.key}</span>
                  {risky && (
                    <Badge variant="outline" className="ml-2 border-destructive/40 bg-destructive/10 text-[10px] text-destructive">
                      高危
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.extra}</td>
                {extra2Header && <td className="px-3 py-2 text-muted-foreground">{r.extra2 ?? "-"}</td>}
                <td className="px-3 py-2 text-right tabular-nums">{r.total}</td>
                <td className="px-3 py-2 text-right tabular-nums text-success">{r.success}</td>
                <td className="px-3 py-2 text-right tabular-nums text-destructive">{r.failed}</td>
                <td className={cn("px-3 py-2 text-right font-medium tabular-nums", rateTone(r.failRate))}>
                  {r.failRate.toFixed(1)}%
                </td>
                <td className="px-3 py-2">
                  {r.topCause ? (
                    <Badge variant="outline" className="text-[10px]">
                      {CAUSE_META[r.topCause].label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                {statusHeader && (
                  <td className="px-3 py-2 text-muted-foreground">{r.status ?? "-"}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TaskDiagnosticsPage() {
  const [filter, setFilter] = useState<DiagFilter>(EMPTY_FILTER);
  const [dim, setDim] = useState<DimKey>("category");
  const [anomalyTab, setAnomalyTab] = useState<"account" | "proxy" | "machine">("account");
  const [page, setPage] = useState(1);
  const [detailType, setDetailType] = useState<"all" | "failed" | "recovered">("all");
  const [showFailed, setShowFailed] = useState(true);
  const [showRate, setShowRate] = useState(true);
  const [viewAll, setViewAll] = useState<null | "account" | "proxy" | "machine" | "goal">(null);
  const [viewAllSearch, setViewAllSearch] = useState("");
  const [viewAllPlatform, setViewAllPlatform] = useState("all");
  const openViewAll = (v: "account" | "proxy" | "machine" | "goal") => {
    setViewAllSearch("");
    setViewAllPlatform("all");
    setViewAll(v);
  };

  const [tenantScope] = useTenantScope();
  const all = useMemo(() => filterByTenant(getSubTasks(), tenantScope), [tenantScope]);
  const patch = (p: Partial<DiagFilter>) => {
    setFilter((f) => ({ ...f, ...p }));
    setPage(1);
  };

  const scoped = useMemo(() => applyScope(all, filter), [all, filter]);
  const prev = useMemo(() => applyScope(all, filter, 1), [all, filter]);
  const failed = useMemo(() => failuresOf(scoped, filter), [scoped, filter]);

  const kpi = useMemo(() => computeKpi(scoped, filter), [scoped, filter]);
  const kpiPrev = useMemo(() => computeKpi(prev, filter), [prev, filter]);
  const trend = useMemo(() => buildTrend(scoped, filter), [scoped, filter]);
  const dist = useMemo(() => buildDistribution(failed, dim), [failed, dim]);
  const causes = useMemo(() => buildCauseCluster(failed), [failed]);
  const accountRank = useMemo(() => buildAccountRank(scoped, filter), [scoped, filter]);
  const proxyRank = useMemo(() => buildProxyRank(scoped, filter), [scoped, filter]);
  const machineRank = useMemo(() => buildMachineRank(scoped, filter), [scoped, filter]);
  const goals = useMemo(() => buildGoalRows(scoped, filter), [scoped, filter]);
  // 过程异常但最终成功（隐性风险）
  const recovered = useMemo(() => recoveredOf(scoped, filter), [scoped, filter]);
  const recoveredCauses = useMemo(() => buildRecoveredCauseCluster(recovered), [recovered]);
  const recoveryModes = useMemo(() => buildRecoveryModeDist(recovered), [recovered]);
  const recoveredSteps = useMemo(() => buildRecoveredStepDist(recovered), [recovered]);
  const hiddenTasks = useMemo(() => buildHiddenRiskTasks(scoped, filter), [scoped, filter]);


  const pctDelta = (cur: number, before: number) =>
    before === 0 ? (cur === 0 ? 0 : 100) : ((cur - before) / before) * 100;

  // 智能诊断摘要
  const summary = useMemo(() => {
    const topPlatform = buildDistribution(failed, "platform", 1)[0];
    const topCategory = buildDistribution(failed, "category", 1)[0];
    const topCause = causes[0];
    const topStep = buildDistribution(failed, "step", 1)[0];
    return { topPlatform, topCategory, topCause, topStep };
  }, [failed, causes]);

  // 失败明细：最终失败 + 过程异常但最终成功
  const detailRows = useMemo(() => {
    const rows =
      detailType === "failed" ? failed
      : detailType === "recovered" ? recovered
      : [...failed, ...recovered].sort((a, b) => b.ts - a.ts);
    return rows;
  }, [detailType, failed, recovered]);
  const pagedFailures = detailRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(detailRows.length / PAGE_SIZE));

  const drillTags = [
    filter.step && { label: `执行步骤：${filter.step}`, clear: () => patch({ step: undefined }) },
    filter.logSource && { label: `日志来源：${filter.logSource}`, clear: () => patch({ logSource: undefined }) },
    filter.action && { label: `动作类型：${filter.action}`, clear: () => patch({ action: undefined }) },
    filter.proxyIp && { label: `代理：${filter.proxyIp}`, clear: () => patch({ proxyIp: undefined }) },
    filter.machine && { label: `执行机：${filter.machine}`, clear: () => patch({ machine: undefined }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const exportReport = () => {
    const head = [
      "子任务ID", "任务名称", "业务类型", "平台", "账号", "动作", "执行步骤",
      "日志来源", "失败原因分类", "失败摘要", "日志级别", "耗时(秒)", "重试次数",
      "代理IP", "执行机", "失败时间",
    ];
    const lines = failed.map((r) =>
      [
        r.id, r.taskName, TASK_CATEGORY_LABEL[r.category], r.platform, r.account, r.action,
        r.step, r.logSource, r.cause ? CAUSE_META[r.cause].label : "", r.causeText,
        r.level, r.durationSec, r.retries, r.proxyIp, r.machine, fmtTs(r.ts),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + [head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `任务诊断报告_${RANGE_LABEL[filter.range]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`已导出 ${failed.length} 条失败明细`);
  };

  const exportViewAll = () => {
    if (!viewAll) return;
    const downloadCsv = (name: string, head: string[], lines: string[], count: number) => {
      const blob = new Blob(["\uFEFF" + [head.join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`已导出 ${count} 条数据`);
    };
    const q = viewAllSearch.trim().toLowerCase();
    if (viewAll === "goal") {
      const rows = goals.filter((g) => {
        if (viewAllPlatform !== "all" && g.platform !== viewAllPlatform) return false;
        if (!q) return true;
        return [g.taskName, g.goalType, TASK_CATEGORY_LABEL[g.category]]
          .some((v) => String(v).toLowerCase().includes(q));
      });
      const head = ["任务名称", "业务类型", "平台", "目标类型", "目标总量", "已完成", "失败", "过程异常但成功", "执行中", "完成率", "任务结果"];
      const lines = rows.map((g) =>
        [g.taskName, TASK_CATEGORY_LABEL[g.category], g.platform, g.goalType, g.goalTotal, g.done, g.failed, g.recovered, g.running, `${g.rate.toFixed(0)}%`, GOAL_RESULT_LABEL[g.result]]

          .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      );
      downloadCsv("父任务目标完成度.csv", head, lines, rows.length);
    } else {
      const p = rankProps[viewAll];
      const extra2Header = "extra2Header" in p ? p.extra2Header : undefined;
      const statusHeader = "statusHeader" in p ? p.statusHeader : undefined;
      const rows = p.rows.filter((r) => {
        if (viewAll === "account" && viewAllPlatform !== "all" && r.extra !== viewAllPlatform) return false;
        if (!q) return true;
        const fields = viewAll === "account" ? [r.key] : [r.key, r.extra, r.extra2 ?? "", r.status ?? ""];
        return fields.some((v) => String(v).toLowerCase().includes(q));
      });
      const head = [p.keyHeader, p.extraHeader, ...(extra2Header ? [extra2Header] : []),
        "执行子任务数", "成功", "失败", "失败率", "主要失败原因", ...(statusHeader ? [statusHeader] : [])];
      const lines = rows.map((r) =>
        [r.key, r.extra, ...(extra2Header ? [r.extra2 ?? ""] : []),
          r.total, r.success, r.failed, `${r.failRate.toFixed(1)}%`, r.topCause ? CAUSE_META[r.topCause].label : "", ...(statusHeader ? [r.status ?? ""] : [])]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      );
      downloadCsv(`${viewAll === "account" ? "账号异常统计" : viewAll === "proxy" ? "代理异常统计" : "执行机异常统计"}.csv`, head, lines, rows.length);
    }
  };

  const rankProps = {
    account: {
      rows: accountRank,
      keyHeader: "账号",
      extraHeader: "平台",
      onPick: (k: string) => patch({ account: k }),
      activeKey: filter.account,
    },
    proxy: {
      rows: proxyRank,
      keyHeader: "代理 IP",
      extraHeader: "国家/地区",
      extra2Header: "延迟",
      statusHeader: "代理当前状态",
      onPick: (k: string) => patch({ proxyIp: filter.proxyIp === k ? undefined : k }),
      activeKey: filter.proxyIp,
    },
    machine: {
      rows: machineRank,
      keyHeader: "执行机",
      extraHeader: "类型",
      extra2Header: "IP",
      statusHeader: "执行机状态",
      onPick: (k: string) => patch({ machine: filter.machine === k ? undefined : k }),
      activeKey: filter.machine,
    },
  } as const;

  const highRisk = (rows: RankRow[]) =>
    rows.filter((r) => r.failRate > HIGH_RISK_RATE && r.failed >= 3).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5 p-6">
        <div>
          <h1 className="text-xl font-semibold">任务诊断中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            聚合任务 / 子任务 / 执行日志，按「宏观趋势 → 失败聚集 → 根因明细」定位失败原因。
          </p>
        </div>

        {/* 筛选栏 */}
        <Card className="sticky top-2 z-20 p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">时间范围</Label>
              <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
                {(["24h", "7d", "30d"] as RangeKey[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => patch({ range: r })}
                    className={cn(
                      "rounded px-3 py-1 transition-colors",
                      filter.range === r
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-40 space-y-1.5">
              <Label className="text-xs text-muted-foreground">业务类型</Label>
              <Select
                value={filter.category}
                onValueChange={(v) => patch({ category: v as TaskCategory | "all" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {DIAG_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{TASK_CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40 space-y-1.5">
              <Label className="text-xs text-muted-foreground">平台</Label>
              <Select
                value={filter.platform}
                onValueChange={(v) => patch({ platform: v as Platform | "all" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-52 space-y-1.5">
              <Label className="text-xs text-muted-foreground">账号 / 子任务ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="搜索账号或子任务ID"
                  value={filter.account}
                  onChange={(e) => patch({ account: e.target.value })}
                />
              </div>
            </div>

            <div className="w-44 space-y-1.5">
              <Label className="text-xs text-muted-foreground">失败原因分类</Label>
              <Select
                value={filter.cause}
                onValueChange={(v) => patch({ cause: v as CauseKey | "all" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部原因</SelectItem>
                  {CAUSE_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>{CAUSE_META[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => { setFilter(EMPTY_FILTER); setPage(1); }}>
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
              <Button onClick={exportReport}>
                <Download className="h-4 w-4" />
                导出报告
              </Button>
            </div>
          </div>

          {drillTags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">下钻条件：</span>
              {drillTags.map((t) => (
                <Badge
                  key={t.label}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={t.clear}
                >
                  {t.label} ✕
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
          <KpiCard
            title="子任务总数"
            value={kpi.subTotal.toLocaleString()}
            delta={pctDelta(kpi.subTotal, kpiPrev.subTotal)}
            deltaGoodWhenDown={false}
          />
          <KpiCard
            title="失败子任务数"
            value={kpi.failed.toLocaleString()}
            delta={pctDelta(kpi.failed, kpiPrev.failed)}
            accent
          />
          <KpiCard
            title="失败率（失败/已终态）"
            value={kpi.failRate.toFixed(1)}
            unit="%"
            delta={pctDelta(kpi.failRate, kpiPrev.failRate)}
          />
          <KpiCard
            title="部分成功任务数"
            value={String(kpi.partialTasks)}
            delta={pctDelta(kpi.partialTasks, kpiPrev.partialTasks)}
          />
          <KpiCard
            title="过程异常但成功"
            value={kpi.recovered.toLocaleString()}
            delta={pctDelta(kpi.recovered, kpiPrev.recovered)}
          />
          <KpiCard
            title="隐性异常率（异常成功/成功）"
            value={kpi.recoveredRate.toFixed(1)}
            unit="%"
            delta={pctDelta(kpi.recoveredRate, kpiPrev.recoveredRate)}
          />
          <KpiCard
            title="平均耗时"
            value={fmtDuration(kpi.avgDurationSec)}
            delta={pctDelta(kpi.avgDurationSec, kpiPrev.avgDurationSec)}
          />
          <KpiCard
            title="重试率"
            value={kpi.retryRate.toFixed(1)}
            unit="%"
            delta={pctDelta(kpi.retryRate, kpiPrev.retryRate)}
          />
        </div>


        {/* 智能诊断摘要 */}
        <Card className="border-primary/30 bg-primary/5 p-5">
          <SectionHead icon={Zap} title="智能诊断摘要" sub={`基于当前筛选范围（${RANGE_LABEL[filter.range]}）自动生成`} />
          {failed.length === 0 ? (
            <p className="text-sm text-muted-foreground">当前筛选范围内没有失败子任务，任务执行健康。</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed">
                {RANGE_LABEL[filter.range]}共有 <b>{kpi.subTotal.toLocaleString()}</b> 个子任务执行，
                其中 <b className="text-destructive">{kpi.failed}</b> 个失败，失败率{" "}
                <b className={rateTone(kpi.failRate)}>{kpi.failRate.toFixed(1)}%</b>。
                失败主要集中在 <b>{summary.topPlatform?.name}</b> 平台（占 {summary.topPlatform?.pct.toFixed(0)}%）的{" "}
                <b>{summary.topCategory ? TASK_CATEGORY_LABEL[summary.topCategory.name as TaskCategory] : "-"}</b>；
                Top 失败原因为 <b>{summary.topCause?.label}</b>（占 {summary.topCause?.pct.toFixed(0)}%），
                典型发生在 <b>{summary.topStep?.name}</b> 步骤。
                {kpi.recovered > 0 && (
                  <>
                    {" "}另有 <b className="text-warning">{kpi.recovered}</b> 个子任务最终成功，但过程中出现过{" "}
                    <b className="text-warning">{kpi.recoveredStepFails}</b> 次失败的动作/步骤
                    （隐性异常率 {kpi.recoveredRate.toFixed(1)}%），涉及{" "}
                    <b>{kpi.hiddenRiskTasks}</b> 个最终判定成功的父任务，建议一并复盘。
                  </>
                )}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {causes.slice(0, 3).map((c, i) => (
                  <div key={c.key} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">问题 {i + 1}</Badge>
                      <span className="text-sm font-medium">{c.label}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      证据：{c.value} 条失败（{c.pct.toFixed(0)}%），关键词 {c.keywords}
                    </p>
                    <p className="mt-1.5 text-xs">建议：{c.advice}</p>
                    <Button
                      variant="link"
                      className="mt-1 h-auto p-0 text-xs"
                      onClick={() => patch({ cause: c.key })}
                    >
                      查看相关明细 →
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* 趋势 + 原因聚类 */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="flex flex-col p-5 shadow-[var(--shadow-card)]">
            <SectionHead
              icon={Activity}
              title="失败趋势"
              sub={`失败子任务数 vs 失败率（${filter.range === "24h" ? "按小时" : filter.range === "7d" ? "按天" : "按周"}）`}
              right={
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={showFailed}
                      onCheckedChange={(v) => {
                        const next = v === true;
                        if (!next && !showRate) return;
                        setShowFailed(next);
                      }}
                    />
                    <span className="inline-block h-2 w-2 rounded-sm bg-destructive" />
                    失败数
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={showRate}
                      onCheckedChange={(v) => {
                        const next = v === true;
                        if (!next && !showFailed) return;
                        setShowRate(next);
                      }}
                    />
                    <span className="inline-block h-2 w-2 rounded-sm bg-primary" />
                    失败率
                  </label>
                </div>
              }
            />
            <div className="min-h-64 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  {showFailed && (
                    <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  )}
                  {showRate && (
                    <YAxis
                      yAxisId="r"
                      orientation={showFailed ? "right" : "left"}
                      unit="%"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                  )}
                  <ReTooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  {showFailed && (
                    <Bar yAxisId="l" dataKey="failed" name="失败子任务数" fill="var(--destructive)" radius={[4, 4, 0, 0]} barSize={18} />
                  )}
                  {showRate && (
                    <Line yAxisId="r" type="monotone" dataKey="rate" name="失败率(%)" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>


          <Card className="p-5 shadow-[var(--shadow-card)]">
            <SectionHead icon={Bug} title="失败原因聚类" sub="规则词典自动归类，点击分类下钻过滤" />
            <div className="space-y-2">
              {causes.map((c) => (
                <button
                  key={c.key}
                  onClick={() => patch({ cause: filter.cause === c.key ? "all" : c.key })}
                  className={cn(
                    "w-full rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/50",
                    filter.cause === c.key && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {c.value} · {c.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </button>
              ))}
              {causes.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无失败数据</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-3">
              <span className="mr-1 text-xs text-muted-foreground">高频关键词</span>
              {KEYWORDS.map((k) => (
                <Badge
                  key={k.word}
                  variant={k.hot ? "default" : "secondary"}
                  className="cursor-default text-[11px]"
                >
                  {k.word}
                </Badge>
              ))}
            </div>
          </Card>
        </div>

        {/* 失败分布分析 */}
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <SectionHead
            icon={Gauge}
            title="失败分布分析"
            sub="点击条目可作为下钻条件注入筛选，下方原因聚类与明细列表联动"
            right={
              <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1 text-xs">
                {(Object.keys(DIM_LABEL) as DimKey[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDim(d)}
                    className={cn(
                      "rounded px-3 py-1 transition-colors",
                      dim === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {DIM_LABEL[d]}
                  </button>
                ))}
              </div>
            }
          />
          <div className="space-y-2.5">
            {dist.map((d, i) => {
              const label =
                dim === "category" ? TASK_CATEGORY_LABEL[d.name as TaskCategory] : d.name;
              return (
                <button
                  key={d.name}
                  className="group w-full text-left"
                  onClick={() => {
                    if (dim === "category") patch({ category: d.name as TaskCategory });
                    else if (dim === "platform") patch({ platform: d.name as Platform });
                    else if (dim === "account") patch({ account: d.name });
                    else if (dim === "step") patch({ step: d.name });
                    else if (dim === "logSource") patch({ logSource: d.name });
                    else patch({ action: d.name });
                  }}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={cn("font-medium", i === 0 && "text-destructive")}>{label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {d.value} 条 · {d.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        i === 0 ? "bg-destructive" : "bg-primary/60 group-hover:bg-primary",
                      )}
                      style={{ width: `${dist[0] ? (d.value / dist[0].value) * 100 : 0}%` }}
                    />
                  </div>
                </button>
              );
            })}
            {dist.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无失败数据</p>
            )}
          </div>
        </Card>

        {/* 过程异常但最终成功（隐性风险） */}
        <Card className="border-warning/40 bg-warning/5 p-5 shadow-[var(--shadow-card)]">
          <SectionHead
            icon={ShieldAlert}
            title="过程异常但最终成功"
            sub="任务/子任务最终状态为成功，但执行过程中出现过失败的动作或步骤（自动重试、降级或换资源后跑通），属于易被忽略的隐性风险"
          />

          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <MiniStat t="过程异常成功子任务" v={kpi.recovered.toLocaleString()} tone="text-warning" />
            <MiniStat t="隐性异常率（异常成功/成功）" v={`${kpi.recoveredRate.toFixed(1)}%`} tone="text-warning" />
            <MiniStat t="过程失败动作/步骤数" v={kpi.recoveredStepFails.toLocaleString()} />
            <MiniStat t="隐性风险父任务数" v={String(kpi.hiddenRiskTasks)} />
          </div>

          {recovered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              当前筛选范围内没有「过程异常但最终成功」的执行记录
            </p>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                  <p className="mb-2.5 text-xs font-medium text-muted-foreground">过程异常原因分布</p>
                  <div className="space-y-2">
                    {recoveredCauses.slice(0, 5).map((c) => (
                      <div key={c.key}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                            {c.label}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {c.value} · {c.pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <p className="mb-2.5 text-xs font-medium text-muted-foreground">高发步骤 Top 6</p>
                  <div className="space-y-2">
                    {recoveredSteps.map((s, i) => (
                      <button
                        key={s.name}
                        className="group w-full text-left"
                        onClick={() => patch({ step: filter.step === s.name ? undefined : s.name })}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn(i === 0 && "font-medium text-warning")}>{s.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {s.value} 次 · {s.pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              i === 0 ? "bg-warning" : "bg-primary/60 group-hover:bg-primary",
                            )}
                            style={{
                              width: `${recoveredSteps[0] ? (s.value / recoveredSteps[0].value) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <p className="mb-2.5 text-xs font-medium text-muted-foreground">恢复方式分布</p>
                  <div className="space-y-2">
                    {recoveryModes.map((m) => (
                      <div key={m.name}>
                        <div className="flex items-center justify-between text-xs">
                          <span>{m.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {m.value} · {m.pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-success/70" style={{ width: `${m.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 border-t pt-2 text-[11px] leading-relaxed text-muted-foreground">
                    建议：优先复盘「自动重试成功」次数偏高的步骤，重试掩盖的瞬时异常若持续恶化，会直接转化为失败任务。
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      {["任务名称", "业务类型", "平台", "子任务数", "过程异常子任务", "过程失败动作数", "隐性异常率", "主要过程异常原因", "最近发生"].map((t) => (
                        <th key={t} className="px-3 py-2 text-left font-medium">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hiddenTasks.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                          当前筛选条件下暂无「最终全部成功但过程有失败」的父任务
                        </td>
                      </tr>
                    )}
                    {hiddenTasks.slice(0, 8).map((t) => (
                      <tr key={t.taskId} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <td className="px-3 py-2">{t.taskName}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={cn("text-[10px]", TASK_CATEGORY_CLS[t.category])}>
                            {TASK_CATEGORY_LABEL[t.category]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={cn("text-[10px]", PLATFORM_CHIP[t.platform])}>
                            {t.platform}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{t.total}</td>
                        <td className="px-3 py-2 tabular-nums text-warning">{t.recovered}</td>
                        <td className="px-3 py-2 tabular-nums text-warning">{t.stepFails}</td>
                        <td className="px-3 py-2 tabular-nums">{t.hiddenRate.toFixed(1)}%</td>
                        <td className="px-3 py-2">
                          {t.topCause ? (
                            <Badge variant="outline" className="text-[10px]">{CAUSE_META[t.topCause].label}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{fmtTs(t.lastTs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hiddenTasks.length > 8 && (
                <p className="mt-2 text-right text-xs text-muted-foreground">
                  共 {hiddenTasks.length} 个隐性风险父任务，当前展示前 8 个
                </p>
              )}
            </>
          )}
        </Card>

        {/* 异常聚集：账号 / 代理 / 执行机 */}

        <Card className="p-5 shadow-[var(--shadow-card)]">
          <SectionHead
            icon={AlertTriangle}
            title="异常聚集分析"
            sub={`按执行时实际使用的资源统计失败集中度，失败率 > ${HIGH_RISK_RATE}% 且失败 ≥ 3 标记高危`}
            right={
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
                  {([
                    ["account", "账号", Users2],
                    ["proxy", "代理", Globe2],
                    ["machine", "执行机", Cpu],
                  ] as const).map(([k, label, Icon]) => (
                    <button
                      key={k}
                      onClick={() => setAnomalyTab(k)}
                      className={cn(
                        "flex items-center gap-1 rounded px-3 py-1 transition-colors",
                        anomalyTab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => openViewAll(anomalyTab)}>
                  查看全部 →
                </Button>
              </div>
            }
          />

          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <MiniStat
              t={anomalyTab === "account" ? "参与执行账号数" : anomalyTab === "proxy" ? "参与执行代理数" : "参与执行执行机数"}
              v={String(rankProps[anomalyTab].rows.length)}
            />
            <MiniStat t="执行子任务总数" v={kpi.subTotal.toLocaleString()} />
            <MiniStat t="失败子任务数" v={String(kpi.failed)} tone="text-destructive" />
            <MiniStat
              t={anomalyTab === "account" ? "疑似风控账号" : anomalyTab === "proxy" ? "高危代理数" : "高危执行机数"}
              v={String(highRisk(rankProps[anomalyTab].rows))}
              tone="text-warning"
            />
          </div>

          <RankTable {...rankProps[anomalyTab]} rows={rankProps[anomalyTab].rows.slice(0, 10)} />
        </Card>

        {/* 父任务目标完成度 */}
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <SectionHead
            icon={Target}
            title="父任务目标完成度"
            sub="每个父任务整体目标达成情况（完成率 < 60% 标红）"
            right={
              <Button variant="link" className="h-auto p-0 text-xs" onClick={() => openViewAll("goal")}>
                查看全部 →
              </Button>
            }
          />
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <MiniStat t="父任务总数" v={String(goals.length)} />
            <MiniStat t="目标总量" v={kpi.subTotal.toLocaleString()} />
            <MiniStat
              t="已完成目标"
              v={goals.reduce((s, g) => s + g.done, 0).toLocaleString()}
              tone="text-success"
            />
            <MiniStat
              t="整体完成率"
              v={`${kpi.subTotal ? ((goals.reduce((s, g) => s + g.done, 0) / kpi.subTotal) * 100).toFixed(1) : "0"}%`}
            />
            <MiniStat t="失败目标" v={String(kpi.failed)} tone="text-destructive" />
            <MiniStat t="过程异常但成功" v={String(kpi.recovered)} tone="text-warning" />
          </div>

          <GoalTable rows={goals.slice(0, 8)} />
        </Card>

        {/* 失败明细列表 */}
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">失败明细列表</h2>
              <span className="text-xs text-muted-foreground">
                含最终失败与「过程异常但最终成功」明细，共 {detailRows.length} 条
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-xs">
              {([
                ["all", `全部 ${failed.length + recovered.length}`],
                ["failed", `最终失败 ${failed.length}`],
                ["recovered", `过程异常但成功 ${recovered.length}`],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { setDetailType(k); setPage(1); }}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition-colors",
                    detailType === k
                      ? "bg-background font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={exportReport}>
              <Download className="h-4 w-4" />
              导出 CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  {["子任务ID", "明细类型", "任务名称", "业务类型", "平台", "账号", "执行步骤", "失败原因", "级别 / 耗时", "失败时间", "操作"].map((t) => (
                    <th key={t} className="px-3 py-2 text-left font-medium">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedFailures.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-12 text-center text-sm text-muted-foreground">
                      当前筛选条件下暂无失败或过程异常明细
                    </td>
                  </tr>
                )}
                {pagedFailures.map((r) => {
                  const isRec = r.state === "success" && r.stepFailures > 0;
                  const dCause = r.cause ?? r.recoveredCause;
                  const dText = r.causeText || r.recoveredText;
                  const dStep = r.cause ? r.step : r.recoveredStep;
                  const dLevel = isRec ? "WARN" : r.level;
                  return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-2">
                      {isRec ? (
                        <Badge variant="outline" className="whitespace-nowrap text-[10px] text-warning">
                          过程异常·已恢复
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="whitespace-nowrap text-[10px] text-destructive">
                          最终失败
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.taskName}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={cn("text-[10px]", TASK_CATEGORY_CLS[r.category])}>
                        {TASK_CATEGORY_LABEL[r.category]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={cn("text-[10px]", PLATFORM_CHIP[r.platform])}>
                        {r.platform}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{r.account}</td>
                    <td className="px-3 py-2 text-muted-foreground">{dStep}</td>
                    <td className="max-w-[280px] px-3 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Badge variant="outline" className={cn("text-[10px]", isRec ? "text-warning" : "text-destructive")}>
                              {dCause ? CAUSE_META[dCause].label : "-"}
                            </Badge>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{dText}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">{dText}{isRec && r.recoveryMode ? `（${r.recoveryMode}）` : ""}</TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={dLevel === "ERROR" ? "text-destructive" : "text-warning"}>{dLevel}</span>
                      <span className="text-muted-foreground"> · {fmtDuration(r.durationSec)}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtTs(r.ts)}</td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.info(`查看子任务 ${r.id} 的执行日志`)}
                      >
                        查看日志
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} totalPages={totalPages} total={failed.length} setPage={setPage} />
        </div>
      </div>

      {/* 查看全部 */}
      <Dialog open={viewAll !== null} onOpenChange={(o) => !o && setViewAll(null)}>
        <DialogContent className="flex h-[85vh] w-[90vw] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6">
            <DialogTitle>
              {viewAll === "goal"
                ? "父任务目标完成度 · 全部"
                : viewAll === "account"
                  ? "账号异常统计 · 全部"
                  : viewAll === "proxy"
                    ? "代理异常统计 · 全部"
                    : "执行机异常统计 · 全部"}
            </DialogTitle>
          </DialogHeader>
          {viewAll && (
            <div className="shrink-0 border-b px-6 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-sm flex-1 min-w-[220px]">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder={
                      viewAll === "goal"
                        ? "搜索任务名称 / 目标类型"
                        : viewAll === "account"
                          ? "搜索账号"
                          : viewAll === "proxy"
                            ? "搜索代理 IP / 国家地区"
                            : "搜索执行机 / 类型 / IP"
                    }
                    value={viewAllSearch}
                    onChange={(e) => setViewAllSearch(e.target.value)}
                  />
                </div>
                {(viewAll === "goal" || viewAll === "account") && (
                  <Select value={viewAllPlatform} onValueChange={setViewAllPlatform}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="平台" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部平台</SelectItem>
                      {(viewAll === "goal"
                        ? [...new Set(goals.map((g) => g.platform))]
                        : [...new Set(accountRank.map((r) => r.extra))]
                      ).map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={exportViewAll}>
                  <Download className="h-3.5 w-3.5" /> 导出
                </Button>
              </div>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
            {viewAll === "goal" ? (
              <GoalTable
                rows={goals.filter((g) => {
                  if (viewAllPlatform !== "all" && g.platform !== viewAllPlatform) return false;
                  const q = viewAllSearch.trim().toLowerCase();
                  if (!q) return true;
                  return [g.taskName, g.goalType, TASK_CATEGORY_LABEL[g.category]]
                    .some((v) => String(v).toLowerCase().includes(q));
                })}
              />
            ) : viewAll ? (
              <RankTable
                {...rankProps[viewAll]}
                rows={rankProps[viewAll].rows.filter((r) => {
                  if (viewAll === "account" && viewAllPlatform !== "all" && r.extra !== viewAllPlatform)
                    return false;
                  const q = viewAllSearch.trim().toLowerCase();
                  if (!q) return true;
                  const fields =
                    viewAll === "account"
                      ? [r.key]
                      : [r.key, r.extra, r.extra2 ?? "", r.status ?? ""];
                  return fields.some((v) => String(v).toLowerCase().includes(q));
                })}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function GoalTable({ rows }: { rows: ReturnType<typeof buildGoalRows> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {["任务名称", "业务类型", "平台", "目标类型", "目标总量", "已完成", "失败", "过程异常但成功", "执行中", "完成率", "任务结果"].map((t) => (
              <th key={t} className="px-3 py-2 text-left font-medium">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-10 text-center text-sm text-muted-foreground">
                当前筛选条件下暂无任务
              </td>
            </tr>
          )}
          {rows.map((g) => (
            <tr key={g.taskId} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
              <td className="px-3 py-2">{g.taskName}</td>
              <td className="px-3 py-2">
                <Badge variant="outline" className={cn("text-[10px]", TASK_CATEGORY_CLS[g.category])}>
                  {TASK_CATEGORY_LABEL[g.category]}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline" className={cn("text-[10px]", PLATFORM_CHIP[g.platform])}>
                  {g.platform}
                </Badge>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{g.goalType}</td>
              <td className="px-3 py-2 tabular-nums">{g.goalTotal}</td>
              <td className="px-3 py-2 tabular-nums text-success">{g.done}</td>
              <td className="px-3 py-2 tabular-nums text-destructive">{g.failed}</td>
              <td className="px-3 py-2 tabular-nums">
                {g.recovered > 0 ? (
                  <span className="text-warning">{g.recovered}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{g.running}</td>

              <td className="w-40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Progress value={g.rate} className="h-1.5" />
                  <span className={cn("shrink-0 text-xs tabular-nums", g.rate < 60 ? "text-destructive" : "text-foreground")}>
                    {g.rate.toFixed(0)}%
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <Badge variant="outline" className="text-[10px]">{GOAL_RESULT_LABEL[g.result]}</Badge>
                {g.result === "success" && g.recovered > 0 && (
                  <Badge variant="outline" className="ml-1 border-warning/40 bg-warning/10 text-[10px] text-warning">
                    含过程异常
                  </Badge>
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
