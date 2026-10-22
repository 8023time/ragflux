import { useParams } from 'react-router';
import { useRetrieval } from '@/pages/retrieval/hooks/use-retrieval';
import { RetrievalTest } from '@/pages/retrieval/components/retrieval-test';

export default function RetrievalPage() {
  const { datasetId = '' } = useParams();
  const state = useRetrieval(Number(datasetId));
  return <RetrievalTest {...state} />;
}
