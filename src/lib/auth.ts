// Simple mock auth state stored in localStorage
const KEY = "boopilot.auth";
const PWD_KEY_PREFIX = "boopilot.pwd.";
const PENDING_KEY = "boopilot.pendingUsers";

function readPending(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function registerPendingUser(username: string) {
  if (typeof window === "undefined") return;
  const list = readPending();
  if (!list.includes(username)) {
    list.push(username);
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  }
}

export function isPendingUser(username: string): boolean {
  return readPending().includes(username);
}

export type AuthUser = {
  username: string;
  displayName: string;
  // 允许访问的租户名称列表；undefined 表示无限制（可见全部租户）
  allowedTenantNames?: string[];
  // 默认选中的租户名称；undefined 表示默认“全部租户”
  defaultTenantName?: string;
};

type AccountDef = {
  username: string;
  defaultPassword: string;
  user: AuthUser;
};

const ACCOUNTS: Record<string, AccountDef> = {
  admin: {
    username: "admin",
    defaultPassword: "admin123",
    user: { username: "admin", displayName: "管理员" },
  },
  ops: {
    username: "ops",
    defaultPassword: "ops123",
    user: {
      username: "ops",
      displayName: "运营专员",
      allowedTenantNames: ["翎羽美妆", "鲸跃游戏"],
      defaultTenantName: "翎羽美妆",
    },
  },
};

export const DEFAULT_USER = {
  username: ACCOUNTS.admin.username,
  password: ACCOUNTS.admin.defaultPassword,
};

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getStoredPassword(username: string): string {
  const acc = ACCOUNTS[username];
  const fallback = acc?.defaultPassword ?? "";
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(PWD_KEY_PREFIX + username) ?? fallback;
}

export function login(username: string, password: string): AuthUser | null {
  const acc = ACCOUNTS[username];
  if (!acc) return null;
  const pwd = getStoredPassword(username);
  if (password !== pwd) return null;
  localStorage.setItem(KEY, JSON.stringify(acc.user));
  return acc.user;
}

export function logout() {
  localStorage.removeItem(KEY);
}

export function changePassword(oldPwd: string, newPwd: string): boolean {
  const u = getCurrentUser();
  if (!u) return false;
  if (oldPwd !== getStoredPassword(u.username)) return false;
  localStorage.setItem(PWD_KEY_PREFIX + u.username, newPwd);
  return true;
}
