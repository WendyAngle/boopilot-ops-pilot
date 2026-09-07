// 根据顶部选择的租户套餐计算 AI 创作模块的实付/原价/折扣
import { useMemo } from "react";
import { useTenantScope } from "@/lib/tenant-scope";
import { CURRENT_USER_TENANT_ID } from "@/lib/tenant-scope";
import { getTenantPlan, useTenantPlans } from "@/lib/billing-tenants";
import { PLAN_META, type PlanTier } from "@/lib/billing-plans";
import {
  BILLING_FUNCTIONS,
  type BillingFunction,
  formatDiscount,
  getDiscount,
  useDiscountMatrix,
  getFunctionStatus,
  useFunctionStatusMap,
} from "@/lib/billing-discounts";

export interface BillingPricing {
  /** 用于显示的套餐档位 */
  plan: PlanTier;
  planLabel: string;
  planBadgeCls: string;
  /** 折扣文案，例如 "7.0 折" 或 "禁用" */
  discountText: string;
  /** 折扣数值（0~1）；禁用时为 0 */
  discountRate: number;
  /** 原价积分（已乘以用量） */
  original: number;
  /** 实付积分（已折扣） */
  final: number;
  /** 节省积分 */
  saved: number;
  /** 是否禁用（免费版 / 功能停用） */
  disabled: boolean;
  /** 禁用原因，便于提示 */
  disabledReason?: string;
}

export function useBillingPricing(
  fn: BillingFunction,
  units: number = 1,
): BillingPricing {
  const [scope] = useTenantScope();
  // 订阅以便折扣/套餐变更时刷新
  useDiscountMatrix();
  useTenantPlans();
  useFunctionStatusMap();

  return useMemo(() => {
    const tenantId =
      !scope || scope === "all" ? CURRENT_USER_TENANT_ID : scope;
    const plan = getTenantPlan(tenantId) ?? "free";
    const meta = PLAN_META[plan];
    const fnMeta = BILLING_FUNCTIONS.find((f) => f.key === fn);
    const base = fnMeta?.baseCost ?? 1;
    const u = Math.max(1, Math.ceil(units));
    const original = base * u;
    const d = getDiscount(fn, plan);
    const fnEnabled = getFunctionStatus(fn);

    let disabled = false;
    let disabledReason: string | undefined;
    let rate = 1;
    if (!fnEnabled) {
      disabled = true;
      disabledReason = "该功能已停用";
    } else if (d === "disabled" || plan === "free") {
      disabled = true;
      disabledReason = "免费版不可使用，请升级套餐";
    } else {
      rate = d as number;
    }

    const final = disabled ? 0 : Math.ceil(original * rate);
    const saved = disabled ? 0 : Math.max(0, original - final);

    return {
      plan,
      planLabel: meta.label,
      planBadgeCls: meta.badgeCls,
      discountText: disabled ? "禁用" : formatDiscount(rate),
      discountRate: disabled ? 0 : rate,
      original,
      final,
      saved,
      disabled,
      disabledReason,
    };
  }, [scope, fn, units]);
}

/** 已知原价(rawCost)的场景，直接按当前租户套餐折扣换算 */
export function useTenantDiscountFor(fn: BillingFunction, rawCost: number): BillingPricing {
  const [scope] = useTenantScope();
  useDiscountMatrix();
  useTenantPlans();
  useFunctionStatusMap();

  return useMemo(() => {
    const tenantId = !scope || scope === "all" ? CURRENT_USER_TENANT_ID : scope;
    const plan = getTenantPlan(tenantId) ?? "free";
    const meta = PLAN_META[plan];
    const d = getDiscount(fn, plan);
    const fnEnabled = getFunctionStatus(fn);

    let disabled = false;
    let disabledReason: string | undefined;
    let rate = 1;
    if (!fnEnabled) {
      disabled = true;
      disabledReason = "该功能已停用";
    } else if (d === "disabled" || plan === "free") {
      disabled = true;
      disabledReason = "免费版不可使用，请升级套餐";
    } else {
      rate = d as number;
    }
    const original = Math.max(0, Math.ceil(rawCost));
    const final = disabled ? 0 : Math.ceil(original * rate);
    const saved = disabled ? 0 : Math.max(0, original - final);
    return {
      plan,
      planLabel: meta.label,
      planBadgeCls: meta.badgeCls,
      discountText: disabled ? "禁用" : formatDiscount(rate),
      discountRate: disabled ? 0 : rate,
      original,
      final,
      saved,
      disabled,
      disabledReason,
    };
  }, [scope, fn, rawCost]);
}
