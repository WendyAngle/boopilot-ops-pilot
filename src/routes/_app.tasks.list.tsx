import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Bot, Sparkles, ListChecks, CheckCircle2, XCircle, Clock3,
  PlayCircle, PauseCircle, Trash2, BookmarkPlus, StopCircle,
  Search, RotateCcw, Filter, Eye, ScrollText, BarChart3, Pencil, MoreHorizontal, Info, Plus,
  UserCheck, MonitorPlay, Send, MessageSquare, type LucideIcon,
} from "lucide-react";
import { UseTemplateDialog } from "@/components/use-template-dialog";
import { ReachTaskDialog } from "@/components/reach-task-dialog";

import { ensureActivityTasksSeeded, useActivitySubtasks, ACTIVITY_SOURCE_LABEL } from "@/lib/activity-tasks";
import { PLATFORM_META, findManagedAccountById } from "@/lib/managed-account-mock";
import { useTenantScope } from "@/lib/tenant-scope";
import { User2, AtSign, ArrowRight } from "lucide-react";

ensureActivityTasksSeeded();

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  PLATFORMS, PLATFORM_CHIP, STATUS_LABEL, STATUS_CLS,
  EXEC_STATE_LABEL, EXEC_STATE_CLS, getExecState, isForeverTask,
  TASK_CATEGORY_LABEL, TASK_CATEGORY_CLS, TASK_CATEGORY_ORDER, TASK_CATEGORY_ACTIONS, getTaskCategory,
  type Platform, type TaskStatus, type ExecState, type TaskRow, type TaskTemplate, type TaskCategory,
  type ContentOpsInfo,
  useTasks, useTemplates, tasksActions, templatesActions,
  executeTask, abortTask, fmtNow, uid,
} from "@/lib/operations-store";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/tasks/list")({
  component: TaskListPage,
  head: () => ({ meta: [{ title: "任务列表 — BooPilot" }] }),
});

const CATEGORY_ICON: Record<TaskCategory, LucideIcon> = {
  nurture: Bot,
  coview: MonitorPlay,
  "social-reach": Send,
  dm: MessageSquare,
  "account-ops": UserCheck,
};
const STATUS_ICON: Record<TaskStatus, LucideIcon> = {
  pending: Clock3, running: PlayCircle, success: CheckCircle2, failed: XCircle, partial: PauseCircle,
};

