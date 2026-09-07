import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import {
  Search,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Calendar as CalendarIcon,
  UserSquare2,
  ShieldCheck,
  CheckCircle2,
  Building,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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
import { AssignTenantDialog } from "@/components/assign-tenant-dialog";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_app/system/roles")({
  component: RoleManagement,
  head: () => ({
    meta: [
      { title: "角色管理 — BooPilot" },
      { name: "description", content: "配置角色与菜单权限" },
    ],
  }),
});

/* ============================================================ */
/* 类型 & 数据                                                   */
/* ============================================================ */

import { rolesActions, useSystemRoles, type RoleStatus, type SystemRole } from "@/lib/systemRoles";

interface MenuNode {
  id: string;
  name: string;
  children?: MenuNode[];
}

/* 菜单树（与左侧导航保持一致） */
const MENU_TREE: MenuNode[] = [
  { id: "menu-dashboard", name: "工作台" },
  {
    id: "menu-tasks",
    name: "任务管理",
    children: [{ id: "menu-/tasks/operations", name: "运营任务" }],
  },
  {
    id: "menu-accounts",
    name: "账号管理",
    children: [
      { id: "menu-/accounts/managed", name: "账号列表" },
      { id: "menu-/accounts/targets", name: "目标账号" },
    ],
  },
  {
    id: "menu-materials",
    name: "素材管理",
    children: [{ id: "menu-/materials/library", name: "成品库" }],
  },
  {
    id: "menu-tenants",
    name: "租户管理",
    children: [{ id: "menu-/tenants/list", name: "租户列表" }],
  },
  {
    id: "menu-tags",
    name: "标签管理",
    children: [{ id: "menu-/tags/list", name: "标签管理" }],
  },
  {
    id: "menu-resources",
    name: "资源管理",
    children: [
      { id: "menu-/resources/devices", name: "设备列表" },
      { id: "menu-/resources/ips", name: "IP列表" },
      { id: "menu-/resources/images", name: "镜像实例" },
    ],
  },
  {
    id: "menu-agents",
    name: "智能体管理",
    children: [
      { id: "menu-/agents/list", name: "智能体列表" },
      { id: "menu-/agents/models", name: "模型配置" },
    ],
  },
  {
    id: "menu-system",
    name: "系统管理",
    children: [
      { id: "menu-/system/users", name: "用户管理" },
      { id: "menu-/system/roles", name: "角色管理" },
    ],
  },
];

/* 叶子菜单对应的功能操作按钮（模块顶部操作 + 列表查看 + 列表行操作） */
const DEFAULT_ACTIONS: { key: string; name: string }[] = [
  { key: "view", name: "查看列表" },
  { key: "create", name: "新增" },
  { key: "edit", name: "编辑" },
  { key: "delete", name: "删除" },
  { key: "export", name: "导出" },
];
const LEAF_ACTIONS_OVERRIDE: Record<string, { key: string; name: string }[]> = {
  "menu-dashboard": [{ key: "view", name: "查看" }],
  "menu-/tasks/operations": [
    { key: "view", name: "查看列表" },
    { key: "create", name: "新建任务" },
    { key: "edit", name: "编辑" },
    { key: "delete", name: "删除" },
    { key: "detail", name: "查看详情" },
    { key: "logs", name: "查看日志" },
    { key: "export", name: "导出" },
  ],
  "menu-/accounts/managed": [
    { key: "view", name: "查看列表" },
    { key: "create", name: "新增账号" },
    { key: "set-login-status", name: "设置账号状态" },
    { key: "assign-tenant", name: "分配租户" },
    { key: "assign-owner", name: "分配负责人" },
    { key: "set-active-time", name: "设置活跃时间" },
    { key: "toggle-action", name: "禁/启用动作设置" },
    { key: "import", name: "批量导入" },
    { key: "export", name: "导出" },
    { key: "edit-tags", name: "修改标签" },
    { key: "batch-delete", name: "批量删除" },
    { key: "detail", name: "查看详情" },
    { key: "assign", name: "分配" },
    { key: "edit", name: "编辑" },
    { key: "delete", name: "删除" },
  ],
  "menu-/system/roles": [
    { key: "view", name: "查看列表" },
    { key: "create", name: "新增角色" },
    { key: "edit", name: "编辑" },
    { key: "delete", name: "删除" },
    { key: "assign", name: "分配用户" },
    { key: "export", name: "导出" },
  ],
  "menu-/system/users": [
    { key: "view", name: "查看列表" },
    { key: "create", name: "新增用户" },
    { key: "edit", name: "编辑" },
    { key: "delete", name: "删除" },
    { key: "reset-pwd", name: "重置密码" },
    { key: "export", name: "导出" },
  ],
};
function getLeafActions(leafId: string) {
  return LEAF_ACTIONS_OVERRIDE[leafId] ?? DEFAULT_ACTIONS;
}
function actionPermId(leafId: string, key: string) {
  return `act:${leafId}:${key}`;
}

