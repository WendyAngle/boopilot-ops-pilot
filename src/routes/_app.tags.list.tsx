import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Search,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Tag as TagIcon,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useSystemTags,
  tagsActions,
  type SystemTag,
  type TagStatus,
} from "@/lib/systemTags";

export const Route = createFileRoute("/_app/tags/list")({
  component: TagManagement,
  head: () => ({
    meta: [
      { title: "标签管理 — BooPilot" },
      { name: "description", content: "统一维护全局标签层级、颜色与状态" },
    ],
  }),
});

/* ============================================================ */
/* 工具                                                          */
/* ============================================================ */

interface TagNode extends SystemTag {
  children: TagNode[];
  depth: number;
}

function buildTree(list: SystemTag[]): TagNode[] {
  const map = new Map<string, TagNode>();
  list.forEach((t) => map.set(t.id, { ...t, children: [], depth: 0 }));
  const roots: TagNode[] = [];
  map.forEach((n) => {
    if (n.parentId && map.has(n.parentId)) {
      const p = map.get(n.parentId)!;
      n.depth = p.depth + 1;
      p.children.push(n);
    } else {
      roots.push(n);
    }
  });
  const sortRec = (arr: TagNode[]) => {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

function flatten(
  nodes: TagNode[],
  expanded: Record<string, boolean>,
  out: TagNode[] = [],
): TagNode[] {
  nodes.forEach((n) => {
    out.push(n);
    if (n.children.length && expanded[n.id]) flatten(n.children, expanded, out);
  });
  return out;
}

function filterTree(nodes: TagNode[], kw: string, status: string): TagNode[] {
  const result: TagNode[] = [];
  nodes.forEach((n) => {
    const childMatched = filterTree(n.children, kw, status);
    const k = kw.toLowerCase();
    const nameOk =
      !kw ||
      n.name.toLowerCase().includes(k) ||
      n.code.toLowerCase().includes(k);
    const statusOk = status === "all" || n.status === status;
    if ((nameOk && statusOk) || childMatched.length) {
      result.push({ ...n, children: childMatched });
    }
  });
  return result;
}

/* ============================================================ */
/* 主组件                                                        */
/* ============================================================ */

function TagManagement() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | TagStatus>("all");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<"all" | TagStatus>("all");

  const tags = useSystemTags();
  const tree = useMemo(() => buildTree(tags), [tags]);
  const filteredTree = useMemo(
    () => filterTree(tree, appliedKeyword, appliedStatus),
    [tree, appliedKeyword, appliedStatus],
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "tag-2": true,
    "tag-music": true,
  });
  const rows = useMemo(
    () => flatten(filteredTree, expanded),
    [filteredTree, expanded],
  );

  const pageSize = 10;
  const [page, setPage] = useState(1);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(rows.length / pageSize)),
    [rows.length, pageSize],
  );
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemTag | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SystemTag | null>(null);

  const handleSearch = () => {
    setAppliedKeyword(keyword.trim());
    setAppliedStatus(status);
    setPage(1);
  };
  const handleReset = () => {
    setKeyword("");
    setStatus("all");
    setAppliedKeyword("");
    setAppliedStatus("all");
    setPage(1);
    toast.success("已重置筛选条件");
  };

  const toggle = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const expandAll = () => {
    const all: Record<string, boolean> = {};
    tags.forEach((t) => (all[t.id] = true));
    setExpanded(all);
  };
  const collapseAll = () => setExpanded({});

  const openAdd = (parentId: string | null) => {
    setEditing(null);
    setDefaultParentId(parentId);
    setFormOpen(true);
  };
  const openEdit = (t: SystemTag) => {
    setEditing(t);
    setDefaultParentId(t.parentId);
    setFormOpen(true);
  };

  const handleToggleStatus = (t: SystemTag) => {
    tagsActions.setStatus(t.id, t.status === "active" ? "inactive" : "active");
    toast.success(t.status === "active" ? "已停用" : "已启用", {
      description: t.name,
    });
  };

  const handleSave = (form: Partial<SystemTag>) => {
    if (editing) {
      tagsActions.update(editing.id, form);
      toast.success("保存成功", { description: form.name });
    } else {
      const t = tagsActions.add({
        name: form.name || "新标签",
        color: form.color,
        parentId: form.parentId ?? null,
      });
      // 应用其它可选字段
      tagsActions.update(t.id, {
        code: form.code || t.code,
        order: form.order ?? t.order,
        status: form.status ?? t.status,
        description: form.description,
        remark: form.remark,
      });
      if (form.parentId) {
        setExpanded((p) => ({ ...p, [form.parentId as string]: true }));
      }
      toast.success("新增成功", { description: form.name });
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    tagsActions.remove(deleting.id);
    toast.success("已删除", { description: deleting.name });
    setDeleting(null);
  };

  const stats = useMemo(
    () => ({
      total: tags.length,
      active: tags.filter((t) => t.status === "active").length,
      inactive: tags.filter((t) => t.status === "inactive").length,
      roots: tags.filter((t) => !t.parentId).length,
    }),
    [tags],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-w-0 space-y-6">
        {/* 标题 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">标签管理</h1>
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              全局标签库
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            统一维护标签层级、颜色与状态，可应用于账号、任务、素材、智能体等全部业务对象。
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="标签总数" value={stats.total} icon={TagIcon} tone="primary" />
          <StatCard title="启用" value={stats.active} icon={CheckCircle2} tone="success" />
          <StatCard title="停用" value={stats.inactive} icon={ShieldCheck} tone="muted" />
        </div>

        {/* 筛选 */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormItem label="关键词">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="标签名称 / 标签编码"
              />
            </FormItem>
            <FormItem label="状态">
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <div className="flex items-end justify-end gap-2">
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
                搜索
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
            </div>
          </div>
        </div>

        {/* 工具栏 + 表格 */}
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-4">
            <Button onClick={() => openAdd(null)}>
              <Plus className="h-4 w-4" />
              新增标签
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button size="sm" variant="ghost" onClick={expandAll}>
                展开全部
              </Button>
              <Button size="sm" variant="ghost" onClick={collapseAll}>
                折叠全部
              </Button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1240px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="w-14 pl-4 text-center">#</TableHead>
                  <TableHead className="w-[140px]">标签ID</TableHead>
                  <TableHead className="w-[260px]">标签名称</TableHead>
                  <TableHead className="w-[80px] text-center">排序</TableHead>
                  <TableHead className="w-[90px] text-center">状态</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[160px]">创建时间</TableHead>
                  <TableHead className="w-[240px] pr-4 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((t, idx) => {
                    const has = t.children.length > 0;
                    const isOpen = expanded[t.id];
                    return (
                      <TableRow key={t.id} className="group">
                        <TableCell className="pl-4 text-center text-muted-foreground tabular-nums">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                          {t.id}
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-1.5"
                            style={{ paddingLeft: t.depth * 20 }}
                          >
                            {has ? (
                              <button
                                type="button"
                                onClick={() => toggle(t.id)}
                                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="inline-block w-5" />
                            )}
                            <TagPill name={t.name} color={t.color} />
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              {t.code}
                            </span>
                            {t.parentId && (
                              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                子级
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono tabular-nums">
                          {t.order}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={t.status === "active"}
                              onCheckedChange={() => handleToggleStatus(t)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                          {t.description || (
                            <span className="text-border">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                          {t.createdAt}
                        </TableCell>
                        <TableCell className="pr-4 text-center">
                          <div className="flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap">
                            <IconAction
                              icon={Pencil}
                              tip="编辑"
                              tone="primary"
                              onClick={() => openEdit(t)}
                            />
                            <IconAction
                              icon={Plus}
                              tip="添加子标签"
                              tone="primary"
                              onClick={() => openAdd(t.id)}
                            />
                            <IconAction
                              icon={Trash2}
                              tip="删除"
                              tone="danger"
                              onClick={() => setDeleting(t)}
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
            total={rows.length}
            setPage={setPage}
          />
        </div>

        {/* 新增/编辑弹窗 */}
        <TagFormDialog
          open={formOpen}
          editing={editing}
          defaultParentId={defaultParentId}
          allTags={tags}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
        />

        {/* 删除 */}
        <AlertDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除该标签？</AlertDialogTitle>
              <AlertDialogDescription>
                即将删除标签 <b>{deleting?.name}</b>
                {tags.some((x) => x.parentId === deleting?.id) && (
                  <span className="text-destructive">（包含其全部子标签）</span>
                )}
                ，删除后已关联的业务对象将自动解除该标签，操作不可恢复。
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
      </div>
    </TooltipProvider>
  );
}

/* ============================================================ */
/* 子组件                                                        */
/* ============================================================ */

function FormItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="w-16 shrink-0 text-right text-sm text-muted-foreground">
        {label}
      </Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function TagPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}1A`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {name}
    </span>
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
  tone: "primary" | "danger";
  onClick?: () => void;
}) {
  const cls =
    tone === "primary"
      ? "text-primary hover:bg-primary/10"
      : "text-destructive hover:bg-destructive/10";
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

/* -------- 表单弹窗 -------- */

const PRESET_COLORS = [
  "#409EFF", "#16A6A6", "#67C23A", "#E6A23C",
  "#F56C6C", "#909399", "#9B5CFF", "#FF8C00",
  "#1E88E5", "#43A047", "#FB8C00", "#E53935",
  "#8E24AA", "#3949AB", "#00897B", "#6D4C41",
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-12 items-center justify-center rounded-md border border-border shadow-sm transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: value }}
            aria-label="选择颜色"
            onClick={() => setDraft(value)}
          >
            <ChevronDown className="h-3.5 w-3.5 text-white drop-shadow" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div
              className="h-16 w-full rounded-md border border-border"
              style={{ backgroundColor: draft }}
            />
            <div className="grid grid-cols-8 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft(c)}
                  className={cn(
                    "h-6 w-6 rounded border transition-transform hover:scale-110",
                    draft.toUpperCase() === c.toUpperCase()
                      ? "border-foreground ring-2 ring-primary/40"
                      : "border-border",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-8 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(draft)) {
                    onChange(draft.toUpperCase());
                    setOpen(false);
                  } else {
                    toast.error("颜色格式不正确", {
                      description: "请使用 #RRGGBB 格式",
                    });
                  }
                }}
              >
                确定
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <span className="font-mono text-sm uppercase">{value}</span>
    </div>
  );
}

function FieldRow({
  required,
  label,
  children,
}: {
  required?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Label className="flex w-20 shrink-0 items-center justify-end gap-0.5 pt-2 text-sm">
        {required && <span className="text-destructive">*</span>}
        <span>{label}</span>
      </Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function TagFormDialog({
  open,
  editing,
  defaultParentId,
  allTags,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: SystemTag | null;
  defaultParentId: string | null;
  allTags: SystemTag[];
  onClose: () => void;
  onSave: (form: Partial<SystemTag>) => void;
}) {
  const [form, setForm] = useState<Partial<SystemTag>>({});

  useMemo(() => {
    if (open) {
      setForm(
        editing
          ? { ...editing }
          : {
              parentId: defaultParentId,
              name: "",
              code: "",
              color: "#409EFF",
              order: 0,
              status: "active",
              description: "",
              remark: "",
            },
      );
    }
  }, [open, editing, defaultParentId]);

  const parentOptions = useMemo(() => {
    if (!editing) return allTags;
    const banned = new Set<string>([editing.id]);
    const collect = (pid: string) => {
      allTags
        .filter((x) => x.parentId === pid)
        .forEach((c) => {
          banned.add(c.id);
          collect(c.id);
        });
    };
    collect(editing.id);
    return allTags.filter((d) => !banned.has(d.id));
  }, [allTags, editing]);

  const handleSubmit = () => {
    if (!form.name?.trim()) {
      toast.error("请输入标签名称");
      return;
    }
    if (!form.color) {
      toast.error("请选择标签颜色");
      return;
    }
    onSave(form);
  };

  const adjustOrder = (delta: number) =>
    setForm((f) => ({ ...f, order: Math.max(0, (f.order ?? 0) + delta) }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑标签" : "新增标签"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <FieldRow label="父级标签">
            <Select
              value={form.parentId ?? "__root__"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  parentId: v === "__root__" ? null : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="无（顶级）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">无（顶级）</SelectItem>
                {parentOptions
                  .filter((d) => !d.parentId)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow required label="标签名称">
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="请输入标签名称"
            />
          </FieldRow>

          <FieldRow label="标签编码">
            <Input
              value={form.code ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="英文 / 下划线，例如 high_intent"
              className="font-mono"
            />
          </FieldRow>

          <FieldRow required label="标签颜色">
            <ColorPicker
              value={form.color ?? "#409EFF"}
              onChange={(v) => setForm((f) => ({ ...f, color: v }))}
            />
          </FieldRow>

          <FieldRow label="排序">
            <div className="flex max-w-[200px] items-center">
              <button
                type="button"
                onClick={() => adjustOrder(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-l-md border border-r-0 border-border bg-muted/40 hover:bg-accent"
              >
                −
              </button>
              <Input
                type="number"
                value={form.order ?? 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order: Number(e.target.value) }))
                }
                className="h-10 rounded-none text-center"
              />
              <button
                type="button"
                onClick={() => adjustOrder(1)}
                className="flex h-10 w-10 items-center justify-center rounded-r-md border border-l-0 border-border bg-muted/40 hover:bg-accent"
              >
                +
              </button>
            </div>
          </FieldRow>

          <FieldRow required label="状态">
            <RadioGroup
              value={form.status ?? "active"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, status: v as TagStatus }))
              }
              className="flex h-10 items-center gap-6"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="active" id="tag-status-active" />
                <span
                  className={cn(
                    form.status === "active" && "font-medium text-primary",
                  )}
                >
                  启用
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="inactive" id="tag-status-inactive" />
                <span>停用</span>
              </label>
            </RadioGroup>
          </FieldRow>

          <FieldRow label="描述">
            <Textarea
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="请输入标签描述"
              rows={2}
            />
          </FieldRow>

          <FieldRow label="备注">
            <Textarea
              value={form.remark ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, remark: e.target.value }))
              }
              placeholder="请输入备注"
              rows={2}
            />
          </FieldRow>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
