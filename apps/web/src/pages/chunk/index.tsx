import { useParams } from 'react-router';
import { ChunkList } from '@/pages/chunk/components/chunk-list';
import { useChunks } from '@/pages/chunk/hooks/use-chunks';

export default function ChunkPage() {
  const { documentId = '' } = useParams();
  const state = useChunks(Number(documentId));
  return <ChunkList {...state} />;
}
