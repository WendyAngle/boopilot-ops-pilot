import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Search, Send, Sparkles, Eraser, Languages, Loader2, CheckCheck, MessageSquare, AlertCircle, RotateCw, Star, ScrollText, MailOpen, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getInboxData,
  platformMeta,
  aiSuggestReplies,
  translateZhToTarget,
  translateLangLabel,
  translateLangShortLabel,
  msgLangToTranslateLang,
  translateLangToMsgLang,
  TRANSLATE_LANGS,
  LANG_LABEL,
  type TranslateLang,
  type Conversation,
  type DirectMessage,
} from "@/lib/messages-mock";
import { useTasks } from "@/lib/operations-store";
import {
  ensureActivityTasksSeeded,
  recordActivity,
} from "@/lib/activity-tasks";
import type { Platform } from "@/lib/managed-account-mock";
import { useTenantScope } from "@/lib/tenant-scope";

ensureActivityTasksSeeded();

export const Route = createFileRoute("/_app/accounts/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    peer: typeof search.peer === "string" ? search.peer : undefined,
  }),
  head: () => ({
    meta: [
      { title: "私信管理 — BooPilot" },
      { name: "description", content: "统一查看与回复各账号收到的私信，支持自动翻译与 AI 生成回复。" },
      { property: "og:title", content: "私信管理 — BooPilot" },
      { property: "og:description", content: "统一查看与回复各账号收到的私信，支持自动翻译与 AI 生成回复。" },
    ],
  }),
  component: MessagesPage,
});

type ScopeKey = "current" | "all";
type ListFilterKey = "all" | "todo" | "unread" | "starred";

const LIST_FILTERS: { key: ListFilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "todo", label: "待我回复" },
  { key: "unread", label: "未读" },
  { key: "starred", label: "关注" },
];

/** 待我回复：最后一条是对方发来的消息 */
function isTodoConv(c: Conversation) {
  return c.messages[c.messages.length - 1]?.direction === "in";
}


