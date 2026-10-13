"use client";

import { Database, FileText, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UpdateDatasetRequest } from "@ragflux/shared/dataset";
import type { DefaultModels, ModelView } from "@ragflux/shared/model";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  datasetFormSchema,
  modelConnectionSchema,
  modelSaveSchema,
} from "@/features/dataset/schemas";
import {
  createDataset,
  deleteDataset,
  listDatasets,
  updateDataset,
} from "@/features/dataset/services/datasets";
import {
  createEmbedModel,
  createVisionModel,
  deleteEmbedModel,
  deleteVisionModel,
  listDefaultModels,
  listEmbedModels,
  listVisionModels,
  testEmbedModel,
  testVisionModel,
} from "@/features/dataset/services/models";
import { listDocuments } from "@/features/document/services/documents";
import { formError } from "@/lib/form";
import {
  CHUNK_STRATEGIES,
  formatRelativeTime,
  strategyLabel,
} from "@/lib/format";
import type { DatasetRow } from "@/types/dataset";
import { useToast } from "@/stores/toast";

type ModelKind = "embed" | "vision";

export function DatasetList() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<DatasetRow[]>([]);
  const [embedModels, setEmbedModels] = useState<ModelView[]>([]);
  const [visionModels, setVisionModels] = useState<ModelView[]>([]);
  const [defaultModels, setDefaultModels] = useState<DefaultModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DatasetRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState("general");
  const [embedId, setEmbedId] = useState<number | null>(null);
  const [visionId, setVisionId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [modelKind, setModelKind] = useState<ModelKind>("embed");
  const [modelName, setModelName] = useState("");
  const [modelId, setModelId] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tested, setTested] = useState(false);
  const [testing, setTesting] = useState(false);
  const [modelSaving, setModelSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<null | {
    title: string;
    message: string;
    run: () => Promise<void>;
  }>(null);

  async function reload() {
    setLoading(true);
    try {
      const [datasets, embeds, visions, defaults] = await Promise.all([
        listDatasets(),
        listEmbedModels(),
        listVisionModels(),
        listDefaultModels(),
      ]);
      const withCounts = await Promise.all(
        datasets.map(async (dataset) => {
          try {
            const documents = await listDocuments(dataset.id);
            return { ...dataset, documentCount: documents.length };
          } catch {
            return dataset;
          }
        }),
      );
      setItems(withCounts);
      setEmbedModels(embeds);
      setVisionModels(visions);
      setDefaultModels(defaults);
    } catch (error) {
      toast.fromError(error, "加载知识库失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // 首次进入加载列表。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setStrategy("general");
    setEmbedId(null);
    setVisionId(null);
    setEditorOpen(true);
  }

  function openEdit(dataset: DatasetRow) {
    setEditing(dataset);
    setName(dataset.name);
    setDescription(dataset.description);
    setStrategy(dataset.chunkStrategy || "general");
    setEmbedId(dataset.embedModelId);
    setVisionId(
      dataset.visionModelId > 0 ? dataset.visionModelId : dataset.visionModel ? null : 0,
    );
    setEditorOpen(true);
  }

  function openModel(kind: ModelKind) {
    setModelKind(kind);
    setModelName("");
    setModelId("");
    setApiUrl("");
    setApiKey("");
    setTested(false);
    setModelOpen(true);
  }

  async function saveDataset() {
    const chunkStrategy = CHUNK_STRATEGIES.some(
      (item) => item.value === strategy,
    )
      ? strategy
      : "general";
    const parsed = datasetFormSchema.safeParse({
      name,
      description,
      chunkStrategy,
      embedModelId: embedId,
      visionModelId: visionId,
    });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    const value = parsed.data;
    setSaving(true);
    try {
      if (editing) {
        const vision =
          value.visionModelId == null
            ? defaultVisionPatch(defaultModels, editing.visionModelId, editing.visionModel)
            : { visionModelId: value.visionModelId };
        if (!vision) {
          toast.error("默认视觉模型不可用");
          return;
        }
        await updateDataset(editing.id, {
          name: value.name,
          description: value.description,
          ...vision,
          ...embedPatch(editing, value.embedModelId, defaultModels),
        });
        toast.success("知识库已更新");
      } else {
        const created = await createDataset({
          name: value.name,
          description: value.description,
          chunkStrategy: value.chunkStrategy,
        });
        const patch = customModelPatch(value.embedModelId, value.visionModelId);
        if (patch) {
          await updateDataset(created.id, patch);
        }
        toast.success("知识库已创建");
      }
      setEditorOpen(false);
      await reload();
    } catch (error) {
      toast.fromError(error, "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function testModel() {
    const parsed = modelConnectionSchema.safeParse({ modelId, apiUrl, apiKey });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      setTested(false);
      return;
    }
    setTesting(true);
    try {
      const payload = parsed.data;
      if (modelKind === "vision") await testVisionModel(payload);
      else await testEmbedModel(payload);
      setTested(true);
      toast.success("连接成功");
    } catch (error) {
      setTested(false);
      toast.fromError(error, "连接失败");
    } finally {
      setTesting(false);
    }
  }

  async function saveModel() {
    if (!tested) {
      toast.error("请先测试连接成功后再保存");
      return;
    }
    const parsed = modelSaveSchema.safeParse({
      name: modelName,
      modelId,
      apiUrl,
      apiKey,
    });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    setModelSaving(true);
    try {
      const payload = parsed.data;
      if (modelKind === "vision") await createVisionModel(payload);
      else await createEmbedModel(payload);
      setModelOpen(false);
      const [embeds, visions] = await Promise.all([
        listEmbedModels(),
        listVisionModels(),
      ]);
      setEmbedModels(embeds);
      setVisionModels(visions);
      toast.success(
        modelKind === "vision" ? "视觉模型已添加" : "嵌入模型已添加",
      );
    } catch (error) {
      toast.fromError(error, "保存失败");
    } finally {
      setModelSaving(false);
    }
  }

  const panels: Array<{
    kind: ModelKind;
    title: string;
    hint: string;
    empty: string;
    models: ModelView[];
  }> = [
    {
      kind: "embed",
      title: "嵌入模型",
      hint: "登记后绑定到知识库。",
      empty: "还没有自定义嵌入模型。新建知识库会使用服务端默认模型。",
      models: embedModels,
    },
    {
      kind: "vision",
      title: "视觉模型",
      hint: "用于识别文档中的图片，生成文字描述后参与检索；可随时更换。",
      empty: "还没有视觉模型。",
      models: visionModels,
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              知识库
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              上传文档构建知识库，基于向量检索智能问答
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" />
            新建知识库
          </Button>
        </div>

        {!loading ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {panels.map((panel) => (
              <div
                key={panel.kind}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                      {panel.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">{panel.hint}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => openModel(panel.kind)}
                  >
                    添加模型
                  </Button>
                </div>
                {panel.models.length === 0 ? (
                  <p className="text-xs text-gray-400">{panel.empty}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {panel.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-700"
                      >
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {model.name}
                        </span>
                        <span className="text-gray-400">{model.modelId}</span>
                        <button
                          type="button"
                          title="删除"
                          className="rounded p-0.5 text-gray-400 hover:text-red-500"
                          onClick={() =>
                            setPendingDelete({
                              title:
                                panel.kind === "vision"
                                  ? "删除视觉模型"
                                  : "删除嵌入模型",
                              message: `确定删除「${model.name}」吗？此操作不可恢复。`,
                              run: async () => {
                                if (panel.kind === "vision")
                                  await deleteVisionModel(model.id);
                                else await deleteEmbedModel(model.id);
                                const [embeds, visions] = await Promise.all([
                                  listEmbedModels(),
                                  listVisionModels(),
                                ]);
                                setEmbedModels(embeds);
                                setVisionModels(visions);
                                toast.success(
                                  panel.kind === "vision"
                                    ? "视觉模型已删除"
                                    : "嵌入模型已删除",
                                );
                              },
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">
            加载中...
          </div>
        ) : null}
        {!loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 py-20 text-gray-400 dark:border-gray-700">
            <Database className="size-10" />
            <p className="text-sm">还没有知识库，点击右上角新建</p>
          </div>
        ) : null}
        {!loading && items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((dataset) => (
              <div
                key={dataset.id}
                className="group flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                onClick={() =>
                  router.push(
                    `/datasets/${dataset.id}?name=${encodeURIComponent(dataset.name)}`,
                  )
                }
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Database className="size-5" />
                  </div>
                  <div
                    className="flex gap-1 opacity-0 group-hover:opacity-100"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="重命名"
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => openEdit(dataset)}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="删除"
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() =>
                        setPendingDelete({
                          title: "删除知识库",
                          message: `确定删除「${dataset.name}」吗？其中的文档与分块将一并删除，且不可恢复。`,
                          run: async () => {
                            await deleteDataset(dataset.id);
                            toast.success("知识库已删除");
                            await reload();
                          },
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <h3 className="mb-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {dataset.name}
                </h3>
                <p className="mb-4 line-clamp-2 min-h-5 text-xs text-gray-500">
                  {dataset.description || "暂无描述"}
                </p>
                <div className="mt-auto space-y-1.5 text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileText className="size-3.5" />
                      {dataset.documentCount ?? 0} 文档
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="size-3.5" />
                      {dataset.chunkCount ?? "—"} 分块
                    </span>
                    <span className="truncate">
                      {strategyLabel(dataset.chunkStrategy)}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="min-w-0 truncate">
                      嵌入 {dataset.embedModel || "未绑定"}
                    </span>
                    <span className="min-w-0 truncate">
                      视觉 {dataset.visionModel || "未使用"}
                    </span>
                    <span className="shrink-0">
                      {formatRelativeTime(dataset.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑知识库" : "新建知识库"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dataset-name">名称</Label>
              <Input
                id="dataset-name"
                value={name}
                maxLength={128}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：产品手册"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataset-description">描述</Label>
              <Textarea
                id="dataset-description"
                value={description}
                rows={3}
                onChange={(event) => setDescription(event.target.value)}
                className="resize-none"
                placeholder="可选"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>解析模板</Label>
                {editing ? (
                  <Input disabled value={strategyLabel(strategy)} />
                ) : (
                  <Select value={strategy} onValueChange={setStrategy}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHUNK_STRATEGIES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>嵌入模型</Label>
                {editing && (editing.embedModelId || editing.embedModel) ? (
                  <Input disabled value={editing.embedModel || "默认模型"} />
                ) : (
                  <Select
                    value={embedId == null ? "default" : String(embedId)}
                    onValueChange={(value) =>
                      setEmbedId(value === "default" ? null : Number(value))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        {defaultLabel(defaultModels?.embed.modelId)}
                      </SelectItem>
                      {embedModels.map((model) => (
                        <SelectItem key={model.id} value={String(model.id)}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {editing
                ? "解析模板与已绑定的嵌入模型创建后不可更换"
                : "知识库中的全部文档将使用所选解析模板。嵌入和视觉默认使用服务端模型，也可以改成自己的模型。"}
            </p>
            <div className="space-y-1.5">
              <Label>视觉模型</Label>
              <Select
                value={visionId == null ? "default" : String(visionId)}
                onValueChange={(value) =>
                  setVisionId(value === "default" ? null : Number(value))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    {defaultLabel(defaultModels?.vision.modelId)}
                  </SelectItem>
                  <SelectItem value="0">不使用</SelectItem>
                  {visionModels.map((model) => (
                    <SelectItem key={model.id} value={String(model.id)}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                仅用于识别图片内容，可随时更换
              </p>
            </div>
            <Button
              type="button"
              disabled={saving}
              className="w-full"
              onClick={() => void saveDataset()}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modelOpen} onOpenChange={setModelOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {modelKind === "vision" ? "添加视觉模型" : "添加嵌入模型"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="model-name">名称</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(event) => setModelName(event.target.value)}
                placeholder="展示名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model-id">模型 ID</Label>
              <Input
                id="model-id"
                value={modelId}
                onChange={(event) => {
                  setModelId(event.target.value);
                  setTested(false);
                }}
                placeholder={
                  modelKind === "vision"
                    ? "例如 google/gemma"
                    : "例如 BAAI/bge-m3"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model-url">接口前缀</Label>
              <Input
                id="model-url"
                value={apiUrl}
                onChange={(event) => {
                  setApiUrl(event.target.value);
                  setTested(false);
                }}
                placeholder="例如 https://api.example.com/v1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model-key">API Key</Label>
              <Input
                id="model-key"
                type="password"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setTested(false);
                }}
                placeholder="sk-…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={testing}
                onClick={() => void testModel()}
              >
                {testing ? "测试中..." : "测试连通性"}
              </Button>
              <Button
                type="button"
                disabled={!tested || modelSaving}
                onClick={() => void saveModel()}
              >
                {modelSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={pendingDelete?.title ?? ""}
        message={pendingDelete?.message ?? ""}
        confirmText="删除"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const action = pendingDelete?.run;
          setPendingDelete(null);
          if (!action) return;
          void action().catch((error) => toast.fromError(error, "删除失败"));
        }}
      />
    </div>
  );
}

function defaultLabel(modelId: string | undefined) {
  return modelId ? `默认 · ${modelId}` : "默认模型";
}

function customModelPatch(
  embedModelId: number | null,
  visionModelId: number | null,
): UpdateDatasetRequest | null {
  const patch: UpdateDatasetRequest = {};
  if (embedModelId != null) {
    patch.embedModelId = embedModelId;
  }
  if (visionModelId != null) {
    patch.visionModelId = visionModelId;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function defaultVisionPatch(
  defaults: DefaultModels | null,
  currentVisionModelId: number,
  currentVisionModel: string,
): Pick<UpdateDatasetRequest, "visionModelId" | "visionModel"> | null {
  const modelId =
    defaults?.vision.modelId || (currentVisionModelId === 0 ? currentVisionModel : "");
  if (!modelId) {
    return null;
  }
  return { visionModelId: 0, visionModel: modelId };
}

function embedPatch(
  editing: DatasetRow,
  embedModelId: number | null,
  defaults: DefaultModels | null,
): UpdateDatasetRequest {
  if (editing.embedModelId || editing.embedModel) {
    return {};
  }
  if (embedModelId != null) {
    return { embedModelId };
  }
  if (!defaults) {
    return {};
  }
  return { embedModelId: null, embedModel: defaults.embed.modelId };
}
