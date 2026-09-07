import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  RotateCw,
  Eye,
  Activity,
  Link2,
  ChevronLeft,
  ChevronRight,
  Globe,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Gauge,
  Sparkles,
  Server,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Ban,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/pagination-bar";

export const Route = createFileRoute("/_app/resources/ips")({
  component: IpList,
  head: () => ({
    meta: [
      { title: "IP 列表 — BooPilot" },
      { name: "description", content: "维护代理 IP 池与可用性状态" },
    ],
  }),
});

/* ============================================================ */
/* 类型 & Mock                                                  */
/* ============================================================ */

type HealthStatus = "available" | "unavailable" | "blacklist" | "high_latency";
type BindStatus = "bound" | "unbound";

interface IpItem {
  id: string;
  index: number;
  ip: string;
  proxyServer?: string;
  port: number;
  socks5Url: string;
  protocol: "SOCKS5" | "HTTP" | "HTTPS";
  country?: string;
  health: HealthStatus;
  latency: number;
  bindStatus: BindStatus;
  boundAccountId?: string;
  boundAccountName?: string;
  boundInstanceName?: string;
  boundInstanceAt?: string;
  instanceCount: number;
  lastCheckAt: string;
  enabled: boolean;
  createdAt: string;
}

const HEALTH_META: Record<
  HealthStatus,
  { label: string; cls: string; icon: LucideIcon }
> = {
  available: {
    label: "可用",
    cls: "bg-success/10 text-success border-success/30",
    icon: CheckCircle2,
  },
  unavailable: {
    label: "不可用",
    cls: "bg-destructive/10 text-destructive border-destructive/30",
    icon: XCircle,
  },
  blacklist: {
    label: "黑名单",
    cls: "bg-foreground/10 text-foreground border-border",
    icon: Ban,
  },
  high_latency: {
    label: "高延迟",
    cls: "bg-warning/10 text-warning border-warning/30",
    icon: Gauge,
  },
};

