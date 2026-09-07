// 租户 → 套餐 映射（默认新租户为免费版）
import { useSyncExternalStore } from "react";
import type { PlanTier } from "./billing-plans";
import { TENANTS_SEED } from "./tenants";

const initial: Record<string, PlanTier> = (() => {
  const map: Record<string, PlanTier> = {};
  // 给前几个种子租户分配不同套餐做演示
  const presets: PlanTier[] = ["flagship", "pro", "basic", "free", "basic", "pro", "free", "flagship"];
  TENANTS_SEED.forEach((t, i) => {
    map[t.id] = presets[i] ?? "free";
  });
  return map;
})();

let assignments: Record<string, PlanTier> = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getTenantPlan(tenantId: string): PlanTier {
  return assignments[tenantId] ?? "free";
}

export function setTenantPlan(tenantId: string, plan: PlanTier) {
  assignments = { ...assignments, [tenantId]: plan };
  emit();
}

export function getAssignments(): Record<string, PlanTier> {
  return assignments;
}

export function useTenantPlans(): Record<string, PlanTier> {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => assignments,
    () => assignments,
  );
}