function MessagesPage() {
  const [tenantScope] = useTenantScope();
  const { accounts, conversations: initialConvs } = useMemo(
    () => getInboxData(),
    [tenantScope],
  );
  const [conversations, setConversations] = useState(initialConvs);
  const [activeAccountId, setActiveAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [activeConvId, setActiveConvId] = useState<string>("");

  // 切换租户时重置为该租户下的数据与选中项
  useEffect(() => {
    setConversations(initialConvs);
    setActiveAccountId(accounts[0]?.id ?? "");
    setActiveConvId("");
  }, [initialConvs, accounts]);
  const { peer } = Route.useSearch();
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState<ScopeKey>("current");
  const [listFilter, setListFilter] = useState<ListFilterKey>("all");


  const isAllScope = scope === "all";

  // 账号维度未读汇总
  const unreadByAccount = useMemo(() => {
    const map = new Map<string, number>();
    conversations.forEach((c) => {
      map.set(c.accountId, (map.get(c.accountId) ?? 0) + c.unread);
    });
    return map;
  }, [conversations]);

  // 计数：当前作用范围下的各筛选项
  const scopedConvs = useMemo(
    () => (isAllScope ? conversations : conversations.filter((c) => c.accountId === activeAccountId)),
    [conversations, isAllScope, activeAccountId],
  );
  const filterCounts = useMemo(
    () => ({
      all: scopedConvs.length,
      todo: scopedConvs.filter(isTodoConv).length,
      unread: scopedConvs.filter((c) => c.unread > 0).length,
      starred: scopedConvs.filter((c) => c.starred).length,
    }),
    [scopedConvs],
  );

  const accountConvs = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return scopedConvs
      .filter((c) =>
        listFilter === "todo"
          ? isTodoConv(c)
          : listFilter === "unread"
            ? c.unread > 0
            : listFilter === "starred"
              ? c.starred
              : true,
      )
      .filter((c) =>
        kw
          ? c.peerName.toLowerCase().includes(kw) ||
            c.peerHandle.toLowerCase().includes(kw) ||
            c.messages.some((m) => m.text.toLowerCase().includes(kw))
          : true,
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [scopedConvs, keyword, listFilter]);


  // 默认选中该账号的第一条会话
  useEffect(() => {
    if (accountConvs.length === 0) {
      setActiveConvId("");
      return;
    }
    if (!accountConvs.find((c) => c.id === activeConvId)) {
      setActiveConvId(accountConvs[0].id);
    }
  }, [accountConvs, activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeAccount = accounts.find(
    (a) => a.id === (activeConv?.accountId ?? activeAccountId),
  );

  // 用于跳转到 任务列表 · 该账号私信任务详情
  const tasksAll = useTasks();
  const dmTaskIdByAccount = useMemo(() => {
    const m = new Map<string, string>();
    tasksAll.forEach((t) => {
      if (t.source === "dm" && t.sourceAccountId) m.set(t.sourceAccountId, t.id);
    });
    return m;
  }, [tasksAll]);

  const toggleStar = (convId: string) => {
    let nextStarred = false;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        nextStarred = !c.starred;
        return { ...c, starred: nextStarred };
      }),
    );
    toast.success(nextStarred ? "已加入关注" : "已取消关注");
  };

  const markRead = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              unread: 0,
              messages: c.messages.map((m) => (m.direction === "in" ? { ...m, read: true } : m)),
            }
          : c,
      ),
    );
  };

  /** 标记为未读：把末尾连续的对方消息重新置为未读，便于稍后跟进 */
  const markUnread = (convId: string) => {
    let ok = false;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const msgs = c.messages.map((m) => ({ ...m }));
        let unread = 0;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].direction !== "in") break;
          msgs[i].read = false;
          unread += 1;
        }
        if (unread === 0) return c;
        ok = true;
        return { ...c, messages: msgs, unread };
      }),
    );
    if (ok) {
      if (convId === activeConvId) setActiveConvId("");
      toast.success("已标记为未读");
    } else {
      toast.info("最后一条是我方发出的消息，无法标记为未读");
    }
  };

  const markAllRead = () => {
    const ids = new Set(accountConvs.filter((c) => c.unread > 0).map((c) => c.id));
    if (ids.size === 0) return;
    setConversations((prev) =>
      prev.map((c) =>
        ids.has(c.id)
          ? {
              ...c,
              unread: 0,
              messages: c.messages.map((m) => (m.direction === "in" ? { ...m, read: true } : m)),
            }
          : c,
      ),
    );
    toast.success(`已将 ${ids.size} 个会话标记为已读`);
  };

  const openConversation = (convId: string) => {
    setActiveConvId(convId);
    markRead(convId);
  };

  // 从好友管理跳转过来：定位到该联系人的会话
  useEffect(() => {
    if (!peer) return;
    const target = conversations.find(
      (c) => c.peerHandle.toLowerCase() === peer.toLowerCase(),
    );
    if (!target) {
      toast.info(`「${peer}」暂无私信会话，可从会话列表发起`);
      return;
    }
    setScope("all");
    setListFilter("all");
    setActiveAccountId(target.accountId);
    setActiveConvId(target.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer, conversations.length]);


  const handleSend = (msg: DirectMessage) => {
    if (!activeConv) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              messages: [...c.messages, msg],
              updatedAt: msg.time,
            }
          : c,
      ),
    );
  };

  const patchMessage = (convId: string, msgId: string, patch: Partial<DirectMessage>) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) }
          : c,
      ),
    );
  };

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + c.unread, 0),
    [conversations],
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">私信管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              集中查看托管账号收到的私信，支持原文翻译、AI 生成回复与一键翻译回复。
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="rounded-full">
              {accounts.length} 个账号
            </Badge>
            <Badge className="rounded-full bg-primary text-primary-foreground">
              {totalUnread} 条未读
            </Badge>
          </div>
        </div>

        <div className="grid h-[calc(100vh-13rem)] grid-cols-[220px_430px_minmax(0,1fr)] gap-3 rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {/* Column 1: Accounts */}
          <div className="flex min-h-0 flex-col border-r">
            <div className="border-b px-3 py-2.5 text-sm font-medium">账号</div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {accounts.map((a) => {
                  const unread = unreadByAccount.get(a.id) ?? 0;
                  const meta = platformMeta(a.platform);
                  const active = a.id === activeAccountId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setActiveAccountId(a.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                        active ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <div className="relative">
                        <img
                          src={a.avatar}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full bg-muted object-cover"
                        />
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-card",
                            meta.cls,
                          )}
                        >
                          {meta.letter}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium" title={`${a.username} · ${a.platformId ?? ""}`}>{a.username}</div>
                        <div className="truncate text-xs text-muted-foreground" title={a.tenantName}>
                          {a.tenantName}
                        </div>
                      </div>
                      {unread > 0 && (
                        <Badge className="h-5 min-w-[20px] justify-center rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                          {unread}
                        </Badge>
                      )}
                    </button>
                  );
                })}
                {accounts.length === 0 && (
                  <div className="px-2 py-8 text-center text-xs text-muted-foreground">
                    暂无账号
                  </div>
                )}
              </div>

            </ScrollArea>
          </div>

          {/* Column 2: Conversations */}
          <div className="flex min-h-0 flex-col border-r">
            <div className="border-b p-2.5 space-y-2">
              {/* 统一筛选：全部 / 待我回复 / 未读 / 关注 + 范围切换 */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {LIST_FILTERS.map((f) => {
                    const on = listFilter === f.key;
                    return (
                      <Button
                        key={f.key}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setListFilter(f.key)}
                        className={cn(
                          "h-7 shrink-0 gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap shadow-none",
                          on
                            ? f.key === "starred"
                              ? "bg-accent text-warning-foreground hover:bg-accent"
                              : "bg-accent text-primary hover:bg-accent"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {f.key === "starred" && (
                          <Star className="h-3 w-3 shrink-0" fill={on ? "currentColor" : "none"} />
                        )}
                        <span>{f.label}</span>
                        <span
                          className={cn(
                            "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[9px] leading-none tabular-nums text-muted-foreground",
                            on && "bg-primary text-primary-foreground",
                          )}
                        >
                          {filterCounts[f.key]}
                        </span>
                      </Button>
                    );
                  })}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Separator orientation="vertical" className="h-5" />
                  <div className="inline-flex items-center rounded-md bg-muted p-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScope("current")}
                    className={cn(
                      "h-6 rounded px-1.5 text-[10px] whitespace-nowrap shadow-none",
                      scope === "current"
                        ? "bg-background text-foreground shadow-sm hover:bg-background"
                        : "text-muted-foreground hover:bg-background/60",
                    )}
                  >
                    当前账号
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScope("all")}
                    className={cn(
                      "h-6 rounded px-1.5 text-[10px] whitespace-nowrap shadow-none",
                      scope === "all"
                        ? "bg-background text-foreground shadow-sm hover:bg-background"
                        : "text-muted-foreground hover:bg-background/60",
                    )}
                  >
                    全部账号
                  </Button>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索会话 / 内容"
                  className="h-8 pl-8 text-sm"
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="shrink-0">共 {accountConvs.length} 个会话</span>
                <div className="flex items-center gap-2">
                  {isAllScope && (
                    <span className="rounded bg-muted px-1.5 py-0.5">跨账号视图</span>
                  )}
                  <button
                    type="button"
                    onClick={markAllRead}
                    disabled={filterCounts.unread === 0}
                    className={cn(
                      "rounded-md border px-2 py-0.5 transition-colors",
                      filterCounts.unread === 0
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    全部标为已读
                  </button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-1.5">
                {accountConvs.map((c) => {
                  const acc = accounts.find((a) => a.id === c.accountId);
                  return (
                    <ConversationItem
                      key={c.id}
                      conv={c}
                      active={c.id === activeConvId}
                      onClick={() => openConversation(c.id)}
                      onToggleStar={() => toggleStar(c.id)}
                      onMarkUnread={() => markUnread(c.id)}
                      accountLabel={
                        isAllScope && acc
                          ? `${acc.username} · ${acc.platform}`
                          : undefined
                      }
                    />
                  );
                })}
                {accountConvs.length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-2 py-10 text-center text-xs text-muted-foreground">
                    <MessageSquare className="h-6 w-6 opacity-50" />
                    {listFilter === "unread"
                      ? "暂无未读会话"
                      : listFilter === "todo"
                        ? "没有等待回复的会话"
                        : listFilter === "starred"
                          ? "暂无关注会话，点击会话卡片右侧的星标可加入"
                          : "暂无私信会话"}
                  </div>
                )}

              </div>
            </ScrollArea>
          </div>

          {/* Column 3: Chat window */}
          <div className="flex min-h-0 flex-col">
            {activeConv && activeAccount ? (
              <ChatWindow
                key={activeConv.id}
                conv={activeConv}
                accountId={activeAccount.id}
                accountName={activeAccount.username}
                accountPlatform={activeAccount.platform}
                dmTaskId={dmTaskIdByAccount.get(activeAccount.id)}
                onSend={handleSend}
                onPatch={(msgId, patch) => patchMessage(activeConv.id, msgId, patch)}
                onToggleStar={() => toggleStar(activeConv.id)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <MessageSquare className="h-8 w-8 opacity-50" />
                请选择左侧的会话开始查看与回复
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ConversationItem({
  conv,
  active,
  onClick,
  onToggleStar,
  onMarkUnread,
  accountLabel,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
  onToggleStar: () => void;
  onMarkUnread: () => void;
  accountLabel?: string;
}) {

  const last = conv.messages[conv.messages.length - 1];
  const failedCount = conv.messages.filter(
    (m) => m.direction === "out" && m.status === "failed",
  ).length;
  const preview =
    last.direction === "in"
      ? last.translation ?? last.text
      : last.sourceZh ?? last.text;
  const displayTime = conv.updatedAt.slice(0, 16);
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group mb-1 grid h-[84px] w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_96px] items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <img src={conv.peerAvatar} alt="" className="h-9 w-9 shrink-0 rounded-full bg-muted" />
      <div className="min-w-0 overflow-hidden">
        <span className="block truncate text-sm font-medium leading-5" title={conv.peerName}>
          {conv.peerName}
        </span>
        <p
          className="mt-0.5 truncate text-xs leading-4 text-muted-foreground"
          title={`${last.direction === "out" ? "我: " : ""}${preview}`}
        >
          {last.direction === "out" ? "我: " : ""}
          {preview}
        </p>
        <div className="mt-1 flex min-h-5 min-w-0 items-center gap-1 overflow-hidden">
          <Badge variant="outline" className="h-4 shrink-0 rounded px-1 text-[9px] font-normal">
            {LANG_LABEL[conv.peerLang]}
          </Badge>
          {failedCount > 0 && (
            <Badge
              variant="outline"
              className="h-4 shrink-0 gap-0.5 rounded-full border-destructive/40 bg-destructive/10 px-1 text-[10px] font-normal text-destructive"
            >
              <AlertCircle className="h-2.5 w-2.5" />
              {failedCount} 未送达
            </Badge>
          )}
          {conv.starred && conv.starredNote && (
            <span className="truncate text-[10px] text-amber-600 dark:text-amber-400">
              · {conv.starredNote}
            </span>
          )}
          {accountLabel && (
            <span className="truncate text-[10px] text-muted-foreground">
              · 来自 {accountLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-col items-start justify-between overflow-visible pl-1">
        <span
          className="block w-[92px] whitespace-nowrap text-left font-mono text-[10px] leading-4 text-muted-foreground"
          title={displayTime}
        >
          {displayTime}
        </span>
        <div className="flex w-[92px] items-center justify-between gap-1">
          {conv.unread > 0 ? (
            <Badge className="h-4 min-w-[16px] shrink-0 justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
              {conv.unread}
            </Badge>
          ) : (
            <span aria-hidden="true" className="h-4 min-w-[16px]" />
          )}
          <div className="flex items-center gap-0.5">
            {conv.unread === 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkUnread();
                    }}
                    aria-label="标记为未读"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-colors hover:text-primary group-hover:opacity-100"
                  >
                    <MailOpen className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>标记为未读，稍后跟进</TooltipContent>
              </Tooltip>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar();
              }}
              aria-label={conv.starred ? "取消关注" : "加入关注"}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
                conv.starred
                  ? "text-amber-500"
                  : "text-muted-foreground/40 opacity-0 hover:text-amber-500 group-hover:opacity-100",
              )}
            >
              <Star className="h-3.5 w-3.5" fill={conv.starred ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function ChatWindow({
  conv,
  accountId,
  accountName,
  accountPlatform,
  dmTaskId,
  onSend,
  onPatch,
  onToggleStar,
}: {
  conv: Conversation;
  accountId: string;
  accountName: string;
  accountPlatform: Platform;
  dmTaskId?: string;
  onSend: (msg: DirectMessage) => void;
  onPatch: (msgId: string, patch: Partial<DirectMessage>) => void;
  onToggleStar: () => void;
}) {
  const [draftZh, setDraftZh] = useState("");
  const [translated, setTranslated] = useState("");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOptions, setAiOptions] = useState<{ zh: string; translated: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 默认目标语言：对方最近一条回复所用语言；对方从未回复时默认英语
  const defaultTargetLang: TranslateLang = useMemo(() => {
    const lastIn = [...conv.messages].reverse().find((m) => m.direction === "in");
    return lastIn ? msgLangToTranslateLang(lastIn.lang) : "en";
  }, [conv.messages]);
  const [targetLang, setTargetLang] = useState<TranslateLang>(defaultTargetLang);

  useEffect(() => {
    // 会话切换时清空并重置目标语言
    setDraftZh("");
    setTranslated("");
    setAiOptions([]);
    setTargetLang(defaultTargetLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conv.messages.length]);

  const noTranslateNeeded = targetLang === "zh-CN";

  // 自动翻译（防抖）
  useEffect(() => {
    if (!autoTranslate || !draftZh.trim() || targetLang === "zh-CN") {
      setTranslated(targetLang === "zh-CN" ? draftZh : "");
      return;
    }
    const t = setTimeout(() => {
      setTranslated(translateZhToTarget(targetLang, draftZh));
    }, 250);
    return () => clearTimeout(t);
  }, [draftZh, autoTranslate, targetLang]);

  const handleAiGenerate = () => {
    setAiLoading(true);
    setTimeout(() => {
      setAiOptions(aiSuggestReplies(conv));
      setAiLoading(false);
    }, 700);
  };

  const handlePickAi = (opt: { zh: string; translated: string }) => {
    setDraftZh(opt.zh);
    setTranslated(opt.translated);
    setAiOptions([]);
  };

  const handleClear = () => {
    setDraftZh("");
    setTranslated("");
    setAiOptions([]);
  };

  const simulateSend = (msgId: string, sourceZh: string) => {
    // 模拟发送：约 15% 概率失败，用于覆盖失败态
    const delay = 900 + Math.random() * 800;
    setTimeout(() => {
      const failed = Math.random() < 0.15;
      if (failed) {
        onPatch(msgId, { status: "failed", failReason: "网络异常，消息未送达" });
        recordActivity({
          accountId, accountName, platform: accountPlatform,
          source: "dm", target: conv.peerName, status: "failed",
          detail: sourceZh,
        });
        toast.error(`私信发送失败 · 对方「${conv.peerName}」`, {
          description: "网络异常，消息未送达。可点击重试或稍后再发。",
          duration: 6000,
          action: {
            label: "重试",
            onClick: () => {
              onPatch(msgId, { status: "sending", failReason: undefined });
              simulateSend(msgId, sourceZh);
            },
          },
        });
      } else {
        onPatch(msgId, { status: "sent" });
        recordActivity({
          accountId, accountName, platform: accountPlatform,
          source: "dm", target: conv.peerName, status: "success",
          detail: sourceZh,
        });
      }
    }, delay);
  };

  const handleRetry = (msg: DirectMessage) => {
    onPatch(msg.id, { status: "sending", failReason: undefined });
    simulateSend(msg.id, msg.sourceZh ?? msg.text);
  };

  const failedMessages = useMemo(
    () => conv.messages.filter((m) => m.direction === "out" && m.status === "failed"),
    [conv.messages],
  );

  const handleRetryAll = () => {
    if (failedMessages.length === 0) return;
    failedMessages.forEach((m) => {
      onPatch(m.id, { status: "sending", failReason: undefined });
      simulateSend(m.id, m.sourceZh ?? m.text);
    });
    toast.info(`正在重试 ${failedMessages.length} 条消息…`);
  };

  const handleSend = () => {
    const zh = draftZh.trim();
    if (!zh) return;
    const finalText =
      !autoTranslate || noTranslateNeeded ? zh : translated || translateZhToTarget(targetLang, zh);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const msgId = `${conv.id}-out-${Date.now()}`;
    onSend({
      id: msgId,
      direction: "out",
      lang: !autoTranslate ? "zh" : translateLangToMsgLang(targetLang),
      text: finalText,
      sourceZh: zh,
      time,
      status: "sending",
    });
    handleClear();
    simulateSend(msgId, zh);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <img src={conv.peerAvatar} alt="" className="h-9 w-9 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{conv.peerName}</span>
            <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px] font-normal">
              {LANG_LABEL[conv.peerLang]}
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {conv.peerHandle} · 通过账号「{accountName}」({accountPlatform})
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-primary">
              <Link to="/accounts/friends" search={{ peer: conv.peerHandle }}>
                <UserCheck className="h-3.5 w-3.5" />
                好友关系
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>在好友管理中查看与该联系人的好友关系</TooltipContent>
        </Tooltip>
        {dmTaskId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-primary">
                <Link to="/tasks/$taskId" params={{ taskId: dmTaskId }}>
                  <ScrollText className="h-3.5 w-3.5" />
                  查看私信任务
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>该账号所有私信发送记录已归档到任务列表，点击查看</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-xs"
              onClick={onToggleStar}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  conv.starred ? "text-amber-500" : "text-muted-foreground",
                )}
                fill={conv.starred ? "currentColor" : "none"}
              />
              {conv.starred ? "已关注" : "关注"}
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            {conv.starred ? "取消对该会话的重点关注" : "加入重点关注，便于稍后跟进"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 失败提醒条 */}
      {failedMessages.length > 0 && (
        <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            当前会话有 <span className="font-semibold">{failedMessages.length}</span> 条消息未送达，请及时处理。
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 border-destructive/40 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleRetryAll}
          >
            <RotateCw className="mr-1 h-3 w-3" />
            全部重试
          </Button>
        </div>
      )}


      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-4 px-4 py-4">
          {conv.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} peerName={conv.peerName} onRetry={handleRetry} />
          ))}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t bg-muted/30">
        {aiOptions.length > 0 && (
          <div className="space-y-1.5 border-b px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> AI 建议回复（点击填入）
            </div>
            {aiOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handlePickAi(opt)}
                className="w-full rounded-md border bg-card px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary hover:bg-accent"
              >
                <div>{opt.zh}</div>
                {autoTranslate && !noTranslateNeeded && (
                  <div className="mt-0.5 text-muted-foreground">
                    {translateZhToTarget(targetLang, opt.zh)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="p-3">
          <div className="flex items-center justify-between gap-2 pb-1.5">
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" />
                <span className="text-foreground">自动翻译</span>
                <Switch
                  checked={autoTranslate}
                  onCheckedChange={setAutoTranslate}
                  aria-label="自动翻译"
                  className="scale-90"
                />
              </div>
              {autoTranslate && (
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0">翻译为</span>
                  <Select
                    value={targetLang}
                    onValueChange={(v) => setTargetLang(v as TranslateLang)}
                  >
                    <SelectTrigger className="h-7 w-[200px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {TRANSLATE_LANGS.map((l) => (
                        <SelectItem key={l.code} value={l.code} className="text-xs">
                          {translateLangLabel(l.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={handleAiGenerate}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    AI 生成回复
                  </Button>
                </TooltipTrigger>
                <TooltipContent>基于最新一条对方消息生成 3 条建议</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={handleClear}
                    disabled={!draftZh && !translated}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    清空
                  </Button>
                </TooltipTrigger>
                <TooltipContent>清空输入框及译文</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Textarea
            value={draftZh}
            onChange={(e) => setDraftZh(e.target.value)}
            placeholder={
              autoTranslate && !noTranslateNeeded
                ? `输入中文，发送时自动翻译为${translateLangShortLabel(targetLang)}…（Ctrl/⌘ + Enter 发送）`
                : "输入要发送的内容…（Ctrl/⌘ + Enter 发送）"
            }
            rows={3}
            className="resize-none bg-card text-sm"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {autoTranslate && !noTranslateNeeded && draftZh.trim() && (
            <div className="mt-2 rounded-md border border-dashed bg-card px-2.5 py-1.5">
              <div className="mb-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Languages className="h-3 w-3" />
                将发送为 {translateLangLabel(targetLang)}
              </div>
              <div className="text-sm">{translated || "…"}</div>
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={handleSend} disabled={!draftZh.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              发送回复
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function MessageBubble({
  msg,
  peerName,
  onRetry,
}: {
  msg: DirectMessage;
  peerName: string;
  onRetry: (msg: DirectMessage) => void;
}) {
  const isOut = msg.direction === "out";
  const status = msg.status;
  const isSending = isOut && status === "sending";
  const isFailed = isOut && status === "failed";
  return (
    <div className={cn("flex gap-2", isOut ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
          isOut ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isOut ? "我" : peerName.slice(0, 1)}
      </div>
      <div className={cn("max-w-[75%] space-y-1", isOut && "items-end text-right")}>
        <div className={cn("flex items-center gap-1.5", isOut && "flex-row-reverse")}>
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
              isOut
                ? "rounded-tr-sm bg-primary text-primary-foreground"
                : "rounded-tl-sm bg-card border",
              isSending && "opacity-70",
              isFailed && "opacity-90 ring-1 ring-destructive/40",
            )}
          >
            {msg.text}
          </div>
          {isSending && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          )}
          {isFailed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRetry(msg)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                  aria-label="重新发送"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {msg.failReason ?? "发送失败"} · 点击重试
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {/* 翻译 */}
        {!isOut && msg.translation && (
          <div className="rounded-lg border border-dashed bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <div className="mb-0.5 flex items-center gap-1 text-[10px]">
              <Languages className="h-3 w-3" />
              译文(中文)
            </div>
            <div>{msg.translation}</div>
          </div>
        )}
        {isOut && msg.sourceZh && msg.sourceZh !== msg.text && (
          <div className="rounded-lg border border-dashed bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <div className="mb-0.5 flex items-center gap-1 text-[10px]">
              <Languages className="h-3 w-3" />
              原文(中文)
            </div>
            <div>{msg.sourceZh}</div>
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-1 text-[10px] text-muted-foreground",
            isOut && "justify-end",
          )}
        >
          <span title={msg.time}>{msg.time}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>{LANG_LABEL[msg.lang]}</span>
          {isOut && status === "sending" && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              发送中
            </span>
          )}
          {isOut && status === "sent" && (
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              <CheckCheck className="h-3 w-3" />
              已送达
            </span>
          )}
          {isOut && status === "failed" && (
            <button
              onClick={() => onRetry(msg)}
              className="flex items-center gap-0.5 text-destructive hover:underline"
            >
              <AlertCircle className="h-3 w-3" />
              发送失败，重试
              <RotateCw className="h-3 w-3" />
            </button>
          )}
          {isOut && !status && <CheckCheck className="h-3 w-3" />}
        </div>
      </div>
    </div>
  );
}