function collectAllMenuIds(nodes: MenuNode[], out: string[] = []): string[] {
  nodes.forEach((n) => {
    out.push(n.id);
    if (n.children) collectAllMenuIds(n.children, out);
  });
  return out;
}
function collectParentIds(nodes: MenuNode[], out: string[] = []): string[] {
  nodes.forEach((n) => {
    if (n.children?.length) {
      out.push(n.id);
      collectParentIds(n.children, out);
    }
  });
  return out;
}
function collectLeafIds(nodes: MenuNode[], out: string[] = []): string[] {
  nodes.forEach((n) => {
    if (n.children?.length) collectLeafIds(n.children, out);
    else out.push(n.id);
  });
  return out;
}
const ALL_MENU_IDS = collectAllMenuIds(MENU_TREE);
const PARENT_MENU_IDS = collectParentIds(MENU_TREE);
const ALL_LEAF_IDS = collectLeafIds(MENU_TREE);
const ALL_ACTION_IDS = ALL_LEAF_IDS.flatMap((id) =>
  getLeafActions(id).map((a) => actionPermId(id, a.key)),
);
const ALL_PERM_IDS = [...ALL_MENU_IDS, ...ALL_ACTION_IDS];

/* ============================================================ */
/* 主组件                                                        */
/* ============================================================ */

