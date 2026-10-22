import { DatasetList } from '@/pages/dataset/components/dataset-list';
import { useDatasets } from '@/pages/dataset/hooks/use-datasets';

export default function DatasetPage() {
  const state = useDatasets();
  return <DatasetList {...state} />;
}
