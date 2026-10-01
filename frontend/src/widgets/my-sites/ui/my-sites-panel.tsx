"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/features/auth";
import {
  describeSiteList,
  listMySites,
  resolveSiteListState,
  type SiteListState,
} from "@/entities/site";

export function MySitesPanel() {
  const { ready, user } = useSession();
  const [state, setState] = useState<SiteListState>({ kind: "loading" });

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      setState({ kind: "guest" });
      return;
    }

    let cancelled = false;
    setState({ kind: "loading" });

    listMySites()
      .then((sites) => {
        if (cancelled) {
          return;
        }
        setState(sites.length === 0 ? { kind: "empty" } : { kind: "ready", sites });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "사이트를 불러오지 못했습니다.";
        setState({ kind: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!ready) {
    return <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12" />;
  }

  const view = describeSiteList(resolveSiteListState({ ready, user }, state));

  return (
    <main
      className={
        view.action
          ? `mx-auto flex flex-1 flex-col
            min-h-[calc(100dvh-3.5rem)] w-full max-w-[1200px]
            px-6 py-12`
          : "mx-auto w-full max-w-[1200px] flex-1 px-6 py-12"
      }
    >
      <h1 className="text-2xl font-semibold text-black">{view.title}</h1>
      {view.action ? (
        <div
          className="flex flex-1 flex-col items-center justify-center
            text-center"
        >
          {view.message ? (
            <p className="text-sm text-gray-500">{view.message}</p>
          ) : null}
          <Link
            href={view.action.href}
            className="inline-flex items-center justify-center
              h-10
              mt-4 px-4
              text-sm font-medium text-white
              bg-black rounded-lg
              hover:bg-gray-900"
          >
            {view.action.label}
          </Link>
        </div>
      ) : view.message ? (
        <p className="mt-6 text-sm text-gray-500">{view.message}</p>
      ) : null}
      {view.items.length > 0 ? (
        <ul className="mt-8 border-t border-gray-200">
          {view.items.map((item) => (
            <li key={item.id} className="border-b border-gray-200">
              <Link
                href={item.href}
                className="flex flex-col gap-3
                  py-4
                  sm:flex-row sm:items-center sm:justify-between
                  hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-center gap-4">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-14 w-14
                        rounded-xl
                        bg-gray-100 object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-gray-100" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-black">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.typeLabel} · {item.statusLabel}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-400">{item.updatedLabel}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
