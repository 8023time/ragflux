import LoginForm from './LoginForm';
import LoginHeader from './loginHeader';

export default function LoginPage() {
  return (
    <main className="relative flex h-screen min-h-[560px] w-full items-center justify-center overflow-y-auto bg-[#fafafa] text-[#171717] dark:bg-gray-950 dark:text-gray-100">
      <LoginHeader />
      <section className="flex w-full max-w-md items-center justify-center px-5 py-12">
        <div className="w-full">
          <div className="mb-9 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">欢迎回来</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">使用邮箱登录 Ragflux</p>
          </div>
          <LoginForm />
          <p className="mt-8 text-center text-xs leading-5 text-gray-400">未注册用户，验证邮箱后将自动创建账号</p>
        </div>
      </section>
    </main>
  );
}
