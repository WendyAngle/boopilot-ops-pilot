import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building,
  Search,
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  Users2,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileDown,
  FileSpreadsheet,
  Tag as TagIcon,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/pagination-bar";
import {
  INDUSTRIES,
  TENANTS_SEED,
  TYPE_META,
  type Tenant,
  type TenantStatus,
  type TenantType,
} from "@/lib/tenants";
import { SYSTEM_TAGS } from "@/lib/systemTags";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { useTenantScope } from "@/lib/tenant-scope";
import { PLAN_META, PLAN_TIERS, type PlanTier } from "@/lib/billing-plans";
import { setTenantPlan, useTenantPlans } from "@/lib/billing-tenants";

export const Route = createFileRoute("/_app/tenants/list")({
  component: TenantList,
  head: () => ({
    meta: [
      { title: "租户列表 — BooPilot" },
      { name: "description", content: "管理平台合作租户的基础信息与合作状态" },
    ],
  }),
});

/* ============================================================ */
/* 工具                                                          */
/* ============================================================ */

const USABLE_TAGS = SYSTEM_TAGS.filter((t) => t.status === "active");

function getTenantDisplayTags(id: string): { name: string; color: string }[] {
  if (USABLE_TAGS.length === 0) return [];
  const seed = Math.abs([...id].reduce((s, c) => s + c.charCodeAt(0), 0));
  const count = (seed % 2) + 1;
  return Array.from({ length: count }, (_, i) => {
    const t = USABLE_TAGS[(seed + i * 7) % USABLE_TAGS.length];
    return { name: t.name, color: t.color };
  });
}

/* ============================================================ */
/* 主组件                                                        */
/* ============================================================ */

