"use client";

import Link from "next/link";
import { useSession } from "../model/use-session";

const buttonClassName = `flex items-center justify-center
  h-10 px-4
  text-sm font-medium text-white
  bg-black rounded-lg
  hover:bg-gray-900`;

const outlineButtonClassName = `flex items-center justify-center
  h-10 px-4
  text-sm font-medium text-gray-900
  bg-white border border-gray-300 rounded-lg
  hover:bg-gray-100`;

export function HomeSessionActions() {
  const { ready, user } = useSession();

  if (!ready) {
    return null;
  }

  if (user) {
    return (
      <Link href="/create" className={buttonClassName}>
        제작 페이지
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login" className={buttonClassName}>
        로그인
      </Link>
      <Link href="/signup" className={outlineButtonClassName}>
        회원가입
      </Link>
    </div>
  );
}