const MOCK_SELF_ACCOUNTS = [
  { id: "self-1", username: "张三", platform: "Facebook", platformId: "100012345678", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=zhangsan" },
  { id: "self-2", username: "@zhang_ip", platform: "Tiktok", platformId: "1234567", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=ip" },
  { id: "self-3", username: "李四", platform: "WhatsApp", platformId: "987654321", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=lisi" },
  { id: "self-4", username: "王五", platform: "Instagram", platformId: "567890123", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=wangwu" },
  { id: "self-5", username: "Boo小宇", platform: "Twitter/X", platformId: "888777666", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=booxiaoyu" },
];

const COUNTRIES = ["US / California", "JP / Tokyo", "SG / Singapore", "DE / Frankfurt", "/", "US / New York"];

const seed = (): IpItem[] => {
  const rows: IpItem[] = [];
  for (let i = 1; i <= 26; i++) {
    const base = i <= 2
      ? { ip: i === 1 ? "2.2.2.2" : "1.1.1.1", proxy: i === 1 ? "11.11.11.11" : "3.3.3.3", port: 1080, country: "/" }
      : { ip: `69.12.87.${130 - i}`, proxy: undefined, port: 7555, country: COUNTRIES[i % COUNTRIES.length] };
    const health: HealthStatus = i % 11 === 0 ? "blacklist" : i % 7 === 0 ? "high_latency" : i % 3 === 0 ? "available" : "unavailable";
    const bound = i % 4 === 0;
    const account = bound ? MOCK_SELF_ACCOUNTS[i % MOCK_SELF_ACCOUNTS.length] : undefined;
    const instancePool = ["image-test-004-1", "image-test-008-1", "132123", "tiktok-test-001", "test-1-27-i2-1", "image-test-005-1", "image-test-002-1"];
    const instanceName = bound ? instancePool[i % instancePool.length] : undefined;
    const instanceAt = bound
      ? `2026-05-${String(((i * 3) % 27) + 1).padStart(2, "0")} ${String(8 + (i % 12)).padStart(2, "0")}:${String((i * 11) % 60).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`
      : undefined;
    rows.push({
      id: `ip-${i}`,
      index: i,
      ip: base.ip,
      proxyServer: base.proxy,
      port: base.port,
      socks5Url: `socks5://${base.proxy ? "admin:123456@" : `seed_user_${130 - i}:seed_`}${base.ip}:${base.port}`,
      protocol: "SOCKS5",
      country: base.country,
      health,
      latency: health === "available" ? 80 + (i * 13) % 200 : health === "high_latency" ? 1200 + i * 50 : 9999,
      bindStatus: bound ? "bound" : "unbound",
      boundAccountId: account?.id,
      boundAccountName: account?.username,
      boundInstanceName: instanceName,
      boundInstanceAt: instanceAt,
      instanceCount: bound ? (i % 3) + 1 : 0,
      lastCheckAt: `2026-04-27 ${String(10 + (i % 8)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
      enabled: i % 9 !== 0,
      createdAt: `2026-04-${String(((i % 27) + 1)).padStart(2, "0")}`,
    });
  }
  return rows;
};

const isUnknownCountry = (c?: string) => !c || c.trim() === "" || c.trim() === "/";
const pickGeo = (ip: string) => {
  const pool = COUNTRIES.filter((c) => c !== "/");
  const hash = ip.split(".").reduce((s, n) => s + Number(n || 0), 0);
  return pool[hash % pool.length];
};

/* ============================================================ */
/* 主页面                                                       */
/* ============================================================ */

function IpList() {
  const [ips, setIps] = useState<IpItem[]>(seed);

  const [keyword, setKeyword] = useState("");
  const [proxyFilter, setProxyFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<HealthStatus | "all">("all");
  const [bindFilter, setBindFilter] = useState<BindStatus | "all">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);

  const proxyServers = useMemo(
    () => Array.from(new Set(ips.map((i) => i.proxyServer).filter(Boolean) as string[])),
    [ips],
  );
  const countries = useMemo(
    () => Array.from(new Set(ips.map((i) => i.country).filter(Boolean) as string[])),
    [ips],
  );

  const filtered = useMemo(() => {
    return ips.filter((r) => {
      if (keyword && !r.ip.includes(keyword)) return false;
      if (proxyFilter !== "all" && r.proxyServer !== proxyFilter) return false;
      if (healthFilter !== "all" && r.health !== healthFilter) return false;
      if (bindFilter !== "all" && r.bindStatus !== bindFilter) return false;
      if (countryFilter !== "all" && r.country !== countryFilter) return false;
      return true;
    });
  }, [ips, keyword, proxyFilter, healthFilter, bindFilter, countryFilter]);

  const pageSize = 8;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const [selected, setSelected] = useState<string[]>([]);
  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const toggleAll = () => {
    if (allChecked)
      setSelected(selected.filter((id) => !pageRows.some((r) => r.id === id)));
    else setSelected([...new Set([...selected, ...pageRows.map((r) => r.id)])]);
  };

  const [viewing, setViewing] = useState<IpItem | null>(null);
  const [batchSyncOpen, setBatchSyncOpen] = useState(false);

  const stats = useMemo(() => ({
    total: ips.length,
    available: ips.filter((i) => i.health === "available").length,
    unavailable: ips.filter((i) => i.health === "unavailable").length,
    blacklist: ips.filter((i) => i.health === "blacklist").length,
    high: ips.filter((i) => i.health === "high_latency").length,
    bound: ips.filter((i) => i.bindStatus === "bound").length,
    unbound: ips.filter((i) => i.bindStatus === "unbound").length,
  }), [ips]);

  const handleReset = () => {
    setKeyword("");
    setProxyFilter("all");
    setHealthFilter("all");
    setBindFilter("all");
    setCountryFilter("all");
    setPage(1);
  };

  const handleCheck = (r: IpItem) => {
    toast.info("正在检测", { description: `IP ${r.ip} 检测任务已发起，请稍候。` });
    setTimeout(() => {
      setIps((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? {
                ...x,
                latency: 80 + Math.floor(Math.random() * 200),
                health: "available",
                country: isUnknownCountry(x.country) ? pickGeo(x.ip) : x.country,
                lastCheckAt: new Date().toISOString().slice(0, 19).replace("T", " "),
              }
            : x,
        ),
      );
      toast.success("检测完成", { description: `IP ${r.ip} 当前状态：可用，地理信息已同步。` });
    }, 800);
  };

  const handleBatchSync = () => {
    setBatchSyncOpen(false);
    const unknownCount = ips.filter((i) => isUnknownCountry(i.country)).length;
    setIps((prev) =>
      prev.map((x) =>
        isUnknownCountry(x.country) ? { ...x, country: pickGeo(x.ip) } : x,
      ),
    );
    toast.success("已发起批量同步", {
      description: `共同步 ${ips.length} 个 IP，已自动补全 ${unknownCount} 个未知地理信息。`,
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-w-0 space-y-6">
        {/* 顶部标题 */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">IP 列表</h2>
              <Badge variant="outline" className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border-primary/30">
                <Sparkles className="mr-1 h-3 w-3" />
                代理 IP 池
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              维护代理 IP 池与可用性状态，支持批量同步、健康检测，可绑定到托管账号使用。
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          <StatCard title="固定 IP 总数" value={stats.total} icon={Server} tone="primary" />
          <StatCard title="可用数" value={stats.available} icon={CheckCircle2} tone="success" />
          <StatCard title="不可用数" value={stats.unavailable} icon={XCircle} tone="destructive" />
          <StatCard title="黑名单数" value={stats.blacklist} icon={ShieldAlert} tone="muted" />
          <StatCard title="高延迟数" value={stats.high} icon={Gauge} tone="warning" />
          <StatCard title="已绑定数" value={stats.bound} icon={Link2} tone="violet" />
          <StatCard title="未绑定数" value={stats.unbound} icon={Globe} tone="muted" />
        </div>

        {/* 筛选条 */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
            <div className="flex items-center gap-2">
              <Label className="w-16 shrink-0 text-sm text-muted-foreground">IP 地址：</Label>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="请输入 IP 地址"
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 shrink-0 text-sm text-muted-foreground">代理服务器：</Label>
              <Select value={proxyFilter} onValueChange={(v) => { setProxyFilter(v); setPage(1); }}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="请选择代理服务器" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部代理服务器</SelectItem>
                  {proxyServers.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setPage(1)}>
                <Search className="h-4 w-4" />
                搜索
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCw className="h-4 w-4" />
                重置
              </Button>
            </div>
            <Button variant="ghost" onClick={() => setExpanded((e) => !e)} className="text-primary">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? "收起" : "展开"}
            </Button>
          </div>

          {expanded && (
            <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 lg:grid-cols-3">
              <div className="flex items-center gap-2">
                <Label className="w-16 shrink-0 text-sm text-muted-foreground">健康状态：</Label>
                <Select value={healthFilter} onValueChange={(v) => { setHealthFilter(v as HealthStatus | "all"); setPage(1); }}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {(Object.keys(HEALTH_META) as HealthStatus[]).map((h) => (
                      <SelectItem key={h} value={h}>{HEALTH_META[h].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-16 shrink-0 text-sm text-muted-foreground">绑定状态：</Label>
                <Select value={bindFilter} onValueChange={(v) => { setBindFilter(v as BindStatus | "all"); setPage(1); }}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="bound">已绑定</SelectItem>
                    <SelectItem value="unbound">未绑定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-16 shrink-0 text-sm text-muted-foreground">国家/地区：</Label>
                <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setPage(1); }}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部国家/地区</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {selected.length > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium text-primary">已选 {selected.length} 项</span>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>取消选择</Button>
            </div>
          )}
        </div>


        {/* 列表 */}
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="w-full overflow-x-auto">
          <Table
            className="min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_th:last-child]:sticky [&_th:last-child]:right-0 [&_th:last-child]:bg-card [&_th:last-child]:z-10 [&_th:last-child]:shadow-[-8px_0_12px_-8px_hsl(var(--foreground)/0.08)] [&_tbody_td:last-child]:sticky [&_tbody_td:last-child]:right-0 [&_tbody_td:last-child]:bg-card [&_tbody_td:last-child]:z-10 [&_tbody_td:last-child]:shadow-[-8px_0_12px_-8px_hsl(var(--foreground)/0.08)]"
          >
            <TableHeader>
              <TableRow className="border-b border-border/60 hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead className="w-[140px]">IP 地址</TableHead>
                <TableHead className="w-[140px]">代理服务器</TableHead>
                <TableHead className="w-[80px]">端口</TableHead>
                <TableHead className="min-w-[260px]">SOCKS5 URL</TableHead>
                <TableHead className="w-[100px]">协议</TableHead>
                <TableHead className="w-[160px]">国家 / 地区</TableHead>
                <TableHead className="w-[120px]">健康状态</TableHead>
                <TableHead className="w-[100px]">延迟</TableHead>
                <TableHead className="w-[120px]">绑定状态</TableHead>
                <TableHead className="min-w-[260px]">当前绑定镜像实例</TableHead>
                <TableHead className="w-[100px] text-right">实例占用数</TableHead>
                <TableHead className="w-[170px]">最近检测时间</TableHead>
                <TableHead className="w-[260px] pr-4 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-40 text-center text-muted-foreground">
                    暂无符合条件的 IP
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => {
                  const hm = HEALTH_META[r.health];
                  const HIcon = hm.icon;
                  const latencyDanger = r.latency >= 9000;
                  const latencyWarn = r.latency >= 1000 && r.latency < 9000;
                  return (
                    <TableRow key={r.id} className="border-b-border/40">
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(r.id)}
                          onCheckedChange={(c) =>
                            setSelected((prev) =>
                              c ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{r.index}</TableCell>
                      <TableCell className="font-mono text-sm">{r.ip}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.proxyServer ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{r.port}</TableCell>
                      <TableCell>
                        <span className="block max-w-[260px] truncate font-mono text-xs text-muted-foreground">
                          {r.socks5Url}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">{r.protocol}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {isUnknownCountry(r.country) ? (
                          <Badge variant="outline" className="gap-1 rounded-full bg-warning/10 font-medium text-warning border-warning/30">
                            <ShieldAlert className="h-3 w-3" />
                            未知 - 请检测
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{r.country}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 rounded-full font-medium", hm.cls)}>
                          <HIcon className="h-3 w-3" />
                          {hm.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-semibold tabular-nums text-sm",
                            latencyDanger && "text-destructive",
                            latencyWarn && "text-warning",
                            !latencyDanger && !latencyWarn && "text-success",
                          )}
                        >
                          {r.latency}ms
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.bindStatus === "bound" ? (
                          <Badge variant="outline" className="rounded-full bg-success/10 font-medium text-success border-success/30">已绑定</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full bg-muted font-medium text-muted-foreground border-border">未绑定</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.bindStatus === "bound" && r.boundInstanceName ? (
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-foreground">{r.boundInstanceName}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{r.boundInstanceAt}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">未绑定镜像实例</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.instanceCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.lastCheckAt}</TableCell>
                      <TableCell>
                        <div className="flex flex-nowrap items-center justify-center gap-x-3 whitespace-nowrap">
                          <TextActionBtn label="详情" icon={Eye} onClick={() => setViewing(r)} />
                          
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
            total={filtered.length}
            setPage={setPage}
          />
        </div>
      </div>

      {/* 详情弹窗 */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>IP 详情</DialogTitle>
            <DialogDescription>查看代理 IP 的完整配置信息与运行状态。</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailRow label="IP 地址" value={<span className="font-mono">{viewing.ip}</span>} />
              <DetailRow label="代理服务器" value={viewing.proxyServer ?? "—"} />
              <DetailRow label="端口" value={viewing.port} />
              <DetailRow label="协议" value={viewing.protocol} />
              <DetailRow label="国家 / 地区" value={isUnknownCountry(viewing.country) ? <span className="text-warning">未知 - 请检测</span> : viewing.country} />
              <DetailRow label="健康状态" value={
                <Badge variant="outline" className={cn("gap-1 rounded-full", HEALTH_META[viewing.health].cls)}>
                  {HEALTH_META[viewing.health].label}
                </Badge>
              } />
              <DetailRow label="延迟" value={`${viewing.latency} ms`} />
              <DetailRow label="绑定状态" value={viewing.bindStatus === "bound" ? "已绑定" : "未绑定"} />
              <DetailRow
                label="当前绑定镜像实例"
                value={
                  viewing.bindStatus === "bound" && viewing.boundInstanceName ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">{viewing.boundInstanceName}</span>
                      <span className="text-xs text-muted-foreground">{viewing.boundInstanceAt}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">未绑定镜像实例</span>
                  )
                }
              />
              <DetailRow label="实例占用数" value={viewing.instanceCount} />
              <DetailRow label="最近检测时间" value={viewing.lastCheckAt} />
              <DetailRow label="添加时间" value={viewing.createdAt} />
              <div className="col-span-2">
                <p className="mb-1 text-xs text-muted-foreground">SOCKS5 URL</p>
                <p className="break-all rounded bg-muted/50 p-2 font-mono text-xs">{viewing.socks5Url}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量同步确认 */}
      <Dialog open={batchSyncOpen} onOpenChange={setBatchSyncOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量同步 IP</DialogTitle>
            <DialogDescription>
              将对当前所有 IP（共 {ips.length} 个）发起健康检测与状态同步任务，可能耗时较长，是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchSyncOpen(false)}>取消</Button>
            <Button onClick={handleBatchSync}>
              <RefreshCw className="h-4 w-4" />
              开始同步
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

/* ============================================================ */
/* 子组件                                                       */
/* ============================================================ */

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "violet" | "muted" | "destructive";
}) {
  const toneCls = {
    primary: "from-primary/15 to-primary/5 text-primary",
    success: "from-success/15 to-success/5 text-success",
    warning: "from-warning/15 to-warning/5 text-warning",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600",
    muted: "from-muted to-muted/50 text-muted-foreground",
    destructive: "from-destructive/15 to-destructive/5 text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
        </div>
        <div className={cn("rounded-xl bg-gradient-to-br p-2", toneCls)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function TextActionBtn({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary transition-colors hover:opacity-80"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

