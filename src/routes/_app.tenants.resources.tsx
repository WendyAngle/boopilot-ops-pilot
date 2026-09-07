import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Search, RotateCw, Users, HardDrive, MonitorSmartphone, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import { cn } from "@/lib/utils";
import { useTenantScope } from "@/lib/tenant-scope";
import { PLATFORM_META } from "@/lib/managed-account-mock";
import { seedTenantResources } from "@/lib/tenant-resource-mock";

export const Route = createFileRoute("/_app/tenants/resources")({
  component: TenantResourcesPage,
  head: () => ({
    meta: [
      { title: "租户资源 — BooPilot" },
      {
        name: "description",
        content: "按租户查看账号、镜像实例、设备与代理 IP 的绑定关系与资源占用统计。",
      },
      { property: "og:title", content: "租户资源 — BooPilot" },
      {
        property: "og:description",
        content: "按租户查看账号、镜像实例、设备与代理 IP 的绑定关系与资源占用统计。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PAGE_SIZE = 10;

function TenantResourcesPage() {
  const [tenantScope] = useTenantScope();
  const all = useMemo(() => seedTenantResources(), []);

  const [accountKw, setAccountKw] = useState("");
  const [deviceKw, setDeviceKw] = useState("");
  const [instanceKw, setInstanceKw] = useState("");
  const [page, setPage] = useState(1);

  // 右上角租户切换：数据整体跟随
  const scoped = useMemo(
    () => (tenantScope === "all" ? all : all.filter((r) => r.tenantId === tenantScope)),
    [all, tenantScope],
  );

  useEffect(() => {
    setPage(1);
  }, [tenantScope]);

  const rows = useMemo(() => {
    const a = accountKw.trim().toLowerCase();
    const d = deviceKw.trim().toLowerCase();
    const ins = instanceKw.trim().toLowerCase();
    return scoped.filter((r) => {
      if (
        a &&
        !`${r.accountName} ${r.accountPlatformId} ${r.platform}`.toLowerCase().includes(a)
      )
        return false;
      if (d && !`${r.deviceId} ${r.deviceName}`.toLowerCase().includes(d)) return false;
      if (ins && !`${r.instanceId} ${r.instanceName} ${r.instanceType}`.toLowerCase().includes(ins))
        return false;
      return true;
    });
  }, [scoped, accountKw, deviceKw, instanceKw]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  // 统计（跟随筛选结果）
  const stats = useMemo(() => {
    const byPlatform = new Map<string, number>();
    const instTypes = new Map<string, number>();
    const devTypes = new Map<string, number>();
    const instIds = new Set<string>();
    const devIds = new Set<string>();
    const ips = new Set<string>();
    for (const r of rows) {
      byPlatform.set(r.platform, (byPlatform.get(r.platform) ?? 0) + 1);
      if (!instIds.has(r.instanceId)) {
        instIds.add(r.instanceId);
        instTypes.set(r.instanceType, (instTypes.get(r.instanceType) ?? 0) + 1);
      }
      if (!devIds.has(r.deviceId)) {
        devIds.add(r.deviceId);
        devTypes.set(r.deviceType, (devTypes.get(r.deviceType) ?? 0) + 1);
      }
      ips.add(r.proxyIp);
    }
    return {
      accounts: rows.length,
      byPlatform: [...byPlatform.entries()].sort((x, y) => y[1] - x[1]),
      instances: instIds.size,
      instTypes: [...instTypes.entries()],
      devices: devIds.size,
      devTypes: [...devTypes.entries()],
      ips: ips.size,
    };
  }, [rows]);

  const reset = () => {
    setAccountKw("");
    setDeviceKw("");
    setInstanceKw("");
    setPage(1);
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">租户资源</h1>
        <p className="text-sm text-muted-foreground">
          以托管账号为主体，串联镜像实例、设备与代理 IP 的绑定关系，按租户查看资源占用。
        </p>
      </header>

      {/* 统计卡片 */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="账号总数" value={stats.accounts} icon={Users} tone="primary" />
        <StatCard title="镜像实例" value={stats.instances} icon={HardDrive} tone="violet" />
        <StatCard title="设备" value={stats.devices} icon={MonitorSmartphone} tone="success" />
        <StatCard title="代理 IP" value={stats.ips} icon={Globe} tone="warning" />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <DimensionCard title="账号维度（按平台）" items={stats.byPlatform} />
        <DimensionCard title="镜像实例维度（按类型）" items={stats.instTypes} />
        <DimensionCard title="设备维度（按类型）" items={stats.devTypes} />
      </section>

      {/* 筛选 */}
      <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterInput
            label="账号"
            placeholder="账号名 / 账号ID / 平台"
            value={accountKw}
            onChange={(v) => {
              setAccountKw(v);
              setPage(1);
            }}
          />
          <FilterInput
            label="设备"
            placeholder="设备ID / 虚拟机名称"
            value={deviceKw}
            onChange={(v) => {
              setDeviceKw(v);
              setPage(1);
            }}
          />
          <FilterInput
            label="镜像实例"
            placeholder="实例ID / 名称 / 类型"
            value={instanceKw}
            onChange={(v) => {
              setInstanceKw(v);
              setPage(1);
            }}
          />
          <div className="flex items-end">
            <Button variant="outline" onClick={reset} className="w-full md:w-auto">
              <RotateCw className="mr-1.5 h-4 w-4" />
              重置
            </Button>
          </div>
        </div>
      </section>

      {/* 列表 */}
      <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">所属租户</TableHead>
                <TableHead className="min-w-[220px]">账号</TableHead>
                <TableHead className="min-w-[200px]">镜像实例</TableHead>
                <TableHead className="min-w-[180px]">设备</TableHead>
                <TableHead className="min-w-[160px]">代理数据</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                    没有符合条件的数据
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => {
                  const meta = PLATFORM_META[r.platform];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.tenantName || "未分配"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                              meta.cls,
                            )}
                          >
                            {meta.letter}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to="/accounts/managed/$id"
                              params={{ id: r.accountId }}
                              className="block truncate text-sm font-medium hover:text-primary hover:underline"
                            >
                              {r.accountName}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              ID {r.accountPlatformId} · {r.platform}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{r.instanceName}</span>
                            <Badge variant="outline" className="text-[11px]">
                              {r.instanceType}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{r.instanceId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{r.deviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.deviceId} · {r.deviceType}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium tabular-nums">{r.proxyIp}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.proxyCountry} · {r.proxyProtocol}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={rows.length}
          setPage={setPage}
        />
      </section>
    </div>
  );
}

function FilterInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function DimensionCard({
  title,
  items,
}: {
  title: string;
  items: [string, number][];
}) {
  const total = items.reduce((s, [, n]) => s + n, 0);
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs text-muted-foreground">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无数据</p>
        ) : (
          items.map(([name, n]) => (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{name}</span>
                <span className="font-medium tabular-nums">{n}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${total ? (n / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
