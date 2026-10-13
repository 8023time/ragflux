"use client";

import { useParams } from "next/navigation";
import { RetrievalTest } from "@/features/retrieval/components/retrieval-test";

export default function RetrievalPage() {
  const params = useParams<{ datasetId: string }>();
  return <RetrievalTest datasetId={Number(params.datasetId)} datasetName="" />;
}
