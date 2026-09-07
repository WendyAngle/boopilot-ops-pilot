import { useSyncExternalStore } from "react";

export type RoleStatus = "active" | "inactive";

export interface SystemRole {
  id: string;
  name: string;
  order: number;
  status: RoleStatus;
  createdAt: string;
  remark?: string;
  menus: string[];
  isSystem?: boolean;
  tenantId?: string;
  tenantName?: string;
}

const SEED_ROLES: SystemRole[] = [
  {
    id: "role-admin",
    name: "管理员",
    order: 1,
    status: "active",
    createdAt: "2026-01-29 17:33:22",
    remark: "系统超级管理员，拥有所有权限",
    menus: [],
    isSystem: true,
  },
  {
    id: "role-operator",
    name: "运营专员",
    order: 1,
    status: "active",
    createdAt: "2026-02-03 17:52:39",
    remark: "执行日常运营与推广任务",
    menus: ["menu-dashboard", "menu-tasks", "menu-/tasks/operations"],
  },
];

let state: SystemRole[] = [...SEED_ROLES];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  return state;
}

export const rolesActions = {
  setAll(next: SystemRole[]) {
    state = [...next];
    emit();
  },
  add(role: SystemRole) {
    state = [role, ...state];
    emit();
  },
  update(id: string, patch: Partial<SystemRole>) {
    state = state.map((r) => (r.id === id ? { ...r, ...patch } : r));
    emit();
  },
  remove(id: string) {
    state = state.filter((r) => r.id !== id);
    emit();
  },
  toggleStatus(id: string) {
    state = state.map((r) =>
      r.id === id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r,
    );
    emit();
  },
};

export function useSystemRoles(): SystemRole[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getSystemRoles(): SystemRole[] {
  return state;
}
