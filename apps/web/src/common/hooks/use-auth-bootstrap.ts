import { useEffect } from 'react';
import { fetchMe, refresh } from '@/apis/auth';
import { saveAccessToken } from '@/common/hooks/use-access-token';
import { useAuthStore } from '@/common/stores/auth';
import { isExplicitLogout, useUserInfoStore } from '@/common/stores/userInfoStore';

export function useAuthBootstrap() {
  const setUser = useUserInfoStore((state) => state.setUser);
  const setIsLogin = useUserInfoStore((state) => state.setIsLogin);
  const clearUserInfo = useUserInfoStore((state) => state.clearUserInfo);
  const setBooted = useAuthStore((state) => state.setBooted);

  useEffect(() => {
    if (isExplicitLogout()) {
      setBooted(true);
      return;
    }

    let cancelled = false;
    refresh()
      .then(async (body) => {
        if (cancelled || isExplicitLogout()) return;
        const accessToken = body.data?.accessToken;
        if (!accessToken) {
          clearUserInfo();
          return;
        }
        saveAccessToken(accessToken);
        const me = await fetchMe();
        if (cancelled || isExplicitLogout()) return;
        if (!me.data) {
          clearUserInfo();
          return;
        }
        setUser(me.data);
        setIsLogin(true);
      })
      .catch(() => {
        if (!cancelled) clearUserInfo();
      })
      .finally(() => {
        if (!cancelled) setBooted(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clearUserInfo, setBooted, setIsLogin, setUser]);
}
