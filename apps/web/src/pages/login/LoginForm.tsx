import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLogin } from './hooks/use-login';
import { useSendCode } from './hooks/use-send-code';

const fieldClassName = 'h-12 rounded-md border-gray-200 bg-white shadow-none dark:border-gray-800 dark:bg-gray-900';
const primaryButtonClassName =
  'h-12 rounded-md bg-[#171717] text-white hover:bg-black dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200';

export default function LoginForm() {
  const { email, codeSent, sending, countdown, sendDisabled, onEmailChange, onChangeEmail, onSend } = useSendCode();
  const { code, submitting, submitDisabled, onCodeChange, clearCode, onSubmit } = useLogin({ email, codeSent });
  const sendingStep = !codeSent;

  function changeEmail() {
    if (sending || submitting) return;
    onChangeEmail();
    clearCode();
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (codeSent) onSubmit();
        else onSend();
      }}
    >
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          邮箱
        </label>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="输入你的邮箱"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              disabled={codeSent || sending || submitting}
              className={`${fieldClassName} pl-10`}
            />
          </div>
          <Button
            type={sendingStep ? 'submit' : 'button'}
            onClick={sendingStep ? undefined : onSend}
            disabled={sendDisabled || submitting}
            className={`${primaryButtonClassName} shrink-0 px-4`}
          >
            {sendButtonLabel(sending, countdown, codeSent)}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex h-6 items-center justify-between">
          <label htmlFor="login-code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            验证码
          </label>
          {codeSent ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-xs text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
              onClick={changeEmail}
              disabled={sending || submitting}
            >
              更换邮箱
            </Button>
          ) : null}
        </div>
        <Input
          id="login-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="输入 6 位验证码"
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          disabled={!codeSent || submitting}
          className={fieldClassName}
        />
      </div>

      <Button
        type={sendingStep ? 'button' : 'submit'}
        disabled={submitDisabled || sending}
        className={`${primaryButtonClassName} w-full`}
      >
        {submitting ? '登录中...' : '登录'}
      </Button>
    </form>
  );
}

function sendButtonLabel(sending: boolean, countdown: number, codeSent: boolean) {
  if (sending) return '发送中...';
  if (countdown > 0) return `${countdown} 秒`;
  if (codeSent) return '重新发送';
  return '发送验证码';
}
