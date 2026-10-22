import { Navigate, Outlet } from 'react-router';
import { Loading } from '@/components/common/loading';
import { useAuth } from '@/common/stores/auth';
import { useUserInfo } from '@/common/stores/userInfoStore';

function AuthPending() {
  return (
    <div className="flex-1 w-full flex h-full items-center justify-center">
      <Loading />
    </div>
  );
}

export function GuestOnly() {
  const { booted } = useAuth();
  const { isLogin } = useUserInfo();
  if (!booted) return <AuthPending />;
  if (isLogin) return <Navigate to="/datasets" replace />;
  return <Outlet />;
}

export function RequireAuth() {
  const { booted } = useAuth();
  const { isLogin } = useUserInfo();
  if (!booted) return <AuthPending />;
  if (!isLogin) return <Navigate to="/login" replace />;
  return <Outlet />;
}
