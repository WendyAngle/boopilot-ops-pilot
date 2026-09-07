import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  ListTodo,
  Users,
  FolderOpen,
  Building2,
  Tags,
  Server,
  Bot,
  Settings,
  Menu as MenuIcon,
  FoldVertical,
  UnfoldVertical,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

export const Route = createFileRoute("/_app/system/menus")({
  component: MenuManagement,
  head: () => ({
    meta: [
      { title: "菜单管理 — BooPilot" },
      { name: "description", content: "维护系统菜单、按钮与权限标识" },
    ],
  }),
});

/* ============================================================ */
/* 类型 & 数据                                                   */
/* ============================================================ */

type MenuType = "catalog" | "menu" | "button";
type VisibleStatus = "show" | "hide";
type EnableStatus = "active" | "inactive";

interface MenuItem {
  id: string;
  parentId: string | null;
  name: string;
  type: MenuType;
  icon?: string; // lucide name
  permission?: string; // 权限标识
  path?: string; // 路由地址
  component?: string; // 组件路径
  routeName?: string; // 路由名称
  order: number;
  visible: VisibleStatus;
  status: EnableStatus;
  external: boolean;
  redirect?: string;
  highlight?: string;
  fullscreen: boolean;
  affix: boolean;
  cache: boolean;
  hideTab: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ListTodo,
  Users,
  FolderOpen,
  Building2,
  Tags,
  Server,
  Bot,
  Settings,
  Menu: MenuIcon,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

/** 初始 mock 菜单数据：完全对照本系统左侧导航 + 系统管理下补充按钮权限示例 */
const INITIAL_MENUS: MenuItem[] = [
  {
    id: "m-dashboard",
    parentId: null,
    name: "工作台",
    type: "menu",
    icon: "LayoutDashboard",
    path: "/",
    component: "_app.index",
    routeName: "Dashboard",
    permission: "dashboard:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: true,
    cache: true,
    hideTab: false,
  },

  // 任务管理
  {
    id: "m-tasks",
    parentId: null,
    name: "任务管理",
    type: "catalog",
    icon: "ListTodo",
    path: "/tasks",
    component: "Layout",
    order: 2,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-tasks-templates",
    parentId: "m-tasks",
    name: "任务模版",
    type: "menu",
    icon: "ListTodo",
    path: "/tasks/templates",
    component: "_app.tasks.templates",
    routeName: "TaskTemplates",
    permission: "tasks:template:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },
  {
    id: "m-tasks-list",
    parentId: "m-tasks",
    name: "任务列表",
    type: "menu",
    icon: "ListTodo",
    path: "/tasks/list",
    component: "_app.tasks.list",
    routeName: "TaskList",
    permission: "tasks:list:view",
    order: 2,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },
  {
    id: "m-tasks-list-create",
    parentId: "m-tasks-list",
    name: "新建任务",
    type: "button",
    permission: "tasks:list:create",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-tasks-list-logs",
    parentId: "m-tasks-list",
    name: "查看日志",
    type: "button",
    permission: "tasks:list:logs",
    order: 2,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },

  // 账号管理
  {
    id: "m-accounts",
    parentId: null,
    name: "账号管理",
    type: "catalog",
    icon: "Users",
    path: "/accounts",
    component: "Layout",
    order: 3,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-accounts-managed",
    parentId: "m-accounts",
    name: "托管账号",
    type: "menu",
    icon: "Users",
    path: "/accounts/managed",
    component: "_app.accounts.managed.index",
    routeName: "ManagedAccounts",
    permission: "accounts:managed:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },

  // 成品素材
  {
    id: "m-materials",
    parentId: null,
    name: "成品素材",
    type: "catalog",
    icon: "FolderOpen",
    path: "/materials",
    component: "Layout",
    order: 4,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-materials-posts",
    parentId: "m-materials",
    name: "贴文素材",
    type: "menu",
    icon: "FolderOpen",
    path: "/materials/posts",
    component: "_app.materials.posts",
    routeName: "MaterialsPosts",
    permission: "materials:posts:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },
  {
    id: "m-materials-ai",
    parentId: "m-materials",
    name: "AI 创作",
    type: "menu",
    icon: "FolderOpen",
    path: "/materials/ai",
    component: "_app.materials.ai",
    routeName: "MaterialsAi",
    permission: "materials:ai:view",
    order: 2,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },

  // 租户管理
  {
    id: "m-tenants",
    parentId: null,
    name: "租户管理",
    type: "catalog",
    icon: "Building2",
    path: "/tenants",
    component: "Layout",
    order: 5,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-tenants-list",
    parentId: "m-tenants",
    name: "租户列表",
    type: "menu",
    icon: "Building2",
    path: "/tenants/list",
    component: "_app.tenants.list",
    routeName: "TenantsList",
    permission: "tenants:list:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },

  // 标签管理
  {
    id: "m-tags",
    parentId: null,
    name: "标签管理",
    type: "catalog",
    icon: "Tags",
    path: "/tags",
    component: "Layout",
    order: 6,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-tags-list",
    parentId: "m-tags",
    name: "标签管理",
    type: "menu",
    icon: "Tags",
    path: "/tags/list",
    component: "_app.tags.list",
    routeName: "TagsList",
    permission: "tags:list:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },

  // 资源管理
  {
    id: "m-resources",
    parentId: null,
    name: "资源管理",
    type: "catalog",
    icon: "Server",
    path: "/resources",
    component: "Layout",
    order: 7,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-resources-devices",
    parentId: "m-resources",
    name: "设备列表",
    type: "menu",
    icon: "Server",
    path: "/resources/devices",
    component: "_app.resources.devices",
    routeName: "ResourcesDevices",
    permission: "resources:devices:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },
  {
    id: "m-resources-ips",
    parentId: "m-resources",
    name: "IP列表",
    type: "menu",
    icon: "Server",
    path: "/resources/ips",
    component: "_app.resources.ips",
    routeName: "ResourcesIps",
    permission: "resources:ips:view",
    order: 2,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },
  {
    id: "m-resources-images",
    parentId: "m-resources",
    name: "镜像实例",
    type: "menu",
    icon: "Server",
    path: "/resources/images",
    component: "_app.resources.images",
    routeName: "ResourcesImages",
    permission: "resources:images:view",
    order: 3,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },

  // 智能体管理
  {
    id: "m-agents",
    parentId: null,
    name: "智能体管理",
    type: "catalog",
    icon: "Bot",
    path: "/agents",
    component: "Layout",
    order: 8,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-agents-list",
    parentId: "m-agents",
    name: "智能体列表",
    type: "menu",
    icon: "Bot",
    path: "/agents/list",
    component: "_app.agents.list",
    routeName: "AgentsList",
    permission: "agents:list:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },

  // 系统管理
  {
    id: "m-system",
    parentId: null,
    name: "系统管理",
    type: "catalog",
    icon: "Settings",
    path: "/system",
    component: "Layout",
    order: 9,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-system-users",
    parentId: "m-system",
    name: "用户管理",
    type: "menu",
    icon: "Users",
    path: "/system/users",
    component: "_app.system.users",
    routeName: "SystemUsers",
    permission: "system:users:view",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },
  {
    id: "m-system-users-create",
    parentId: "m-system-users",
    name: "新增用户",
    type: "button",
    permission: "system:users:create",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-system-users-reset",
    parentId: "m-system-users",
    name: "重置密码",
    type: "button",
    permission: "system:users:reset",
    order: 2,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-system-roles",
    parentId: "m-system",
    name: "角色管理",
    type: "menu",
    icon: "Users",
    path: "/system/roles",
    component: "_app.system.roles",
    routeName: "SystemRoles",
    permission: "system:roles:view",
    order: 2,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },
  {
    id: "m-system-roles-assign",
    parentId: "m-system-roles",
    name: "分配权限",
    type: "button",
    permission: "system:roles:assign",
    order: 1,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: false,
    hideTab: false,
  },
  {
    id: "m-system-menus",
    parentId: "m-system",
    name: "菜单管理",
    type: "menu",
    icon: "Menu",
    path: "/system/menus",
    component: "_app.system.menus",
    routeName: "SystemMenus",
    permission: "system:menus:view",
    order: 4,
    visible: "show",
    status: "active",
    external: false,
    fullscreen: false,
    affix: false,
    cache: true,
    hideTab: false,
  },
];

/* ============================================================ */
/* 工具                                                          */
/* ============================================================ */

interface TreeNode extends MenuItem {
  children: TreeNode[];
  depth: number;
}

function buildTree(items: MenuItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  items.forEach((it) => map.set(it.id, { ...it, children: [], depth: 0 }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      const p = map.get(node.parentId)!;
      node.depth = p.depth + 1;
      p.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr: TreeNode[]) => {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((n) => {
      n.depth = computeDepth(n.id, items);
      sortRec(n.children);
    });
  };
  sortRec(roots);
  return roots;
}

function computeDepth(id: string, items: MenuItem[]): number {
  let depth = 0;
  let cur = items.find((i) => i.id === id);
  while (cur && cur.parentId) {
    depth++;
    cur = items.find((i) => i.id === cur!.parentId);
  }
  return depth;
}

function collectIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (arr: TreeNode[]) =>
    arr.forEach((n) => {
      if (n.children.length) ids.push(n.id);
      walk(n.children);
    });
  walk(nodes);
  return ids;
}

function collectDescendantIds(items: MenuItem[], rootId: string): string[] {
  const result: string[] = [];
  const walk = (pid: string) => {
    items
      .filter((i) => i.parentId === pid)
      .forEach((c) => {
        result.push(c.id);
        walk(c.id);
      });
  };
  walk(rootId);
  return result;
}

function filterTree(nodes: TreeNode[], keyword: string): TreeNode[] {
  if (!keyword.trim()) return nodes;
  const kw = keyword.trim().toLowerCase();
  const walk = (arr: TreeNode[]): TreeNode[] =>
    arr
      .map((n) => {
        const kids = walk(n.children);
        const hit =
          n.name.toLowerCase().includes(kw) ||
          (n.permission?.toLowerCase().includes(kw) ?? false) ||
          (n.path?.toLowerCase().includes(kw) ?? false);
        if (hit || kids.length) return { ...n, children: kids };
        return null;
      })
      .filter((x): x is TreeNode => x !== null);
  return walk(nodes);
}

/* ============================================================ */
/* 页面                                                          */
/* ============================================================ */

function MenuManagement() {
  const [items, setItems] = useState<MenuItem[]>(INITIAL_MENUS);
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(INITIAL_MENUS.filter((i) => !i.parentId).map((i) => i.id)),
  );

  const tree = useMemo(() => buildTree(items), [items]);
  const filtered = useMemo(() => filterTree(tree, keyword), [tree, keyword]);
  const allParentIds = useMemo(() => collectIds(tree), [tree]);

  const expandAll = () => setExpanded(new Set(allParentIds));
  const collapseAll = () => setExpanded(new Set());
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 统计
  const stats = useMemo(() => {
    const catalog = items.filter((i) => i.type === "catalog").length;
    const menu = items.filter((i) => i.type === "menu").length;
    const button = items.filter((i) => i.type === "button").length;
    return { total: items.length, catalog, menu, button };
  }, [items]);

  /* ---------------- 弹窗 ---------------- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<MenuItem>(blankItem());

  function blankItem(parentId: string | null = null): MenuItem {
    return {
      id: "",
      parentId,
      name: "",
      type: "catalog",
      icon: "",
      permission: "",
      path: "",
      component: "",
      routeName: "",
      order: 0,
      visible: "show",
      status: "active",
      external: false,
      redirect: "",
      highlight: "",
      fullscreen: false,
      affix: false,
      cache: false,
      hideTab: false,
    };
  }

  const openCreate = (parentId: string | null = null) => {
    setEditing(null);
    setForm({ ...blankItem(parentId) });
    setDialogOpen(true);
  };
  const openEdit = (it: MenuItem) => {
    setEditing(it);
    setForm({ ...it });
    setDialogOpen(true);
  };

  const submitForm = () => {
    if (!form.name.trim()) return toast.error("请输入菜单名称");
    if (form.type !== "button" && !form.external && !form.path?.trim())
      return toast.error("请输入路由地址");
    if (form.type === "menu" && !form.component?.trim())
      return toast.error("请输入组件路径");

    if (editing) {
      setItems((prev) => prev.map((i) => (i.id === editing.id ? { ...form, id: editing.id } : i)));
      toast.success("菜单已更新");
    } else {
      const id = `m-${Date.now()}`;
      setItems((prev) => [...prev, { ...form, id }]);
      if (form.parentId) setExpanded((p) => new Set(p).add(form.parentId!));
      toast.success("菜单已创建");
    }
    setDialogOpen(false);
  };

  /* ---------------- 删除 ---------------- */
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const confirmDelete = () => {
    if (!deleteId) return;
    const toRemove = new Set([deleteId, ...collectDescendantIds(items, deleteId)]);
    setItems((prev) => prev.filter((i) => !toRemove.has(i.id)));
    toast.success("已删除菜单");
    setDeleteId(null);
  };

  const toggleVisible = (id: string, v: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, visible: v ? "show" : "hide" } : i)),
    );
  };

  // 父级选项（目录 / 菜单 可作为父级）
  const parentOptions = useMemo(
    () => items.filter((i) => i.type !== "button"),
    [items],
  );

  /* ---------------- 渲染树 ---------------- */
  const renderRows = (nodes: TreeNode[]): React.ReactNode =>
    nodes.map((n) => {
      const hasChildren = n.children.length > 0;
      const open = expanded.has(n.id);
      const Icon = n.icon ? ICON_MAP[n.icon] : undefined;
      return (
        <Fragment key={n.id}>
          <TableRow className="group/row">
            <TableCell>
              <div
                className="flex items-center gap-1.5"
                style={{ paddingLeft: n.depth * 20 }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleExpand(n.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                  >
                    {open ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-5" />
                )}
                {Icon ? (
                  <Icon className="h-4 w-4 text-muted-foreground" />
                ) : n.type === "button" ? (
                  <span className="h-4 w-4" />
                ) : (
                  <MenuIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-foreground">{n.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <TypeBadge type={n.type} />
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {n.permission || "—"}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {n.path || "—"}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {n.component || "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{n.order}</TableCell>
            <TableCell>
              <Switch
                checked={n.visible === "show"}
                onCheckedChange={(v) => toggleVisible(n.id, v)}
              />
            </TableCell>
            <TableCell>
              <div className="flex flex-nowrap items-center gap-1 whitespace-nowrap">
                {n.type !== "button" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                    onClick={() => openCreate(n.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增下级
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                  onClick={() => openEdit(n)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteId(n.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </Button>
              </div>
            </TableCell>
          </TableRow>
          {open && hasChildren ? renderRows(n.children) : null}
        </Fragment>
      );
    });

  /* ============================================================ */
  return (
    <div className="space-y-4">
      {/* 顶部说明 */}
      <div>
        <h1 className="text-xl font-semibold">菜单管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          维护系统目录、菜单、按钮三类资源，配置路由、组件、权限标识与可见状态。
        </p>
      </div>

      {/* 概览 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="资源总数" value={stats.total} icon={MenuIcon} tone="primary" />
        <MiniStat label="目录" value={stats.catalog} icon={FolderOpen} tone="amber" />
        <MiniStat label="菜单" value={stats.menu} icon={LayoutDashboard} tone="emerald" />
        <MiniStat label="按钮" value={stats.button} icon={Settings} tone="sky" />
      </div>

      {/* 卡片：操作栏 + 表格 */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MenuIcon className="h-4 w-4 text-primary" />
            菜单列表
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="输入菜单名称 / 权限 / 路由过滤"
                className="h-8 w-64 pl-8 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setKeyword("")}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              重置
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={expandAll}>
              <UnfoldVertical className="mr-1 h-3.5 w-3.5" />
              展开全部
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={collapseAll}>
              <FoldVertical className="mr-1 h-3.5 w-3.5" />
              折叠全部
            </Button>
            <Button size="sm" className="h-8" onClick={() => openCreate(null)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              新增菜单
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1280px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-[260px]">菜单名称</TableHead>
                <TableHead className="w-[90px]">菜单类型</TableHead>
                <TableHead className="w-[170px]">权限标识</TableHead>
                <TableHead className="min-w-[180px]">路由路径</TableHead>
                <TableHead className="min-w-[200px]">组件路径</TableHead>
                <TableHead className="w-[70px]">排序</TableHead>
                <TableHead className="w-[70px]">可见</TableHead>
                <TableHead className="w-[260px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                renderRows(filtered)
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    未找到匹配的菜单
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 新增/编辑 弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑菜单" : "新增菜单"}</DialogTitle>
          </DialogHeader>

          <div className="grid max-h-[70vh] grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto py-2 pr-1">
            {/* 上级菜单 */}
            <Field label="上级菜单" required colSpan={2}>
              <Select
                value={form.parentId ?? "__root__"}
                onValueChange={(v) =>
                  setForm({ ...form, parentId: v === "__root__" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择上级菜单" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">主目录</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* 菜单类型 */}
            <Field label="菜单类型" required colSpan={2}>
              <RadioGroup
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as MenuType })}
                className="flex items-center gap-6"
              >
                {[
                  { v: "catalog", l: "目录" },
                  { v: "menu", l: "菜单" },
                  { v: "button", l: "按钮" },
                ].map((o) => (
                  <label key={o.v} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={o.v} id={`type-${o.v}`} />
                    <span>{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </Field>

            {/* 图标 + 名称 */}
            {form.type !== "button" && (
              <Field label="菜单图标" required>
                <Select
                  value={form.icon || ""}
                  onValueChange={(v) => setForm({ ...form, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择图标" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((n) => {
                      const I = ICON_MAP[n];
                      return (
                        <SelectItem key={n} value={n}>
                          <div className="flex items-center gap-2">
                            <I className="h-4 w-4" />
                            <span>{n}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="菜单名称" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入菜单名称"
              />
            </Field>

            {/* 路由名称 / 排序 */}
            {form.type !== "button" && (
              <Field label="路由名称">
                <Input
                  value={form.routeName || ""}
                  onChange={(e) => setForm({ ...form, routeName: e.target.value })}
                  placeholder="如 SystemUsers"
                />
              </Field>
            )}
            <Field label="显示排序" required>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })}
              />
            </Field>

            {/* 是否外链 / 路由地址 */}
            {form.type !== "button" && (
              <>
                <Field label="是否外链">
                  <YesNo
                    value={form.external}
                    onChange={(v) => setForm({ ...form, external: v })}
                  />
                </Field>
                <Field label="路由地址" required hint="组件页面对应的访问路径">
                  <Input
                    value={form.path || ""}
                    onChange={(e) => setForm({ ...form, path: e.target.value })}
                    placeholder="如 /system/menus"
                  />
                </Field>
              </>
            )}

            {/* 组件路径 + 权限字符 */}
            {form.type === "menu" && (
              <Field label="组件路径" required hint="对应路由文件，例如 _app.system.menus">
                <Input
                  value={form.component || ""}
                  onChange={(e) => setForm({ ...form, component: e.target.value })}
                  placeholder="如 _app.system.menus"
                />
              </Field>
            )}
            {(form.type === "menu" || form.type === "button") && (
              <Field
                label="权限字符"
                required={form.type === "button"}
                hint="后端鉴权关键字，如 system:menus:create"
              >
                <Input
                  value={form.permission || ""}
                  onChange={(e) => setForm({ ...form, permission: e.target.value })}
                  placeholder="如 system:menus:view"
                />
              </Field>
            )}

            {/* 其他属性（仅 目录 / 菜单） */}
            {form.type !== "button" && (
              <>
                <Field label="重定向地址">
                  <Input
                    value={form.redirect || ""}
                    onChange={(e) => setForm({ ...form, redirect: e.target.value })}
                    placeholder="可选"
                  />
                </Field>
                <Field label="详情页高亮菜单">
                  <Input
                    value={form.highlight || ""}
                    onChange={(e) => setForm({ ...form, highlight: e.target.value })}
                    placeholder="可选"
                  />
                </Field>

                <Field label="显示状态" required>
                  <RadioGroup
                    value={form.visible}
                    onValueChange={(v) => setForm({ ...form, visible: v as VisibleStatus })}
                    className="flex items-center gap-6"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="show" id="vis-s" />
                      显示
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="hide" id="vis-h" />
                      隐藏
                    </label>
                  </RadioGroup>
                </Field>
                <Field label="菜单状态">
                  <RadioGroup
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as EnableStatus })}
                    className="flex items-center gap-6"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="active" id="st-a" />
                      正常
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="inactive" id="st-i" />
                      停用
                    </label>
                  </RadioGroup>
                </Field>

                <Field label="是否全屏">
                  <YesNo value={form.fullscreen} onChange={(v) => setForm({ ...form, fullscreen: v })} />
                </Field>
                <Field label="是否固定标签页">
                  <YesNo value={form.affix} onChange={(v) => setForm({ ...form, affix: v })} />
                </Field>
                <Field label="是否缓存路由">
                  <YesNo value={form.cache} onChange={(v) => setForm({ ...form, cache: v })} />
                </Field>
                <Field label="是否隐藏标签">
                  <YesNo value={form.hideTab} onChange={(v) => setForm({ ...form, hideTab: v })} />
                </Field>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submitForm}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该菜单？</AlertDialogTitle>
            <AlertDialogDescription>
              删除将同时移除其下所有子菜单与按钮，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================ */
/* 小部件                                                        */
/* ============================================================ */

function TypeBadge({ type }: { type: MenuType }) {
  if (type === "catalog")
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
        目录
      </Badge>
    );
  if (type === "menu")
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        菜单
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
      按钮
    </Badge>
  );
}

function Field({
  label,
  required,
  hint,
  colSpan = 1,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  colSpan?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", colSpan === 2 && "col-span-2")}>
      <Label className="flex items-center gap-1 text-sm">
        {required && <span className="text-destructive">*</span>}
        <span>{label}</span>
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Label>
      {children}
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <RadioGroup
      value={value ? "y" : "n"}
      onValueChange={(v) => onChange(v === "y")}
      className="flex items-center gap-6"
    >
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="y" />
        是
      </label>
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="n" />
        否
      </label>
    </RadioGroup>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "amber" | "emerald" | "sky";
}) {
  const toneCls: Record<typeof tone, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
    sky: "bg-sky-100 text-sky-600",
  } as const;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneCls[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}
