"use client";

import { useEffect } from "react";
import {
  describeVersionBadges,
  formatVersionCreatedAt,
} from "@/entities/site";
import type { SiteVersionList } from "@/entities/site";
import type { EditPageChrome } from "../model/edit-page-layout";

type EditSiteHistoryDialogProps = {
  chrome: EditPageChrome["history"];
  list: SiteVersionList | null;
  loading: boolean;
  error: string | null;
  busyHistoryId: number | null;
  publishingHistoryId: number | null;
  onClose: () => void;
  onOpenVersion: (historyId: number) => void;
  onPublishVersion: (historyId: number) => void;
};

export function EditSiteHistoryDialog({
  chrome,
  list,
  loading,
  error,
  busyHistoryId,
  publishingHistoryId,
  onClose,
  onOpenVersion,
  onPublishVersion,
}: EditSiteHistoryDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const items = list?.items ?? [];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-history-title"
        className="flex max-h-[80dvh] w-full max-w-md flex-col
          bg-white
          sm:rounded-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <h2 id="site-history-title" className="text-base font-medium text-black">
            {chrome.title}
          </h2>
          <button
            type="button"
            className="h-10 px-3 text-sm text-gray-800 rounded-lg hover:bg-gray-100"
            onClick={onClose}
          >
            {chrome.closeLabel}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm text-gray-500">{chrome.hint}</p>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-gray-800">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="mt-4 text-sm text-gray-500">{chrome.loadingMessage}</p>
          ) : null}
          {!loading && !error && items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">{chrome.emptyMessage}</p>
          ) : null}
          {items.length > 0 ? (
            <ul className="mt-4 flex flex-col">
              {items.map((item) => {
                const badges = describeVersionBadges(item);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 border-b border-gray-200 py-3"
                  >
                    <button
                      type="button"
                      disabled={busyHistoryId !== null}
                      className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left hover:bg-gray-100 disabled:cursor-not-allowed"
                      onClick={() => onOpenVersion(item.id)}
                    >
                      <span className="block text-sm text-gray-800">
                        {formatVersionCreatedAt(item.createdAt)}
                      </span>
                      {badges.length > 0 ? (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {badges.map((badge) => (
                            <span
                              key={badge}
                              className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                            >
                              {badge}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </button>
                    {item.isPublished ? null : (
                      <button
                        type="button"
                        disabled={busyHistoryId !== null}
                        className="h-10 shrink-0 px-3
                          text-sm text-gray-800
                          rounded-lg border border-gray-300
                          hover:bg-gray-100
                          disabled:cursor-not-allowed disabled:text-gray-400"
                        onClick={() => onPublishVersion(item.id)}
                      >
                        {publishingHistoryId === item.id
                          ? chrome.publishingLabel
                          : chrome.publishLabel}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
