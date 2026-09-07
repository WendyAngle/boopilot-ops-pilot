import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  RotateCw,
  Eye,
  Link2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  Loader2,
  Clock,
  AlertTriangle,
  Server,
  Globe,
  Sparkles,
  FolderOpen,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/pagination-bar";

export const Route = createFileRoute("/_app/resources/images")({
  component: ImageInstancesPage,
  head: () => ({
    meta: [
      { title: "镜像实例 — BooPilot" },
      { name: "description", content: "管理云机镜像实例与指纹浏览器资源" },
    ],
  }),
});

/* ============================================================ */
/* 类型 & Mock                                                  */
/* ============================================================ */

type CloudStatus = "in_use" | "mounted" | "mounting" | "unmounting" | "pending" | "abnormal";

const CLOUD_STATUS: Record<CloudStatus, { label: string; cls: string; icon: LucideIcon }> = {
  in_use:    { label: "使用中",  cls: "bg-primary/10 text-primary border-primary/30",           icon: Activity },
  mounted:   { label: "已挂载",  cls: "bg-success/10 text-success border-success/30",           icon: CheckCircle2 },
  mounting:  { label: "挂载中",  cls: "bg-warning/10 text-warning border-warning/30",           icon: Loader2 },
  unmounting:{ label: "卸载中",  cls: "bg-warning/10 text-warning border-warning/30",           icon: Loader2 },
  pending:   { label: "待挂载",  cls: "bg-muted text-muted-foreground border-border",           icon: Clock },
  abnormal:  { label: "异常",    cls: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
};

interface CloudInstance {
  id: string;
  index: number;
  instanceId: string;
  instanceName: string;
  capacity: number; // GB
  used: number;     // GB
  runningVm?: string;
  recentVm?: string;
  proxyIp: string;
  serviceNode: string;
  serviceNodeName: string;
  createdBy: string;
  updatedAt: string;
  status: CloudStatus;
}

type FpStatus = "available" | "in_use" | "unused" | "abnormal";
const FP_STATUS: Record<FpStatus, { label: string; cls: string }> = {
  available: { label: "可用",   cls: "bg-success/10 text-success border-success/30" },
  in_use:    { label: "使用中", cls: "bg-primary/10 text-primary border-primary/30" },
  unused:    { label: "未使用", cls: "bg-muted text-muted-foreground border-border" },
  abnormal:  { label: "异常",   cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

interface FpResource {
  id: string;
  index: number;
  resourceId: string;
  resourceName: string;
  bucket: string;
  path: string;
  proxyIp: string;
  createdBy: string;
  vm?: string;
  updatedAt: string;
  status: FpStatus;
  boundIp: boolean;
}

/* ----- Cloud seed ----- */
const NAMES = ["image-test-004-1","image-test-009-1","132123-1","image_test_0021-1","image-test-003-1","test-1-27-i2-1","image-test-008-1","tiktok-test-001","test-1-13-i2-1"];
const VMS = ["test-1-13-i2","test-1-5-i3","test-1-27-i3","test-1-1-i3","test-1-19-i1","test-1-24-i1","test-1-7-i2",""];
const IPS = ["23.95.228.2","192.3.176.155","23.95.228.1","23.95.10.28","192.3.176.158","23.95.10.26","23.95.228.5","192.3.176.156"];
const USERS = ["--","admin","wyf","--","admin","--","admin","wyf","--"];

const seedCloud = (): CloudInstance[] =>
  Array.from({ length: 9 }, (_, i) => {
    const idx = i + 1;
    const statusPool: CloudStatus[] = ["in_use","in_use","pending","in_use","in_use","pending","in_use","mounted","pending"];
    const status = statusPool[i % statusPool.length];
    const running = i % 3 === 2 ? "" : VMS[i % VMS.length];
    return {
      id: `cloud-${idx}`,
      index: idx,
      instanceId: `2057009125105${String(1000 + i)}`.slice(0, 17),
      instanceName: NAMES[i % NAMES.length],
      capacity: [10,15,1,10,10,10,10,15,10][i],
      used: 0,
      runningVm: running || undefined,
      recentVm: VMS[(i + 2) % VMS.length] || undefined,
      proxyIp: IPS[i % IPS.length],
      serviceNode: "172.30.11.173",
      serviceNodeName: "boo-node-shenzhen-01",
      createdBy: USERS[i % USERS.length],
      updatedAt: `2026-05-26 ${String(17 - (i % 8)).padStart(2, "0")}:${String(55 - i * 3).padStart(2, "0")}:${String(16 + i).padStart(2, "0")}`,
      status,
    };
  });

const seedFp = (): FpResource[] => [
  {
    id: "fp-1", index: 1,
    resourceId: "2057418712428152345",
    resourceName: "tiktok-test-001",
    bucket: "matrix",
    path: "/fingerprintBrowserFiles/resources/tiktok-test-001",
    proxyIp: "23.95.228.5",
    createdBy: "-",
    vm: undefined,
    updatedAt: "2026-05-21 19:10:21",
    status: "available",
    boundIp: true,
  },
  {
    id: "fp-2", index: 2,
    resourceId: "2056625819813098765",
    resourceName: "12313-weqwe.qwedqw",
    bucket: "matrix",
    path: "/fingerprintBrowserFiles/resources/12313-weqwe-qwedqw",
    proxyIp: "192.3.176.156",
    createdBy: "wyf",
    vm: undefined,
    updatedAt: "2026-05-19 14:39:41",
    status: "available",
    boundIp: true,
  },
];

/* ============================================================ */
/* 主页面                                                       */
/* ============================================================ */

function ImageInstancesPage() {
  const [tab, setTab] = useState<"cloud" | "fp">("cloud");

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-w-0 space-y-6">
        {/* 标题 */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">镜像实例</h2>
              <Badge variant="outline" className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border-primary/30">
                <Sparkles className="mr-1 h-3 w-3" />
                云机 & 指纹浏览器
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              统一管理云机镜像实例与指纹浏览器资源，支持挂载状态监控、节点分配与代理 IP 绑定。
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "cloud" | "fp")} className="space-y-6">
          <TabsList className="h-auto rounded-xl border bg-card p-1 shadow-[var(--shadow-card)]">
            <TabsTrigger value="cloud" className="gap-1.5 rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              <HardDrive className="h-4 w-4" />
              云机
            </TabsTrigger>
            <TabsTrigger value="fp" className="gap-1.5 rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              <Globe className="h-4 w-4" />
              指纹浏览器
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cloud" className="space-y-6 outline-none">
            <CloudTab />
          </TabsContent>
          <TabsContent value="fp" className="space-y-6 outline-none">
            <FpTab />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

/* ============================================================ */
/* 云机 Tab                                                     */
/* ============================================================ */

function CloudTab() {
  const [rows, setRows] = useState<CloudInstance[]>(seedCloud);
  const [keyword, setKeyword] = useState("");
  const [name, setName] = useState("");
  const [statusFilter, setStatusFilter] = useState<CloudStatus | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<CloudInstance | null>(null);

  const stats = useMemo(() => ({
    total: rows.length,
    mounted: rows.filter((r) => r.status === "in_use" || r.status === "mounted").length,
    mounting: rows.filter((r) => r.status === "mounting").length,
    unmounting: rows.filter((r) => r.status === "unmounting").length,
    pending: rows.filter((r) => r.status === "pending").length,
    abnormal: rows.filter((r) => r.status === "abnormal").length,
  }), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (keyword && !r.instanceId.includes(keyword)) return false;
    if (name && !r.instanceName.includes(name)) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  }), [rows, keyword, name, statusFilter]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setKeyword(""); setName(""); setStatusFilter("all"); setPage(1);
  };

  return (
    <>
      {/* 统计 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard title="云机资源总数" value={stats.total} icon={Server} tone="primary" />
        <StatCard title="已挂载" value={stats.mounted} icon={CheckCircle2} tone="success" />
        <StatCard title="挂载中" value={stats.mounting} icon={Loader2} tone="warning" />
        <StatCard title="卸载中" value={stats.unmounting} icon={Loader2} tone="warning" />
        <StatCard title="待挂载" value={stats.pending} icon={Clock} tone="muted" />
        <StatCard title="异常" value={stats.abnormal} icon={AlertTriangle} tone="destructive" />
      </div>

      {/* 筛选 */}
      <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <div className="flex items-center gap-2">
            <Label className="w-24 shrink-0 text-sm text-muted-foreground">镜像实例ID：</Label>
            <Input placeholder="请输入镜像实例ID" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-24 shrink-0 text-sm text-muted-foreground">镜像实例名称：</Label>
            <Input placeholder="请输入镜像实例名称" value={name} onChange={(e) => { setName(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPage(1)}><Search className="h-4 w-4" />搜索</Button>
            <Button variant="outline" onClick={handleReset}><RotateCw className="h-4 w-4" />重置</Button>
          </div>
          <Button variant="ghost" className="text-primary" onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "合并" : "展开"}
          </Button>
        </div>
        {expanded && (
          <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 lg:grid-cols-3">
            <div className="flex items-center gap-2">
              <Label className="w-24 shrink-0 text-sm text-muted-foreground">状态：</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as CloudStatus | "all"); setPage(1); }}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="请选择状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {(Object.keys(CLOUD_STATUS) as CloudStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{CLOUD_STATUS[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* 操作 + 表格 */}
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-4">
          <div />

          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => toast.info("已刷新")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <Table className="min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_th:last-child]:sticky [&_th:last-child]:right-0 [&_th:last-child]:bg-card [&_th:last-child]:z-10 [&_th:last-child]:shadow-[-8px_0_12px_-8px_hsl(var(--foreground)/0.08)] [&_tbody_td:last-child]:sticky [&_tbody_td:last-child]:right-0 [&_tbody_td:last-child]:bg-card [&_tbody_td:last-child]:z-10 [&_tbody_td:last-child]:shadow-[-8px_0_12px_-8px_hsl(var(--foreground)/0.08)]">
            <TableHeader>
              <TableRow className="border-b border-border/60 hover:bg-transparent">
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead className="w-[180px]">镜像实例ID</TableHead>
                <TableHead className="w-[160px]">镜像实例名称</TableHead>
                <TableHead className="w-[80px]">容量</TableHead>
                <TableHead className="w-[180px]">已用</TableHead>
                <TableHead className="w-[140px]">当前运行虚拟机</TableHead>
                <TableHead className="w-[140px]">最近使用虚拟机</TableHead>
                <TableHead className="w-[140px]">关联代理IP</TableHead>
                <TableHead className="w-[140px]">服务节点</TableHead>
                <TableHead className="w-[180px]">服务节点名称</TableHead>
                <TableHead className="w-[170px]">更新时间</TableHead>
                <TableHead className="w-[110px]">状态</TableHead>
                <TableHead className="w-[180px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-40 text-center text-muted-foreground">暂无云机镜像实例</TableCell>
                </TableRow>
              ) : pageRows.map((r) => {
                const sm = CLOUD_STATUS[r.status];
                const SIcon = sm.icon;
                const pct = (r.used / r.capacity) * 100;
                return (
                  <TableRow key={r.id} className="border-b-border/40">
                    <TableCell className="tabular-nums text-muted-foreground">{r.index}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block max-w-[170px] truncate font-mono text-xs text-muted-foreground">{r.instanceId}</span>
                        </TooltipTrigger>
                        <TooltipContent>{r.instanceId}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-sm">{r.instanceName}</TableCell>
                    <TableCell className="tabular-nums text-sm">{r.capacity}GB</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 w-24" />
                        <span className="tabular-nums text-xs text-muted-foreground">{r.used}GB</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.runningVm ? (
                        <button className="text-sm text-primary hover:underline">{r.runningVm}</button>
                      ) : (
                        <span className="text-sm text-muted-foreground">未挂载</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.recentVm ? (
                        <button className="text-sm text-primary hover:underline">{r.recentVm}</button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.proxyIp}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.serviceNode}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.serviceNodeName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{r.updatedAt}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("gap-1 rounded-full font-medium", sm.cls)}>
                        <SIcon className={cn("h-3 w-3", (r.status === "mounting" || r.status === "unmounting") && "animate-spin")} />
                        {sm.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <IconBtn label="详情" icon={Eye} tone="primary" onClick={() => setViewing(r)} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Pager page={page} total={filtered.length} totalPages={totalPages} onPage={setPage} />
      </div>

      {/* 详情 */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>云机镜像实例详情</DialogTitle>
            <DialogDescription>查看镜像实例完整配置与运行状态。</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailRow label="镜像实例ID" value={<span className="font-mono break-all">{viewing.instanceId}</span>} />
              <DetailRow label="镜像实例名称" value={viewing.instanceName} />
              <DetailRow label="容量" value={`${viewing.capacity}GB`} />
              <DetailRow label="已用" value={`${viewing.used}GB`} />
              <DetailRow label="当前运行虚拟机" value={viewing.runningVm ?? "未挂载"} />
              <DetailRow label="最近使用虚拟机" value={viewing.recentVm ?? "—"} />
              <DetailRow label="关联代理IP" value={<span className="font-mono">{viewing.proxyIp}</span>} />
              <DetailRow label="服务节点" value={<span className="font-mono">{viewing.serviceNode}</span>} />
              <DetailRow label="服务节点名称" value={viewing.serviceNodeName} />
              <DetailRow label="更新时间" value={viewing.updatedAt} />
              <DetailRow label="状态" value={
                <Badge variant="outline" className={cn("gap-1 rounded-full", CLOUD_STATUS[viewing.status].cls)}>
                  {CLOUD_STATUS[viewing.status].label}
                </Badge>
              } />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}

/* ============================================================ */
/* 指纹浏览器 Tab                                               */
/* ============================================================ */

function FpTab() {
  const [rows, setRows] = useState<FpResource[]>(seedFp);
  const [rid, setRid] = useState("");
  const [rname, setRname] = useState("");
  const [bucket, setBucket] = useState("");
  const [path, setPath] = useState("");
  const [statusFilter, setStatusFilter] = useState<FpStatus | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<FpResource | null>(null);

  const stats = useMemo(() => ({
    total: rows.length,
    inUse: rows.filter((r) => r.status === "in_use").length,
    available: rows.filter((r) => r.status === "available").length,
    boundIp: rows.filter((r) => r.boundIp).length,
    unused: rows.filter((r) => r.status === "unused" || r.status === "available").length,
    abnormal: rows.filter((r) => r.status === "abnormal").length,
  }), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (rid && !r.resourceId.includes(rid)) return false;
    if (rname && !r.resourceName.includes(rname)) return false;
    if (bucket && !r.bucket.includes(bucket)) return false;
    if (path && !r.path.includes(path)) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  }), [rows, rid, rname, bucket, path, statusFilter]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setRid(""); setRname(""); setBucket(""); setPath(""); setStatusFilter("all"); setPage(1);
  };

  return (
    <>
      {/* 统计 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard title="指纹浏览器资源总数" value={stats.total} icon={Globe} tone="primary" />
        <StatCard title="使用中" value={stats.inUse} icon={Activity} tone="violet" />
        <StatCard title="可用" value={stats.available} icon={CheckCircle2} tone="success" />
        <StatCard title="已绑定IP" value={stats.boundIp} icon={Link2} tone="primary" />
        <StatCard title="未使用" value={stats.unused} icon={Clock} tone="muted" />
        <StatCard title="异常" value={stats.abnormal} icon={AlertTriangle} tone="destructive" />
      </div>

      {/* 筛选 */}
      <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <div className="flex items-center gap-2">
            <Label className="w-16 shrink-0 text-sm text-muted-foreground">资源ID：</Label>
            <Input placeholder="请输入资源ID" value={rid} onChange={(e) => { setRid(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-16 shrink-0 text-sm text-muted-foreground">资源名称：</Label>
            <Input placeholder="请输入资源名称" value={rname} onChange={(e) => { setRname(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPage(1)}><Search className="h-4 w-4" />搜索</Button>
            <Button variant="outline" onClick={handleReset}><RotateCw className="h-4 w-4" />重置</Button>
          </div>
          <Button variant="ghost" className="text-primary" onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "合并" : "展开"}
          </Button>
        </div>
        {expanded && (
          <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 lg:grid-cols-3">
            <div className="flex items-center gap-2">
              <Label className="w-16 shrink-0 text-sm text-muted-foreground">桶：</Label>
              <Input placeholder="请输入桶名称" value={bucket} onChange={(e) => { setBucket(e.target.value); setPage(1); }} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-16 shrink-0 text-sm text-muted-foreground">目录路径：</Label>
              <Input placeholder="请输入目录路径" value={path} onChange={(e) => { setPath(e.target.value); setPage(1); }} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-16 shrink-0 text-sm text-muted-foreground">状态：</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as FpStatus | "all"); setPage(1); }}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="请选择状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {(Object.keys(FP_STATUS) as FpStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{FP_STATUS[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-4">
          <Button onClick={() => toast.info("批量同步任务已发起", { description: "指纹浏览器资源同步中..." })}>
            <RefreshCw className="h-4 w-4" />
            批量同步指纹浏览器
          </Button>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => toast.info("已刷新")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <Table className="min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_th:last-child]:sticky [&_th:last-child]:right-0 [&_th:last-child]:bg-card [&_th:last-child]:z-10 [&_th:last-child]:shadow-[-8px_0_12px_-8px_hsl(var(--foreground)/0.08)] [&_tbody_td:last-child]:sticky [&_tbody_td:last-child]:right-0 [&_tbody_td:last-child]:bg-card [&_tbody_td:last-child]:z-10 [&_tbody_td:last-child]:shadow-[-8px_0_12px_-8px_hsl(var(--foreground)/0.08)]">
            <TableHeader>
              <TableRow className="border-b border-border/60 hover:bg-transparent">
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead className="w-[180px]">资源ID</TableHead>
                <TableHead className="w-[180px]">资源名称</TableHead>
                <TableHead className="w-[100px]">桶</TableHead>
                <TableHead className="min-w-[260px]">目录路径</TableHead>
                <TableHead className="w-[140px]">关联代理IP</TableHead>
                <TableHead className="w-[140px]">虚拟机</TableHead>
                <TableHead className="w-[170px]">更新时间</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="w-[180px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-40 text-center text-muted-foreground">暂无指纹浏览器资源</TableCell>
                </TableRow>
              ) : pageRows.map((r) => {
                const sm = FP_STATUS[r.status];
                return (
                  <TableRow key={r.id} className="border-b-border/40">
                    <TableCell className="tabular-nums text-muted-foreground">{r.index}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block max-w-[170px] truncate font-mono text-xs text-muted-foreground">{r.resourceId}</span>
                        </TooltipTrigger>
                        <TooltipContent>{r.resourceId}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-sm">{r.resourceName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-md font-mono text-xs">{r.bucket}</Badge>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex max-w-[260px] items-center gap-1 truncate font-mono text-xs text-muted-foreground">
                            <FolderOpen className="h-3 w-3 shrink-0" />
                            {r.path}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{r.path}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.proxyIp}</TableCell>
                    <TableCell>
                      {r.vm ? <span className="text-sm text-primary">{r.vm}</span> : <span className="text-sm text-muted-foreground">未使用</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{r.updatedAt}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("rounded-full font-medium", sm.cls)}>{sm.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <IconBtn label="详情" icon={Eye} tone="primary" onClick={() => setViewing(r)} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Pager page={page} total={filtered.length} totalPages={totalPages} onPage={setPage} />
      </div>

      {/* 详情 */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>指纹浏览器资源详情</DialogTitle>
            <DialogDescription>查看资源完整配置与挂载状态。</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailRow label="资源ID" value={<span className="font-mono break-all">{viewing.resourceId}</span>} />
              <DetailRow label="资源名称" value={viewing.resourceName} />
              <DetailRow label="桶" value={viewing.bucket} />
              <DetailRow label="关联代理IP" value={<span className="font-mono">{viewing.proxyIp}</span>} />
              <DetailRow label="虚拟机" value={viewing.vm ?? "未使用"} />
              <DetailRow label="更新时间" value={viewing.updatedAt} />
              <DetailRow label="状态" value={
                <Badge variant="outline" className={cn("rounded-full", FP_STATUS[viewing.status].cls)}>
                  {FP_STATUS[viewing.status].label}
                </Badge>
              } />
              <div className="col-span-2">
                <p className="mb-1 text-xs text-muted-foreground">目录路径</p>
                <p className="break-all rounded bg-muted/50 p-2 font-mono text-xs">{viewing.path}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}

/* ============================================================ */
/* 子组件                                                       */
/* ============================================================ */

function StatCard({
  title, value, icon: Icon, tone,
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

function IconBtn({
  label, icon: Icon, tone, onClick,
}: {
  label: string;
  icon: LucideIcon;
  tone: "primary" | "warning" | "destructive";
  onClick: () => void;
}) {
  const cls = {
    primary: "text-primary hover:bg-primary/10",
    warning: "text-warning hover:bg-warning/10",
    destructive: "text-destructive hover:bg-destructive/10",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors",
        cls,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Pager({ page, total, totalPages, onPage }: { page: number; total: number; totalPages: number; onPage: (p: number) => void }) {
  return (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      total={total}
      setPage={(p) => onPage(typeof p === "function" ? p(page) : p)}
    />
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
