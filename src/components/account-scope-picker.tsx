import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { cn } from "@/lib/utils";
import type { ManagedAccount } from "@/lib/managed-account-mock";

/** 候选行标签：仅展示 1 个，超出以 +N 展示，点击浮层查看全部 */
function TagOverflow({ tags, max = 1 }: { tags: string[]; max?: number }) {
  if (!tags.length) return null;
  const visible = tags.slice(0, max);
  const rest = tags.length - visible.length;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {visible.map((t) => (
        <span
          key={t}
          className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground"
        >
          {t}
        </span>
      ))}
      {rest > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              +{rest}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto min-w-[140px] p-1.5"
            align="end"
          >
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/** 兼容旧字段：现仅保留一种统一口径（标签作为筛选工具，最终以已选账号为准） */
export type AccountScopeMode = "tag" | "manual";

export interface AccountScopeValue {
  mode: AccountScopeMode;
  /** 标签筛选条件（仅用于过滤候选账号，不参与最终范围计算） */
  tags: string[];
  /** 最终生效的账号清单 */
  accountIds: string[];
}

export const EMPTY_ACCOUNT_SCOPE: AccountScopeValue = {
  mode: "manual",
  tags: [],
  accountIds: [],
};

/** 最终范围以已勾选的账号清单为准，所见即所得 */
export function resolveScopeAccounts(
  value: AccountScopeValue,
  accounts: ManagedAccount[],
): ManagedAccount[] {
  const idSet = new Set(value.accountIds);
  return accounts.filter((a) => idSet.has(a.id));
}

interface Props {
  /** 候选账号池（已按平台 / 状态过滤） */
  accounts: ManagedAccount[];
  value: AccountScopeValue;
  onChange: (next: AccountScopeValue) => void;
  className?: string;
  /** 单选模式：仅能选中 1 个账号，再次点击其他账号会替换 */
  single?: boolean;
}

export function AccountScopePicker({
  accounts,
  value,
  onChange,
  className,
  single = false,
}: Props) {
  const [kw, setKw] = useState("");

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    const tagSet = new Set(value.tags);
    return accounts.filter((a) => {
      if (tagSet.size && !(a.tags ?? []).some((t) => tagSet.has(t))) return false;
      if (!k) return true;
      return (
        a.username.toLowerCase().includes(k) ||
        a.platformId.toLowerCase().includes(k) ||
        (a.remark ?? "").toLowerCase().includes(k)
      );
    });
  }, [accounts, kw, value.tags]);

  const selected = useMemo(
    () => resolveScopeAccounts(value, accounts),
    [value, accounts],
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((a) => value.accountIds.includes(a.id));

  const toggleAll = () => {
    const ids = filtered.map((a) => a.id);
    const others = value.accountIds.filter((id) => !ids.includes(id));
    onChange({
      ...value,
      accountIds: allFilteredSelected ? others : [...others, ...ids],
    });
  };

  const remove = (id: string) =>
    onChange({ ...value, accountIds: value.accountIds.filter((x) => x !== id) });

  return (
    <div className={cn("rounded-lg border p-3", className)}>
      {/* 标签筛选（横跨左右两栏） */}
      <div className="mb-2.5 space-y-1.5">
        <p className="text-[11px] text-muted-foreground">
          {single
            ? "按标签筛选账号（可多选，仅用于缩小候选范围）；也可直接搜索，点击选中 1 个账号"
            : "按标签筛选账号（可多选，仅用于过滤候选列表；也可直接搜索并勾选特定账号）"}
        </p>
        <TagMultiSelect
          value={value.tags}
          onChange={(v) => onChange({ ...value, tags: v })}
          placeholder="选择标签筛选账号（可不选）"
        />
      </div>

      {/* 左右分栏：左候选 / 右已选 */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* 左栏：候选账号 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
              onClick={toggleAll}
            >
              {allFilteredSelected
                ? "取消全选当前结果"
                : `全选当前结果（${filtered.length}）`}
            </button>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                placeholder="搜索账号 / 平台ID / 备注"
                className="h-7 w-full pl-6 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="h-44 rounded-md border bg-background">
            <div className="divide-y">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                  无匹配账号，可调整标签或搜索条件
                </div>
              ) : (
                filtered.map((a) => {
                  const checked = value.accountIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/40",
                        checked && "bg-primary/5",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) =>
                          onChange({
                            ...value,
                            accountIds: c
                              ? [...value.accountIds, a.id]
                              : value.accountIds.filter((x) => x !== a.id),
                          })
                        }
                      />
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                        {a.username.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {a.username}
                      </span>
                      <TagOverflow tags={a.tags ?? []} max={1} />
                      <span className="hidden shrink-0 text-[10px] text-muted-foreground md:inline">
                        {a.country}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 右栏：已选账号 */}
        <div className="flex flex-col rounded-md border bg-muted/30">
          <div className="flex items-center justify-between border-b px-2.5 py-1.5 text-[11px]">
            <span className="text-muted-foreground">
              已选{" "}
              <span className="font-semibold text-foreground">
                {selected.length}
              </span>{" "}
              个账号
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                候选共 {accounts.length}
              </span>
              {selected.length > 0 && (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => onChange({ ...value, accountIds: [] })}
                >
                  清空已选
                </button>
              )}
            </div>
          </div>
          <ScrollArea className="h-44">
            {selected.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                勾选左侧账号后会显示在这里
              </div>
            ) : (
              <div className="divide-y">
                {selected.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                      {a.username.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {a.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* 底部汇总 */}
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        本次将对{" "}
        <span className="font-semibold text-foreground">
          {selected.length}
        </span>{" "}
        个账号执行
      </p>
    </div>
  );
}
