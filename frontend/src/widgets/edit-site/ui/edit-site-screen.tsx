"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/features/auth";
import {
  buildSitePreviewDocument,
  getMySite,
  type SiteEditorDetail,
} from "@/entities/site";
import { API_URL } from "@/shared/api";
import {
  describeEditPageChrome,
  initialSidebarOpen,
} from "../model/edit-page-layout";

type PreviewState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "error"; message: string }
  | { kind: "ready"; site: SiteEditorDetail };

const iconButtonClassName = `flex shrink-0 items-center justify-center
  h-10 w-10
  text-gray-800
  bg-white rounded-lg border border-gray-300
  hover:bg-gray-100
  disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white`;

const saveButtonClassName = `flex shrink-0 items-center justify-center
  h-10 px-4
  text-sm font-medium whitespace-nowrap text-white
  bg-black rounded-lg
  hover:bg-gray-900`;

const iconClassName = "h-5 w-5";

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={iconClassName}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={iconClassName}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0-5.5 5.5 5.5 5.5 0 0 0 5.5 5.5H13" />
    </svg>
  );
}

function SidebarIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={iconClassName}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
      {open ? <path d="m11 9-3 3 3 3" /> : <path d="m8 9 3 3-3 3" />}
    </svg>
  );
}

function previewMessage(preview: PreviewState): string {
  if (preview.kind === "guest") {
    return "로그인하면 사이트를 편집할 수 있습니다.";
  }

  if (preview.kind === "error") {
    return preview.message;
  }

  if (preview.kind === "ready") {
    return "아직 미리볼 페이지가 없습니다.";
  }

  return "사이트를 불러오는 중입니다.";
}

export function EditSiteScreen({ siteId }: { siteId: string }) {
  const chrome = describeEditPageChrome();
  const { ready, user } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ kind: "loading" });

  useEffect(() => {
    setSidebarOpen(
      initialSidebarOpen(window.matchMedia("(min-width: 1024px)").matches),
    );
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      setPreview({ kind: "guest" });
      return;
    }

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) {
      setPreview({ kind: "error", message: "사이트를 찾을 수 없습니다." });
      return;
    }

    let cancelled = false;
    setPreview({ kind: "loading" });

    getMySite(id)
      .then((site) => {
        if (!cancelled) {
          setPreview({ kind: "ready", site });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "사이트를 불러오지 못했습니다.";
        setPreview({ kind: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, siteId]);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-white">
      <header
        className="flex shrink-0 items-center justify-between
          h-14
          gap-3 overflow-x-auto px-4
          border-b border-gray-200
          sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={chrome.history.back.label}
            disabled={!chrome.history.back.enabled}
            className={iconButtonClassName}
          >
            <BackIcon />
          </button>
          <button
            type="button"
            aria-label={chrome.history.forward.label}
            disabled={!chrome.history.forward.enabled}
            className={iconButtonClassName}
          >
            <ForwardIcon />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-expanded={sidebarOpen}
            aria-label={
              sidebarOpen
                ? chrome.sidebar.collapseLabel
                : chrome.sidebar.expandLabel
            }
            className={iconButtonClassName}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <SidebarIcon open={sidebarOpen} />
          </button>
          <button type="button" className={saveButtonClassName}>
            {chrome.save.label}
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          aria-label="사이트 미리보기"
          className="min-h-0 min-w-0 flex-1 bg-gray-50"
        >
          {preview.kind === "ready" && preview.site.pages.length > 0 ? (
            <iframe
              title={`${preview.site.name} 미리보기`}
              sandbox=""
              srcDoc={buildSitePreviewDocument(preview.site.pages, API_URL)}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <p className="text-center text-sm text-gray-500">
                {previewMessage(preview)}
              </p>
            </div>
          )}
        </section>
        {sidebarOpen ? (
          <aside
            className="flex shrink-0 flex-col
              w-full max-h-64
              border-t border-gray-200 bg-gray-50
              lg:w-80 lg:max-h-none lg:border-l lg:border-t-0"
          >
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-medium text-black">
                {chrome.sidebar.title}
              </h2>
            </div>
            <p className="px-4 py-4 text-sm text-gray-500">
              {chrome.sidebar.emptyMessage}
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
