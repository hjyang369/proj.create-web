"use client";

import { useEffect, useRef } from "react";
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
  onChangeEditing: (editing: boolean) => void;
  canRegenerate: boolean;
  regenerating: boolean;
  regenerateError: string | null;
  onRegenerate: () => void;
  selectedComponent: SelectedComponent | null;
  editRequest: string;
  onEditRequestChange: (value: string) => void;
  onSubmitEdit: () => void;
  editLoading: boolean;
  editError: string | null;
  uploadedImageUrl: string | null;
  imageUploading: boolean;
  onImageFile: (file: File) => void;
  onClearImage: () => void;
  onCancelSelection: () => void;
  onHistoryBack: () => void;
  onHistoryForward: () => void;
  canSave: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
};

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
  hover:bg-gray-900
  disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300`;

const regenerateButtonClassName = `flex items-center justify-center
  h-10 w-full px-4
  text-sm font-medium text-gray-800
  bg-white rounded-lg border border-gray-300
  hover:bg-gray-100
  disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white`;

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

export function EditSiteAside({
  open,
  chrome,
  onToggle,
  editing,
  onChangeEditing,
  canRegenerate,
  regenerating,
  regenerateError,
  onRegenerate,
  selectedComponent,
  editRequest,
  onEditRequestChange,
  onSubmitEdit,
  editLoading,
  editError,
  uploadedImageUrl,
  imageUploading,
  onImageFile,
  onClearImage,
  onCancelSelection,
  onHistoryBack,
  onHistoryForward,
  canSave,
  saving,
  saveError,
  onSave,
}: EditSiteAsideProps) {
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedComponent) {
      return;
    }

    const timer = window.setTimeout(() => editInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [selectedComponent]);

  const sidebarToggle = (
    <button
      type="button"
      aria-expanded={open}
      aria-label={
        open ? chrome.sidebar.collapseLabel : chrome.sidebar.expandLabel
      }
      className={iconButtonClassName}
      onClick={onToggle}
    >
      <SidebarIcon open={open} />
    </button>
  );

  if (!open) {
    return <div className="absolute top-4 right-4">{sidebarToggle}</div>;
  }

  return (
    <aside
      className="flex shrink-0 flex-col
        w-full max-h-72
        border-t border-gray-200 bg-gray-50
        lg:w-80 lg:max-h-none lg:border-l lg:border-t-0"
    >
      {chrome.controls === "sidebar" ? (
        <div
          className="flex shrink-0 items-center justify-between
            gap-2 overflow-x-auto px-3 py-3
            border-b border-gray-200"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={chrome.history.back.label}
              disabled={!chrome.history.back.enabled}
              className={iconButtonClassName}
              onClick={onHistoryBack}
            >
              <BackIcon />
            </button>
            <button
              type="button"
              aria-label={chrome.history.forward.label}
              disabled={!chrome.history.forward.enabled}
              className={iconButtonClassName}
              onClick={onHistoryForward}
            >
              <ForwardIcon />
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sidebarToggle}
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
      ) : null}
      {saveError ? (
        <p role="alert" className="px-4 py-2 text-sm text-gray-800">
          {saveError}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-black">
              {chrome.mode.editLabel}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {editing ? chrome.mode.editHint : chrome.mode.previewHint}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={editing}
            aria-label={chrome.mode.groupLabel}
            className={`relative shrink-0
              h-6 w-11 rounded-full
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black
              ${editing ? "bg-black" : "bg-gray-300"}`}
            onClick={() => onChangeEditing(!editing)}
          >
            <span
              aria-hidden="true"
              className={`absolute top-0.5 left-0.5
                h-5 w-5 rounded-full bg-white transition-transform
                ${editing ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
        <div className="border-b border-gray-200 px-4 py-4">
          <button
            type="button"
            disabled={!canRegenerate || regenerating}
            className={regenerateButtonClassName}
            onClick={onRegenerate}
          >
            {regenerating
              ? chrome.regenerate.pendingLabel
              : chrome.regenerate.label}
          </button>
          {regenerateError ? (
            <p className="mt-3 text-sm text-gray-800">{regenerateError}</p>
          ) : null}
        </div>
        {editing && selectedComponent ? (
          <div className="border-b border-gray-200 px-4 py-4 flex flex-col gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                선택된 요소
              </p>
              <p className="text-xs text-gray-800 font-mono bg-gray-100 rounded px-2 py-1">
                &lt;{selectedComponent.tagName}&gt;
              </p>
              {selectedComponent.preview ? (
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {selectedComponent.preview}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <textarea
                ref={editInputRef}
                rows={3}
                value={editRequest}
                onChange={(event) => onEditRequestChange(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    onSubmitEdit();
                  }
                }}
                disabled={editLoading}
                placeholder="수정 요청을 입력하세요. (예: 배경을 어둡게 해줘)"
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
              {editError ? (
                <p className="text-xs text-gray-800">{editError}</p>
              ) : null}
              {uploadedImageUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <img
                    src={uploadedImageUrl}
                    alt="업로드 이미지"
                    className="h-8 w-8 rounded object-cover border border-gray-200"
                  />
                  <span className="flex-1 truncate text-xs text-gray-600">
                    이미지 준비됨
                  </span>
                  <button
                    type="button"
                    onClick={onClearImage}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="이미지 제거"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M3 3l10 10M13 3L3 13" />
                    </svg>
                  </button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onImageFile(file);
                    }
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={imageUploading || editLoading}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                  aria-label="이미지 업로드"
                  title="이미지 업로드"
                >
                  {imageUploading ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="30 10"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  disabled={
                    !editRequest.trim() || editLoading || imageUploading
                  }
                  onClick={onSubmitEdit}
                  className="flex-1 flex items-center justify-center h-9 rounded-lg bg-black text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {editLoading ? "수정 중..." : "AI로 수정"}
                </button>
                <button
                  type="button"
                  disabled={editLoading || imageUploading}
                  onClick={onCancelSelection}
                  className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="px-4 py-4 text-sm text-gray-500">
            {editing ? chrome.sidebar.emptyMessage : chrome.mode.previewMessage}
          </p>
        )}
      </div>
    </aside>
  );
}