function TaskListPage() {
  const allTasks = useTasks();
  const [tenantScope] = useTenantScope();
  const tasks = useMemo(
    () =>
      tenantScope === "all"
        ? allTasks
        : allTasks.filter((t) => t.tenantId === tenantScope),
    [allTasks, tenantScope],
  );
  const templates = useTemplates();
  const navigate = useNavigate();

  const [statsTask, setStatsTask] = useState<TaskRow | null>(null);
  const [distSubject, setDistSubject] = useState<DistSubject>("exec");
  const [saveTplFor, setSaveTplFor] = useState<TaskRow | null>(null);
  const [saveTplName, setSaveTplName] = useState("");
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [detailTask, setDetailTask] = useState<TaskRow | null>(null);
  const [abortConfirm, setAbortConfirm] = useState<TaskRow | null>(null);
  const [pickTplOpen, setPickTplOpen] = useState(false);
  const [newTaskTpl, setNewTaskTpl] = useState<TaskTemplate | null>(null);

  const usableTemplates = useMemo(
    () => templates.filter((t) => t.status !== "draft"),
    [templates],
  );



  const openDetail = (id: string) => navigate({ to: "/tasks/$taskId", params: { taskId: id } });
  const openLogs = (id: string) => navigate({ to: "/tasks/$taskId/logs", params: { taskId: id } });



  const stats = useMemo(() => ({
    total: tasks.length,
    running: tasks.filter((t) => t.status === "running").length,
    success: tasks.filter((t) => t.status === "success").length,
    failed: tasks.filter((t) => t.status === "failed" || t.status === "partial").length,
  }), [tasks]);

  const [tKeyword, setTKeyword] = useState("");
  const [tCategory, setTCategory] = useState<"all" | TaskCategory>("all");
  const [tPlatform, setTPlatform] = useState<"all" | Platform>("all");
  const [tResult, setTResult] = useState<"all" | "success" | "failed" | "partial" | "none">("all");
  const [tExec, setTExec] = useState<"all" | ExecState>("all");

  const filteredTasks = useMemo(() => {
    const kw = tKeyword.trim().toLowerCase();
    return tasks.filter((t) => {
      if (kw && !t.name.toLowerCase().includes(kw) && !t.id.toLowerCase().includes(kw)) return false;
      if (tCategory !== "all" && getTaskCategory(t) !== tCategory) return false;
      if (tPlatform !== "all" && !t.platforms.includes(tPlatform)) return false;
      if (tResult !== "all") {
        const showsDash = t.aborted || t.status === "pending" || t.status === "running";
        if (tResult === "none") {
          if (!showsDash) return false;
        } else {
          if (showsDash || t.status !== tResult) return false;
        }
      }
      if (tExec !== "all" && getExecState(t) !== tExec) return false;
      return true;
    });
  }, [tasks, tKeyword, tCategory, tPlatform, tResult, tExec]);

  const pageSize = 10;
  const [taskPage, setTaskPage] = useState(1);
  const taskTotalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  // 筛选后结果变少时，当前页可能已超出范围，需要回到有效页，避免“有总数无数据”
  const safeTaskPage = Math.min(taskPage, taskTotalPages);
  useEffect(() => {
    if (taskPage > taskTotalPages) setTaskPage(taskTotalPages);
  }, [taskPage, taskTotalPages]);
  const pagedFilteredTasks = useMemo(() => {
    const start = (safeTaskPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, safeTaskPage]);

  const tasksFiltersActive = tKeyword.trim() !== "" || tCategory !== "all" || tPlatform !== "all" || tResult !== "all" || tExec !== "all";

  const resetTaskFilters = () => {
    setTKeyword(""); setTCategory("all"); setTPlatform("all"); setTResult("all"); setTExec("all"); setTaskPage(1);
  };


  const handleManualSaveTemplate = () => {
    if (!saveTplFor) return;
    if (!saveTplName.trim()) { toast.error("请输入模版名称"); return; }
    const tpl: TaskTemplate = {
      id: uid("tpl"), name: saveTplName.trim(), subtype: saveTplFor.subtype, platforms: saveTplFor.platforms,
      total: saveTplFor.total, description: saveTplFor.description, createdAt: fmtNow(), uses: 0,
    };
    templatesActions.add(tpl);
    toast.success(`已保存模版「${tpl.name}」`);
    setSaveTplFor(null); setSaveTplName("");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">任务列表</h1>
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
                <Sparkles className="h-3 w-3" />智能体驱动
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              查看与管理所有运营任务的执行状态，点击「新建任务」选择模版即可关联账号与素材快速创建。
            </p>
          </div>
          <Button className="gap-1.5" onClick={() => setPickTplOpen(true)}>
            <Plus className="h-4 w-4" />新建任务
          </Button>
        </header>


        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="任务总数" value={stats.total} icon={ListChecks} tone="muted" />
          <StatCard title="执行中" value={stats.running} icon={PlayCircle} tone="primary" />
          <StatCard title="执行成功" value={stats.success} icon={CheckCircle2} tone="success" />
          <StatCard title="执行失败/部分成功" value={stats.failed} icon={XCircle} tone="destructive" />
        </div>

        <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">

            <div className="relative w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={tKeyword} onChange={(e) => setTKeyword(e.target.value)} placeholder="搜索任务名称 / ID" className="h-8 pl-8 text-xs" />
            </div>
            <Select value={tCategory} onValueChange={(v) => setTCategory(v as typeof tCategory)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="任务类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {TASK_CATEGORY_ORDER.map((c) => (
                  <SelectItem key={c} value={c}>{TASK_CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tPlatform} onValueChange={(v) => setTPlatform(v as typeof tPlatform)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="平台" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tResult} onValueChange={(v) => setTResult(v as typeof tResult)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="任务结果" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务结果</SelectItem>
                <SelectItem value="success">全部成功</SelectItem>
                <SelectItem value="partial">部分成功</SelectItem>
                <SelectItem value="failed">全部失败</SelectItem>
                <SelectItem value="none">暂无结果</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tExec} onValueChange={(v) => setTExec(v as typeof tExec)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="执行状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部执行状态</SelectItem>
                {(Object.keys(EXEC_STATE_LABEL) as ExecState[]).map((s) => (
                  <SelectItem key={s} value={s}>{EXEC_STATE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tasksFiltersActive && (
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground" onClick={resetTaskFilters}>
                <RotateCcw className="h-3.5 w-3.5" />重置
              </Button>
            )}
            <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Filter className="h-3 w-3" />共 <span className="font-semibold text-foreground tabular-nums">{filteredTasks.length}</span> 条
              {tasksFiltersActive && <span>/ {tasks.length}</span>}
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="min-w-[260px]">任务名称</TableHead>
                  <TableHead className="w-[110px]">类型</TableHead>
                  <TableHead className="min-w-[180px]">平台</TableHead>
                  <TableHead className="w-[110px]">任务结果</TableHead>
                  <TableHead className="w-[110px]">执行状态</TableHead>
                  <TableHead className="w-[160px]">创建时间</TableHead>
                  <TableHead className="w-[380px] text-center pr-4">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-sm text-muted-foreground">
                      {tasks.length === 0
                        ? "还没有运营任务，前往「任务模版」选择模版「使用」即可创建。"
                        : (
                          <span className="inline-flex items-center gap-2">
                            没有符合筛选条件的任务
                            <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={resetTaskFilters}>清除筛选</Button>
                          </span>
                        )}
                    </TableCell>
                  </TableRow>
                ) : pagedFilteredTasks.map((t) => {
                  const SIcon = STATUS_ICON[t.status];
                  const category = getTaskCategory(t);
                  const TIcon = CATEGORY_ICON[category];

                  return (
                    <TableRow key={t.id} className="border-b-border/40">
                      <TableCell>
                        <button onClick={() => openDetail(t.id)} className="group block text-left">
                          <div className="font-medium text-sm text-foreground group-hover:text-primary">{t.name}</div>
                        </button>

                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 text-xs font-normal", TASK_CATEGORY_CLS[category])}>
                          <TIcon className="h-3 w-3" />{TASK_CATEGORY_LABEL[category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.platforms.map((p) => (
                            <Badge key={p} variant="outline" className={cn("text-[10px] font-normal", PLATFORM_CHIP[p])}>{p}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.aborted || t.status === "pending" || t.status === "running" ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
                          <Badge variant="outline" className={cn("gap-1 text-xs font-normal", STATUS_CLS[t.status])}>
                            <SIcon className="h-3 w-3" />{STATUS_LABEL[t.status]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const es = getExecState(t);
                          return (
                            <Badge variant="outline" className={cn("text-xs font-normal", EXEC_STATE_CLS[es])}>
                              {EXEC_STATE_LABEL[es]}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-[11px] tabular-nums text-muted-foreground">{t.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"
                            onClick={() => openDetail(t.id)}>
                            <Eye className="h-3.5 w-3.5" />查看子任务
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"
                            onClick={() => setStatsTask(t)}>
                            <BarChart3 className="h-3.5 w-3.5" />统计
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-3.5 w-3.5" />更多
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => setDetailTask(t)}>
                                <Info className="h-3.5 w-3.5" />查看详情
                              </DropdownMenuItem>
                              {t.status === "pending" && !t.aborted && (
                                <DropdownMenuItem onClick={() => executeTask(t.id)}>
                                  <PlayCircle className="h-3.5 w-3.5" />执行
                                </DropdownMenuItem>
                              )}
                              {!t.aborted && (t.status === "pending" || t.status === "running") && (
                                isForeverTask(t) ? (
                                  <DropdownMenuItem
                                    onClick={() => setAbortConfirm(t)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <StopCircle className="h-3.5 w-3.5" />手动终止
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => { abortTask(t.id); toast.success("任务已终止"); }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <StopCircle className="h-3.5 w-3.5" />终止
                                  </DropdownMenuItem>
                                )
                              )}
                              <DropdownMenuItem
                                disabled={t.status !== "pending" || !!t.aborted}
                                onClick={() => setEditingTask(t)}
                              >
                                <Pencil className="h-3.5 w-3.5" />编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openLogs(t.id)}>
                                <ScrollText className="h-3.5 w-3.5" />日志
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { tasksActions.remove(t.id); toast.success("任务已删除"); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>


                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <PaginationBar page={safeTaskPage} totalPages={taskTotalPages} total={filteredTasks.length} setPage={setTaskPage} />
        </div>
      </div>




      {/* 存为模版弹窗 */}
      <Dialog open={!!saveTplFor} onOpenChange={(o) => { if (!o) { setSaveTplFor(null); setSaveTplName(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-violet-600" />保存为任务模版
            </DialogTitle>
            <DialogDescription>
              基于任务「{saveTplFor?.name}」创建模版，后续可在「任务模版」中复用。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">模版名称 <span className="text-destructive">*</span></Label>
              <Input id="tpl-name" value={saveTplName} onChange={(e) => setSaveTplName(e.target.value)} placeholder="例如：节日营销触达" />
            </div>
            {saveTplFor && (
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="text-muted-foreground">将保留以下配置：</div>
                <div>类型：{TASK_CATEGORY_LABEL[getTaskCategory(saveTplFor)]}</div>
                <div>平台：{saveTplFor.platforms.join(" / ")}</div>
                <div>数量：{saveTplFor.total}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSaveTplFor(null); setSaveTplName(""); }}>取消</Button>
            <Button onClick={handleManualSaveTemplate}>保存模版</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      {/* 查看统计数据弹窗 */}
      <Dialog open={!!statsTask} onOpenChange={(o) => !o && setStatsTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />统计数据
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{statsTask?.id}</DialogDescription>
          </DialogHeader>
          {statsTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <StatBox label="总计" value={statsTask.total} />
                <StatBox label="执行成功" value={statsTask.done} tone="success" />
                <StatBox label="执行失败" value={statsTask.failed} tone="danger" />
                <StatBox label="成功率" value={`${statsTask.total ? Math.round((statsTask.done / statsTask.total) * 100) : 0}%`} />
              </div>
              <Tabs defaultValue="account" className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">分布维度</div>
                  <TabsList className="h-8">
                    <TabsTrigger value="account" className="text-xs">按账号分布</TabsTrigger>
                    <TabsTrigger value="action" className="text-xs">按操作/动作分布</TabsTrigger>
                    <TabsTrigger value="subtask" className="text-xs">按子任务统计</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="account" className="mt-0 space-y-2">
                  {(getTaskCategory(statsTask) === "social-reach" || getTaskCategory(statsTask) === "dm") ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground">
                          {distSubject === "exec"
                            ? "统计口径：发起任务的托管账号（我方账号）"
                            : "统计口径：被触达的目标账号（对方账号）"}
                        </p>
                        <TabsList className="h-7">
                          <button
                            type="button"
                            onClick={() => setDistSubject("exec")}
                            className={cn(
                              "rounded px-2 py-1 text-[11px] transition-colors",
                              distSubject === "exec" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground",
                            )}
                          >执行账号</button>
                          <button
                            type="button"
                            onClick={() => setDistSubject("target")}
                            className={cn(
                              "rounded px-2 py-1 text-[11px] transition-colors",
                              distSubject === "target" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground",
                            )}
                          >目标账号</button>
                        </TabsList>
                      </div>
                      <DistList rows={buildDist(statsTask, "account", distSubject)} />
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] text-muted-foreground">统计口径：执行任务的托管账号</p>
                      <DistList rows={buildDist(statsTask, "account", "exec")} />
                    </>
                  )}
                </TabsContent>
                <TabsContent value="action" className="mt-0">
                  <DistList rows={buildDist(statsTask, "action")} />
                </TabsContent>
                <TabsContent value="subtask" className="mt-0">
                  <DistList rows={buildDist(statsTask, "subtask")} />
                </TabsContent>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />执行成功</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-destructive" />执行失败</span>
                  <span className="ml-auto">末尾数字格式：成功 / 失败 / 总数</span>
                </div>
              </Tabs>


              <div className="grid grid-cols-2 gap-3 text-xs">
                <Field label="平均耗时" value="2.4s / 账号" />
                <Field label="峰值并发" value="12" />
                <Field label="创建时间" value={statsTask.createdAt} />
                <Field label="结束时间" value={statsTask.endTime ?? "—"} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsTask(null)}>关闭</Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <Dialog open={pickTplOpen} onOpenChange={setPickTplOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>新建任务</DialogTitle>
            <DialogDescription>
              选择一个任务模版，下一步可指定托管账号、关联素材与执行方式。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] space-y-2 overflow-y-auto py-1">
            {usableTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                还没有可用模版，请先前往「任务模版」创建。
              </div>
            ) : (
              usableTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => { setPickTplOpen(false); setNewTaskTpl(tpl); }}
                  className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{tpl.name}</span>
                    <Badge variant="outline" className="text-[11px]">
                      {tpl.subtype === "nurture" ? "周期养号" : "单次任务"}
                    </Badge>
                    {tpl.platforms.map((p) => (
                      <Badge key={p} variant="outline" className={cn("text-[11px]", PLATFORM_CHIP[p])}>
                        {p}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {tpl.description || "暂无描述"}
                  </p>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickTplOpen(false)}>取消</Button>
            <Button variant="ghost" onClick={() => { setPickTplOpen(false); navigate({ to: "/tasks/templates" }); }}>
              管理模版
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UseTemplateDialog
        template={newTaskTpl}
        open={!!newTaskTpl}
        onOpenChange={(o) => { if (!o) setNewTaskTpl(null); }}
      />


      <UseTemplateDialog
        task={editingTask && (!!editingTask?.source || !isReachLike(editingTask!)) ? editingTask : null}
        open={!!editingTask && (!!editingTask?.source || !isReachLike(editingTask!))}
        onOpenChange={(o) => { if (!o) setEditingTask(null); }}
      />


      <ReachTaskDialog
        task={editingTask && (!editingTask?.source && isReachLike(editingTask!)) ? editingTask : null}
        open={!!editingTask && (!editingTask?.source && isReachLike(editingTask!))}
        onOpenChange={(o) => { if (!o) setEditingTask(null); }}
      />


      <TaskDetailDialog task={detailTask} onClose={() => setDetailTask(null)} />

      <AlertDialog open={!!abortConfirm} onOpenChange={(o) => !o && setAbortConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-destructive" />确认手动终止任务？
            </AlertDialogTitle>
            <AlertDialogDescription>
              任务「{abortConfirm?.name}」配置为「持续执行直到手动停止」，当前仍在运行。
              终止后将不再产出新的子任务结果，且无法恢复，请谨慎确认。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (abortConfirm) {
                  abortTask(abortConfirm.id);
                  toast.success(`任务「${abortConfirm.name}」已手动终止`);
                }
                setAbortConfirm(null);
              }}
            >
              确认终止
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>

  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

const EXEC_MODE_LABEL: Record<string, string> = { now: "立即执行", scheduled: "指定时间执行", recurring: "周期执行" };
const TARGET_MODE_LABEL: Record<string, string> = { keyword: "匹配关键词", specified: "指定目标", random: "系统随机选择目标" };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground break-words">{children}</div>
    </div>
  );
}

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="mt-3 mb-2 flex items-center gap-2">
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
        {index}
      </span>
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

const REACH_FIND_MODE_TEXT: Record<string, string> = {
  smart: "系统智能搜索",
  post: "指定贴文搜索",
  group: "指定群组搜索",
};

/** 社媒触达（拓客）任务详情 */
function ReachTaskDetailDialog({ task, onClose }: { task: TaskRow; onClose: () => void }) {
  const d = (task.draft ?? {}) as Record<string, unknown>;
  const s = (k: string) => (d[k] === undefined || d[k] === null || d[k] === "" ? "—" : String(d[k]));
  const list = (k: string) => (Array.isArray(d[k]) && (d[k] as string[]).length ? (d[k] as string[]).join("、") : "—");
  const links = Array.isArray(d.reachLinks) ? (d.reachLinks as string[]) : [];
  const findMode = String(d.reachFindMode ?? "smart");
  const startAt = `${s("recurStartDate")} ${d.recurStartTime ?? ""}`.trim();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />任务详情 - {task.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{task.id}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          <SectionHeader index="1/4" title="任务基本信息" />
          <DetailRow label="任务名称">{task.name}</DetailRow>
          <DetailRow label="平台">{task.platforms.join("、")}</DetailRow>
          <DetailRow label="触达动作">{s("reachAction")}</DetailRow>
          <DetailRow label="目标市场">{s("reachRegion")}</DetailRow>
          <DetailRow label="推广产品">{list("reachProducts")}</DetailRow>

          <SectionHeader index="2/4" title="寻找目标" />
          <DetailRow label="寻找目标方式">{REACH_FIND_MODE_TEXT[findMode] ?? "—"}</DetailRow>
          <DetailRow label="搜索关键词">{s("reachKeywords")}</DetailRow>
          {links.length > 0 && (
            <DetailRow label={findMode === "group" ? "指定群组链接" : "指定贴文链接"}>
              <div className="space-y-1">
                {links.map((l) => (
                  <div key={l} className="break-all text-xs text-muted-foreground">{l}</div>
                ))}
              </div>
            </DetailRow>
          )}
          <DetailRow label="活跃时间范围">{s("reachActiveWindow")}</DetailRow>
          <DetailRow label="目标数量上限">{s("reachTargetCap")}</DetailRow>

          <SectionHeader index="3/4" title="执行账号" />
          <DetailRow label="执行账号">
            {Array.isArray(d.reachAccounts) && (d.reachAccounts as string[]).length
              ? `已选 ${(d.reachAccounts as string[]).length} 个账号`
              : "—"}
          </DetailRow>
          <DetailRow label="每账号每日上限">{s("reachDailyPerAccount")}</DetailRow>

          <SectionHeader index="4/4" title="执行方式" />
          <DetailRow label="执行方式">周期(每日)</DetailRow>
          <DetailRow label="开始时间">{startAt || "—"}</DetailRow>
          <DetailRow label="结束时间">{task.endTime ?? "—"}</DetailRow>
        </div>
        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailDialog({ task, onClose }: { task: TaskRow | null; onClose: () => void }) {
  if (!task) {
    return (
      <Dialog open={false} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }
  // 活动台账类（私信 / 通过好友申请 / 拒绝好友申请）走专用视图
  if (task.source) {
    return <ActivityTaskDetailDialog task={task} onClose={onClose} />;
  }
  // 同屏任务：一个社媒账号一个任务，展示账号 / 平台 / 动作 / 执行时间
  if (getTaskCategory(task) === "coview") {
    return <CoviewTaskDetailDialog task={task} onClose={onClose} />;
  }
  // 社媒触达（拓客）任务：展示寻找目标、执行账号与周期执行方式
  if ((getTaskCategory(task) === "social-reach" || getTaskCategory(task) === "dm") && task.draft && "reachFindMode" in (task.draft as Record<string, unknown>)) {
    return <ReachTaskDetailDialog task={task} onClose={onClose} />;
  }
  // 内容运营任务：展示与创建弹窗一致的动作与目标配置
  if (getTaskCategory(task) === "account-ops" && task.draft && "contentOps" in (task.draft as Record<string, unknown>)) {
    return <ContentOpsTaskDetailDialog task={task} onClose={onClose} />;
  }
  const d = (task.draft ?? {}) as Record<string, unknown>;
  const has = Object.keys(d).length > 0;
  const get = <T,>(k: string, fb: T): T => (d[k] === undefined || d[k] === null ? fb : (d[k] as T));
  const arr = (k: string): string[] => {
    const v = d[k];
    return Array.isArray(v) ? (v as string[]) : [];
  };
  const dash = (v: string | number | undefined | null) =>
    v === undefined || v === null || v === "" ? "—" : String(v);
  const listOrDash = (xs: string[]) => (xs.length ? xs.join("、") : "—");

  const isNurture = task.subtype === "nurture";
  const execMode = get<string>("execMode", isNurture ? "recurring" : "now");
  const targetMode = get<string>("targetMode", "keyword");
  type NG = {
    id: string;
    nurtureInterestKeywords?: string;
    nurtureLike?: boolean; nurtureLikeMin?: number; nurtureLikeMax?: number;
    nurtureFollow?: boolean; nurtureFollowMin?: number; nurtureFollowMax?: number;
    nurtureComment?: boolean; nurtureCommentMin?: number; nurtureCommentMax?: number;
    nurtureCommentEmoji?: boolean; nurtureCommentSentiment?: string; nurtureCommentStyle?: string;
    nurtureSearch?: boolean; nurtureKeywords?: string;
  };
  const nurtureGroups: NG[] = Array.isArray(d.nurtureGroups) ? (d.nurtureGroups as NG[]) : [];
  const showStrategy = isNurture && nurtureGroups.length > 0;
  const total = showStrategy ? 4 : 3;


  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />任务详情 - {task.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{task.id}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          <SectionHeader index={`1/${total}`} title="任务基本信息" />
          <DetailRow label="任务名称">{dash(get<string>("name", task.name))}</DetailRow>

          <SectionHeader index={`2/${total}`} title="执行目标" />

          {isNurture && (
            <DetailRow label="目标">
              {TARGET_MODE_LABEL[targetMode] ?? "—"}
              {targetMode === "keyword" && (
                <span className="ml-2 text-muted-foreground">「{get<string>("targetKeyword", "") || "—"}」</span>
              )}
              {targetMode === "specified" && (
                <span className="ml-2 text-muted-foreground">「{get<string>("targetUrl", "") || "—"}」</span>
              )}
            </DetailRow>
          )}
          <DetailRow label="指定账号 · 标签">{listOrDash(arr("reachTags"))}</DetailRow>
          <DetailRow label="指定账号 · 特定账号">
            {arr("reachAccounts").length ? `已选 ${arr("reachAccounts").length} 个账号` : "—"}
          </DetailRow>

          {!isNurture && (
            <>
              <DetailRow label="指定贴文 · 标签">{listOrDash(arr("postTags"))}</DetailRow>
              <DetailRow label="指定贴文 · 特定贴文">
                {arr("postIds").length ? `已选 ${arr("postIds").length} 篇贴文` : "—"}
              </DetailRow>
            </>
          )}

          {showStrategy && (
            <>
              <SectionHeader index={`3/${total}`} title="养号策略" />
              <div className="space-y-3 py-1">
                <div className="text-[11px] text-muted-foreground">
                  共 {nurtureGroups.length} 组策略，每个匹配账号将随机选择一组执行
                </div>
                {nurtureGroups.map((g, idx) => {
                  const actions: string[] = [];
                  if (g.nurtureLike) actions.push(`点赞 ${g.nurtureLikeMin}%–${g.nurtureLikeMax}%`);
                  if (g.nurtureFollow) actions.push(`关注 ${g.nurtureFollowMin}%–${g.nurtureFollowMax}%`);
                  if (g.nurtureComment) actions.push(`评论 ${g.nurtureCommentMin}%–${g.nurtureCommentMax}%`);
                  return (
                    <div key={g.id} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">第 {idx + 1} 组</Badge>
                        {actions.map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px] font-normal">{a}</Badge>
                        ))}
                      </div>
                      {g.nurtureInterestKeywords && (
                        <div className="flex gap-2 text-xs">
                          <span className="w-20 shrink-0 text-muted-foreground">兴趣关键词</span>
                          <span>{g.nurtureInterestKeywords}</span>
                        </div>
                      )}
                      {g.nurtureSearch && g.nurtureKeywords && (
                        <div className="flex gap-2 text-xs">
                          <span className="w-20 shrink-0 text-muted-foreground">搜索关键词</span>
                          <span>{g.nurtureKeywords}</span>
                        </div>
                      )}
                      {g.nurtureComment && (g.nurtureCommentSentiment || g.nurtureCommentStyle) && (
                        <div className="flex gap-2 text-xs">
                          <span className="w-20 shrink-0 text-muted-foreground">评论设定</span>
                          <span>
                            {[
                              g.nurtureCommentSentiment && `情绪：${g.nurtureCommentSentiment}`,
                              g.nurtureCommentStyle && `风格：${g.nurtureCommentStyle}`,
                              g.nurtureCommentEmoji && "可带表情",
                            ].filter(Boolean).join("；")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <SectionHeader index={`${total}/${total}`} title="执行方式" />

          <DetailRow label="执行方式">{EXEC_MODE_LABEL[execMode] ?? "—"}</DetailRow>
          {execMode === "scheduled" && (
            <DetailRow label="计划时间">
              {`${get<string>("scheduledDate", "—")} ${get<string>("scheduledTime", "")}`}
            </DetailRow>
          )}
          {execMode === "recurring" && (
            <>
              <DetailRow label="开始时间">
                {`${get<string>("recurStartDate", "—")} ${get<string>("recurStartTime", "")}`}
              </DetailRow>
              <DetailRow label="执行周期">每日</DetailRow>
              <DetailRow label="时段">
                {`${get<string>("recurTimeStart", "—")} — ${get<string>("recurTimeEnd", "—")}`}
              </DetailRow>
              <DetailRow label="单次时长">
                {`${get<number>("sessionDuration", 0)} ${get<string>("sessionDurationUnit", "min") === "hour" ? "小时" : "分钟"}`}
              </DetailRow>
              <DetailRow label="持续">
                {get<boolean>("recurForever", false)
                  ? "持续执行直到手动停止"
                  : `${get<number>("recurDuration", 0)} 天`}
              </DetailRow>
            </>
          )}

          {!has && (
            <div className="mt-3 rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
              该任务未保存编辑项快照，仅展示基础信息。
            </div>
          )}
        </div>
        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 内容运营任务详情：与「创建内容运营任务」弹窗的编辑项一一对应 */
const OPS_ACTION_LABEL: Record<ContentOpsInfo["action"], string> = {
  sharePost: "转发贴文",
  hidePost: "隐藏贴文",
  deletePost: "删除贴文",
  editProfile: "修改账号基础信息",
};
const OPS_EDIT_FIELD_LABEL: Record<string, string> = {
  nickname: "昵称",
  displayName: "显示名",
  bio: "个人简介",
  language: "语言",
  region: "地区",
};
function opsShareModeLabel(platform: Platform, mode?: ContentOpsInfo["shareMode"]): string {
  if (!mode) return "—";
  if (platform === "Tiktok") return mode === "immediate" ? "一键转发" : "分享到群组";
  return mode === "immediate" ? "立即分享" : mode === "timeline" ? "分享到动态" : "分享到群组";
}
function opsPostTypeLabel(t?: ContentOpsInfo["postType"]): string {
  return t === "original" ? "原创" : t === "repost" ? "转发" : "全部";
}

function LinkList({ links }: { links: string[] }) {
  return (
    <div className="space-y-1">
      {links.map((l) => (
        <div key={l} className="break-all rounded bg-muted/40 px-2 py-1 font-mono text-[11px]">{l}</div>
      ))}
    </div>
  );
}

function ContentOpsTaskDetailDialog({ task, onClose }: { task: TaskRow; onClose: () => void }) {
  const d = (task.draft ?? {}) as Record<string, unknown>;
  const ops = (d.contentOps ?? {}) as ContentOpsInfo;
  const platform = (task.platforms[0] ?? "Facebook") as Platform;
  const isPostManage = ops.action === "hidePost" || ops.action === "deletePost";
  const postVerb = ops.action === "hidePost" ? "隐藏" : "删除";
  const accountCount = Array.isArray(d.reachAccounts) ? (d.reachAccounts as string[]).length : 0;
  const execMode = typeof d.execMode === "string" ? (d.execMode as string) : "now";
  const scheduledActive = d.scheduledActive === true;

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />任务详情 - {task.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{task.id}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          <SectionHeader index="1/4" title="任务基本信息" />
          <DetailRow label="任务名称">{task.name}</DetailRow>
          <DetailRow label="来源模版">{task.fromTemplate || "—"}</DetailRow>
          <DetailRow label="平台">{platform}</DetailRow>

          <SectionHeader index="2/4" title="指定动作和目标" />
          <DetailRow label="动作类型">{OPS_ACTION_LABEL[ops.action] ?? "—"}</DetailRow>

          {ops.action === "sharePost" && (
            <>
              <DetailRow label="转发贴文链接">
                {ops.sharePostLinks?.length ? <LinkList links={ops.sharePostLinks} /> : "—"}
              </DetailRow>
              <DetailRow label="转发方式">{opsShareModeLabel(platform, ops.shareMode)}</DetailRow>
              {ops.shareNote && (
                <DetailRow label={platform === "Tiktok" ? "转发附言" : "转发说明"}>{ops.shareNote}</DetailRow>
              )}
              {ops.shareMode === "group" && ops.groupLinks?.length ? (
                <DetailRow label="指定群组链接"><LinkList links={ops.groupLinks} /></DetailRow>
              ) : null}
            </>
          )}

          {isPostManage && (
            <>
              <DetailRow label="目标模式">
                {ops.targetMode === "specific" ? "指定贴文" : "按条件批量"}
              </DetailRow>
              {ops.targetMode === "specific" ? (
                <>
                  <DetailRow label="归属账号">{ops.targetAccount || "—"}</DetailRow>
                  <DetailRow label={`待${postVerb}贴文`}>
                    {ops.targetPostLinks?.length ? <LinkList links={ops.targetPostLinks} /> : "—"}
                  </DetailRow>
                </>
              ) : (
                <>
                  <DetailRow label={`${postVerb}范围`}>
                    {ops.rangeStart && ops.rangeEnd ? `${ops.rangeStart} 至 ${ops.rangeEnd}` : "—"}
                  </DetailRow>
                  <DetailRow label="关键词">{ops.keyword || "—"}</DetailRow>
                  <DetailRow label="贴文类型">{opsPostTypeLabel(ops.postType)}</DetailRow>
                  <DetailRow label="条数上限">{ops.maxCount ?? "—"}</DetailRow>
                </>
              )}
            </>
          )}

          {ops.action === "editProfile" && (
            <DetailRow label="修改字段">
              {ops.editFields?.length
                ? ops.editFields.map((f) => OPS_EDIT_FIELD_LABEL[f] ?? f).join("、")
                : "—"}
            </DetailRow>
          )}

          <SectionHeader index="3/4" title="指定账号" />
          <DetailRow label="已选账号">{accountCount > 0 ? `${accountCount} 个账号` : "—"}</DetailRow>

          <SectionHeader index="4/4" title="执行方式" />
          <DetailRow label="执行方式">
            {execMode === "now"
              ? "立即执行"
              : scheduledActive
                ? "指定时间开始执行（账号活跃时间）"
                : "指定时间开始执行"}
          </DetailRow>
          {execMode === "scheduled" && !scheduledActive && (
            <DetailRow label="计划时间">
              {`${typeof d.scheduledDate === "string" ? d.scheduledDate : "—"} ${typeof d.scheduledTime === "string" ? d.scheduledTime : ""}`}
            </DetailRow>
          )}
        </div>
        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoviewTaskDetailDialog({ task, onClose }: { task: TaskRow; onClose: () => void }) {
  const d = (task.draft ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const platform = (str("coviewPlatform") || task.platforms[0]) as Platform;
  const meta = PLATFORM_META[platform as keyof typeof PLATFORM_META];
  const accountName = str("coviewAccountName") || "—";
  const action = str("coviewAction") || "账号同屏";
  const start = str("coviewStartTime");
  const end = str("coviewEndTime") || task.endTime || "";
  const execState = getExecState(task);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MonitorPlay className="h-4 w-4 text-primary" />任务详情 - {task.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{task.id}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              执行状态
            </span>
            <Badge variant="outline" className={cn("text-[10px] font-normal", EXEC_STATE_CLS[execState])}>
              {EXEC_STATE_LABEL[execState]}
            </Badge>
          </div>

          <div className="rounded-lg border">
            <DetailRowBox label="账号">{accountName}</DetailRowBox>
            <DetailRowBox label="平台">
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold", meta?.cls)}>
                  {meta?.letter}
                </span>
                {platform}
              </span>
            </DetailRowBox>
            <DetailRowBox label="动作">
              <Badge variant="outline" className="text-[10px] font-normal">{action}</Badge>
            </DetailRowBox>
            <DetailRowBox label="开始时间">
              <span className="font-mono text-xs tabular-nums">{start || "—"}</span>
            </DetailRowBox>
            <DetailRowBox label="结束时间" last>
              <span className="font-mono text-xs tabular-nums">{end || "—"}</span>
            </DetailRowBox>
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRowBox({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[120px_1fr] items-center gap-3 px-3 py-2.5 text-sm", !last && "border-b")}>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground break-words">{children}</div>
    </div>
  );
}

function ActivityTaskDetailDialog({ task, onClose }: { task: TaskRow; onClose: () => void }) {
  const navigate = useNavigate();
  const subs = useActivitySubtasks(task.id);
  const platform = task.platforms[0];
  const platformMeta = PLATFORM_META[platform];
  const executorName = subs[0]?.accountName ?? "—";
  const sourceLabel = task.source ? ACTIVITY_SOURCE_LABEL[task.source] : "";

  const stats = {
    total: subs.length,
    done: subs.filter((s) => s.status === "success").length,
    failed: subs.filter((s) => s.status === "failed").length,
  };
  const successRate = stats.total === 0 ? "—" : `${Math.round((stats.done / stats.total) * 100)}%`;
  const preview = subs.slice(0, 5);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />任务详情 - {task.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{task.id}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
          {/* 执行账号 */}
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2.5">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              执行账号（我方托管账号）
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold",
                platformMeta?.cls,
              )}>
                {platformMeta?.letter}
              </div>
              <span className="font-medium">{executorName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{platform}</span>
              <Badge variant="outline" className="ml-auto text-[10px] font-normal">
                {sourceLabel}
              </Badge>
            </div>
          </div>

          {/* 统计 */}
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="动作总数" value={stats.total} />
            <StatBox label="成功" value={stats.done} tone="success" />
            <StatBox label="失败" value={stats.failed} tone="danger" />
            <StatBox label="成功率" value={successRate} />
          </div>

          {/* 明细预览 */}
          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b bg-muted/20 px-3 py-2">
              <div className="text-xs font-semibold">最近动作</div>
              <div className="text-[11px] text-muted-foreground">
                展示最近 {preview.length} 条 / 共 {subs.length} 条
              </div>
            </div>
            {preview.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">暂无记录</div>
            ) : (
              <Table className="[&_th]:whitespace-nowrap [&_td]:align-top">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[130px] pl-3 text-xs">时间</TableHead>
                    <TableHead className="w-[80px] text-xs">动作</TableHead>
                    <TableHead className="min-w-[180px] text-xs">目标账号（对方）</TableHead>
                    <TableHead className="min-w-[220px] text-xs">内容 / 说明</TableHead>
                    <TableHead className="w-[80px] pr-3 text-xs">结果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((s) => (
                    <TableRow key={s.id} className="border-b-border/40">
                      <TableCell className="pl-3 py-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {s.createdAt}
                      </TableCell>
                      <TableCell className="py-2 text-xs">{s.action}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          {s.peerAvatar ? (
                            <img src={s.peerAvatar} alt="" className="h-5 w-5 shrink-0 rounded-full border border-border/60" loading="lazy" />
                          ) : (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground">
                              <User2 className="h-2.5 w-2.5" />
                            </div>
                          )}
                          <div className="min-w-0 leading-tight">
                            <div className="truncate text-xs">{s.target}</div>
                            {s.peerHandle && (
                              <div className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <AtSign className="h-2 w-2" />
                                <span className="truncate">{s.peerHandle.replace(/^@/, "")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {s.detail ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[260px] truncate text-xs text-foreground/80">{s.detail}</div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[420px] whitespace-pre-wrap break-words">
                              {s.detail}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-3 py-2">
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-normal",
                          s.status === "success"
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-destructive/10 text-destructive border-destructive/30",
                        )}>
                          {s.status === "success" ? "成功" : "失败"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2 border-t px-6 py-3 sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            该任务为手动运营台账，明细来自 {sourceLabel} 模块
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>关闭</Button>
            <Button
              onClick={() => {
                onClose();
                navigate({ to: "/tasks/$taskId", params: { taskId: task.id } });
              }}
              className="gap-1"
            >
              查看完整任务台账<ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-1 text-xl font-semibold tabular-nums",
        tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-destructive" : "text-foreground",
      )}>{value}</div>
    </div>
  );
}

type DistRow = { label: string; success: number; failed: number; pending?: number };

export type DistDimension = "account" | "action" | "subtask";
export type DistSubject = "exec" | "target";

/** 内容运营任务：从任务说明中解析实际动作 */
function parseContentOpsAction(t: TaskRow): string {
  const m = /指定动作：([^\n，,。]+)/.exec(t.description ?? "");
  return m?.[1]?.trim() || "内容运营";
}

/** 社媒触达 / 私信任务：共用触达任务的表单与详情渲染 */
function isReachLike(t: TaskRow): boolean {
  const c = getTaskCategory(t);
  return c === "social-reach" || c === "dm";
}

function execAccountLabels(t: TaskRow): string[] {
  const ids = Array.from(new Set((t.draft?.["reachAccounts"] as string[] | undefined) ?? []));
  const names = Array.from(new Set(
    ids.map((id) => findManagedAccountById(id)?.username ?? id),
  )).slice(0, 12);
  if (names.length) return names;
  if (t.sourceAccountId) {
    return [findManagedAccountById(t.sourceAccountId)?.username ?? t.sourceAccountId];
  }
  return ["执行账号 A", "执行账号 B", "执行账号 C"];
}

/** 触达任务的目标账号（对方账号）为确定性 mock 名单 */
function targetAccountLabels(t: TaskRow): string[] {
  const n = Math.min(8, Math.max(3, t.total % 7 || 5));
  return Array.from({ length: n }, (_, i) => `目标账号 ${t.id.slice(-4)}-${i + 1}`);
}

function actionLabels(t: TaskRow): string[] {
  const cat = getTaskCategory(t);
  if (cat === "account-ops") return [parseContentOpsAction(t)];
  if (cat === "coview") return ["同屏"];
  return TASK_CATEGORY_ACTIONS[cat];
}

/** 子任务动作序列，与任务详情页 buildSubTasks 保持一致 */
function subTaskAction(t: TaskRow, i: number): string {
  const cat = getTaskCategory(t);
  if (cat === "dm") return "私信";
  if (cat === "social-reach") return ["加好友", "关注"][i % 2];
  if (cat === "coview") return "同屏";
  if (cat === "account-ops") return parseContentOpsAction(t);
  return ["点赞", "关注", "评论"][i % 3];
}

/** 按子任务统计：使用任务真实的子任务编号 */
function subTaskRows(t: TaskRow): DistRow[] {
  const count = Math.min(t.total, 60);
  return Array.from({ length: count }, (_, i) => {
    const id = `${t.id}-${String(i + 1).padStart(3, "0")}`;
    const success = i < t.done ? 1 : 0;
    const failed = i >= t.done && i < t.done + t.failed ? 1 : 0;
    return { label: `${id} · ${subTaskAction(t, i)}`, success, failed };
  });
}

function distLabels(t: TaskRow, dim: DistDimension, subject: DistSubject): string[] {
  if (dim === "account") {
    return subject === "target" ? targetAccountLabels(t) : execAccountLabels(t);
  }
  return actionLabels(t);
}

function buildDist(t: TaskRow, dim: DistDimension, subject: DistSubject = "exec"): DistRow[] {
  if (dim === "subtask") return subTaskRows(t);
  // Deterministic pseudo-random based on task id + dim to avoid SSR hydration drift
  const seed = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  const rng = (key: string) => {
    const h = seed(`${t.id}|${dim}|${subject}|${key}`);
    return (h % 1000) / 1000;
  };

  const labels = distLabels(t, dim, subject);


  const n = labels.length || 1;
  // Distribute totals across buckets with slight variation while preserving sums.
  const weights = labels.map((l) => 0.6 + rng(l) * 0.8);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const rows: DistRow[] = labels.map((l, i) => {
    const share = weights[i] / wSum;
    const success = Math.round(t.done * share);
    const failed = Math.round(t.failed * share);
    return { label: l, success, failed };
  });
  // Reconcile rounding drift to match totals exactly
  const adjust = (key: "success" | "failed", target: number) => {
    const cur = rows.reduce((a, r) => a + r[key], 0);
    let diff = target - cur;
    let i = 0;
    while (diff !== 0 && rows.length > 0) {
      const r = rows[i % rows.length];
      if (diff > 0) { r[key] += 1; diff -= 1; }
      else if (r[key] > 0) { r[key] -= 1; diff += 1; }
      i += 1;
      if (i > n * 10) break;
    }
  };
  adjust("success", t.done);
  adjust("failed", t.failed);
  return rows;
}


function DistList({ rows }: { rows: DistRow[] }) {
  if (rows.length === 0) {
    return <div className="py-6 text-center text-xs text-muted-foreground">暂无数据</div>;
  }
  return (
    <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
      {rows.map((r) => {
        const total = r.success + r.failed;
        const sPct = total ? (r.success / total) * 100 : 0;
        const fPct = total ? (r.failed / total) * 100 : 0;
        return (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <span className="w-40 shrink-0 truncate" title={r.label}>{r.label}</span>
            <div className="flex h-2.5 flex-1 overflow-hidden rounded bg-muted">
              <div className="h-full bg-emerald-500" style={{ width: `${sPct}%` }} />
              <div className="h-full bg-destructive" style={{ width: `${fPct}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums">
              <span className="font-medium text-emerald-600">{r.success}</span>
              <span className="mx-0.5 text-muted-foreground">/</span>
              <span className="font-medium text-destructive">{r.failed}</span>
              <span className="mx-0.5 text-muted-foreground">/</span>
              <span className="text-foreground">{total}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}


type LogLine = { ts: string; level: "INFO" | "WARN" | "ERROR"; msg: string };

function buildMockLogs(t: TaskRow): LogLine[] {
  const base = t.createdAt.slice(11) || "10:00:00";
  const [hh, mm, ss] = base.split(":").map(Number);
  const at = (offset: number) => {
    const total = (hh * 3600 + mm * 60 + ss + offset) % 86400;
    const H = String(Math.floor(total / 3600)).padStart(2, "0");
    const M = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const S = String(total % 60).padStart(2, "0");
    return `${H}:${M}:${S}`;
  };
  const lines: LogLine[] = [
    { ts: at(0), level: "INFO", msg: `任务「${t.name}」已创建，计划执行 ${t.total} 个账号` },
    { ts: at(1), level: "INFO", msg: `平台范围：${t.platforms.join(", ")}` },
    { ts: at(2), level: "INFO", msg: "调度器已分配执行节点 boo-node-shenzhen-01" },
    { ts: at(4), level: "INFO", msg: "镜像实例预热完成，开始批次 #1" },
  ];
  for (let i = 0; i < Math.min(6, t.done); i++) {
    lines.push({ ts: at(6 + i * 2), level: "INFO", msg: `账号 acc-${1000 + i} 执行成功` });
  }
  for (let i = 0; i < Math.min(3, t.failed); i++) {
    lines.push({ ts: at(20 + i * 3), level: "ERROR", msg: `账号 acc-${2000 + i} 执行失败：登录态过期` });
  }
  if (t.status === "running") {
    lines.push({ ts: at(40), level: "INFO", msg: "任务执行中…" });
  } else if (t.status === "success") {
    lines.push({ ts: at(45), level: "INFO", msg: "任务执行完成" });
  } else if (t.status === "failed") {
    lines.push({ ts: at(45), level: "ERROR", msg: "任务执行失败，已停止" });
  }
  return lines;
}

