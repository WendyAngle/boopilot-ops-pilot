// 折扣规则：功能 × 套餐 二维矩阵
// 消耗积分 = ceil( 模型基准积分 × 用量 × 该套餐在该功能上的折扣率 )
import { useSyncExternalStore } from "react";
import type { PlanTier } from "./billing-plans";

/**
 * 内置功能保留字面量类型以便其它模块（如 use-billing-pricing）直接传字符串使用；
 * 新增的自定义折扣规则使用任意 string key。
 */
export type BillingFunction = string;

export interface FunctionMeta {
  key: BillingFunction;
  label: string;
  /** 该功能默认基础消耗（仅在没有匹配到模型规则时兜底） */
  baseCost: number;
  /** 计费单位 */
  unit: string;
  /** 关联的 AI 模块路径，用于跳转 */
  route?: string;
  /** 是否为自定义新增的折扣规则 */
  custom?: boolean;
}

const BUILTIN_FUNCTIONS: FunctionMeta[] = [
  { key: "text2video", label: "文生视频", baseCost: 8, unit: "秒", route: "/ai/video" },
  { key: "image2video", label: "图生视频", baseCost: 6, unit: "秒", route: "/ai/video" },
  { key: "text2image", label: "文生图", baseCost: 8, unit: "张", route: "/ai/image" },
  { key: "image2image", label: "图生图", baseCost: 10, unit: "张", route: "/ai/image" },
  { key: "video_erase", label: "视频内容消除", baseCost: 8, unit: "秒", route: "/ai/erase" },
  { key: "image_erase", label: "图片内容消除", baseCost: 5, unit: "张", route: "/ai/erase" },
  { key: "replicate", label: "爆款复刻", baseCost: 60, unit: "次", route: "/ai/replicate" },
  { key: "remix", label: "视频混剪", baseCost: 20, unit: "次", route: "/ai/remix" },
];

let allFunctions: FunctionMeta[] = [...BUILTIN_FUNCTIONS];

export const BILLING_FUNCTIONS: FunctionMeta[] = allFunctions;


export const FUNCTION_LABEL: Record<BillingFunction, string> = BILLING_FUNCTIONS.reduce(
  (acc, f) => ((acc[f.key] = f.label), acc),
  {} as Record<BillingFunction, string>,
);

/** 折扣率 1.0 = 原价，0.5 = 5 折；免费版固定 disabled（不可用） */
export type DiscountValue = number | "disabled";

export type DiscountMatrix = Record<BillingFunction, Record<PlanTier, DiscountValue>>;

const DEFAULT_MATRIX: DiscountMatrix = {
  text2video: { free: "disabled", basic: 0.85, pro: 0.7, flagship: 0.55 },
  image2video: { free: "disabled", basic: 0.85, pro: 0.7, flagship: 0.55 },
  text2image: { free: "disabled", basic: 0.8, pro: 0.65, flagship: 0.5 },
  image2image: { free: "disabled", basic: 0.85, pro: 0.7, flagship: 0.55 },
  video_erase: { free: "disabled", basic: 0.9, pro: 0.75, flagship: 0.6 },
  image_erase: { free: "disabled", basic: 0.9, pro: 0.75, flagship: 0.6 },
  replicate: { free: "disabled", basic: 0.8, pro: 0.65, flagship: 0.5 },
  remix: { free: "disabled", basic: 0.85, pro: 0.7, flagship: 0.55 },
};

let matrix: DiscountMatrix = JSON.parse(JSON.stringify(DEFAULT_MATRIX));
let statusMap: Record<BillingFunction, boolean> = BILLING_FUNCTIONS.reduce(
  (acc, f) => ((acc[f.key] = true), acc),
  {} as Record<BillingFunction, boolean>,
);
let removed: Record<BillingFunction, boolean> = {} as Record<BillingFunction, boolean>;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getMatrix(): DiscountMatrix {
  return matrix;
}

export function getDiscount(fn: BillingFunction, plan: PlanTier): DiscountValue {
  return matrix[fn]?.[plan] ?? 1;
}

export function setDiscount(fn: BillingFunction, plan: PlanTier, value: DiscountValue) {
  // 免费版固定 disabled
  if (plan === "free") return;
  matrix = {
    ...matrix,
    [fn]: { ...matrix[fn], [plan]: value },
  };
  emit();
}

export function getFunctionStatus(fn: BillingFunction): boolean {
  return statusMap[fn] ?? true;
}

export function setFunctionStatus(fn: BillingFunction, enabled: boolean) {
  statusMap = { ...statusMap, [fn]: enabled };
  emit();
}

export function deleteFunction(fn: BillingFunction) {
  removed = { ...removed, [fn]: true };
  emit();
}

export function isFunctionRemoved(fn: BillingFunction): boolean {
  return !!removed[fn];
}

export function useFunctionStatusMap(): Record<BillingFunction, boolean> {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => statusMap,
    () => statusMap,
  );
}

export function resetMatrix() {
  matrix = JSON.parse(JSON.stringify(DEFAULT_MATRIX));
  emit();
}

export function resetRow(fn: BillingFunction) {
  matrix = { ...matrix, [fn]: { ...DEFAULT_MATRIX[fn] } };
  emit();
}

export function useDiscountMatrix(): DiscountMatrix {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => matrix,
    () => matrix,
  );
}

/** 新增一条折扣规则（自定义计费功能） */
export function addFunction(
  meta: Omit<FunctionMeta, "custom">,
  discounts: Record<Exclude<PlanTier, "free">, number>,
) {
  if (allFunctions.some((f) => f.key === meta.key)) {
    throw new Error("功能标识已存在");
  }
  allFunctions.push({ ...meta, custom: true });
  matrix = {
    ...matrix,
    [meta.key]: {
      free: "disabled",
      basic: discounts.basic,
      pro: discounts.pro,
      flagship: discounts.flagship,
    },
  };
  statusMap = { ...statusMap, [meta.key]: true };
  emit();
}

export function useBillingFunctions(): FunctionMeta[] {
  // 订阅 listeners，functions 列表会随 addFunction / deleteFunction 等动作刷新
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => allFunctions.length + Object.keys(removed).length,
    () => allFunctions.length,
  );
  return allFunctions;
}


/** 计算实际消耗积分 */
export function calcCost(
  fn: BillingFunction,
  plan: PlanTier,
  units: number = 1,
): { cost: number; disabled: boolean; discount: DiscountValue; base: number } {
  const meta = BILLING_FUNCTIONS.find((f) => f.key === fn);
  const base = (meta?.baseCost ?? 1) * Math.max(1, units);
  const d = getDiscount(fn, plan);
  if (d === "disabled") return { cost: 0, disabled: true, discount: d, base };
  return { cost: Math.ceil(base * d), disabled: false, discount: d, base };
}

/** 折扣展示文本，如 "7.0 折" */
export function formatDiscount(d: DiscountValue): string {
  if (d === "disabled") return "禁用";
  if (d >= 1) return "原价";
  return `${(d * 10).toFixed(1)} 折`;
}
