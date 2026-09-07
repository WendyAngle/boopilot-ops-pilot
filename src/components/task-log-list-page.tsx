import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Filter, RotateCcw, Search } from "lucide-react";

import { PaginationBar } from "@/components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PLATFORM_CHIP, type TaskRow } from "@/lib/operations-store";
import {
  buildLogs, STATUS_CLS, STATUS_LABEL,
} from "@/lib/task-logs";
import { cn } from "@/lib/utils";

type TaskLogListPageProps = {
  task?: TaskRow;
  taskId: string;
  selectedLogId?: string;
  subIndex?: number;
  subTaskId?: string;
  subTaskLabel?: string;
};

const PAGE_SIZE = 15;

export function TaskLogListPage({ task, taskId, selectedLogId, subIndex, subTaskId, subTaskLabel }: TaskLogListPageProps) {
  const navigate = useNavigate();
  const allLogs = useMemo(() => (task ? buildLogs(task) : []), [task]);
  const logs = useMemo(
    () => {
      if (subTaskId) return allLogs.filter((l) => l.subTaskId === subTaskId);
      if (subIndex !== undefined) return allLogs.filter((l) => l.subIndex === subIndex);
      return allLogs;
    },
    [allLogs, subIndex, subTaskId],
  );

  const [kw, setKw] = useState("");
  const [fPlatform, setFPlatform] = useState<"all" | string>("all");
  const [fEvent, setFEvent] = useState<"all" | string>("all");
  const [fCode, setFCode] = useState<"all" | string>("all");
  const [fCodeDesc, setFCodeDesc] = useState("");
  const [fDate, setFDate] = useState("");
  const [page, setPage] = useState(1);

  const codeOptions = useMemo(() => Array.from(new Set(logs.map((l) => l.statusCode))).sort(), [logs]);
  const platformOptions = useMemo(() => Array.from(new Set(logs.map((l) => l.platform))), [logs]);
  const eventOptions = useMemo(() => Array.from(new Set(logs.map((l) => l.eventType))), [logs]);

  const filtered = useMemo(() => {
    const keyword = kw.trim().toLowerCase();
    return logs.filter((l) => {
      if (keyword) {
        const haystack = [
          taskId,
          l.id,
          l.subTaskId,
          l.account,
          l.eventType,
          l.target,
          l.targetTitle ?? "",
          l.targetUrl ?? "",
          l.platform,
          l.statusCode,
          l.statusCodeDesc,
          l.content,
          l.ts,
        ].join(" ").toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      if (fPlatform !== "all" && l.platform !== fPlatform) return false;
      if (fEvent !== "all" && l.eventType !== fEvent) return false;
      if (fCode !== "all" && l.statusCode !== fCode) return false;
      if (fCodeDesc.trim() && !l.statusCodeDesc.toLowerCase().includes(fCodeDesc.trim().toLowerCase())) return false;
      if (fDate && !l.ts.startsWith(fDate)) return false;

      return true;
    });
  }, [fCode, fCodeDesc, fDate, fEvent, fPlatform, kw, logs, taskId]);

  const filtersActive = kw.trim() !== ""
    || fPlatform !== "all"
    || fEvent !== "all"
    || fCode !== "all"
    || fCodeDesc.trim() !== ""
    || fDate !== "";

  const selectedLogPage = useMemo(() => {
    if (!selectedLogId) return 1;
    const idx = logs.findIndex((item) => item.id === selectedLogId);
    return idx >= 0 ? Math.floor(idx / PAGE_SIZE) + 1 : 1;
  }, [logs, selectedLogId]);

  useEffect(() => {
    if (selectedLogId && !filtersActive) {
      setPage(selectedLogPage);
    }
  }, [filtersActive, selectedLogId, selectedLogPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page]);

  const resetFilters = () => {
    setKw("");
    setFPlatform("all");
    setFEvent("all");
    setFCode("all");
    setFCodeDesc("");
    setFDate("");
    setPage(selectedLogPage);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  if (!task) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate({ to: "/tasks/list" })}>
          <ArrowLeft className="h-4 w-4" />返回任务列表
        </Button>
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          未找到任务 <span className="font-mono">{taskId}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate({ to: "/tasks/list" })}>
          <ArrowLeft className="h-4 w-4" />返回任务列表
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold tracking-tight">
                {subIndex !== undefined ? "子任务日志" : "任务日志"}
              </h1>
              <div className="text-xs text-muted-foreground">
                任务ID：<span className="font-mono text-foreground">{task.id}</span>
                {subTaskLabel && (
                  <>
                    <span className="mx-2 text-border">·</span>
                    子任务ID：<span className="font-mono text-foreground">{subTaskLabel}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              共 <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> 条日志
              {filtersActive && <span> / {logs.length}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => {
                setKw(e.target.value);
                setPage(1);
              }}
              placeholder="搜索任务ID / 账号 / 事件类型 / 平台 / 状态码 / 状态码描述 / 时间"
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Select value={fPlatform} onValueChange={(value) => { setFPlatform(value); setPage(1); }}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="平台" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              {platformOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={fEvent} onValueChange={(value) => { setFEvent(value); setPage(1); }}>
            <SelectTrigger className="h-8 w-[210px] text-xs"><SelectValue placeholder="事件类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部事件</SelectItem>
              {eventOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={fCode} onValueChange={(value) => { setFCode(value); setPage(1); }}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="状态码" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态码</SelectItem>
              {codeOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input
            value={fCodeDesc}
            onChange={(e) => {
              setFCodeDesc(e.target.value);
              setPage(1);
            }}
            placeholder="状态码描述"
            className="h-8 w-[150px] text-xs"
          />

          <Input
            type="date"
            value={fDate}
            onChange={(e) => {
              setFDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-[150px] text-xs"
          />

          {filtersActive && (
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" />重置
            </Button>
          )}

          <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Filter className="h-3 w-3" />共 <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> 条
            {filtersActive && <span>/ {logs.length}</span>}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
            <TableHeader>
              <TableRow className="border-b border-border/60 hover:bg-transparent">
                <TableHead className="w-[110px]">子任务ID</TableHead>
                <TableHead className="w-[150px]">账号</TableHead>
                <TableHead className="w-[220px]">事件类型</TableHead>
                <TableHead className="min-w-[200px]">目标</TableHead>
                <TableHead className="w-[100px]">平台</TableHead>
                <TableHead className="w-[90px]">状态码</TableHead>
                <TableHead className="w-[140px]">状态码描述</TableHead>
                <TableHead className="min-w-[240px]">日志内容</TableHead>
                <TableHead className="w-[160px]">时间</TableHead>
                <TableHead className="w-[100px] pr-4">状态</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-sm text-muted-foreground">
                    {logs.length === 0 ? "暂无日志" : (
                      <span className="inline-flex items-center gap-2">
                        没有符合筛选条件的日志
                        <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={resetFilters}>清除筛选</Button>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ) : paged.map((log) => {
                const selected = log.id === selectedLogId;

                return (
                  <TableRow key={log.id} className={cn("border-b-border/40", selected && "bg-primary/5")}> 
                    <TableCell className="font-mono text-xs">{log.subTaskId}</TableCell>
                    <TableCell className="font-mono text-xs">{log.account}</TableCell>
                    <TableCell className="font-mono text-xs">{log.eventType}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-[11px]" title={log.targetUrl ?? log.target}>
                      {log.targetUrl ? (
                        <a
                          href={log.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline"
                        >
                          <span className="truncate">{log.targetTitle ?? log.target}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                        </a>
                      ) : (
                        <span className="font-mono text-muted-foreground">{log.target}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] font-normal lowercase", PLATFORM_CHIP[log.platformBadge])}>
                        {log.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("font-mono text-xs", log.status === "failed" && "text-destructive")}>
                      {log.statusCode}
                    </TableCell>
                    <TableCell className={cn("text-xs text-muted-foreground", log.status === "failed" && "text-destructive/80")}>
                      {log.statusCodeDesc}
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate text-xs text-foreground/90" title={log.content}>
                      {log.content}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{log.ts}</TableCell>
                    <TableCell className="pr-4">
                      <Badge variant="outline" className={cn("text-xs font-normal", STATUS_CLS[log.status])}>
                        {STATUS_LABEL[log.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <PaginationBar page={page} totalPages={totalPages} total={filtered.length} setPage={setPage} />
      </div>
    </div>
  );
}