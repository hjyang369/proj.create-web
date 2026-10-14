"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { EditPageChrome } from "../model/edit-page-layout";

export type SiteViewMode = "preview" | "edit" | "code";
export type PreviewViewport = "desktop" | "mobile";

type EditSitePreviewBarProps = {
  chrome: EditPageChrome;
  pagePath: string;
  pages: { pageOrder: number; label: string }[];
  onSelectPage: (pageOrder: number) => void;
  viewport: PreviewViewport;
  onChangeViewport: (viewport: PreviewViewport) => void;
  view: SiteViewMode;
  onChangeView: (view: SiteViewMode) => void;
  canStepBack: boolean;
  canStepForward: boolean;
  onStepBack: () => void;
  onStepForward: () => void;
  canRefresh: boolean;
  onRefresh: () => void;
  canOpenHistory: boolean;
  historyLocked: boolean;
  onOpenHistory: () => void;
  canRegenerate: boolean;
  regenerating: boolean;
  regenerateError: string | null;
  onRegenerate: () => void;
  canSave: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
};

const iconButtonClassName = `flex shrink-0 items-center justify-center
  h-8 w-8
  text-gray-700 rounded-lg
  hover:bg-gray-100
  disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent`;

const outlineButtonClassName = `flex shrink-0 items-center justify-center
  h-8 px-3
  text-sm whitespace-nowrap text-gray-800
  bg-white rounded-lg border border-gray-300
  hover:bg-gray-100
  disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white`;

const saveButtonClassName = `flex shrink-0 items-center justify-center
  h-8 px-3
  text-sm font-medium whitespace-nowrap text-white
  bg-black rounded-lg
  hover:bg-gray-900
  disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300`;

const iconClassName = "h-4 w-4";

