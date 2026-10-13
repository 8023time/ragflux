"use client";

import { useParams } from "next/navigation";
import { DocumentList } from "@/features/document/components/document-list";

export default function DatasetDocumentsPage() {
  const params = useParams<{ datasetId: string }>();
  return <DocumentList datasetId={Number(params.datasetId)} datasetName="" />;
}
