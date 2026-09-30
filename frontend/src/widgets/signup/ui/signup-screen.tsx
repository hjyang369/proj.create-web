import { SignupForm } from "@/features/auth";

export function SignupScreen() {
  return (
    <main
      className="mx-auto flex w-full max-w-[1200px] flex-1 items-center
        px-6 py-16"
    >
      <section className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold text-black">회원가입</h1>
        <p className="mt-2 text-sm text-gray-500">
          계정을 만들면 바로 로그인됩니다.
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
      </section>
    </main>
  );
}
