// 套餐定义（4 档固定 SKU，仅参数可编辑）
import { useSyncExternalStore } from "react";

export type PlanTier = "free" | "basic" | "pro" | "flagship";

export const PLAN_TIERS: PlanTier[] = ["free", "basic", "pro", "flagship"];

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  baseCredits: number;
  bonusCredits: number;
  creditValidDays: number;
  /** 套餐有效期（天）；0 表示永久有效 */
  planValidDays: number;
  /** 是否允许使用消耗积分的功能（免费版固定 false） */
  canConsume: boolean;
  /** 是否享受优先队列 */
  priorityQueue: boolean;
  /** 高级模型授权 */
  premiumModels: boolean;
}

export const PLAN_META: Record<
  PlanTier,
  { label: string; cls: string; badgeCls: string; accent: string; cardRing: string }
> = {
  free: {
    label: "免费版",
    cls: "bg-muted text-muted-foreground border-border",
    badgeCls: "bg-muted text-muted-foreground border-border",
    accent: "text-muted-foreground",
    cardRing: "ring-border/60",
  },
  basic: {
    label: "基础版",
    cls: "bg-primary/10 text-primary border-primary/30",
    badgeCls: "bg-primary/10 text-primary border-primary/30",
    accent: "text-primary",
    cardRing: "ring-primary/40",
  },
  pro: {
    label: "专业版",
    cls: "bg-violet-500/10 text-violet-600 border-violet-400/30",
    badgeCls: "bg-violet-500/10 text-violet-600 border-violet-400/30",
    accent: "text-violet-600",
    cardRing: "ring-violet-400/40",
  },
  flagship: {
    label: "旗舰版",
    cls: "bg-amber-500/10 text-amber-600 border-amber-300/40",
    badgeCls: "bg-amber-500/10 text-amber-600 border-amber-300/40",
    accent: "text-amber-600",
    cardRing: "ring-amber-300/50",
  },
};

const DEFAULT_PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "免费版",
    tagline: "体验平台基础能力，AI 创作功能不可用",
    monthlyPrice: 0,
    yearlyPrice: 0,
    baseCredits: 0,
    bonusCredits: 0,
    creditValidDays: 30,
    planValidDays: 0,
    canConsume: false,
    priorityQueue: false,
    premiumModels: false,
  },
  basic: {
    tier: "basic",
    name: "基础版",
    tagline: "适合中小团队日常 AI 创作",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    baseCredits: 5000,
    bonusCredits: 500,
    creditValidDays: 60,
    planValidDays: 30,
    canConsume: true,
    priorityQueue: false,
    premiumModels: false,
  },
  pro: {
    tier: "pro",
    name: "专业版",
    tagline: "高频次创作、解锁高级模型",
    monthlyPrice: 599,
    yearlyPrice: 5990,
    baseCredits: 20000,
    bonusCredits: 3000,
    creditValidDays: 90,
    planValidDays: 90,
    canConsume: true,
    priorityQueue: false,
    premiumModels: true,
  },
  flagship: {
    tier: "flagship",
    name: "旗舰版",
    tagline: "海量任务、优先队列、最低折扣",
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    baseCredits: 80000,
    bonusCredits: 15000,
    creditValidDays: 180,
    planValidDays: 365,
    canConsume: true,
    priorityQueue: true,
    premiumModels: true,
  },
};

let store: Record<PlanTier, PlanConfig> = { ...DEFAULT_PLANS };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getPlans(): Record<PlanTier, PlanConfig> {
  return store;
}

export function getPlan(tier: PlanTier): PlanConfig {
  return store[tier];
}

export function updatePlan(tier: PlanTier, patch: Partial<PlanConfig>) {
  store = {
    ...store,
    [tier]: {
      ...store[tier],
      ...patch,
      tier, // immutable
      // 免费版强制不可消费
      canConsume: tier === "free" ? false : (patch.canConsume ?? store[tier].canConsume),
    },
  };
  emit();
}

export function resetPlan(tier: PlanTier) {
  store = { ...store, [tier]: { ...DEFAULT_PLANS[tier] } };
  emit();
}

export function usePlans(): Record<PlanTier, PlanConfig> {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => store,
    () => store,
  );
}