function TenantList() {
  const [tenants, setTenants] = useState<Tenant[]>(TENANTS_SEED);

  /* 筛选 */
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TenantType>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TenantStatus>("all");

  const [tenantScope] = useTenantScope();

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (tenantScope !== "all" && t.id !== tenantScope) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!`${t.id} ${t.name}`.toLowerCase().includes(kw)) return false;
      }
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (industryFilter !== "all" && t.industry !== industryFilter)
        return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tenants, tenantScope, keyword, typeFilter, industryFilter, statusFilter]);

  /* 分页 */
  const pageSize = 8;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* 选择 */
  const [selected, setSelected] = useState<string[]>([]);
  const allChecked =
    pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const toggleAll = () => {
    if (allChecked)
      setSelected(selected.filter((id) => !pageRows.some((r) => r.id === id)));
    else setSelected([...new Set([...selected, ...pageRows.map((r) => r.id)])]);
  };

  /* 弹窗 */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [modifyTagsOpen, setModifyTagsOpen] = useState(false);
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null);
  const tenantPlans = useTenantPlans();

  /* 统计 */
  const stats = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((t) => t.status === "active").length,
      ended: tenants.filter((t) => t.status === "ended").length,
    }),
    [tenants],
  );

  /* 操作 */

  const handleSave = (
    form: Omit<Tenant, "id" | "createdAt"> & { id?: string },
  ) => {
    if (editing) {
      setTenants((prev) =>
        prev.map((x) =>
          x.id === editing.id ? { ...x, ...form, id: editing.id } : x,
        ),
      );
      toast.success("保存成功", { description: form.name });
    } else {
      const t: Tenant = {
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      };
      setTenants((prev) => [t, ...prev]);
      setTenantPlan(t.id, "free"); // 新注册租户默认免费版
      toast.success("新建成功", { description: `${form.name} · 默认套餐：免费版` });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setTenants((prev) => prev.filter((x) => x.id !== deleting.id));
    setSelected((prev) => prev.filter((id) => id !== deleting.id));
    toast.success("已删除", { description: deleting.name });
    setDeleting(null);
  };

  const handleExport = () => {
    const headers = [
      "租户ID",
      "名称",
      "简介",
      "类型",
      "行业",
      "主营产品",
      "合作内容",
      "状态",
      "创建时间",
    ];
    const rows = filtered.map((t) => [
      t.id,
      t.name,
      t.intro,
      TYPE_META[t.type].label,
      t.industry,
      t.product,
      t.cooperation ?? "",
      t.status === "active" ? "合作中" : "终止合作",
      t.createdAt,
    ]);
    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) =>
          row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `租户列表_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("导出成功", {
      description: `共导出 ${filtered.length} 条租户数据`,
    });
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "名称*",
      "简介*",
      "类型*",
      "行业*",
      "主营产品*",
      "合作内容",
      "状态",
    ];
    const sample = [
      "示例租户",
      "一句话简介",
      "潜在客户/新客户/活跃客户/VIP客户",
      "电商零售",
      "私域裂变工具",
      "战略合作",
      "合作中/终止合作",
    ];
    const csv = "\uFEFF" + [headers, sample].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "租户导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setKeyword("");
    setTypeFilter("all");
    setIndustryFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-w-0 space-y-6">
        {/* 顶部标题 */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                租户列表
              </h2>
              <Badge
                variant="outline"
                className="rounded-full border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                租户管理
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              租户数据由博海身份云系统统一同步维护，本页用于查看合作状态与商务进展，如需新增或调整请前往身份云系统操作。
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="租户总数"
            value={stats.total}
            icon={Users2}
            tone="primary"
            hint="平台累计合作租户"
          />
          <StatCard
            title="合作中"
            value={stats.active}
            icon={CheckCircle2}
            tone="success"
            hint="正在维护的客户"
          />
          <StatCard
            title="终止合作"
            value={stats.ended}
            icon={XCircle}
            tone="muted"
            hint="已结束合作关系"
          />
        </div>

        {/* 筛选条 */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full shrink-0 sm:w-[340px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="请输入租户ID/名称关键词搜索"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as typeof typeFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {(Object.keys(TYPE_META) as TenantType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {TYPE_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={industryFilter}
              onValueChange={(v) => {
                setIndustryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="行业" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部行业</SelectItem>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as typeof statusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">合作中</SelectItem>
                <SelectItem value="ended">终止合作</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={resetFilters}>
              重置
            </Button>
          </div>

          {selected.length > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium text-primary">
                已选 {selected.length} 项
              </span>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                取消选择
              </Button>
            </div>
          )}
        </div>


        {/* 列表 */}
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1560px] [&_td]:align-top [&_th]:whitespace-nowrap">
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[180px]">租户ID</TableHead>
                  <TableHead className="min-w-[160px]">名称</TableHead>
                  <TableHead className="min-w-[220px]">简介</TableHead>
                  <TableHead className="w-[120px]">类型</TableHead>
                  <TableHead className="w-[110px]">套餐</TableHead>
                  <TableHead className="w-[120px]">行业</TableHead>
                  <TableHead className="min-w-[180px]">主营产品</TableHead>
                  <TableHead className="min-w-[180px]">合作内容</TableHead>
                  <TableHead className="w-[200px]">标签</TableHead>
                  <TableHead className="w-[140px] text-center">状态</TableHead>
                  <TableHead className="w-[200px] pr-4 text-center">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="h-40 text-center text-muted-foreground"
                    >
                      暂无符合条件的租户
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((t) => {
                    const tm = TYPE_META[t.type];
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help font-mono text-xs text-muted-foreground">
                                {t.id.slice(0, 8)}…{t.id.slice(-4)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="font-mono text-xs"
                            >
                              {t.id}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                              <Building className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">
                              {t.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {t.intro}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("rounded-full text-xs", tm.cls)}
                          >
                            {tm.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const plan = tenantPlans[t.id] ?? "free";
                            const pm = PLAN_META[plan];
                            return (
                              <Badge variant="outline" className={cn("rounded-full text-xs", pm.badgeCls)}>
                                {pm.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {t.industry}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="line-clamp-2 text-sm text-foreground">
                            {t.product}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {t.cooperation || "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <TagPillList tags={getTenantDisplayTags(t.id)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                t.status === "active"
                                  ? "border-success/30 bg-success/10 text-success"
                                  : "border-border bg-muted text-muted-foreground",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  t.status === "active"
                                    ? "bg-success"
                                    : "bg-muted-foreground/60",
                                )}
                              />
                              {t.status === "active" ? "合作中" : "终止合作"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-center gap-1">
                            <IconBtn
                              icon={Wallet}
                              label="设置套餐"
                              onClick={() => setPlanTenant(t)}
                            />
                            <IconBtn
                              icon={Pencil}
                              label="编辑"
                              onClick={() => {
                                setEditing(t);
                                setFormOpen(true);
                              }}
                            />
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

      {/* 新建 / 编辑 弹窗 */}
      <TenantFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSave={handleSave}
      />

      {/* 导入弹窗 */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onDownloadTemplate={handleDownloadTemplate}
        onConfirm={() => {
          setImportOpen(false);
          toast.success("导入完成", { description: "已解析模板文件并入库" });
        }}
      />

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除租户？</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除租户「
              <span className="font-medium text-foreground">
                {deleting?.name}
              </span>
              」，此操作不可恢复，关联数据将无法访问。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 修改标签 */}
      <ModifyTagsDialog
        open={modifyTagsOpen}
        onOpenChange={setModifyTagsOpen}
        count={selected.length}
        onConfirm={(tags) => {
          setModifyTagsOpen(false);
          toast.success("标签已更新", {
            description: `已为 ${selected.length} 个租户设置标签 ${tags.map((t) => `「${t}」`).join("")}`,
          });
          setSelected([]);
        }}
      />

      {/* 设置套餐 */}
      <SetPlanDialog
        tenant={planTenant}
        currentPlan={planTenant ? (tenantPlans[planTenant.id] ?? "free") : "free"}
        onClose={() => setPlanTenant(null)}
        onConfirm={(plan) => {
          if (!planTenant) return;
          setTenantPlan(planTenant.id, plan);
          toast.success("套餐已更新", {
            description: `${planTenant.name} → ${PLAN_META[plan].label}`,
          });
          setPlanTenant(null);
        }}
      />
    </TooltipProvider>
  );
}

/* ============================================================ */
/* 子组件                                                        */
/* ============================================================ */

function TagPillList({
  tags,
}: {
  tags: { name: string; color: string }[];
}) {
  if (tags.length === 0)
    return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <span
          key={t.name}
          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{
            color: t.color,
            borderColor: `${t.color}55`,
            backgroundColor: `${t.color}1A`,
          }}
        >
          {t.name}
        </span>
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: "primary" | "success" | "muted";
  hint?: string;
}) {
  const toneCls = {
    primary: "from-primary/15 to-primary/5 text-primary",
    success: "from-success/15 to-success/5 text-success",
    muted: "from-muted to-muted/50 text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn("rounded-xl bg-gradient-to-br p-2.5", toneCls)}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 gap-1 px-2 text-xs",
        danger &&
          "text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-sm">
      <span className="mr-0.5 text-destructive">*</span>
      {children}
    </Label>
  );
}

/* ---------- 新建/编辑弹窗 ---------- */

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Tenant | null;
  onSave: (
    form: Omit<Tenant, "id" | "createdAt"> & { id?: string },
  ) => void;
}

const EMPTY_FORM: Omit<Tenant, "id" | "createdAt"> = {
  name: "",
  intro: "",
  type: "potential",
  industry: INDUSTRIES[0],
  product: "",
  cooperation: "",
  status: "active",
};

function TenantFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: TenantFormDialogProps) {
  const [form, setForm] =
    useState<Omit<Tenant, "id" | "createdAt">>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          intro: editing.intro,
          type: editing.type,
          industry: editing.industry,
          product: editing.product,
          cooperation: editing.cooperation ?? "",
          status: editing.status,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, editing]);

  const submit = () => {
    if (!form.name.trim()) return toast.error("请填写名称");
    if (!form.intro.trim()) return toast.error("请填写简介");
    if (!form.product.trim()) return toast.error("请填写主营产品");
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑租户" : "新增租户"}</DialogTitle>
          <DialogDescription>
            填写租户基础信息与合作信息，标{" "}
            <span className="text-destructive">*</span> 为必填项。
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <ReqLabel>名称</ReqLabel>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="请输入租户名称"
              maxLength={50}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <ReqLabel>简介</ReqLabel>
            <Textarea
              value={form.intro}
              onChange={(e) => setForm({ ...form, intro: e.target.value })}
              placeholder="请输入租户简介，例如行业地位、业务概况等"
              rows={3}
              maxLength={200}
            />
            <p className="text-right text-xs text-muted-foreground">
              {form.intro.length}/200
            </p>
          </div>
          <div className="space-y-2">
            <ReqLabel>类型</ReqLabel>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({ ...form, type: v as TenantType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_META) as TenantType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex flex-col">
                      <span>{TYPE_META[k].label}</span>
                      <span className="text-xs text-muted-foreground">
                        {TYPE_META[k].hint}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <ReqLabel>行业</ReqLabel>
            <Select
              value={form.industry}
              onValueChange={(v) => setForm({ ...form, industry: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <ReqLabel>主营产品</ReqLabel>
            <Input
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              placeholder="例如：Facebook 广告投放、TikTok 达人营销"
              maxLength={100}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm">合作内容</Label>
            <Textarea
              value={form.cooperation}
              onChange={(e) =>
                setForm({ ...form, cooperation: e.target.value })
              }
              placeholder="请输入具体的合作内容、合作模式或备注"
              rows={2}
              maxLength={200}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm">状态</Label>
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  form.status === "active"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    form.status === "active"
                      ? "bg-success"
                      : "bg-muted-foreground/60",
                  )}
                />
                {form.status === "active" ? "合作中" : "终止合作"}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {editing ? "状态由系统统一维护，不可在此修改" : "新建租户默认为合作中"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>{editing ? "保存" : "创建"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 导入弹窗 ---------- */

function ImportDialog({
  open,
  onOpenChange,
  onDownloadTemplate,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDownloadTemplate: () => void;
  onConfirm: () => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setFileName(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>导入租户</DialogTitle>
          <DialogDescription>
            通过 CSV 模板批量导入租户数据，请先下载模板按格式填写。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  第一步：下载模板
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  必填字段：
                  <span className="text-destructive">
                    名称、简介、类型、行业、主营产品
                  </span>
                  ；选填字段：合作内容、状态。
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onDownloadTemplate}
              >
                <FileDown className="h-4 w-4" />
                下载模板
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-6">
            <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {fileName ? fileName : "点击或拖拽 CSV 文件到此处"}
              </span>
              <span className="text-xs text-muted-foreground">
                仅支持 .csv 格式，单次最多 1000 条数据
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) =>
                  setFileName(e.target.files?.[0]?.name ?? null)
                }
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={!fileName}>
            确认导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 修改标签弹窗（与图文素材模块统一） ---------- */

function ModifyTagsDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  count: number;
  onConfirm: (tags: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (!open) setSelected([]);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>修改标签</DialogTitle>
          <DialogDescription>
            为所选 <span className="font-medium text-foreground">{count}</span>{" "}
            个租户设置标签（将覆盖原标签）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">标签</Label>
          <TagMultiSelect
            value={selected}
            onChange={setSelected}
            placeholder="选择或新增标签"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 设置套餐弹窗 ---------- */

function SetPlanDialog({
  tenant,
  currentPlan,
  onClose,
  onConfirm,
}: {
  tenant: Tenant | null;
  currentPlan: PlanTier;
  onClose: () => void;
  onConfirm: (plan: PlanTier) => void;
}) {
  const [picked, setPicked] = useState<PlanTier>(currentPlan);
  useEffect(() => {
    setPicked(currentPlan);
  }, [currentPlan, tenant?.id]);

  return (
    <Dialog open={!!tenant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>设置套餐</DialogTitle>
          <DialogDescription>
            为租户「<span className="font-medium text-foreground">{tenant?.name}</span>」选择套餐。当前套餐：
            <Badge variant="outline" className={cn("ml-1 rounded-full", PLAN_META[currentPlan].badgeCls)}>
              {PLAN_META[currentPlan].label}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PLAN_TIERS.map((t) => {
            const m = PLAN_META[t];
            const on = picked === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setPicked(t)}
                className={cn(
                  "flex flex-col items-start rounded-xl border p-3 text-left transition",
                  on
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <Badge variant="outline" className={cn("rounded-full text-[11px]", m.badgeCls)}>
                  {m.label}
                </Badge>
                <span className="mt-2 text-xs text-muted-foreground">
                  {t === "free" ? "无法使用 AI 创作" : "支持 AI 创作 · 享套餐折扣"}
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => onConfirm(picked)} disabled={picked === currentPlan}>
            确认更换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

