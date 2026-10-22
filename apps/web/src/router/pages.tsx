import { lazy } from 'react';

export const Login = lazy(() => import('@/pages/login/loginPage'));
export const Chat = lazy(() => import('@/pages/chat'));
export const Dataset = lazy(() => import('@/pages/dataset'));
export const Document = lazy(() => import('@/pages/document'));
export const Retrieval = lazy(() => import('@/pages/retrieval'));
export const Chunk = lazy(() => import('@/pages/chunk'));
export const NotFound = lazy(() => import('@/pages/notFoundPage'));
