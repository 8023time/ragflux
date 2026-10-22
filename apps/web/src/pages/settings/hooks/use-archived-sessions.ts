import type { SessionView } from '@ragflux/shared/session';
import { useEffect, useState } from 'react';
import { listSessions } from '@/apis/chat';
import { useToast } from '@/common/stores/toast';

export function useArchivedSessions(open: boolean) {
  const toast = useToast();
  const [archived, setArchived] = useState<SessionView[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listSessions()
      .then((body) => {
        if (!cancelled) setArchived((body.data ?? []).filter((item) => item.status !== 1));
      })
      .catch((error) => {
        if (cancelled) return;
        setArchived([]);
        toast.fromError(error, '加载归档失败');
      });
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  return archived;
}
