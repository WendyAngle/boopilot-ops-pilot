import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Building2, LogOut, KeyRound, User as UserIcon } from "lucide-react";
import { ACTIVE_TENANTS } from "@/lib/managed-account-mock";
import { setTenantScope, useTenantScope } from "@/lib/tenant-scope";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changePassword, getCurrentUser, logout, type AuthUser } from "@/lib/auth";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [tenantScope, setTenantScopeState] = useTenantScope();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
    // 根据用户权限初始化租户作用域
    if (u.allowedTenantNames && u.allowedTenantNames.length > 0) {
      const defaultName = u.defaultTenantName ?? u.allowedTenantNames[0];
      const target =
        ACTIVE_TENANTS.find((t) => t.name === defaultName) ??
        ACTIVE_TENANTS.find((t) => u.allowedTenantNames!.includes(t.name));
      if (target) setTenantScope(target.id);
    } else if (ACTIVE_TENANTS[0]) {
      // 管理员等无租户限制账号：默认选中第一个租户，避免“全部租户”作为初始值
      setTenantScope(ACTIVE_TENANTS[0].id);
    }
    setReady(true);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    setTenantScope("all");
    toast.success("已退出登录");
    navigate({ to: "/login" });
  };

  if (!ready) return null;

  const initials = user?.displayName?.slice(0, 2) ?? "BP";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <div className="ml-auto flex items-center gap-2">
            {(() => {
              const visibleTenants = user?.allowedTenantNames
                ? ACTIVE_TENANTS.filter((t) =>
                    user.allowedTenantNames!.includes(t.name),
                  )
                : ACTIVE_TENANTS;
              const canSelectAll = !user?.allowedTenantNames;
              return (
                <Select value={tenantScope} onValueChange={setTenantScopeState}>
                  <SelectTrigger className="h-9 w-[180px] rounded-full bg-muted/60 border-transparent">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="切换租户" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {canSelectAll && (
                      <SelectItem value="all">全部租户</SelectItem>
                    )}
                    {visibleTenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 outline-none ring-offset-background transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-medium">{user?.displayName}</span>
                    <span className="text-xs text-muted-foreground">{user?.username}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">

                <DropdownMenuItem onClick={() => setPwdOpen(true)}>
                  <KeyRound className="h-4 w-4" />
                  修改密码
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
        <Toaster position="top-right" />
      </SidebarInset>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </SidebarProvider>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const reset = () => {
    setOldPwd("");
    setNewPwd("");
    setConfirmPwd("");
  };

  const handleSubmit = () => {
    if (!oldPwd || !newPwd || !confirmPwd) {
      toast.error("请填写完整");
      return;
    }
    if (newPwd.length < 6) {
      toast.error("新密码至少 6 位");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    if (!changePassword(oldPwd, newPwd)) {
      toast.error("当前密码不正确");
      return;
    }
    toast.success("密码修改成功");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>
            修改后请使用新密码登录系统
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="old-pwd">当前密码<span className="ml-0.5 text-destructive">*</span></Label>
            <Input
              id="old-pwd"
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="请输入当前密码"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pwd">新密码<span className="ml-0.5 text-destructive">*</span></Label>
            <Input
              id="new-pwd"
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="至少 6 位"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pwd">确认新密码<span className="ml-0.5 text-destructive">*</span></Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="请再次输入新密码"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>确认修改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
