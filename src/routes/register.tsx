import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { registerPendingUser } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "注册 — BooPilot" },
      { name: "description", content: "注册 BooPilot 业务运营自动驾驶平台账号" },
    ],
  }),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    code: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [joinCloud, setJoinCloud] = useState(true);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cdLeft, setCdLeft] = useState(0);
  const [successOpen, setSuccessOpen] = useState(false);

  const update = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const sendCode = () => {
    if (!/^1\d{10}$/.test(form.phone)) {
      toast.error("请输入正确的 11 位手机号");
      return;
    }
    toast.success("验证码已发送（mock：123456）");
    setCdLeft(60);
    const t = setInterval(() => {
      setCdLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^1\d{10}$/.test(form.phone)) return toast.error("请输入正确的手机号");
    if (!form.code.trim()) return toast.error("请输入验证码");
    if (form.password.length < 6) return toast.error("密码至少 6 位");
    if (form.password !== form.confirm) return toast.error("两次密码不一致");
    if (!agree) return toast.error("请先阅读并同意用户协议");

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      registerPendingUser(form.phone.trim());
      setSuccessOpen(true);
    }, 600);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="pointer-events-none absolute -left-32 top-1/4 -z-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-info/20 blur-3xl" />

      <div className="w-full max-w-md">
        <div
          className="rounded-2xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Cloud className="h-7 w-7" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                加入 BooPilot
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                创建一个新账户以开始使用
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field
              id="phone"
              label="手机号"
              required
              icon={<Phone className="h-4 w-4" />}
            >
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
                placeholder="请输入手机号"
                maxLength={11}
                className="h-11 rounded-xl bg-muted/40 pl-9"
              />
            </Field>

            <div className="space-y-2">
              <Label htmlFor="code">
                验证码 <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => update("code", e.target.value)}
                    placeholder="请输入验证码"
                    maxLength={6}
                    className="h-11 rounded-xl bg-muted/40 pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={cdLeft > 0}
                  onClick={sendCode}
                  className="h-11 shrink-0 rounded-xl"
                >
                  {cdLeft > 0 ? `${cdLeft}s 后重发` : "获取验证码"}
                </Button>
              </div>
            </div>

            <Field
              id="email"
              label="邮箱"
              icon={<Mail className="h-4 w-4" />}
              hint="选填"
            >
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="请输入邮箱（选填）"
                className="h-11 rounded-xl bg-muted/40 pl-9"
              />
            </Field>

            <Field
              id="password"
              label="密码"
              required
              icon={<Lock className="h-4 w-4" />}
            >
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="至少 6 位"
                className="h-11 rounded-xl bg-muted/40 pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            <Field
              id="confirm"
              label="确认密码"
              required
              icon={<Lock className="h-4 w-4" />}
            >
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                value={form.confirm}
                onChange={(e) => update("confirm", e.target.value)}
                placeholder="请再次输入密码"
                className="h-11 rounded-xl bg-muted/40 pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            {/* 博海身份云勾选 */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  className="mt-0.5"
                  checked={joinCloud}
                  onCheckedChange={(v) => setJoinCloud(!!v)}
                />
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    同时注册博海身份云统一认证系统
                  </div>
                  <div className="text-xs text-muted-foreground">
                    注册后可同一个账户可登录博海旗下所有业务系统
                  </div>
                </div>
              </label>
            </div>

            <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
              我已阅读并同意
              <a className="text-primary hover:underline">《用户协议》</a>
              与
              <a className="text-primary hover:underline">《隐私政策》</a>
            </label>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl"
              style={{ background: "var(--gradient-primary)" }}
            >
              {loading ? "注册中..." : "注 册"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              立即登录
            </Link>
          </p>
        </div>
      </div>

      <Toaster position="top-right" />

      <Dialog
        open={successOpen}
        onOpenChange={(v) => {
          setSuccessOpen(v);
          if (!v) navigate({ to: "/login" });
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              注册成功
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-6 text-foreground">
              恭喜您已成功注册，请及时联系博海悦意工作人员为您开通业务权限方可登录系统开展业务
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setSuccessOpen(false);
                navigate({ to: "/login" });
              }}
            >
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  icon,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}
