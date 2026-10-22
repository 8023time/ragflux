import type { UpdateDatasetRequest } from '@ragflux/shared/dataset';
import type { DefaultModels, ModelView } from '@ragflux/shared/model';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { datasetFormSchema } from '@/apis/dataset/schema';
import { createDataset, deleteDataset, listDatasets, updateDataset, type DatasetRow } from '@/apis/dataset';
import { listDocuments } from '@/apis/document';
import { modelConnectionSchema, modelSaveSchema } from '@/apis/model/schema';
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
} from '@/apis/model';
import { formError } from '@/common/utils/form';
import { CHUNK_STRATEGIES } from '@/common/utils/format';
import { useToast } from '@/common/stores/toast';
import { ApiError } from '@/common/utils/api-request';

export type ModelKind = 'embed' | 'vision';

export function useDatasets() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<DatasetRow[]>([]);
  const [embedModels, setEmbedModels] = useState<ModelView[]>([]);
  const [visionModels, setVisionModels] = useState<ModelView[]>([]);
  const [defaultModels, setDefaultModels] = useState<DefaultModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DatasetRow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState('general');
  const [embedId, setEmbedId] = useState<number | null>(null);
  const [visionId, setVisionId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [modelKind, setModelKind] = useState<ModelKind>('embed');
  const [modelName, setModelName] = useState('');
  const [modelId, setModelId] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
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
      const [datasetRes, embedRes, visionRes, defaultRes] = await Promise.all([
        listDatasets(),
        listEmbedModels(),
        listVisionModels(),
        listDefaultModels(),
      ]);
      const datasets = datasetRes.data ?? [];
      const withCounts = await Promise.all(
        datasets.map(async (dataset) => {
          try {
            const documents = (await listDocuments(dataset.id)).data ?? [];
            return { ...dataset, documentCount: documents.length };
          } catch {
            return dataset;
          }
        }),
      );
      setItems(withCounts);
      setEmbedModels(embedRes.data ?? []);
      setVisionModels(visionRes.data ?? []);
      setDefaultModels(defaultRes.data ?? null);
    } catch (error) {
      toast.fromError(error, '加载知识库失败');
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
    setName('');
    setDescription('');
    setStrategy('general');
    setEmbedId(null);
    setVisionId(null);
    setEditorOpen(true);
  }

  function openEdit(dataset: DatasetRow) {
    setEditing(dataset);
    setName(dataset.name);
    setDescription(dataset.description);
    setStrategy(dataset.chunkStrategy || 'general');
    setEmbedId(dataset.embedModelId);
    setVisionId(dataset.visionModelId > 0 ? dataset.visionModelId : dataset.visionModel ? null : 0);
    setEditorOpen(true);
  }

  function openDataset(dataset: DatasetRow) {
    navigate(`/datasets/${dataset.id}?name=${encodeURIComponent(dataset.name)}`);
  }

  function openModel(kind: ModelKind) {
    setModelKind(kind);
    setModelName('');
    setModelId('');
    setApiUrl('');
    setApiKey('');
    setTested(false);
    setModelOpen(true);
  }

  async function saveDataset() {
    const chunkStrategy = CHUNK_STRATEGIES.some((item) => item.value === strategy) ? strategy : 'general';
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
          toast.error('默认视觉模型不可用');
          return;
        }
        await updateDataset(editing.id, {
          name: value.name,
          description: value.description,
          ...vision,
          ...embedPatch(editing, value.embedModelId, defaultModels),
        });
        toast.success('知识库已更新');
      } else {
        const created = (
          await createDataset({
            name: value.name,
            description: value.description,
            chunkStrategy: value.chunkStrategy,
          })
        ).data;
        if (!created) throw new ApiError('创建知识库失败');
        const patch = customModelPatch(value.embedModelId, value.visionModelId);
        if (patch) await updateDataset(created.id, patch);
        toast.success('知识库已创建');
      }
      setEditorOpen(false);
      await reload();
    } catch (error) {
      toast.fromError(error, '保存失败');
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
      if (modelKind === 'vision') await testVisionModel(parsed.data);
      else await testEmbedModel(parsed.data);
      setTested(true);
      toast.success('连接成功');
    } catch (error) {
      setTested(false);
      toast.fromError(error, '连接失败');
    } finally {
      setTesting(false);
    }
  }

  async function saveModel() {
    if (!tested) {
      toast.error('请先测试连接成功后再保存');
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
      if (modelKind === 'vision') await createVisionModel(parsed.data);
      else await createEmbedModel(parsed.data);
      setModelOpen(false);
      const [embeds, visions] = await Promise.all([listEmbedModels(), listVisionModels()]);
      setEmbedModels(embeds.data ?? []);
      setVisionModels(visions.data ?? []);
      toast.success(modelKind === 'vision' ? '视觉模型已添加' : '嵌入模型已添加');
    } catch (error) {
      toast.fromError(error, '保存失败');
    } finally {
      setModelSaving(false);
    }
  }

  async function removeDataset(datasetId: number) {
    await deleteDataset(datasetId);
    toast.success('知识库已删除');
    await reload();
  }

  async function removeModel(kind: ModelKind, id: number) {
    if (kind === 'vision') await deleteVisionModel(id);
    else await deleteEmbedModel(id);
    const [embeds, visions] = await Promise.all([listEmbedModels(), listVisionModels()]);
    setEmbedModels(embeds.data ?? []);
    setVisionModels(visions.data ?? []);
    toast.success(kind === 'vision' ? '视觉模型已删除' : '嵌入模型已删除');
  }

  return {
    items,
    embedModels,
    visionModels,
    defaultModels,
    loading,
    editorOpen,
    setEditorOpen,
    editing,
    name,
    setName,
    description,
    setDescription,
    strategy,
    setStrategy,
    embedId,
    setEmbedId,
    visionId,
    setVisionId,
    saving,
    modelOpen,
    setModelOpen,
    modelKind,
    modelName,
    setModelName,
    modelId,
    setModelId,
    apiUrl,
    setApiUrl,
    apiKey,
    setApiKey,
    tested,
    setTested,
    testing,
    modelSaving,
    pendingDelete,
    setPendingDelete,
    openCreate,
    openEdit,
    openDataset,
    openModel,
    saveDataset,
    testModel,
    saveModel,
    removeDataset,
    removeModel,
    toast,
  };
}

export type DatasetListProps = ReturnType<typeof useDatasets>;

function customModelPatch(embedModelId: number | null, visionModelId: number | null): UpdateDatasetRequest | null {
  const patch: UpdateDatasetRequest = {};
  if (embedModelId != null) patch.embedModelId = embedModelId;
  if (visionModelId != null) patch.visionModelId = visionModelId;
  return Object.keys(patch).length > 0 ? patch : null;
}

function defaultVisionPatch(
  defaults: DefaultModels | null,
  currentVisionModelId: number,
  currentVisionModel: string,
): Pick<UpdateDatasetRequest, 'visionModelId' | 'visionModel'> | null {
  const modelId = defaults?.vision.modelId || (currentVisionModelId === 0 ? currentVisionModel : '');
  if (!modelId) return null;
  return { visionModelId: 0, visionModel: modelId };
}

function embedPatch(
  editing: DatasetRow,
  embedModelId: number | null,
  defaults: DefaultModels | null,
): UpdateDatasetRequest {
  if (editing.embedModelId || editing.embedModel) return {};
  if (embedModelId != null) return { embedModelId };
  if (!defaults) return {};
  return { embedModelId: null, embedModel: defaults.embed.modelId };
}
