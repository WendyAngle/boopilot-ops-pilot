import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { cn } from "@/lib/utils";
import type { ManagedAccount } from "@/lib/managed-account-mock";

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
}

export function AccountScopePicker({
  accounts,
  value,
  onChange,
  className,
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
    <div className={cn("space-y-2.5 rounded-lg border p-3", className)}>
      {/* 标签筛选 */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-muted-foreground">
          按标签筛选账号（可多选，仅用于过滤下方列表；也可直接搜索并勾选特定账号）
        </p>
        <TagMultiSelect
          value={value.tags}
          onChange={(v) => onChange({ ...value, tags: v })}
          placeholder="选择标签筛选账号（可不选）"
        />
      </div>

      {/* 账号列表 */}
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
              className="h-7 w-56 pl-6 text-xs"
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
                    {(a.tags ?? []).slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="hidden rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground sm:inline"
                      >
                        {t}
                      </span>
                    ))}
                    <span className="rounded border border-border/60 px-1.5 py-px text-[10px] text-muted-foreground">
                      {a.platform}
                    </span>
                    <span className="hidden text-[10px] text-muted-foreground md:inline">
                      {a.country}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 已选清单 */}
      <div className="space-y-1.5 rounded-md bg-muted/50 px-2.5 py-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            已选{" "}
            <span className="font-semibold text-foreground">
              {selected.length}
            </span>{" "}
            个账号，本次将对这些账号执行（候选共 {accounts.length} 个）
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
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-px text-[10px] text-foreground"
              >
                {a.username}
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
