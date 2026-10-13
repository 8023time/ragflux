import type { ChunkView, UpdateChunkRequest } from "@ragflux/shared/chunk";
import { apiJSON } from "@/lib/http";

export function listChunks(documentId: number) {
  return apiJSON<ChunkView[]>(`/documents/${documentId}/chunks`);
}

export function updateChunk(chunkId: string, body: UpdateChunkRequest) {
  return apiJSON<ChunkView>(`/chunks/${encodeURIComponent(chunkId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
