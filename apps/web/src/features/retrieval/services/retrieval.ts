import type { RetrievalHit, RetrievalTestRequest } from "@ragflux/shared/retrieval";
import { apiJSON } from "@/lib/http";

export function retrievalTest(body: RetrievalTestRequest) {
  return apiJSON<RetrievalHit[]>("/retrieval/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
