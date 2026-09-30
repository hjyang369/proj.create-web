"use client";

import Link from "next/link";
import { useSession } from "../model/use-session";

const buttonClassName = `flex items-center justify-center
  h-10 px-4
  text-sm font-medium text-white
  bg-black rounded-lg
  hover:bg-gray-900`;

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
    <Link href="/signup" className={buttonClassName}>
      회원가입
    </Link>
  );
}
