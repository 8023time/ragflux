import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { login } from '@/apis/auth';
import { loginSchema } from '@/apis/auth/schema';
import { saveAccessToken } from '@/common/hooks/use-access-token';
import { useUserInfo } from '@/common/stores/userInfoStore';
import { useToast } from '@/common/stores/toast';
import { ApiError } from '@/common/utils/api-request';
import { formError } from '@/common/utils/form';

const LOGIN_CODE_LENGTH = 6;

interface UseLoginOptions {
  email: string;
  codeSent: boolean;
}

export function useLogin({ email, codeSent }: UseLoginOptions) {
  const navigate = useNavigate();
  const { setUser, setIsLogin } = useUserInfo();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function submit() {
    if (submittingRef.current || !codeSent) return;
    const parsed = loginSchema.safeParse({ email, code });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const body = await login(parsed.data);
      if (!body.data) throw new ApiError(body.msg || '登录失败');
      saveAccessToken(body.data.accessToken);
      setUser(body.data.user);
      setIsLogin(true);
      toast.success('登录成功');
      navigate('/datasets');
    } catch (error) {
      toast.fromError(error, '登录失败');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function clearCode() {
    if (submittingRef.current) return;
    setCode('');
  }

  return {
    code,
    submitting,
    submitDisabled: submitting || !codeSent || code.length !== LOGIN_CODE_LENGTH,
    onCodeChange: (value: string) => setCode(value.replace(/\D/g, '').slice(0, LOGIN_CODE_LENGTH)),
    clearCode,
    onSubmit: () => void submit(),
  };
}
