"use client";

import type { ReactNode } from "react";
import type { EditPageChrome } from "../model/edit-page-layout";

export type SelectedComponent = {
  pageOrder: number;
  sectionIndex: number;
  innerSectionIndex: number; // -1이면 outer 섹션 직접 수정
  tagName: string;
  preview: string;
  elementHtml: string;
};

type EditSiteAsideProps = {
  open: boolean;
  chrome: EditPageChrome;
  onToggle: () => void;
  editing: boolean;
  /** 우클릭 직접 편집 패널. 있으면 안내 문구 대신 보여준다. */
  manualPanel: ReactNode;
};

const iconClassName = "h-5 w-5";

function SidebarIcon({
  open,
  className = iconClassName,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
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

export function EditSiteAside({
  open,
  chrome,
  onToggle,
  editing,
  manualPanel,
}: EditSiteAsideProps) {
  const edgeToggle = (
    <button
      type="button"
      aria-expanded={open}
      aria-label={
        open ? chrome.sidebar.collapseLabel : chrome.sidebar.expandLabel
      }
      onClick={onToggle}
      className={
        open
          ? `absolute z-30 flex items-center justify-center
              top-0 left-1/2 h-5 w-6 -translate-x-1/2 -translate-y-full
              text-gray-600
              bg-white border border-b-0 border-gray-300 rounded-t-md
              hover:bg-gray-100
              lg:top-1/2 lg:left-0 lg:h-6 lg:w-5
              lg:-translate-x-full lg:-translate-y-1/2
              lg:rounded-t-none lg:rounded-l-md lg:border-b lg:border-r-0`
          : `fixed z-30 flex items-center justify-center
              bottom-0 left-1/2 h-5 w-6 -translate-x-1/2
              text-gray-600
              bg-white border border-b-0 border-gray-300 rounded-t-md
              hover:bg-gray-100
              lg:top-1/2 lg:right-0 lg:bottom-auto lg:left-auto lg:h-6 lg:w-5
              lg:translate-x-0 lg:-translate-y-1/2
              lg:rounded-t-none lg:rounded-l-md lg:border-b lg:border-r-0`
      }
    >
      <SidebarIcon open={open} className="h-3 w-3" />
    </button>
  );

  if (!open) {
    return edgeToggle;
  }

  return (
    <aside
      className="relative flex shrink-0 flex-col
        w-full max-h-72
        border-t border-gray-200 bg-white
        lg:w-80 lg:max-h-none lg:border-l lg:border-t-0"
    >
      {edgeToggle}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {editing && manualPanel ? (
          manualPanel
        ) : (
          <p className="whitespace-pre-line px-4 py-4 text-sm text-gray-500">
            {editing ? chrome.sidebar.emptyMessage : chrome.mode.previewMessage}
          </p>
        )}
      </div>
    </aside>
  );
}
