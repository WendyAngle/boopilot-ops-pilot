// 真实认证：基于 Supabase Auth + profiles 表
// getCurrentUser() 保持同步语义（内存缓存），由 App Shell 在挂载时通过 initSession() 填充，
// 从而使其它同步调用方（如账号健康看板、账号列表等）无需改动。
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = {
  username: string;
  displayName: string;
  // 允许访问的租户名称列表；undefined 表示无限制（可见全部租户）
  allowedTenantNames?: string[];
  // 默认选中的租户名称；undefined 表示默认"全部租户"
  defaultTenantName?: string;
};

let currentUser: AuthUser | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeAuth(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

export function setCurrentUser(u: AuthUser | null) {
  currentUser = u;
  emit();
}

type ProfileRow = {
  display_name: string | null;
  allowed_tenant_names: string[] | null;
  default_tenant_name: string | null;
};

function mapUser(
  email: string,
  profile: ProfileRow | null,
): AuthUser {
  const display = profile?.display_name || email.split("@")[0];
  const allowed =
    profile?.allowed_tenant_names && profile.allowed_tenant_names.length > 0
      ? profile.allowed_tenant_names
      : undefined;
  const def = profile?.default_tenant_name || undefined;
  return {
    username: email,
    displayName: display,
    allowedTenantNames: allowed,
    defaultTenantName: def,
  };
}

const PROFILE_SELECT = "display_name,allowed_tenant_names,default_tenant_name";

export async function loadSessionUser(): Promise<AuthUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const email = user.email ?? "";

  let { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    // 首次登录自动创建档案
    const { data: created } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, display_name: email.split("@")[0] })
      .select(PROFILE_SELECT)
      .maybeSingle();
    profile = created;
  }

  return mapUser(email, profile);
}

/** 由 App Shell 在挂载时调用，从 Supabase 会话恢复当前用户并写入缓存 */
export async function initSession(): Promise<AuthUser | null> {
  const u = await loadSessionUser();
  setCurrentUser(u);
  return u;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  const u = await loadSessionUser();
  setCurrentUser(u);
  return {};
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<{ error?: string; confirmed?: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  const uid = data.user?.id;
  if (uid) {
    await supabase
      .from("profiles")
      .upsert(
        { user_id: uid, display_name: displayName || email.split("@")[0] },
        { onConflict: "user_id" },
      );
  }
  if (data.session) {
    const u = await loadSessionUser();
    setCurrentUser(u);
    return {};
  }
  // 需要邮箱确认
  return { error: "注册成功，请前往邮箱完成验证后登录", confirmed: false };
}

export async function signInWithGoogle(): Promise<{
  redirected: boolean;
  error?: string;
}> {
  const { lovable } = await import("@/integrations/lovable/index");
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result.error) {
    return { redirected: false, error: String(result.error) };
  }
  if (result.redirected) {
    return { redirected: true };
  }
  const u = await loadSessionUser();
  setCurrentUser(u);
  return { redirected: false };
}

export async function signOut() {
  await supabase.auth.signOut();
  setCurrentUser(null);
}

export async function changePassword(newPwd: string): Promise<boolean> {
  const { error } = await supabase.auth.updateUser({ password: newPwd });
  return !error;
}

// 向后兼容的占位实现（旧注册流程引用，现已被真实注册取代）
export function registerPendingUser(_username: string) {}
export function isPendingUser(_username: string): boolean {
  return false;
}
