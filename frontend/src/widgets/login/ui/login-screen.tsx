import Link from "next/link";
import { LoginForm } from "@/features/auth";

export function LoginScreen() {
  return (
    <main
      className="mx-auto flex w-full max-w-[1200px] flex-1 items-center
        px-6 py-16"
    >
      <section className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold text-black">로그인</h1>
        <p className="mt-2 text-sm text-gray-500">
          이메일과 비밀번호로 계정에 들어갑니다.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-6 text-sm text-gray-500">
          계정이 없나요?{" "}
          <Link href="/signup" className="font-medium text-black">
            회원가입
          </Link>
        </p>
      </section>
    </main>
  );
}
