import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Cpu, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  MOCK_MODELS, MODULE_OPTIONS, MODULE_LABEL, PRICING_LABEL,
  type AppModule,
} from "@/lib/models-mock";

export const Route = createFileRoute("/_app/agents/models")({
  component: AgentModelsPage,
  head: () => ({
    meta: [
      { title: "智能体模型配置 — BooPilot" },
      { name: "description", content: "为各业务场景绑定智能体所使用的模型与生成参数。" },
      { property: "og:title", content: "智能体模型配置 — BooPilot" },
      { property: "og:description", content: "为各业务场景绑定智能体所使用的模型与生成参数。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Binding = Record<AppModule, string>;

function defaultBindings(): Binding {
  const out = {} as Binding;
  for (const m of MODULE_OPTIONS) {
    const first = MOCK_MODELS.find(
      (x) => x.status === "active" && x.modules.includes(m.value),
    );
    out[m.value] = first?.id ?? "";
  }
  return out;
}

function AgentModelsPage() {
  const [bindings, setBindings] = useState<Binding>(defaultBindings);
  const [temperature, setTemperature] = useState(0.7);
  const [maxRetry, setMaxRetry] = useState(2);
  const [concurrency, setConcurrency] = useState(4);

  const optionsByModule = useMemo(() => {
    const map = {} as Record<AppModule, typeof MOCK_MODELS>;
    for (const m of MODULE_OPTIONS) {
      map[m.value] = MOCK_MODELS.filter(
        (x) => x.status === "active" && x.modules.includes(m.value),
      );
    }
    return map;
  }, []);

  const boundCount = Object.values(bindings).filter(Boolean).length;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Cpu className="h-5 w-5 text-primary" />
            模型配置
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            为每个业务场景绑定智能体默认调用的模型，并设置统一的生成参数。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            已绑定 {boundCount}/{MODULE_OPTIONS.length}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setBindings(defaultBindings());
              setTemperature(0.7);
              setMaxRetry(2);
              setConcurrency(4);
              toast.success("已恢复默认配置");
            }}
          >
            <RotateCcw className="h-4 w-4" /> 恢复默认
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => toast.success("模型配置已保存")}>
            <Save className="h-4 w-4" /> 保存配置
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">业务场景</TableHead>
              <TableHead className="min-w-[260px]">默认模型</TableHead>
              <TableHead className="w-[160px]">供应商</TableHead>
              <TableHead className="w-[110px]">计费方式</TableHead>
              <TableHead className="w-[110px]">可选模型</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULE_OPTIONS.map((m) => {
              const opts = optionsByModule[m.value];
              const current = MOCK_MODELS.find((x) => x.id === bindings[m.value]);
              return (
                <TableRow key={m.value}>
                  <TableCell className="font-medium">{MODULE_LABEL[m.value]}</TableCell>
                  <TableCell>
                    <Select
                      value={bindings[m.value] || undefined}
                      onValueChange={(v) => setBindings((p) => ({ ...p, [m.value]: v }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="未配置可用模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {opts.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {current?.vendor ?? "—"}
                  </TableCell>
                  <TableCell>
                    {current?.pricing ? (
                      <Badge variant={current.pricing === "paid" ? "default" : "secondary"}>
                        {PRICING_LABEL[current.pricing]}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{opts.length} 个</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="space-y-5 p-4">
        <h2 className="text-sm font-semibold text-foreground">全局生成参数</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">创意度 (temperature) · {temperature.toFixed(1)}</Label>
            <Slider
              value={[temperature]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([v]) => setTemperature(v)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">失败重试次数 · {maxRetry}</Label>
            <Slider value={[maxRetry]} min={0} max={5} step={1} onValueChange={([v]) => setMaxRetry(v)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">并发任务数 · {concurrency}</Label>
            <Slider value={[concurrency]} min={1} max={16} step={1} onValueChange={([v]) => setConcurrency(v)} />
          </div>
        </div>
      </Card>
    </div>
  );
}
