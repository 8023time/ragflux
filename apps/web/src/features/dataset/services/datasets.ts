import type {
  CreateDatasetRequest,
  DatasetView,
  UpdateDatasetRequest,
} from "@ragflux/shared/dataset";
import { apiJSON } from "@/lib/http";

export function listDatasets() {
  return apiJSON<DatasetView[]>("/datasets");
}

export function createDataset(body: CreateDatasetRequest) {
  return apiJSON<DatasetView>("/datasets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateDataset(datasetId: number, body: UpdateDatasetRequest) {
  return apiJSON<DatasetView>(`/datasets/${datasetId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteDataset(datasetId: number) {
  return apiJSON<null>(`/datasets/${datasetId}`, { method: "DELETE" });
}
