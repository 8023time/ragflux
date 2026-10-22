import { useEffect, useRef, useState } from 'react';
import { sendCode } from '@/apis/auth';
import { sendCodeSchema } from '@/apis/auth/schema';
import { useToast } from '@/common/stores/toast';
import { formError } from '@/common/utils/form';

/** 与服务端 RESEND_COOLDOWN_SECONDS 保持一致。 */
const RESEND_COOLDOWN_SECONDS = 60;

export function useSendCode() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const sendingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current === null) return;
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function startCountdown(seconds: number) {
    clearTimer();
    deadlineRef.current = Date.now() + seconds * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setCountdown(left);
      if (left === 0) clearTimer();
    };
    tick();
    timerRef.current = window.setInterval(tick, 250);
  }

  async function send() {
    if (sendingRef.current || countdown > 0) return;
    const parsed = sendCodeSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    sendingRef.current = true;
    setSending(true);
    try {
      await sendCode(parsed.data);
      setCodeSent(true);
      startCountdown(RESEND_COOLDOWN_SECONDS);
      toast.success('验证码已发送');
    } catch (error) {
      toast.fromError(error, '发送验证码失败');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function onChangeEmail() {
    if (sendingRef.current) return;
    setCodeSent(false);
  }

  return {
    email,
    codeSent,
    sending,
    countdown,
    sendDisabled: sending || countdown > 0,
    onEmailChange: setEmail,
    onChangeEmail,
    onSend: () => void send(),
  };
}
