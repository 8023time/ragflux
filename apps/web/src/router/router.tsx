import { RootLayout } from './root-layout';
import { RequireAuth, GuestOnly } from './guard';
import { createBrowserRouter, Navigate } from 'react-router';
import { Chat, Chunk, Dataset, Document, Login, NotFound, Retrieval } from './pages';

export const router = createBrowserRouter([
  // 登录页：只有未登录能访问
  {
    path: '/login',
    Component: GuestOnly,
    children: [{ index: true, Component: Login }],
  },
  // 需要登录的区域
  {
    path: '/',
    Component: RequireAuth,
    children: [
      {
        Component: RootLayout, // 布局路由（内部有 <Outlet />）
        children: [
          { index: true, element: <Navigate to="/chat" replace /> },
          {
            path: 'chat',
            children: [
              { index: true, Component: Chat },
              { path: ':sessionId', Component: Chat },
            ],
          },
          {
            path: 'datasets',
            children: [
              { index: true, Component: Dataset },
              { path: ':datasetId', Component: Document },
              { path: ':datasetId/retrieval', Component: Retrieval },
            ],
          },
          { path: 'documents/:documentId/chunks', Component: Chunk },
        ],
      },
    ],
  },
  // 404 页面
  { path: '*', Component: NotFound },
]);
