import type { RetrievalHit } from '@ragflux/shared/retrieval';
import { useEffect, useState } from 'react';
import { listDatasets } from '@/apis/dataset';
import { retrievalSchema } from '@/apis/retrieval/schema';
import { retrievalTest } from '@/apis/retrieval';
import { useToast } from '@/common/stores/toast';
import { formError } from '@/common/utils/form';

export function useRetrieval(datasetId: number, datasetName = '') {
  const toast = useToast();
  const [resolvedName, setResolvedName] = useState('');
  const title = datasetName || resolvedName;
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(6);
  const [hits, setHits] = useState<RetrievalHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (datasetName) return;
    let cancelled = false;
    listDatasets()
      .then((body) => {
        const found = body.data?.find((item) => item.id === datasetId);
        if (!cancelled && found) setResolvedName(found.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [datasetId, datasetName]);

  async function run() {
    const parsed = retrievalSchema.safeParse({ query, topK });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    setSearching(true);
    try {
      setHits(
        (
          await retrievalTest({
            datasetId,
            query: parsed.data.query,
            topK: parsed.data.topK,
          })
        ).data ?? [],
      );
      setSearched(true);
    } catch (error) {
      toast.fromError(error, '检索失败');
    } finally {
      setSearching(false);
    }
  }

  function toggle(chunkId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(chunkId)) next.delete(chunkId);
      else next.add(chunkId);
      return next;
    });
  }

  return {
    datasetId,
    title,
    query,
    setQuery,
    topK,
    setTopK,
    hits,
    searching,
    searched,
    expanded,
    run,
    toggle,
  };
}

export type RetrievalTestProps = ReturnType<typeof useRetrieval>;