function UndoIcon() {
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

function RedoIcon() {
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

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 12a8 8 0 0 1-14.9 4" />
      <path d="M4 12a8 8 0 0 1 14.9-4" />
      <path d="M18 4v4h-4" />
      <path d="M6 20v-4h4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MonitorIcon() {
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
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

function PhoneIcon() {
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
      <rect x="8" y="2" width="8" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function ViewportSwitch({
  groupLabel,
  desktopLabel,
  mobileLabel,
  viewport,
  onChangeViewport,
}: {
  groupLabel: string;
  desktopLabel: string;
  mobileLabel: string;
  viewport: PreviewViewport;
  onChangeViewport: (viewport: PreviewViewport) => void;
}) {
  const options: { id: PreviewViewport; label: string; icon: ReactNode }[] = [
    { id: "desktop", label: desktopLabel, icon: <MonitorIcon /> },
    { id: "mobile", label: mobileLabel, icon: <PhoneIcon /> },
  ];

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-gray-300 p-0.5"
    >
      {options.map((option) => {
        const active = viewport === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            title={option.label}
            className={`flex items-center justify-center
              h-7 w-7
              rounded-full
              ${
                active
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            onClick={() => onChangeViewport(option.id)}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

function GlobeIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function PencilIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CodeIcon() {
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
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
    </svg>
  );
}

const modeButtonClassName = `relative z-10 flex items-center justify-center
  h-8 px-2.5
  text-sm whitespace-nowrap text-gray-900`;

const modeMoveClassName = "transition-[left,width] duration-200 ease-out";

function ModeText({ active, children }: { active: boolean; children: string }) {
  return (
    <span
      className="grid"
      style={{
        gridTemplateColumns: active ? "1fr" : "0fr",
        opacity: active ? 1 : 0,
        transition: active
          ? "grid-template-columns 200ms ease-out, opacity 180ms ease-out 40ms"
          : "grid-template-columns 200ms ease-out, opacity 120ms ease-out",
      }}
    >
      <span className="overflow-hidden">
        <span className="block pl-1.5 whitespace-nowrap">{children}</span>
      </span>
    </span>
  );
}

function ModeSwitch({
  groupLabel,
  previewLabel,
  editLabel,
  codeLabel,
  view,
  onChangeView,
}: {
  groupLabel: string;
  previewLabel: string;
  editLabel: string;
  codeLabel: string;
  view: SiteViewMode;
  onChangeView: (view: SiteViewMode) => void;
}) {
  const modes: { id: SiteViewMode; label: string; icon: ReactNode }[] = [
    { id: "preview", label: previewLabel, icon: <GlobeIcon /> },
    { id: "edit", label: editLabel, icon: <PencilIcon /> },
    { id: "code", label: codeLabel, icon: <CodeIcon /> },
  ];
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const collapsedWidthRef = useRef(0);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const buttons = buttonRefs.current;
    const textWidths = textRefs.current.map((node) => node?.scrollWidth ?? 0);
    const activeIndex = (["preview", "edit", "code"] as const).indexOf(view);
    if (
      activeIndex < 0 ||
      buttons.length < 3 ||
      buttons.some((button) => button == null) ||
      textWidths.length < 3 ||
      textWidths.some((width) => width === 0)
    ) {
      return;
    }

    if (collapsedWidthRef.current === 0) {
      const sample = buttons.find((_, index) => index !== activeIndex);
      collapsedWidthRef.current = sample?.offsetWidth ?? 0;
    }

    const collapsed = collapsedWidthRef.current;
    const origin = buttons[0]?.offsetLeft ?? 0;
    setBar({
      left: origin + collapsed * activeIndex,
      width: collapsed + textWidths[activeIndex],
    });
    setAnimate(true);
  }, [view, previewLabel, editLabel, codeLabel]);

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="relative flex items-center rounded-full border border-gray-300 p-0.5"
    >
      {modes.map((mode, index) => (
        <span
          key={`${mode.id}-measure`}
          ref={(node) => {
            textRefs.current[index] = node;
          }}
          aria-hidden="true"
          className="pointer-events-none absolute pl-1.5 text-sm whitespace-nowrap opacity-0"
        >
          {mode.label}
        </span>
      ))}
      {bar ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute
            top-0.5 bottom-0.5
            rounded-full border border-gray-800 bg-white
            ${animate ? modeMoveClassName : ""}`}
          style={{ left: bar.left, width: bar.width }}
        />
      ) : null}
      {modes.map((mode, index) => (
        <button
          key={mode.id}
          ref={(node) => {
            buttonRefs.current[index] = node;
          }}
          type="button"
          aria-pressed={view === mode.id}
          aria-label={mode.label}
          className={modeButtonClassName}
          onClick={() => onChangeView(mode.id)}
        >
          {mode.icon}
          <ModeText active={view === mode.id}>{mode.label}</ModeText>
        </button>
      ))}
    </div>
  );
}

const pathButtonClassName = `flex shrink-0 items-center justify-center
  h-6 w-6
  text-gray-500 rounded-full
  hover:bg-gray-200 hover:text-gray-800
  disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent`;

function PagePathField({
  pagePath,
  pages,
  canRefresh,
  onRefresh,
  onSelectPage,
}: {
  pagePath: string;
  pages: { pageOrder: number; label: string }[];
  canRefresh: boolean;
  onRefresh: () => void;
  onSelectPage: (pageOrder: number) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const label = pagePath === "/" ? "home page" : pagePath;
  const canChoose = pages.length > 0;

  useEffect(() => {
    if (!open) return;

    function placeMenu() {
      const rect = fieldRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuBox({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (fieldRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    placeMenu();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  return (
    <div ref={fieldRef} className="relative w-full">
      <div
        className="flex items-center
          h-8 w-full gap-1 px-1
          bg-gray-50 rounded-full border border-gray-300"
      >
        <button
          type="button"
          aria-label="미리보기 새로고침"
          disabled={!canRefresh}
          className={pathButtonClassName}
          onClick={onRefresh}
        >
          <RefreshIcon />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm text-gray-800">
          {label}
        </p>
        <button
          type="button"
          aria-label="페이지 선택"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={!canChoose}
          className={pathButtonClassName}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDownIcon />
        </button>
      </div>
      {open && menuBox
        ? createPortal(
            <ul
              ref={menuRef}
              role="listbox"
              aria-label="페이지 선택"
              className="fixed z-30 max-h-60 overflow-y-auto
                bg-white py-1
                rounded-lg border border-gray-300"
              style={{
                top: menuBox.top,
                left: menuBox.left,
                width: menuBox.width,
              }}
            >
              {pages.map((page) => (
                <li key={page.pageOrder}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={page.label === label}
                    className={`flex w-full px-3 py-2
                      text-left text-sm text-gray-800
                      hover:bg-gray-100
                      ${page.label === label ? "bg-gray-100" : ""}`}
                    onClick={() => {
                      onSelectPage(page.pageOrder);
                      setOpen(false);
                    }}
                  >
                    {page.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

export function EditSitePreviewBar({
  chrome,
  pagePath,
  pages,
  onSelectPage,
  viewport,
  onChangeViewport,
  view,
  onChangeView,
  canStepBack,
  canStepForward,
  onStepBack,
  onStepForward,
  canRefresh,
  onRefresh,
  canOpenHistory,
  historyLocked,
  onOpenHistory,
  canRegenerate,
  regenerating,
  regenerateError,
  onRegenerate,
  canSave,
  saving,
  saveError,
  onSave,
}: EditSitePreviewBarProps) {
  const notice = saveError ?? regenerateError;

  return (
    <div className="shrink-0">
      <div className="flex h-14 items-center gap-2 overflow-x-auto px-3">
        <div className="flex shrink-0 items-center gap-1">
          <ModeSwitch
            groupLabel={chrome.mode.groupLabel}
            previewLabel={chrome.mode.previewLabel}
            editLabel={chrome.mode.editLabel}
            codeLabel={chrome.mode.codeLabel}
            view={view}
            onChangeView={onChangeView}
          />
          <button
            type="button"
            aria-label={chrome.undo.backLabel}
            disabled={!canStepBack}
            className={iconButtonClassName}
            onClick={onStepBack}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            aria-label={chrome.undo.forwardLabel}
            disabled={!canStepForward}
            className={iconButtonClassName}
            onClick={onStepForward}
          >
            <RedoIcon />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
          <ViewportSwitch
            groupLabel={chrome.viewport.groupLabel}
            desktopLabel={chrome.viewport.desktopLabel}
            mobileLabel={chrome.viewport.mobileLabel}
            viewport={viewport}
            onChangeViewport={onChangeViewport}
          />
          <div className="w-full min-w-40 max-w-sm">
            <PagePathField
              pagePath={pagePath}
              pages={pages}
              canRefresh={canRefresh}
              onRefresh={onRefresh}
              onSelectPage={onSelectPage}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={outlineButtonClassName}
            disabled={historyLocked || !canOpenHistory}
            onClick={onOpenHistory}
          >
            {chrome.history.label}
          </button>
          <button
            type="button"
            className={outlineButtonClassName}
            disabled={!canRegenerate || regenerating}
            onClick={onRegenerate}
          >
            {regenerating
              ? chrome.regenerate.pendingLabel
              : chrome.regenerate.label}
          </button>
          <button
            type="button"
            className={saveButtonClassName}
            disabled={!canSave}
            onClick={onSave}
          >
            {saving ? "저장 중..." : chrome.save.label}
          </button>
        </div>
      </div>
      {notice ? (
        <p role="alert" className="px-4 py-2 text-sm text-gray-800">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
