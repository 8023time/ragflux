import type {
  CreateModelRequest,
  DefaultModels,
  ModelView,
  TestModelRequest,
  TestModelResult,
} from "@ragflux/shared/model";
import { apiJSON } from "@/lib/http";

export function listDefaultModels() {
  return apiJSON<DefaultModels>("/models/defaults");
}

export function listEmbedModels() {
  return apiJSON<ModelView[]>("/embed-models");
}

export function createEmbedModel(body: CreateModelRequest) {
  return apiJSON<ModelView>("/embed-models", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteEmbedModel(id: number) {
  return apiJSON<null>(`/embed-models/${id}`, { method: "DELETE" });
}

export function listVisionModels() {
  return apiJSON<ModelView[]>("/vision-models");
}

export function createVisionModel(body: CreateModelRequest) {
  return apiJSON<ModelView>("/vision-models", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteVisionModel(id: number) {
  return apiJSON<null>(`/vision-models/${id}`, { method: "DELETE" });
}

export function testEmbedModel(body: TestModelRequest) {
  return apiJSON<TestModelResult>("/models/test-embed", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function testVisionModel(body: TestModelRequest) {
  return apiJSON<TestModelResult>("/models/test-vision", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
