"use client";

import { useSession } from "../model/use-session";

export function SessionGreeting() {
  const { user } = useSession();

  if (!user) {
    return null;
  }

  return (
    <p className="text-sm text-gray-500">{user.name}님으로 로그인되어 있습니다.</p>
  );
}
