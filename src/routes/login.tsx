import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Cloud,
  Send,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Sparkles,
  Workflow,
  Users2,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "登录 — BooPilot" },
      { name: "description", content: "登录 BooPilot 业务运营自动驾驶平台" },
    ],
  }),
});

const HIGHLIGHTS = [
  { icon: Workflow, label: "任务编排" },
  { icon: Users2, label: "多租户隔离" },
  { icon: Sparkles, label: "AI 智能体" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("请输入邮箱与密码");
      return;
    }
    setLoading(true);
    const res = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("登录成功");
    navigate({ to: "/" });
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    setGoogleLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.redirected) return; // 浏览器跳转中
    toast.success("已通过 Google 登录");
    navigate({ to: "/" });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-16rem] left-1/2 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-info/15 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Send className="h-4 w-4 -rotate-12" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-foreground">
            BooPilot
          </span>
        </div>
        <Link
          to="/register"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          注册账号
        </Link>
      </header>

      {/* Centered card */}
      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-2">
        <div className="relative w-full max-w-[460px]">
          {/* Decorative top icon, half-overlap the card */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground ring-8 ring-background/70"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: "var(--shadow-elegant)",
              }}
            >
              <Send className="h-7 w-7 -rotate-12" />
            </div>
          </div>

          <div
            className="rounded-3xl border border-border/60 bg-card/85 px-8 pb-8 pt-14 backdrop-blur-xl sm:px-10 sm:pt-16"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                BooPilot Platform
              </div>
              <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">
                业务运营
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  自动驾驶
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                统一接入账号、任务、素材、资源与智能体能力，让运营动作可配置、可追踪、可回放。
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    className="h-11 rounded-xl bg-muted/40 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="h-11 rounded-xl bg-muted/40 pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group h-11 w-full justify-center rounded-xl text-sm font-medium text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在登录...
                  </>
                ) : (
                  <>
                    登录
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border/60" />
              或
              <span className="h-px flex-1 bg-border/60" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="h-11 w-full justify-center gap-2 rounded-xl"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              使用 Google 登录
            </Button>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              企业级单点登录，统一身份与权限治理
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border/60 pt-5">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <Icon className="h-4 w-4 text-primary/80" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">
            登录即代表您同意 BooPilot 的
            <span className="text-foreground/70"> 服务条款 </span>与
            <span className="text-foreground/70"> 隐私政策</span>
          </p>
        </div>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-muted-foreground sm:px-12">
        © {new Date().getFullYear()} BooPilot · 业务运营自动驾驶平台
      </footer>

      <Toaster position="top-right" />
    </div>
  );
}
