"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, sendCodeSchema } from "@/features/auth/schemas";
import { login, sendCode } from "@/features/auth/services/auth";
import { formError } from "@/lib/form";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/stores/toast";

export function AuthModal() {
  const router = useRouter();
  const { authOpen, setAuthOpen, applyUser } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  async function handleSendCode() {
    const parsed = sendCodeSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    if (countdown > 0) return;
    try {
      await sendCode(parsed.data);
      setCountdown(60);
      const timer = window.setInterval(() => {
        setCountdown((current) => {
          if (current <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return current - 1;
        });
      }, 1000);
      toast.success("验证码已发送");
    } catch (error) {
      toast.fromError(error, "发送验证码失败");
    }
  }

  async function handleSubmit() {
    const parsed = loginSchema.safeParse({ email, code });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    setLoading(true);
    try {
      const data = await login(parsed.data);
      toast.success("登录成功");
      applyUser(data.user, data.accessToken);
      router.push("/datasets");
    } catch (error) {
      toast.fromError(error, "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>登录 Ragflux</DialogTitle>
          <DialogDescription>未注册用户登录即注册</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">邮箱</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSubmit();
                }}
                placeholder="请输入邮箱"
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-code">验证码</Label>
            <div className="flex gap-2">
              <Input
                id="auth-code"
                value={code}
                maxLength={6}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSubmit();
                }}
                placeholder="请输入6位验证码"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={countdown > 0}
                className="shrink-0"
                onClick={() => void handleSendCode()}
              >
                {countdown > 0 ? `${countdown}s` : "发送验证码"}
              </Button>
            </div>
          </div>
          <Button
            type="button"
            disabled={loading}
            className="w-full"
            onClick={() => void handleSubmit()}
          >
            {loading ? "处理中..." : "登录"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
