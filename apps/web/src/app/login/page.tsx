"use client";

import Link from "next/link";
import { Mail, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, sendCodeSchema } from "@/features/auth/schemas";
import { login, sendCode } from "@/features/auth/services/auth";
import { formError } from "@/lib/form";
import { useAuth } from "@/stores/auth";
import { useTheme } from "@/stores/theme";
import { useToast } from "@/stores/toast";

export default function LoginPage() {
  const router = useRouter();
  const { applyUser } = useAuth();
  const { preference, setPreference } = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
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
      setCodeSent(true);
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
      applyUser(data.user, data.accessToken);
      toast.success("登录成功");
      router.push("/datasets");
    } catch (error) {
      toast.fromError(error, "登录失败");
    } finally {
      setLoading(false);
    }
  }

  function handleEmailAction() {
    if (codeSent) {
      void handleSubmit();
    } else {
      void handleSendCode();
    }
  }

  return (
    <main className="relative flex h-screen min-h-[560px] w-full items-center justify-center overflow-y-auto bg-[#fafafa] text-[#171717] dark:bg-gray-950 dark:text-gray-100">
      <header className="absolute inset-x-0 top-0 z-10 flex h-16 items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900 dark:focus-visible:outline-white"
          aria-label="返回 Ragflux 首页"
        >
          Ragflux
        </Link>
        <button
          type="button"
          aria-label="切换主题"
          title="切换主题"
          className="flex size-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:hover:bg-gray-800 dark:hover:text-white dark:focus-visible:outline-white"
          onClick={() => {
            const isDark = document.documentElement.classList.contains("dark");
            setPreference(isDark ? "light" : "dark");
          }}
        >
          {preference === "dark" ? (
            <Sun className="size-[18px]" />
          ) : (
            <Moon className="size-[18px]" />
          )}
        </button>
      </header>

      <section className="flex w-full max-w-md items-center justify-center px-5 py-12">
        <div className="w-full">
          <div className="mb-9 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">欢迎回来</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              使用邮箱登录 Ragflux
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              handleEmailAction();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                邮箱
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="输入你的邮箱"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={codeSent || loading}
                  className="h-12 rounded-md border-gray-200 bg-white pl-10 shadow-none dark:border-gray-800 dark:bg-gray-900"
                />
              </div>
            </div>

            {codeSent ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-code"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    验证码
                  </label>
                  <button
                    type="button"
                    className="text-xs text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
                    onClick={() => {
                      setCodeSent(false);
                      setCode("");
                    }}
                  >
                    更换邮箱
                  </button>
                </div>
                <Input
                  id="login-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="输入 6 位验证码"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  disabled={loading}
                  className="h-12 rounded-md border-gray-200 bg-white shadow-none dark:border-gray-800 dark:bg-gray-900"
                />
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={loading || (!codeSent && countdown > 0)}
              className="h-12 w-full rounded-md bg-[#171717] text-white hover:bg-black dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
              {loading
                ? "登录中..."
                : codeSent
                  ? "登录"
                  : countdown > 0
                    ? `${countdown} 秒后重新发送`
                    : "获取验证码"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-gray-400">
            未注册用户，验证邮箱后将自动创建账号
          </p>
        </div>
      </section>
    </main>
  );
}
