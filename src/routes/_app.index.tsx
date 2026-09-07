import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  FileEdit,
  MessageSquare,
  Send,
  Repeat2,
  ThumbsUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "工作台 — BooPilot" },
      { name: "description", content: "BooPilot 业务运营自动驾驶工作台" },
    ],
  }),
});


const actionStats = [
  {
    label: "发帖",
    value: "326",
    sub: "今日执行 / 累计 12,480",
    delta: "+12.4%",
    up: true,
    icon: FileEdit,
    color: "oklch(0.68 0.16 220)",
  },
  {
    label: "评论",
    value: "1,058",
    sub: "今日执行 / 累计 42,310",
    delta: "+8.7%",
    up: true,
    icon: MessageSquare,
    color: "oklch(0.70 0.15 160)",
  },
  {
    label: "私信",
    value: "412",
    sub: "今日执行 / 累计 18,902",
    delta: "+3.2%",
    up: true,
    icon: Send,
    color: "oklch(0.68 0.18 260)",
  },
  {
    label: "转载",
    value: "234",
    sub: "今日执行 / 累计 9,672",
    delta: "-2.1%",
    up: false,
    icon: Repeat2,
    color: "oklch(0.70 0.16 30)",
  },
  {
    label: "点赞",
    value: "3,287",
    sub: "今日执行 / 累计 124,580",
    delta: "+9.8%",
    up: true,
    icon: ThumbsUp,
    color: "oklch(0.72 0.18 350)",
  },
];

const TREND_METRICS = [
  { key: "发帖", color: "var(--chart-1)" },
  { key: "评论", color: "var(--chart-2)" },
  { key: "私信", color: "var(--chart-3)" },
  { key: "转载", color: "var(--chart-5)" },
  { key: "点赞", color: "var(--chart-6)" },
] as const;

const chartData = [
  { date: "5/20", 发帖: 42, 评论: 168, 私信: 96, 浏览: 1240, 转载: 28, 点赞: 312 },
  { date: "5/21", 发帖: 48, 评论: 182, 私信: 88, 浏览: 1320, 转载: 31, 点赞: 298 },
  { date: "5/22", 发帖: 38, 评论: 154, 私信: 102, 浏览: 1180, 转载: 24, 点赞: 276 },
  { date: "5/23", 发帖: 55, 评论: 196, 私信: 118, 浏览: 1420, 转载: 36, 点赞: 348 },
  { date: "5/24", 发帖: 62, 评论: 214, 私信: 124, 浏览: 1560, 转载: 42, 点赞: 392 },
  { date: "5/25", 发帖: 58, 评论: 226, 私信: 132, 浏览: 1488, 转载: 38, 点赞: 372 },
  { date: "5/26", 发帖: 65, 评论: 248, 私信: 146, 浏览: 1620, 转载: 45, 点赞: 416 },
];

const todos = [
  { tag: "风控", tone: "destructive", title: "账号 #1001 风控异常", sub: "Facebook · 张三 · 状态：风控" },
  { tag: "失败", tone: "warning", title: "任务 #204683 执行失败", sub: "运营任务 · 连续失败 3 次" },
  { tag: "私信", tone: "info", title: "账号 客服-小美 收到新私信", sub: "Instagram · 待回复 8 条", count: 8 },
  { tag: "好友", tone: "info", title: "账号 客服-小美 收到加好友请求", sub: "Facebook · 待处理 5 条", count: 5 },
];

const recent = [
  { who: "运营A", what: "创建了任务", target: "春节营销活动", time: "2 分钟前" },
  { who: "运营B", what: "上传了素材", target: "图文 ×12", time: "10 分钟前" },
  { who: "系统", what: "同步完成", target: "目标账号 ×48", time: "32 分钟前" },
];

function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card
        className="relative overflow-hidden border-0 p-8 shadow-[var(--shadow-card)]"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            你好，欢迎回到{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              BooPilot
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            把自动驾驶的体验带给业务运营 —— 这里是你的业务工作台，快速掌握触达、任务、账号与风控的实时动态。
          </p>
        </div>
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--gradient-primary)" }}
        />
      </Card>


      {/* Action Stats */}
      <Card className="p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">动作执行统计</h2>
          <span className="text-xs text-muted-foreground">今日数据 · 含累计趋势</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {actionStats.map((s) => (
            <div
              key={s.label}
              className="group rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ background: s.color }}
                >
                  <s.icon className="h-4 w-4" />
                </div>
                <Badge
                  variant="outline"
                  className={
                    s.up
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }
                >
                  {s.up ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {s.delta}
                </Badge>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                {s.value}
              </div>
              <div className="mt-0.5 text-sm font-medium">{s.label}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.sub}</div>
            </div>
          ))}
        </div>
      </Card>


      {/* Chart + Todos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">核心趋势</h2>
            </div>
            <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
              {["近一天", "近一周", "近两周", "近一月"].map((t, i) => (
                <button
                  key={t}
                  className={`rounded px-3 py-1 transition-colors ${
                    i === 1
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                {TREND_METRICS.map((m) => (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">待处理事项</h2>
            <Badge variant="secondary">{todos.length}</Badge>
          </div>
          <div className="space-y-3">
            {todos.map((t) => (
              <div
                key={t.title}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:bg-accent/40"
              >
                <Badge
                  className={
                    t.tone === "destructive"
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                      : t.tone === "warning"
                        ? "bg-warning/15 text-warning-foreground hover:bg-warning/20"
                        : "bg-info/10 text-info hover:bg-info/15"
                  }
                  variant="secondary"
                >
                  {t.tag}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.sub}</div>
                </div>
                {"count" in t && t.count ? (
                  <Badge variant="outline" className="shrink-0 text-xs font-medium">
                    {t.count}
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent */}
      <Card className="p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-base font-semibold">最近动态</h2>
        <div className="space-y-3">
          {recent.map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                {r.who[2] ?? r.who[0]}
              </div>
              <div className="flex-1">
                <span className="font-medium">{r.who}</span>
                <span className="text-muted-foreground"> {r.what} </span>
                <span className="font-medium text-primary">「{r.target}」</span>
              </div>
              <span className="text-xs text-muted-foreground">{r.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
