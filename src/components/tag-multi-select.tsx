import { useMemo, useState } from "react";
import { ChevronDown, Plus, Search, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  tagsActions,
  useUsableTags,
  TAG_COLOR_PRESETS,
  type SystemTag,
} from "@/lib/systemTags";

interface TagMultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
  disabled?: boolean;
  className?: string;
  /** 触发器最多平铺多少个标签，超出显示 +N */
  maxTagCount?: number;
}

export function TagMultiSelect({
  value,
  onChange,
  placeholder = "请选择标签",
  allowCreate = true,
  disabled = false,
  className,
  maxTagCount = 4,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(TAG_COLOR_PRESETS[0]);

  const tags = useUsableTags();
  const tagByName = useMemo(() => {
    const m = new Map<string, SystemTag>();
    tags.forEach((t) => m.set(t.name, t));
    return m;
  }, [tags]);

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return tags;
    return tags.filter(
      (t) =>
        t.name.toLowerCase().includes(k) || t.code.toLowerCase().includes(k),
    );
  }, [tags, kw]);

  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((v) => v !== name));
    else onChange([...value, name]);
  };

  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  const beginCreate = (preset?: string) => {
    setNewName(preset ?? kw.trim());
    setNewColor(
      TAG_COLOR_PRESETS[
        Math.floor(Math.random() * TAG_COLOR_PRESETS.length)
      ],
    );
    setCreating(true);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewName("");
  };

  const confirmCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const t = tagsActions.add({ name, color: newColor });
    if (!value.includes(t.name)) onChange([...value, t.name]);
    setKw("");
    cancelCreate();
  };

  const visible = value.slice(0, maxTagCount);
  const rest = value.length - visible.length;
  const exactExists = !!kw && !!tagByName.get(kw.trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2 py-1 text-left text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {value.length === 0 ? (
              <span className="px-1 text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {visible.map((name) => {
                  const t = tagByName.get(name);
                  const color = t?.color ?? "#94a3b8";
                  return (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: `${color}1A`,
                        color,
                        border: `1px solid ${color}55`,
                      }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {name}
                      <X
                        className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(name);
                        }}
                      />
                    </span>
                  );
                })}
                {rest > 0 && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    +{rest}
                  </span>
                )}
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0"
        align="start"
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="搜索标签"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              暂无匹配标签
            </div>
          ) : (
            filtered.map((t) => {
              const selected = value.includes(t.name);
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggle(t.name)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent",
                    selected && "bg-accent/60",
                  )}
                >
                  <Checkbox
                    checked={selected}
                    className="pointer-events-none"
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="flex-1 truncate text-xs">{t.name}</span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
        {allowCreate && (
          <div className="border-t p-2">
            {creating ? (
              <div className="space-y-2">
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="新标签名称"
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmCreate();
                    }
                  }}
                />
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-[11px] text-muted-foreground">
                    颜色
                  </span>
                  {TAG_COLOR_PRESETS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition",
                        newColor === c
                          ? "border-foreground"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={cancelCreate}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={confirmCreate}
                    disabled={!newName.trim()}
                  >
                    确认
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start text-xs"
                disabled={exactExists}
                onClick={() => beginCreate()}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {kw.trim()
                  ? exactExists
                    ? `「${kw.trim()}」已存在`
                    : `新增「${kw.trim()}」`
                  : "新增标签"}
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
