"use client";

import { StatusScreen } from "@/components/shared/status-screen";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusScreen
      title="页面没有加载出来"
      description="再试一次。如果还是不行，回到首页。"
      extra={error.digest}
      primary={{ href: "/", label: "返回首页" }}
      secondary={{ label: "重新加载", onClick: reset }}
    />
  );
}
