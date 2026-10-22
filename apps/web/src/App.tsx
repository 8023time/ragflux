import { RouterProvider } from 'react-router';
import { AppProviders } from '@/components/layout/providers';
import { router } from '@/router/router';

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