function RoleManagement() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | RoleStatus>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<"all" | RoleStatus>("all");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  const roles = useSystemRoles();

  // Hydrate the system admin role's menu permissions with the full menu tree on first mount.
  useEffect(() => {
    const admin = roles.find((r) => r.isSystem);
    if (admin && admin.menus.length === 0) {
      rolesActions.update(admin.id, { menus: ALL_PERM_IDS });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return roles.filter((r) => {
      if (appliedKeyword && !r.name.toLowerCase().includes(appliedKeyword.toLowerCase())) return false;
      if (appliedStatus !== "all" && r.status !== appliedStatus) return false;
      if (appliedStart && r.createdAt < appliedStart) return false;
      if (appliedEnd && r.createdAt > appliedEnd + " 23:59:59") return false;
      return true;
    });
  }, [roles, appliedKeyword, appliedStatus, appliedStart, appliedEnd]);

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const [jumpPage, setJumpPage] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const toggleAll = () => {
    if (allChecked) setSelected(selected.filter((id) => !pageRows.some((r) => r.id === id)));
    else setSelected([...new Set([...selected, ...pageRows.map((r) => r.id)])]);
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemRole | null>(null);
  const [deleting, setDeleting] = useState<SystemRole | null>(null);
  const [assigning, setAssigning] = useState<SystemRole | null>(null);
  const [assignTenantOpen, setAssignTenantOpen] = useState(false);

  const handleSearch = () => {
    setAppliedKeyword(keyword.trim());
    setAppliedStatus(status);
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
    setPage(1);
  };
  const handleReset = () => {
    setKeyword("");
    setStatus("all");
    setStartDate("");
    setEndDate("");
    setAppliedKeyword("");
    setAppliedStatus("all");
    setAppliedStart("");
    setAppliedEnd("");
    setPage(1);
    toast.success("已重置筛选条件");
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: SystemRole) => {
    setEditing(r);
    setFormOpen(true);
  };

  const handleToggleStatus = (r: SystemRole) => {
    rolesActions.toggleStatus(r.id);
    toast.success(r.status === "active" ? "已停用" : "已启用", { description: r.name });
  };

  const handleSave = (form: Partial<SystemRole>) => {
    if (editing) {
      rolesActions.update(editing.id, form);
      toast.success("保存成功");
    } else {
      const id = `role-${Date.now()}`;
      rolesActions.add({
        id,
        name: form.name || "新角色",
        order: form.order ?? 1,
        status: form.status || "active",
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
        remark: form.remark,
        menus: form.menus ?? [],
      });
      toast.success("新增成功");
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    rolesActions.remove(deleting.id);
    setSelected((prev) => prev.filter((id) => id !== deleting.id));
    toast.success("已删除", { description: deleting.name });
    setDeleting(null);
  };

  const handleExport = () => {
    const headers = ["角色名称", "显示顺序", "状态", "创建时间", "备注"];
    const rows = filtered.map((r) => [r.name, String(r.order), r.status === "active" ? "正常" : "停用", r.createdAt, r.remark ?? ""]);
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `角色列表_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已导出当前筛选结果");
  };

  const stats = useMemo(
    () => ({
      total: roles.length,
      active: roles.filter((r) => r.status === "active").length,
      inactive: roles.filter((r) => r.status === "inactive").length,
    }),
    [roles],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-w-0 space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">角色管理</h2>
          <p className="text-sm text-muted-foreground">配置角色与菜单权限，控制不同身份在系统中的可见范围。</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="角色总数" value={stats.total} icon={ShieldCheck} tone="primary" />
          <StatCard title="正常" value={stats.active} icon={CheckCircle2} tone="success" />
          <StatCard title="停用" value={stats.inactive} icon={ShieldCheck} tone="muted" />
        </div>

        {/* 筛选 */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormItem label="角色名称">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="请输入角色名称"
              />
            </FormItem>
            <FormItem label="创建时间" className="md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pl-9" />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="relative flex-1">
                  <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pl-9" />
                </div>
              </div>
            </FormItem>
            <FormItem label="状态">
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue placeholder="角色状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">正常</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <div className="flex items-end justify-end gap-2 md:col-span-2 xl:col-span-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
                搜索
              </Button>
            </div>
          </div>
        </div>

        {/* 工具栏 + 表格 */}
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              新增角色
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              导出
            </Button>
            {!getCurrentUser()?.allowedTenantNames && (
              <Button
                variant="outline"
                disabled={selected.length === 0}
                onClick={() => setAssignTenantOpen(true)}
              >
                <Building className="h-4 w-4" />
                分配租户{selected.length > 0 && ` (${selected.length})`}
              </Button>
            )}
            {selected.length > 0 && (
              <span className="ml-1 text-sm text-muted-foreground">已选 {selected.length} 项</span>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 pl-4">
                    <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="全选" />
                  </TableHead>
                  <TableHead>角色名称</TableHead>
                  <TableHead className="w-[100px] text-center">显示顺序</TableHead>
                  <TableHead className="w-[90px] text-center">状态</TableHead>
                  <TableHead className="w-[170px] text-center">创建时间</TableHead>
                  <TableHead className="w-[240px] pr-4 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((r) => (
                    <TableRow key={r.id} className="group">
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selected.includes(r.id)}
                          onCheckedChange={(v) =>
                            setSelected(v ? [...selected, r.id] : selected.filter((id) => id !== r.id))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-center font-mono tabular-nums">{r.order}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Switch checked={r.status === "active"} onCheckedChange={() => handleToggleStatus(r)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm tabular-nums text-muted-foreground">
                        {r.createdAt}
                      </TableCell>
                      <TableCell className="pr-4 text-center">
                        <div className="flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap">
                          {!r.isSystem && (
                            <>
                              <IconAction icon={Pencil} tip="编辑" tone="primary" onClick={() => openEdit(r)} />
                              <IconAction icon={Trash2} tip="删除" tone="danger" onClick={() => setDeleting(r)} />
                            </>
                          )}
                          <IconAction
                            icon={UserSquare2}
                            tip="分配用户"
                            tone="primary"
                            onClick={() => setAssigning(r)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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

        <RoleFormDialog open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSave={handleSave} />

        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除该角色？</AlertDialogTitle>
              <AlertDialogDescription>
                即将删除角色 <b>{deleting?.name}</b>，删除后已分配该角色的用户将失去对应权限，操作不可恢复。
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

        <AssignUserDialog role={assigning} onClose={() => setAssigning(null)} />

        <AssignTenantDialog
          open={assignTenantOpen}
          onOpenChange={setAssignTenantOpen}
          count={selected.length}
          entityLabel="个角色"
          onConfirm={(t) => {
            selected.forEach((id) =>
              rolesActions.update(id, { tenantId: t.id, tenantName: t.name }),
            );
            setAssignTenantOpen(false);
            toast.success("分配成功", { description: `${selected.length} 个角色 → ${t.name}` });
            setSelected([]);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

/* ============================================================ */
/* 子组件                                                        */
/* ============================================================ */

function FormItem({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Label className="w-20 shrink-0 text-right text-sm text-muted-foreground">{label}</Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}


function IconAction({
  icon: Icon,
  tip,
  tone,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tip: string;
  tone: "primary" | "danger" | "warning" | "success";
  onClick?: () => void;
}) {
  const cls =
    tone === "primary"
      ? "text-primary hover:bg-primary/10"
      : tone === "danger"
        ? "text-destructive hover:bg-destructive/10"
        : tone === "success"
          ? "text-success hover:bg-success/10"
          : "text-warning hover:bg-warning/10";
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
      {tip}
    </button>
  );
}

function ReqLabel({ required, children }: { required?: boolean; children: React.ReactNode }) {
  return (
    <Label className="flex w-28 shrink-0 items-center justify-end gap-0.5 text-sm text-foreground">
      {required && <span className="text-destructive">*</span>}
      <span>{children}</span>
    </Label>
  );
}

function FieldRow({ required, label, children }: { required?: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-2">
        <ReqLabel required={required}>{label}</ReqLabel>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function RoleFormDialog({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: SystemRole | null;
  onClose: () => void;
  onSave: (form: Partial<SystemRole>) => void;
}) {
  const [form, setForm] = useState<Partial<SystemRole>>({});
  const [expandAll, setExpandAll] = useState(true);
  const [linked, setLinked] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { ...editing }
          : { name: "", order: 1, status: "active", menus: [], remark: "" },
      );
      setExpandAll(true);
      setLinked(true);
      const init: Record<string, boolean> = {};
      PARENT_MENU_IDS.forEach((id) => (init[id] = true));
      setExpanded(init);
    }
  }, [open, editing]);

  const menus = form.menus ?? [];
  const allSelected = menus.length === ALL_PERM_IDS.length;

  const toggleExpandAll = () => {
    const next = !expandAll;
    setExpandAll(next);
    const map: Record<string, boolean> = {};
    PARENT_MENU_IDS.forEach((id) => (map[id] = next));
    setExpanded(map);
  };
  const toggleAllSelect = (v: boolean) => {
    setForm((f) => ({ ...f, menus: v ? [...ALL_PERM_IDS] : [] }));
  };

  const setMenuChecked = (node: MenuNode, checked: boolean) => {
    setForm((f) => {
      const cur = new Set(f.menus ?? []);
      const apply = (n: MenuNode) => {
        if (checked) cur.add(n.id);
        else cur.delete(n.id);
        // 叶子节点：联动其下功能操作权限
        if (!n.children?.length) {
          getLeafActions(n.id).forEach((a) => {
            const pid = actionPermId(n.id, a.key);
            if (checked && linked) cur.add(pid);
            else if (!checked) cur.delete(pid);
          });
        }
        if (linked) n.children?.forEach(apply);
      };
      apply(node);
      if (linked) {
        const syncParents = (nodes: MenuNode[]): boolean => {
          let anySelected = false;
          nodes.forEach((n) => {
            if (n.children?.length) {
              const childAny = syncParents(n.children);
              if (childAny) cur.add(n.id);
              else cur.delete(n.id);
              if (childAny || cur.has(n.id)) anySelected = true;
            } else if (cur.has(n.id)) {
              anySelected = true;
            }
          });
          return anySelected;
        };
        syncParents(MENU_TREE);
      }
      return { ...f, menus: Array.from(cur) };
    });
  };

  const setActionChecked = (leafId: string, key: string, checked: boolean) => {
    setForm((f) => {
      const cur = new Set(f.menus ?? []);
      const pid = actionPermId(leafId, key);
      if (checked) {
        cur.add(pid);
        if (linked) cur.add(leafId); // 勾选功能 → 自动勾选其菜单
      } else {
        cur.delete(pid);
      }
      // 联动父级菜单
      if (linked) {
        const syncParents = (nodes: MenuNode[]): boolean => {
          let anySelected = false;
          nodes.forEach((n) => {
            if (n.children?.length) {
              const childAny = syncParents(n.children);
              if (childAny) cur.add(n.id);
              else cur.delete(n.id);
              if (childAny || cur.has(n.id)) anySelected = true;
            } else if (cur.has(n.id)) {
              anySelected = true;
            }
          });
          return anySelected;
        };
        syncParents(MENU_TREE);
      }
      return { ...f, menus: Array.from(cur) };
    });
  };

  const toggleAllActionsForLeaf = (leafId: string, checked: boolean) => {
    setForm((f) => {
      const cur = new Set(f.menus ?? []);
      getLeafActions(leafId).forEach((a) => {
        const pid = actionPermId(leafId, a.key);
        if (checked) cur.add(pid);
        else cur.delete(pid);
      });
      if (checked && linked) cur.add(leafId);
      return { ...f, menus: Array.from(cur) };
    });
  };

  const handleSubmit = () => {
    if (!form.name?.trim()) {
      toast.error("请输入角色名称");
      return;
    }
    if (form.order === undefined || form.order === null) {
      toast.error("请输入角色顺序");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "修改角色" : "新增角色"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <FieldRow required label="角色名称">
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="请输入角色名称"
            />
          </FieldRow>
          <FieldRow required label="角色顺序">
            <Input
              type="number"
              value={form.order ?? 1}
              onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
            />
          </FieldRow>
          <FieldRow label="状态">
            <RadioGroup
              value={form.status ?? "active"}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as RoleStatus }))}
              className="flex h-10 items-center gap-6"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="active" id="role-status-active" />
                <span className={cn(form.status === "active" && "font-medium text-primary")}>正常</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="inactive" id="role-status-inactive" />
                <span>停用</span>
              </label>
            </RadioGroup>
          </FieldRow>

          <FieldRow label="菜单及功能权限">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-5 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={expandAll} onCheckedChange={toggleExpandAll} />
                  <span>展开/折叠</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAllSelect(!!v)} />
                  <span>全选/全不选</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={linked} onCheckedChange={(v) => setLinked(!!v)} />
                  <span className={cn(linked && "font-medium text-primary")}>父子联动</span>
                </label>
                <span className="ml-auto text-xs text-muted-foreground">
                  已选 <span className="font-medium text-foreground">{menus.length}</span> / {ALL_PERM_IDS.length}
                </span>
              </div>

              <div className="max-h-[26rem] overflow-y-auto rounded-md border bg-muted/30 p-3">
                <MenuTree
                  nodes={MENU_TREE}
                  expanded={expanded}
                  onToggle={(id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))}
                  selected={menus}
                  onCheck={setMenuChecked}
                  onActionCheck={setActionChecked}
                  onToggleAllActions={toggleAllActionsForLeaf}
                />
              </div>
            </div>
          </FieldRow>

          <FieldRow label="备注">
            <Textarea
              value={form.remark ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
              placeholder="请输入内容"
              rows={3}
            />
          </FieldRow>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>确 定</Button>
          <Button variant="outline" onClick={onClose}>
            取 消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MenuTree({
  nodes,
  expanded,
  onToggle,
  selected,
  onCheck,
  onActionCheck,
  onToggleAllActions,
  level = 0,
}: {
  nodes: MenuNode[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  selected: string[];
  onCheck: (node: MenuNode, checked: boolean) => void;
  onActionCheck: (leafId: string, key: string, checked: boolean) => void;
  onToggleAllActions: (leafId: string, checked: boolean) => void;
  level?: number;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => {
        const has = !!n.children?.length;
        const isOpen = expanded[n.id];
        const checked = selected.includes(n.id);
        const actions = !has ? getLeafActions(n.id) : [];
        const actionIds = actions.map((a) => actionPermId(n.id, a.key));
        const selectedActionCount = actionIds.filter((id) => selected.includes(id)).length;
        const allActionsChecked = actions.length > 0 && selectedActionCount === actions.length;
        return (
          <li key={n.id}>
            <div
              className="flex items-center gap-1 rounded px-1 py-1 text-sm hover:bg-accent/50"
              style={{ paddingLeft: 4 + level * 18 }}
            >
              {has ? (
                <button
                  type="button"
                  onClick={() => onToggle(n.id)}
                  className="flex h-4 w-4 items-center justify-center text-muted-foreground"
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="inline-block w-4" />
              )}
              <Checkbox checked={checked} onCheckedChange={(v) => onCheck(n, !!v)} />
              <span className="select-none">{n.name}</span>
              {!has && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedActionCount}/{actions.length})
                </span>
              )}
            </div>

            {!has && (
              <div
                className="mb-1 ml-1 mr-1 mt-1 rounded-md border border-dashed border-border/70 bg-background/60 px-3 py-2"
                style={{ marginLeft: 4 + (level + 1) * 18 }}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">功能操作</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={allActionsChecked}
                      onCheckedChange={(v) => onToggleAllActions(n.id, !!v)}
                      className="h-3.5 w-3.5"
                    />
                    <span>全选</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {actions.map((a) => {
                    const pid = actionPermId(n.id, a.key);
                    const on = selected.includes(pid);
                    return (
                      <label
                        key={a.key}
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 text-xs transition-colors",
                          on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Checkbox
                          checked={on}
                          onCheckedChange={(v) => onActionCheck(n.id, a.key, !!v)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="select-none">{a.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {has && isOpen && (
              <MenuTree
                nodes={n.children!}
                expanded={expanded}
                onToggle={onToggle}
                selected={selected}
                onCheck={onCheck}
                onActionCheck={onActionCheck}
                onToggleAllActions={onToggleAllActions}
                level={level + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

const MOCK_USERS_FOR_ASSIGN = [
  { id: "u-1", name: "陈晓明" },
  { id: "u-2", name: "李雨欣" },
  { id: "u-3", name: "王浩然" },
  { id: "u-4", name: "张梦琪" },
  { id: "u-5", name: "刘子轩" },
  { id: "u-6", name: "周思远" },
  { id: "u-7", name: "吴佳怡" },
  { id: "u-8", name: "郑天宇" },
];

function AssignUserDialog({ role, onClose }: { role: SystemRole | null; onClose: () => void }) {
  const [kw, setKw] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (role) {
      setKw("");
      setPicked([]);
    }
  }, [role]);

  const list = MOCK_USERS_FOR_ASSIGN.filter((u) => !kw || u.name.includes(kw));

  const handleSubmit = () => {
    toast.success("已分配用户", { description: `角色 ${role?.name} 新增 ${picked.length} 个用户` });
    onClose();
  };

  return (
    <Dialog open={!!role} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>分配用户 · {role?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索用户昵称" className="pl-9" />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 pl-4">
                    <Checkbox
                      checked={list.length > 0 && list.every((u) => picked.includes(u.id))}
                      onCheckedChange={(v) => {
                        if (v) setPicked([...new Set([...picked, ...list.map((u) => u.id)])]);
                        else setPicked(picked.filter((id) => !list.some((u) => u.id === id)));
                      }}
                    />
                  </TableHead>
                  <TableHead>用户昵称</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={picked.includes(u.id)}
                          onCheckedChange={(v) =>
                            setPicked(v ? [...picked, u.id] : picked.filter((id) => id !== u.id))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{u.name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-muted-foreground">
            已选 <span className="font-medium text-foreground">{picked.length}</span> 个用户
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={picked.length === 0}>
            确 定
          </Button>
          <Button variant="outline" onClick={onClose}>
            取 消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
