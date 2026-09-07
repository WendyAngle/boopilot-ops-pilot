import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import {
  Search,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Calendar as CalendarIcon,
  Users2,
  ShieldCheck,
  UserCog,
  Upload,
  Download,
  FileSpreadsheet,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/pagination-bar";
import { ACTIVE_TENANTS } from "@/lib/managed-account-mock";
import { useSystemRoles } from "@/lib/systemRoles";
import { getCurrentUser } from "@/lib/auth";
import { getTenantScope, useTenantScope } from "@/lib/tenant-scope";

export const Route = createFileRoute("/_app/system/users")({
  component: UserManagement,
  head: () => ({
    meta: [
      { title: "用户管理 — BooPilot" },
      { name: "description", content: "维护系统用户账号、角色与状态" },
    ],
  }),
});

/* ============================================================ */
/* 类型 & 数据                                                   */
/* ============================================================ */

type UserStatus = "active" | "inactive";

interface SystemUser {
  id: string;
  nickname: string;
  username: string;
  phone: string;
  email?: string;
  gender?: "male" | "female" | "unknown";
  roles: string[];
  tenantId?: string;
  tenantName?: string;
  dataScope?: "all" | "self";
  status: UserStatus;
  createdAt: string;
  remark?: string;
}




const NICKS = [
  "陈晓明", "李雨欣", "王浩然", "张梦琪", "刘子轩",
  "周思远", "吴佳怡", "郑天宇", "黄诗涵", "林子睿",
  "M", "易凡", "苏沐辰", "孙博文",
];

const MOCK_USERS: SystemUser[] = Array.from({ length: 13 }).map((_, i) => {
  const tenant = ACTIVE_TENANTS[i % Math.max(1, ACTIVE_TENANTS.length)];
  return {
    id: `u-${i + 1}`,
    nickname: NICKS[i % NICKS.length],
    username: `user${(1000 + i).toString()}`,
    phone: `138${String(10000000 + i * 137).slice(0, 8)}`,
    email: `user${i + 1}@boo.com`,
    tenantId: tenant?.id,
    tenantName: tenant?.name,
    roles:
      i === 0
        ? ["超级管理员"]
        : i % 4 === 0
          ? ["主管"]
          : i % 4 === 1
            ? ["运营专员"]
            : i % 4 === 2
              ? ["运营专员", "观察者"]
              : ["观察者"],
    status: i === 5 || i === 9 ? "inactive" : "active",
    createdAt: `2026-0${1 + (i % 3)}-${String(10 + i).padStart(2, "0")} 1${i % 9}:33:22`,
    remark: i % 3 === 0 ? "核心成员" : undefined,
  };
});

/* ============================================================ */
/* 组件                                                         */
/* ============================================================ */

function UserManagement() {
  const roleOptions = useSystemRoles().filter((r) => r.status === "active");
  const [keyword, setKeyword] = useState("");
  const [phone, setPhone] = useState("");
  const [emailKw, setEmailKw] = useState("");
  const [roleKw, setRoleKw] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [users, setUsers] = useState<SystemUser[]>(MOCK_USERS);

  const [tenantScope] = useTenantScope();

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (tenantScope && tenantScope !== "all" && u.tenantId !== tenantScope) return false;
      if (keyword && !u.nickname.toLowerCase().includes(keyword.toLowerCase())) return false;
      if (phone && !u.phone.includes(phone)) return false;
      if (emailKw && !(u.email ?? "").toLowerCase().includes(emailKw.toLowerCase())) return false;
      if (roleKw !== "all" && !(u.roles ?? []).includes(roleKw)) return false;
      if (startDate && u.createdAt < startDate) return false;
      if (endDate && u.createdAt > endDate + " 23:59:59") return false;
      return true;
    });
  }, [users, keyword, phone, emailKw, roleKw, startDate, endDate, tenantScope]);

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const [selected, setSelected] = useState<string[]>([]);
  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const toggleAll = () => {
    if (allChecked) setSelected(selected.filter((id) => !pageRows.some((r) => r.id === id)));
    else setSelected([...new Set([...selected, ...pageRows.map((r) => r.id)])]);
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [removing, setRemoving] = useState<SystemUser | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [assigning, setAssigning] = useState<SystemUser | null>(null);
  const [assignRoles, setAssignRoles] = useState<string[]>([]);
  const [jumpPage, setJumpPage] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const handleReset = () => {
    setKeyword("");
    setPhone("");
    setEmailKw("");
    setRoleKw("all");
    setStartDate("");
    setEndDate("");
    toast.success("已重置筛选条件");
  };




  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (u: SystemUser) => {
    setEditing(u);
    setFormOpen(true);
  };

  const handleSave = (form: Partial<SystemUser>) => {
    if (editing) {
      setUsers((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...form } : x)));
      toast.success("保存成功");
    } else {
      const id = `u-${Date.now()}`;
      setUsers((prev) => [
        {
          id,
          nickname: form.nickname || "新用户",
          username: form.username || "user",
          phone: form.phone || "",
          email: form.email,
          tenantId: form.tenantId,
          tenantName: form.tenantName,
          roles: form.roles || ["运营专员"],
          status: "active",
          createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
          remark: form.remark,
        },
        ...prev,
      ]);
      toast.success("新增成功");
    }
    setFormOpen(false);
  };


  const handleRemove = () => {
    if (!removing) return;
    setUsers((prev) =>
      prev.map((x) =>
        x.id === removing.id ? { ...x, tenantId: undefined, tenantName: undefined } : x,
      ),
    );
    setSelected((prev) => prev.filter((id) => id !== removing.id));
    toast.success("已移除", { description: `${removing.nickname} 已从当前租户移除` });
    setRemoving(null);
  };

  const handleBatchRemove = () => {
    setUsers((prev) =>
      prev.map((x) =>
        selected.includes(x.id) ? { ...x, tenantId: undefined, tenantName: undefined } : x,
      ),
    );
    toast.success(`已批量移除 ${selected.length} 个用户`);
    setSelected([]);
    setBatchDeleteOpen(false);
  };

  const scopedUsers = useMemo(
    () =>
      users.filter(
        (u) => !tenantScope || tenantScope === "all" || u.tenantId === tenantScope,
      ),
    [users, tenantScope],
  );
  const stats = useMemo(
    () => ({
      total: scopedUsers.length,
      withEmail: scopedUsers.filter((u) => !!u.email?.trim()).length,
      withRole: scopedUsers.filter((u) => (u.roles?.length ?? 0) > 0).length,
    }),
    [scopedUsers],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-w-0 space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">用户管理</h2>
          <p className="text-sm text-muted-foreground">维护系统用户账号、角色与状态。</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="总用户" value={stats.total} icon={Users2} tone="primary" />
          <StatCard title="已绑定邮箱" value={stats.withEmail} icon={CheckCircle2} tone="success" />
          <StatCard title="已分配角色" value={stats.withRole} icon={ShieldCheck} tone="muted" />
        </div>

        <div className="min-w-0">
          <section className="min-w-0 space-y-4">
            {/* 筛选 */}
            <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormItem label="用户昵称">
                  <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="请输入用户昵称" />
                </FormItem>
                <FormItem label="手机号码">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号码" />
                </FormItem>
                <FormItem label="邮箱">
                  <Input value={emailKw} onChange={(e) => setEmailKw(e.target.value)} placeholder="请输入邮箱" />
                </FormItem>
                <FormItem label="角色">
                  <Select value={roleKw} onValueChange={(v) => setRoleKw(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部角色</SelectItem>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="flex items-end justify-end gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" />
                    重置
                  </Button>
                  <Button onClick={() => setPage(1)}>
                    <Search className="h-4 w-4" />
                    搜索
                  </Button>
                </div>
              </div>
            </div>

            {/* 工具栏 + 表格 */}
            <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    新增用户
                  </Button>
                  <Button variant="outline" disabled={selected.length === 0} onClick={() => setBatchDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                    批量移除
                  </Button>
                  <Button variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4" />
                    导入用户
                  </Button>
                  <Button variant="outline" onClick={() => toast.success("已开始导出当前列表")}>
                    <Download className="h-4 w-4" />
                    导出
                  </Button>
                  {selected.length > 0 && (
                    <span className="ml-1 text-sm text-muted-foreground">已选 {selected.length} 项</span>
                  )}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <Table className="min-w-[1180px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-12 pl-4">
                        <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="全选" />
                      </TableHead>
                      <TableHead className="text-center">用户昵称</TableHead>
                      <TableHead className="w-[180px] text-center">所属租户</TableHead>
                      <TableHead className="w-[140px] text-center">手机号码</TableHead>
                      <TableHead className="w-[200px] text-center">邮箱</TableHead>
                      <TableHead className="w-[180px] text-center">角色</TableHead>
                      <TableHead className="w-[170px] text-center">创建时间</TableHead>
                      <TableHead className="w-[220px] pr-4 text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((u) => (
                        <TableRow key={u.id} className="group">
                          <TableCell className="pl-4">
                            <Checkbox
                              checked={selected.includes(u.id)}
                              onCheckedChange={(v) =>
                                setSelected(v ? [...selected, u.id] : selected.filter((id) => id !== u.id))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center font-medium">{u.nickname}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{u.tenantName ?? "-"}</TableCell>
                          <TableCell className="text-center font-mono text-sm tabular-nums">{u.phone}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{u.email ?? "-"}</TableCell>
                          <TableCell className="text-center text-sm">
                            {(u.roles && u.roles.length > 0) ? u.roles.join("、") : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm tabular-nums text-muted-foreground">
                            {u.createdAt}
                          </TableCell>
                          <TableCell className="pr-4 text-center">
                            <div className="flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap">
                              <IconAction icon={Pencil} tip="编辑" tone="primary" onClick={() => openEdit(u)} />
                              <IconAction
                                icon={UserCog}
                                tip="分配角色"
                                tone="success"
                                onClick={() => {
                                  setAssignRoles(u.roles ?? []);
                                  setAssigning(u);
                                }}
                              />
                              <IconAction
                                icon={Trash2}
                                tip="移除"
                                tone="danger"
                                onClick={() => setRemoving(u)}
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
          </section>
        </div>

        <UserFormDialog open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSave={handleSave} />

        <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认移除该用户？</AlertDialogTitle>
              <AlertDialogDescription>
                确认将用户 <b>"{removing?.nickname}"</b> 从当前租户移除？移除后该用户将不再属于当前租户。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认移除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>批量移除</AlertDialogTitle>
              <AlertDialogDescription>
                确认将选中的 <b>{selected.length}</b> 个用户从当前租户移除？移除后这些用户将不再归属于当前租户。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBatchRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认移除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        <Dialog
          open={!!assigning}
          onOpenChange={(o) => {
            if (!o) setAssigning(null);
            else {
              setAssignRoles(assigning?.roles ?? []);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>分配角色</DialogTitle>
              <DialogDescription>
                为用户 <b>{assigning?.nickname}</b> 设置角色，控制其在系统中的权限范围。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <section className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  角色
                </div>
                <div className="space-y-1 rounded-md border p-2">
                  {roleOptions.map((r) => {
                    const checked = assignRoles.includes(r.name);
                    return (
                      <label
                        key={r.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setAssignRoles((prev) => (v ? [...prev, r.name] : prev.filter((n) => n !== r.name)))
                          }
                        />
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="font-medium">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssigning(null)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  if (!assigning) return;
                  setUsers((prev) =>
                    prev.map((x) =>
                      x.id === assigning.id ? { ...x, roles: assignRoles } : x,
                    ),
                  );
                  toast.success("已更新", {
                    description: `${assigning.nickname}：${assignRoles.join(" / ") || "无角色"}`,
                  });
                  setAssigning(null);
                }}
              >
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <ImportUserDialog open={importOpen} onClose={() => setImportOpen(false)} />


      </div>
    </TooltipProvider>
  );
}

/* ============================================================ */
/* 子组件                                                       */
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
  tone: "primary" | "danger" | "warning" | "success" | "muted";
  onClick?: () => void;
}) {
  const cls =
    tone === "primary"
      ? "text-primary hover:bg-primary/10"
      : tone === "danger"
        ? "text-destructive hover:bg-destructive/10"
        : tone === "warning"
          ? "text-warning hover:bg-warning/10"
          : tone === "success"
            ? "text-success hover:bg-success/10"
            : "text-muted-foreground hover:bg-muted";
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

const DATA_SCOPE_OPTIONS = [
  { value: "all", label: "超级管理员" },
  { value: "self", label: "本人" },
] as const;

function ReqLabel({ required, children }: { required?: boolean; children: React.ReactNode }) {
  return (
    <Label className="flex w-24 shrink-0 items-center justify-end gap-0.5 text-sm text-foreground">
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

function UserFormDialog({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: SystemUser | null;
  onClose: () => void;
  onSave: (form: Partial<SystemUser>) => void;
}) {
  const roleOptions = useSystemRoles().filter((r) => r.status === "active");
  const [form, setForm] = useState<Partial<SystemUser>>({});

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { ...editing }
          : {
              nickname: "",
              phone: "",
              email: "",
              gender: "unknown",
              roles: [],
              tenantId: undefined,
              tenantName: undefined,
              dataScope: undefined,
              status: "active",
              remark: "",
            },
      );
    }
  }, [open, editing]);

  const handleSubmit = () => {
    if (!form.nickname?.trim()) {
      toast.error("请填写用户昵称");
      return;
    }
    if (!form.phone?.trim()) {
      toast.error("请填写手机号码");
      return;
    }
    if (!form.roles || form.roles.length === 0) {
      toast.error("请选择角色");
      return;
    }
    onSave({ ...form, username: form.username || form.phone });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "修改用户" : "新增用户"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-2">
          <FieldRow required label="用户昵称">
            <Input
              value={form.nickname ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              placeholder="请输入用户昵称"
            />
          </FieldRow>

          <FieldRow required label="手机号码">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="请输入手机号码"
              disabled={!!editing}
              className={editing ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
            />
            {!editing && (
              <p className="mt-1 text-xs text-muted-foreground">请输入手机号作为登录用户名</p>
            )}
          </FieldRow>
          <FieldRow label="邮箱">
            <Input
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="请输入邮箱"
            />
          </FieldRow>



          <FieldRow label="用户性别">
            <Select
              value={form.gender ?? "unknown"}
              onValueChange={(v) => setForm((f) => ({ ...f, gender: v as SystemUser["gender"] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">男</SelectItem>
                <SelectItem value="female">女</SelectItem>
                <SelectItem value="unknown">未知</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow required label="角色">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="truncate">
                    {form.roles && form.roles.length > 0 ? (
                      form.roles.join("、")
                    ) : (
                      <span className="text-muted-foreground">请选择</span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1">
                  {roleOptions.map((r) => {
                    const checked = form.roles?.includes(r.name) ?? false;
                    return (
                      <label
                        key={r.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setForm((f) => {
                              const cur = f.roles ?? [];
                              return {
                                ...f,
                                roles: v ? [...cur, r.name] : cur.filter((n) => n !== r.name),
                              };
                            });
                          }}
                        />
                        {r.name}
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </FieldRow>

          <div className="col-span-2">
            <FieldRow label="备注">
              <Textarea
                value={form.remark ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                placeholder="请输入内容"
                rows={3}
              />
            </FieldRow>
          </div>
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

function ImportUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      "用户昵称*",
      "手机号码*",
      "邮箱",
      "用户性别(男/女/未知)",
      "角色*",
      "数据权限*",
      "状态(正常/停用)",
      "备注",
    ];
    const sample = ["张三", "13800138000", "zhangsan@boo.com", "男", "运营专员", "本人", "正常", ""];
    const csv = "\uFEFF" + headers.join(",") + "\n" + sample.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "用户导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("模板已下载");
  };

  const handleImport = () => {
    if (!file) {
      toast.error("请先选择导入文件");
      return;
    }
    toast.success("导入成功", { description: `已解析文件 ${file.name}` });
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>导入用户</DialogTitle>
          <DialogDescription>通过批量导入快速创建用户。请先下载模板，按格式填写后上传。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">用户导入模板</div>
                <div className="text-xs text-muted-foreground">CSV 格式，含字段说明与示例</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4" />
              下载模板
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">选择文件</Label>
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/30 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5",
              )}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="text-sm text-foreground">{file ? file.name : "点击选择 .csv / .xlsx 文件"}</div>
              <div className="text-xs text-muted-foreground">单个文件不超过 10MB</div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-foreground/80">
            <div className="mb-1 font-medium text-warning">字段必填说明</div>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>
                <b>用户昵称</b>、<b>手机号码</b>、<b>角色</b>、<b>数据权限</b> 为必填项；
              </li>
              <li>
                <b>角色</b>、<b>数据权限</b> 须与系统已有名称一致，否则该行将导入失败；
              </li>
              <li>
                <b>手机号码</b> 在系统内须唯一，重复将提示并跳过；
              </li>
              <li>
                <b>状态</b> 默认为"正常"，可填写"正常"或"停用"。
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleImport}>开始导入</Button>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
