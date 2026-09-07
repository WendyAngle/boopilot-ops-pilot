import { useEffect, useState } from "react";
import { ACTIVE_TENANTS } from "@/lib/managed-account-mock";

// 当前登录用户所属租户（mock：取第一个活跃租户）
export const CURRENT_USER_TENANT_ID = ACTIVE_TENANTS[0]?.id ?? "";
export const CURRENT_USER_TENANT_NAME = ACTIVE_TENANTS[0]?.name ?? "";

// 全局租户作用域（"all" 表示全部）
let currentScope: string = "all";
const listeners = new Set<() => void>();

export function getTenantScope() {
  return currentScope;
}

export function setTenantScope(id: string) {
  currentScope = id;
  listeners.forEach((l) => l());
}

export function useTenantScope(): [string, (id: string) => void] {
  const [v, setV] = useState(currentScope);
  useEffect(() => {
    const fn = () => setV(currentScope);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return [v, setTenantScope];
}
