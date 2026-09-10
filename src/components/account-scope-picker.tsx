import { useMemo, useState } from "react";
import { Search, Tags, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { cn } from "@/lib/utils";
import type { ManagedAccount } from "@/lib/managed-account-mock";

export type AccountScopeMode = "tag" | "manual";

export interface AccountScopeValue {
  mode: AccountScopeMode;
  tags: string[];
  accountIds: string[];
}

export const EMPTY_ACCOUNT_SCOPE: AccountScopeValue = {
  mode: "tag",
  tags: [],
  accountIds: [],
};

/** 按当前范围解析出实际命中的账号 */
export function resolveScopeAccounts(
  value: AccountScopeValue,
  accounts: ManagedAccount[],
): ManagedAccount[] {
  if (value.mode === "tag") {
    if (!value.tags.length) return [];
    const tagSet = new Set(value.tags);
    return accounts.filter((a) => (a.tags ?? []).some((t) => tagSet.has(t)));
  }
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

const MODES: {
  key: AccountScopeMode;
  title: string;
  desc: string;
  icon: typeof Tags;
}[] = [
  {
    key: "tag",
    title: "按标签匹配账号",
    desc: "选择标签，系统自动匹配符合标签的账号",
    icon: Tags,
  },
  {
    key: "manual",
    title: "选择特定账号",
    desc: "从账号列表中手动勾选具体账号",
    icon: Users,
  },
];

export function AccountScopePicker({
  accounts,
  value,
  onChange,
  className,
}: Props) {
  const [kw, setKw] = useState("");

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return accounts;
    return accounts.filter(
      (a) =>
        a.username.toLowerCase().includes(k) ||
        a.platformId.toLowerCase().includes(k) ||
        (a.remark ?? "").toLowerCase().includes(k),
    );
  }, [accounts, kw]);

  const matched = useMemo(
    () => resolveScopeAccounts(value, accounts),
    [value, accounts],
  );

  const setMode = (mode: AccountScopeMode) => {
    if (mode === value.mode) return;
    // 切换方式时清空另一种方式的选择，避免两种口径混淆
    onChange({ mode, tags: [], accountIds: [] });
  };

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

  return (
    <div className={cn("space-y-3 rounded-lg border p-3", className)}>
      {/* 方式选择 */}
      <div className="grid gap-2 sm:grid-cols-2">
        {MODES.map((m) => {
          const active = value.mode === m.key;
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                "flex items-start gap-2 rounded-md border p-2.5 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                  active ? "border-primary" : "border-muted-foreground/50",
                )}
              >
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-xs font-medium">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {m.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  {m.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* 方式对应的配置区 */}
      {value.mode === "tag" ? (
        <div className="space-y-1.5">
          <TagMultiSelect
            value={value.tags}
            onChange={(v) => onChange({ ...value, tags: v })}
            placeholder="选择或新增标签"
          />
          {value.tags.length > 0 && matched.length === 0 && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] text-warning">
              该标签未匹配到账号，可更换标签或改用「选择特定账号」
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
              onClick={toggleAll}
            >
              {allFilteredSelected ? "取消全选" : "全选"}
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
                  无可选账号
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
                      <span className="rounded border border-border/60 px-1.5 py-px text-[10px] text-muted-foreground">
                        {a.platform}
                      </span>
                      <span className="hidden text-[10px] text-muted-foreground sm:inline">
                        {a.country}
                      </span>
                      <span className="hidden max-w-[120px] truncate text-[10px] text-muted-foreground md:inline">
                        {a.tenantName}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* 统一结果提示 */}
      <div className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px]">
        <span className="text-muted-foreground">
          本次将对{" "}
          <span className="font-semibold text-foreground">{matched.length}</span>{" "}
          个账号执行
          {value.mode === "manual" &&
            `（候选账号共 ${accounts.length} 个，仅列出状态正常且平台匹配的账号）`}
        </span>
        {value.mode === "manual" && value.accountIds.length > 0 && (
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
  );
}
