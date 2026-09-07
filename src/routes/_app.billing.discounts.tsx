import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Percent,
  RefreshCw,
  Search,
  TrendingDown,
  Ban,
  Calculator,
  Wand2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";

import { PLAN_META, PLAN_TIERS, usePlans, type PlanTier } from "@/lib/billing-plans";
import {
  
  type BillingFunction,
  type DiscountValue,
  type FunctionMeta,
  formatDiscount,
  setDiscount,
  useDiscountMatrix,
  calcCost,
  useFunctionStatusMap,
  setFunctionStatus,
  deleteFunction,
  isFunctionRemoved,
  addFunction,
  useBillingFunctions,
} from "@/lib/billing-discounts";

export const Route = createFileRoute("/_app/billing/discounts")({
  component: DiscountsPage,
  head: () => ({
    meta: [
      { title: "积分管理 — BooPilot" },
      { name: "description", content: "功能 × 套餐 的积分折扣规则矩阵" },
    ],
  }),
});

function DiscountsPage() {
  const matrix = useDiscountMatrix();
  const statusMap = useFunctionStatusMap();
  const functions = useBillingFunctions();
  const plans = usePlans();
  const [keyword, setKeyword] = useState("");
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftPlan, setShiftPlan] = useState<PlanTier>("basic");
  const [shiftDelta, setShiftDelta] = useState(0.05);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFn, setEditFn] = useState<FunctionMeta | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{ fn: FunctionMeta; next: boolean } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<FunctionMeta | null>(null);

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return functions.filter((f) => !isFunctionRemoved(f.key)).filter((f) =>
      !kw ? true : f.label.toLowerCase().includes(kw) || f.key.includes(kw),
    );
  }, [keyword, statusMap, functions]);

  /** 各档套餐平均折扣 */
  const avgByPlan = useMemo(() => {
    const out: Record<PlanTier, number> = { free: 0, basic: 0, pro: 0, flagship: 0 };
    PLAN_TIERS.forEach((p) => {
      const vals = rows.map((f) => matrix[f.key][p]).filter((v): v is number => v !== "disabled");
      out[p] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    return out;
  }, [matrix, rows]);

  const totalCells = rows.length * 3;

  const handleShift = () => {
    rows.forEach((f) => {
      const cur = matrix[f.key][shiftPlan];
      if (cur === "disabled") return;
      const next = Math.min(1, Math.max(0.1, +(cur + shiftDelta).toFixed(2)));
      setDiscount(f.key, shiftPlan, next);
    });
    toast.success(
      `已对「${PLAN_META[shiftPlan].label}」全场${shiftDelta >= 0 ? "提价" : "让利"} ${Math.abs(shiftDelta * 10).toFixed(1)} 折`,
    );
    setShiftOpen(false);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-w-0 space-y-6">
        {/* 标题 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">积分管理</h2>
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              折扣规则
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            配置 <span className="font-medium text-foreground">「功能 × 套餐」</span> 二维折扣矩阵：消耗积分 = 模型基准积分 × 用量 × 折扣率。免费版固定为「禁用」，无法使用消耗积分的功能。
          </p>
        </div>

        {/* StatCard */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="计费功能数" value={rows.length} icon={Percent} tone="primary" />
          <StatCard
            title="基础版平均折扣"
            value={formatDiscount(avgByPlan.basic)}
            icon={TrendingDown}
            tone="primary"
          />
          <StatCard
            title="专业版平均折扣"
            value={formatDiscount(avgByPlan.pro)}
            icon={TrendingDown}
            tone="violet"
          />
          <StatCard
            title="旗舰版平均折扣"
            value={formatDiscount(avgByPlan.flagship)}
            icon={TrendingDown}
            tone="warning"
          />
        </div>

        {/* 搜索 */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full shrink-0 sm:w-[340px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索功能名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              共 {totalCells} 个可配置单元格 · 单元格点击即可编辑
            </div>
          </div>
        </div>

        {/* 操作工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShiftOpen(true)}>
            <Wand2 className="h-4 w-4" />
            一键平移
          </Button>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            新增折扣规则
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => toast.success("已刷新")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 矩阵表 */}
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[180px] pl-4">功能模块</TableHead>
                  <TableHead className="w-[110px]">单位</TableHead>
                  <TableHead className="w-[90px] text-right">基准积分</TableHead>
                  {PLAN_TIERS.map((p) => (
                    <TableHead key={p} className="w-[120px] text-center">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          PLAN_META[p].badgeCls,
                        )}
                      >
                        {PLAN_META[p].label}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="w-[110px] text-center">状态</TableHead>
                  <TableHead className="w-[130px] pr-4 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={PLAN_TIERS.length + 5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      暂无匹配功能
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((f) => {
                    const enabled = statusMap[f.key] ?? true;
                    return (
                      <TableRow key={f.key} className={cn(!enabled && "opacity-60")}>
                        <TableCell className="pl-4">
                          <div className="font-medium text-foreground">{f.label}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{f.key}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          每 1 {f.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-sm">
                          {f.baseCost}
                        </TableCell>
                        {PLAN_TIERS.map((p) => (
                          <TableCell key={p} className="text-center">
                            <DiscountCell
                              fn={f.key}
                              plan={p}
                              value={matrix[f.key][p]}
                              base={f.baseCost}
                              unit={f.unit}
                              disabled={!enabled}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-2">
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(v) =>
                                    setToggleTarget({ fn: f, next: v })
                                  }
                                />
                                <span
                                  className={cn(
                                    "text-xs",
                                    enabled ? "text-success" : "text-muted-foreground",
                                  )}
                                >
                                  {enabled ? "启用" : "停用"}
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {enabled
                                ? `点击停用「${f.label}」，停用后该功能将不可使用`
                                : `点击启用「${f.label}」，启用后租户可按折扣消耗积分使用`}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="pr-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditFn(f)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>编辑 / 查看详情</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setDeleteTarget(f)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>删除此折扣规则</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 说明 */}
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <Calculator className="h-3.5 w-3.5" />
            计费公式
          </div>
          <code className="rounded bg-background px-2 py-1 text-[11px] text-foreground">
            消耗积分 = ⌈ 模型基准积分 × 用量 × 套餐折扣率 ⌉
          </code>
          <span className="ml-2">；免费版任何功能均不可用，需升级套餐解锁。</span>
        </div>

        {/* 一键平移 */}
        <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>一键平移折扣</DialogTitle>
              <DialogDescription>对选定套餐档位的所有功能折扣率统一加减。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">套餐档位</Label>
                <Select value={shiftPlan} onValueChange={(v) => setShiftPlan(v as PlanTier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TIERS.filter((p) => p !== "free").map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLAN_META[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  变化量：{shiftDelta >= 0 ? "+" : ""}
                  {(shiftDelta * 10).toFixed(1)} 折（{shiftDelta >= 0 ? "提价" : "让利"}）
                </Label>
                <Slider
                  value={[shiftDelta]}
                  min={-0.3}
                  max={0.3}
                  step={0.05}
                  onValueChange={([v]) => setShiftDelta(+v.toFixed(2))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShiftOpen(false)}>
                取消
              </Button>
              <Button onClick={handleShift}>应用</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 新增折扣规则 */}
        <CreateRuleDialog
          open={createOpen}
          existingKeys={functions.map((f) => f.key)}
          onClose={() => setCreateOpen(false)}
          onCreate={(meta, discounts) => {
            try {
              addFunction(meta, discounts);
              toast.success(`已新增折扣规则「${meta.label}」`);
              setCreateOpen(false);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />

        {/* 启停二次确认 */}
        <AlertDialog
          open={!!toggleTarget}
          onOpenChange={(o) => !o && setToggleTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {toggleTarget?.next ? "确认启用" : "确认停用"}「{toggleTarget?.fn.label}」？
              </AlertDialogTitle>
              <AlertDialogDescription>
                {toggleTarget?.next
                  ? "启用后，租户可按已配置折扣消耗积分使用该功能。"
                  : "停用后，所有租户（含付费版）将无法使用该功能，已发起的任务不受影响。"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!toggleTarget) return;
                  setFunctionStatus(toggleTarget.fn.key, toggleTarget.next);
                  toast.success(
                    `已${toggleTarget.next ? "启用" : "停用"}「${toggleTarget.fn.label}」`,
                  );
                  setToggleTarget(null);
                }}
              >
                确认
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 删除二次确认 */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除「{deleteTarget?.label}」折扣规则？</AlertDialogTitle>
              <AlertDialogDescription>
                删除后该功能将从积分管理列表中移除，且不再参与计费。该操作不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!deleteTarget) return;
                  deleteFunction(deleteTarget.key);
                  toast.success(`已删除「${deleteTarget.label}」`);
                  setDeleteTarget(null);
                }}
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 编辑 / 详情 抽屉 */}
        <Sheet open={!!editFn} onOpenChange={(o) => !o && setEditFn(null)}>
          <SheetContent side="right" className="w-[480px] sm:max-w-[480px]">
            <SheetHeader>
              <SheetTitle>{editFn?.label} · 折扣详情</SheetTitle>
              <SheetDescription>
                基准 <span className="font-mono text-foreground">{editFn?.baseCost}</span> 积分 / {editFn?.unit}；调整各套餐折扣率。
              </SheetDescription>
            </SheetHeader>
            {editFn && (
              <div className="mt-6 space-y-5">
                {PLAN_TIERS.map((p) => {
                  const v = matrix[editFn.key][p];
                  const isFree = p === "free";
                  const num = v === "disabled" ? 0.8 : v;
                  return (
                    <div
                      key={p}
                      className="rounded-lg border bg-card p-4 shadow-[var(--shadow-card)]"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn("rounded-full", PLAN_META[p].badgeCls)}
                        >
                          {PLAN_META[p].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {isFree
                            ? "免费版固定禁用"
                            : `当前 ${formatDiscount(v)} · 消耗 ${calcCost(editFn.key, p, 1).cost} 积分`}
                        </span>
                      </div>
                      {isFree ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Ban className="h-3.5 w-3.5" />
                          不可使用，需升级到付费套餐
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[num]}
                            min={0.1}
                            max={1}
                            step={0.05}
                            onValueChange={([nv]) =>
                              setDiscount(editFn.key, p, +nv.toFixed(2))
                            }
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={num}
                            onChange={(e) =>
                              setDiscount(
                                editFn.key,
                                p,
                                Math.min(1, Math.max(0.1, +Number(e.target.value).toFixed(2))),
                              )
                            }
                            className="h-8 w-20 text-center"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

function DiscountCell({
  fn,
  plan,
  value,
  base,
  unit,
  disabled,
}: {
  fn: BillingFunction;
  plan: PlanTier;
  value: DiscountValue;
  base: number;
  unit: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<number>(value === "disabled" ? 0.8 : value);
  const isFree = plan === "free";

  if (isFree || disabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
        <Ban className="h-3 w-3" />
        禁用
      </span>
    );
  }

  /** 折扣越低色越深 */
  const cls =
    value === "disabled"
      ? "border-border bg-muted text-muted-foreground"
      : value <= 0.5
        ? "border-success/40 bg-success/15 text-success"
        : value <= 0.7
          ? "border-primary/40 bg-primary/15 text-primary"
          : value <= 0.85
            ? "border-violet-400/40 bg-violet-500/15 text-violet-600"
            : "border-border bg-muted text-foreground";

  const sample = calcCost(fn, plan, 1);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setLocal(value === "disabled" ? 0.8 : value);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-w-[64px] items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold transition hover:scale-105",
            cls,
          )}
        >
          {formatDiscount(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="center">
        <div className="text-xs text-muted-foreground">
          <Badge variant="outline" className={cn("mr-1 rounded-full", PLAN_META[plan].badgeCls)}>
            {PLAN_META[plan].label}
          </Badge>
          调整折扣
        </div>
        <div className="flex items-center gap-2">
          <Slider
            value={[local]}
            min={0.1}
            max={1}
            step={0.05}
            onValueChange={([v]) => setLocal(+v.toFixed(2))}
            className="flex-1"
          />
          <Input
            value={local}
            type="number"
            min={0.1}
            max={1}
            step={0.05}
            onChange={(e) => setLocal(Math.min(1, Math.max(0.1, +Number(e.target.value).toFixed(2))))}
            className="h-8 w-16 text-center"
          />
        </div>
        <div className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
          基准 {base} 积分 / {unit} × {(local * 10).toFixed(1)} 折 ={" "}
          <span className="font-semibold text-foreground">
            {Math.ceil(base * local)} 积分
          </span>
          {value !== "disabled" && <span className="ml-1">（当前 {sample.cost} 积分）</span>}
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setDiscount(fn, plan, local);
              setOpen(false);
            }}
          >
            保存
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CreateRuleDialog({
  open,
  existingKeys,
  onClose,
  onCreate,
}: {
  open: boolean;
  existingKeys: string[];
  onClose: () => void;
  onCreate: (
    meta: { key: string; label: string; baseCost: number; unit: string; route?: string },
    discounts: { basic: number; pro: number; flagship: number },
  ) => void;
}) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [baseCost, setBaseCost] = useState(10);
  const [unit, setUnit] = useState("次");
  const [route, setRoute] = useState("");
  const [basic, setBasic] = useState(0.85);
  const [pro, setPro] = useState(0.7);
  const [flagship, setFlagship] = useState(0.55);

  const reset = () => {
    setLabel("");
    setKey("");
    setBaseCost(10);
    setUnit("次");
    setRoute("");
    setBasic(0.85);
    setPro(0.7);
    setFlagship(0.55);
  };

  const submit = () => {
    const trimmedLabel = label.trim();
    const trimmedKey = key.trim();
    if (!trimmedLabel) {
      toast.error("请填写功能名称");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/i.test(trimmedKey)) {
      toast.error("功能标识需以字母开头，仅含字母数字下划线");
      return;
    }
    if (existingKeys.includes(trimmedKey)) {
      toast.error("功能标识已存在");
      return;
    }
    onCreate(
      {
        key: trimmedKey,
        label: trimmedLabel,
        baseCost: Math.max(1, Math.floor(Number(baseCost) || 1)),
        unit: unit.trim() || "次",
        route: route.trim() || undefined,
      },
      {
        basic: clampDiscount(basic),
        pro: clampDiscount(pro),
        flagship: clampDiscount(flagship),
      },
    );
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增折扣规则</DialogTitle>
          <DialogDescription>
            新增一条计费功能与套餐折扣规则，配置后将出现在积分管理列表中。免费版默认禁用。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">功能名称</Label>
              <Input
                placeholder="例如：风格迁移"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">功能标识 (key)</Label>
              <Input
                placeholder="例如：style_transfer"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">基准积分</Label>
              <Input
                type="number"
                min={1}
                value={baseCost}
                onChange={(e) => setBaseCost(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">计费单位</Label>
              <Input
                placeholder="次 / 张 / 秒"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">关联模块路径（可选）</Label>
              <Input
                placeholder="如：/ai/image"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-foreground">套餐折扣率</div>
              <div className="text-[11px] text-muted-foreground">
                取值 0.1 – 1.0；免费版固定禁用
              </div>
            </div>
            <DiscountField
              plan="basic"
              value={basic}
              onChange={setBasic}
            />
            <DiscountField plan="pro" value={pro} onChange={setPro} />
            <DiscountField plan="flagship" value={flagship} onChange={setFlagship} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            取消
          </Button>
          <Button onClick={submit}>新增</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function clampDiscount(n: number): number {
  if (!Number.isFinite(n)) return 0.8;
  return Math.min(1, Math.max(0.1, +Number(n).toFixed(2)));
}

function DiscountField({
  plan,
  value,
  onChange,
}: {
  plan: Exclude<PlanTier, "free">;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Badge
        variant="outline"
        className={cn("w-16 justify-center rounded-full", PLAN_META[plan].badgeCls)}
      >
        {PLAN_META[plan].label}
      </Badge>
      <Slider
        value={[value]}
        min={0.1}
        max={1}
        step={0.05}
        onValueChange={([v]) => onChange(+v.toFixed(2))}
        className="flex-1"
      />
      <Input
        type="number"
        min={0.1}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(clampDiscount(Number(e.target.value)))}
        className="h-8 w-20 text-center"
      />
      <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">
        {formatDiscount(value)}
      </span>
    </div>
  );
}
