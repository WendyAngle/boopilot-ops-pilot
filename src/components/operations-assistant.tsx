import { useEffect, useRef, useState } from "react";
import {
  Bot, Send, Mic, MicOff, CircleDot, User as UserIcon, ListChecks, BookmarkPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SUBTYPE_LABEL, type TaskRow, type TaskTemplate,
  useTasks, useTemplates, templatesActions,
  executeTask, createTaskFromIntent, createTaskFromTemplate, parseUserMessage,
  fmtNow, shortTime, uid,
} from "@/lib/operations-store";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  taskRef?: string;
  templateRef?: string;
  ts: string;
}

const initialChat = (): ChatMessage[] => [
  {
    id: uid("m"),
    role: "agent",
    content:
      `你好，我是「账号运营助手」。直接告诉我你要做的事，例如：\n• 创建一个 Facebook 的单次触达任务，发布 10 条\n• 用 Facebook 日常养号 任务模版 创建任务\n• 把刚才的任务保存为模版，命名为 节日营销`,
    ts: fmtNow(),
  },
];

export function OperationsAssistant({ className }: { className?: string }) {
  const tasks = useTasks();
  const templates = useTemplates();
  const [chat, setChat] = useState<ChatMessage[]>(initialChat);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [thinking, setThinking] = useState(false);
  const lastTaskIdRef = useRef<string | undefined>(undefined);

  const [saveTplFor, setSaveTplFor] = useState<TaskRow | null>(null);
  const [saveTplName, setSaveTplName] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, thinking]);

  const pushAgent = (content: string, extra: Partial<ChatMessage> = {}) => {
    setChat((prev) => [...prev, { id: uid("m"), role: "agent", content, ts: fmtNow(), ...extra }]);
  };

  const respondAndAct = (userText: string) => {
    const intent = parseUserMessage(userText, templates, lastTaskIdRef.current);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);

      if (intent.kind === "save_template") {
        const target = tasks.find((t) => t.id === intent.targetTaskId) ?? tasks[0];
        if (!target) { pushAgent("当前还没有可保存的任务，请先描述一个任务让我创建。"); return; }
        if (!intent.newTemplateName) {
          setSaveTplFor(target); setSaveTplName(target.name);
          pushAgent(`请为模版命名后确认保存，将基于任务「${target.name}」创建模版。`);
          return;
        }
        const tpl: TaskTemplate = {
          id: uid("tpl"), name: intent.newTemplateName, subtype: target.subtype, platforms: target.platforms,
          total: target.total, description: target.description, createdAt: fmtNow(), uses: 0,
        };
        templatesActions.add(tpl);
        pushAgent(`已将任务「${target.name}」保存为模版「${tpl.name}」，后续可直接说"用 ${tpl.name} 任务模版 创建任务"。`, { templateRef: tpl.id });
        toast.success(`已保存模版「${tpl.name}」`);
        return;
      }

      if (intent.kind === "use_template") {
        const tpl = templates.find((x) => x.name === intent.templateName) ?? templates.find((x) => x.name.includes(intent.templateName ?? ""));
        if (!tpl) { pushAgent(`没有找到名为「${intent.templateName}」的任务模版，请确认模版名称或在当前页面新建。`); return; }
        const task = createTaskFromTemplate(tpl);
        pushAgent(`已根据模版「${tpl.name}」创建任务「${task.name}」并加入待执行队列。`, { taskRef: task.id, templateRef: tpl.id });
        lastTaskIdRef.current = task.id;
        setTimeout(() => executeTask(task.id), 600);
        return;
      }

      if (intent.kind === "create") {
        const task = createTaskFromIntent(intent, userText);
        pushAgent(
          `已为你创建任务：\n• 名称：${task.name}\n• 类型：${SUBTYPE_LABEL[task.subtype]}\n• 平台：${task.platforms.join(" / ")}\n• 数量：${task.total}\n任务已加入队列并开始执行。如需保留以备复用，可说"保存为模版"。`,
          { taskRef: task.id }
        );
        lastTaskIdRef.current = task.id;
        setTimeout(() => executeTask(task.id), 600);
        return;
      }

      pushAgent("我可以帮你创建并执行运营任务。请尝试描述任务（平台、类型、数量），或使用一个已有的任务模版。");
    }, 500);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setChat((prev) => [...prev, { id: uid("m"), role: "user", content: text, ts: fmtNow() }]);
    setInput("");
    respondAndAct(text);
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
    pushAgent(`已将任务「${saveTplFor.name}」保存为模版「${tpl.name}」。`, { templateRef: tpl.id });
    setSaveTplFor(null); setSaveTplName("");
  };

  return (
    <>
      <div className={cn("flex h-[680px] min-w-0 flex-col rounded-xl border bg-card shadow-[var(--shadow-card)]", className)}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">账号运营助手</h3>
              <span className="flex items-center gap-1 text-[10px] text-success">
                <CircleDot className="h-2.5 w-2.5 fill-current" />在线
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">描述任务即可创建并执行；支持调用任务模版</p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="space-y-4 p-4">
            {chat.map((m) => (
              <ChatBubble key={m.id} msg={m}
                taskName={tasks.find((t) => t.id === m.taskRef)?.name}
                templateName={templates.find((t) => t.id === m.templateRef)?.name} />
            ))}
            {thinking && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-wrap gap-1.5 border-t px-3 py-2">
          {[
            "创建一个 Facebook 的单次触达任务，发布 10 条",
            "创建周期性养号任务 Tiktok 5 个账号",
            templates[0] && `用 ${templates[0].name} 任务模版 创建任务`,
            "保存上一个任务为模版 命名为 节日营销",
          ].filter(Boolean).map((q) => (
            <button key={q as string} onClick={() => setInput(q as string)}
              className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
              {q as string}
            </button>
          ))}
        </div>

        <div className="border-t p-3">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="描述你要做的任务，例如：创建一个 Facebook 单次触达任务，发布 10 条..."
              className="min-h-[120px] resize-none pr-20"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Button size="icon" variant={isRecording ? "destructive" : "ghost"}
                onClick={() => { setIsRecording((v) => !v); toast.info(isRecording ? "已停止语音输入" : "开始语音输入..."); }}
                className={cn("h-8 w-8", isRecording && "animate-pulse")}>
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button size="icon" className="h-8 w-8" onClick={handleSend} disabled={!input.trim() || thinking}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!saveTplFor} onOpenChange={(o) => { if (!o) { setSaveTplFor(null); setSaveTplName(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-violet-600" />保存为任务模版
            </DialogTitle>
            <DialogDescription>
              基于任务「{saveTplFor?.name}」创建模版，后续可通过对话"用 模版名 任务模版 创建任务"快速复用。
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
                <div>类型：{SUBTYPE_LABEL[saveTplFor.subtype]}</div>
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
    </>
  );
}

function ChatBubble({ msg, taskName, templateName }: { msg: ChatMessage; taskName?: string; templateName?: string }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
      )}>
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("max-w-[80%] space-y-1.5", isUser && "items-end text-right")}>
        <div className={cn(
          "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted text-foreground",
        )}>
          {msg.content}
        </div>
        {(taskName || templateName) && (
          <div className={cn("flex flex-wrap gap-1", isUser && "justify-end")}>
            {taskName && (
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <ListChecks className="h-3 w-3" />任务：{taskName}
              </Badge>
            )}
            {templateName && (
              <Badge variant="outline" className="gap-1 border-violet-300/40 bg-violet-500/10 text-[10px] font-normal text-violet-600">
                <BookmarkPlus className="h-3 w-3" />模版：{templateName}
              </Badge>
            )}
          </div>
        )}
        <div className={cn("text-[10px] text-muted-foreground", isUser && "text-right")}>{shortTime(msg.ts)}</div>
      </div>
    </div>
  );
}
