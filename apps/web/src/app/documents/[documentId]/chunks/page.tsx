"use client";

import { useParams } from "next/navigation";
import { ChunkList } from "@/features/chunk/components/chunk-list";

export default function ChunksPage() {
  const params = useParams<{ documentId: string }>();
  return <ChunkList documentId={Number(params.documentId)} />;
}
