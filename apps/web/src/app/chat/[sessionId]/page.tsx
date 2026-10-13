"use client";

import { useParams } from "next/navigation";
import { ChatView } from "@/features/chat/components/chat-view";

export default function ChatSessionPage() {
  const params = useParams<{ sessionId: string }>();
  return <ChatView sessionId={Number(params.sessionId)} />;
}
