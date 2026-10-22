import { useParams } from 'react-router';
import { DocumentList } from '@/pages/document/components/document-list';
import { useDocuments } from '@/pages/document/hooks/use-documents';

export default function DocumentPage() {
  const { datasetId = '' } = useParams();
  const state = useDocuments(Number(datasetId));
  return <DocumentList {...state} />;
}
