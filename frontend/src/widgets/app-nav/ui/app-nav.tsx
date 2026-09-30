"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, useSession } from "@/features/auth";
import { getAppNavActions } from "../model/app-nav-actions";

const buttonClassName = `flex shrink-0 items-center justify-center
  h-10 px-4
  text-sm font-medium text-white
  bg-black rounded-lg
  hover:bg-gray-900`;

export function AppNav() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { ready, user } = useSession();
  const actions = ready ? getAppNavActions(user) : [];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div
        className="mx-auto flex h-14 w-full max-w-screen-2xl items-center
          justify-between px-4 sm:px-6"
      >
        <Link href="/" className="shrink-0 text-sm font-semibold text-black">
          CREP AI
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          {actions.map((action) => {
            if (action.kind === "logout") {
              return (
                <button
                  key="logout"
                  type="button"
                  className={buttonClassName}
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  {action.label}
                </button>
              );
            }

            if (action.href) {
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={buttonClassName}
                >
                  {action.label}
                </Link>
              );
            }

            return (
              <p key={action.label} className="truncate text-sm text-gray-500">
                {action.label}
              </p>
            );
          })}
        </div>
      </div>
    </header>
  );
}
