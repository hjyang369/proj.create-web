"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { EditPageChrome } from "../model/edit-page-layout";
import { editLogInChatOrder } from "../model/edit-log-chat";

export type EditLogEntry = {
  /** 서버에 저장된 대화면 그 id */
  id?: number;
  /** 대응하는 siteHistory 인덱스. -1이면 이번 화면에서 미리보기로 돌아갈 수 없다. */
  historyIndex: number;
  type: "ai-edit" | "regenerate";
  /** AI 요청 문장 또는 고정 문구 */
  label: string;
  /** ai-edit일 때만 — 어느 페이지인지 */
  pageOrder?: number;
  createdAt: Date;
};

type EditSiteChatPanelProps = {
  chrome: EditPageChrome;
  siteName: string | null;
  /** AI 수정 내역 목록 (최신이 앞) */
  editLog: EditLogEntry[];
  currentHistoryIndex: number;
  historyLocked: boolean;
  onEditLogJump: (entry: EditLogEntry) => void;
  editLoading: boolean;
  regenerating: boolean;
  editRequest: string;
  onEditRequestChange: (value: string) => void;
  onSubmitEdit: () => void;
  /** 요소를 고른 편집 중일 때만 보낼 수 있다 */
  canSend: boolean;
  editError: string | null;
  /** 좌클릭으로 고른 요소. 없으면 입력창만 보인다. */
  selectedComponent: { tagName: string; preview: string } | null;
  uploadedImageUrl: string | null;
  imageUploading: boolean;
  onImageFile: (file: File) => void;
  onClearImage: () => void;
  onCancelSelection: () => void;
};

function formatEntryTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PendingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-25"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function previewButtonClassName(active: boolean): string {
  return `flex items-center justify-center
    h-9 px-4
    text-sm rounded-lg border
    disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white
    ${
      active
        ? "border-gray-200 bg-gray-200 text-gray-900"
        : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
    }`;
}

export function EditSiteChatPanel({
  chrome,
  siteName,
  editLog,
  currentHistoryIndex,
  historyLocked,
  onEditLogJump,
  editLoading,
  regenerating,
  editRequest,
  onEditRequestChange,
  onSubmitEdit,
  canSend,
  editError,
  selectedComponent,
  uploadedImageUrl,
  imageUploading,
  onImageFile,
  onClearImage,
  onCancelSelection,
}: EditSiteChatPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pending = editLoading || regenerating;
  const pendingText = editLoading
    ? editRequest.trim()
    : chrome.editLog.regenerateLabel;
  const turns = editLogInChatOrder(editLog);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    list.scrollTop = list.scrollHeight;
  }, [editLog, editLoading, regenerating]);

  useEffect(() => {
    if (!selectedComponent) {
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [selectedComponent]);

  return (
    <section
      aria-label={chrome.editLog.title}
      className="hidden min-h-0 w-96 shrink-0 flex-col lg:flex"
    >
      <div className="flex h-14 shrink-0 items-center gap-1 px-4">
        <Link
          href="/"
          aria-label="홈으로"
          className="flex shrink-0 items-center justify-center
            h-8 w-8
            text-black rounded-lg
            hover:bg-gray-100"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <p className="min-w-0 truncate text-sm font-medium text-black">
          {siteName ?? chrome.editLog.title}
        </p>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {turns.length === 0 && !pending ? (
          <div>
            <p className="text-sm text-gray-500">
              {chrome.editLog.emptyMessage}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm text-gray-400">
              {chrome.sidebar.emptyMessage}
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-6">
            {turns.map((entry) => {
              const isActive = entry.historyIndex === currentHistoryIndex;
              return (
                <li
                  key={
                    entry.id != null
                      ? `chat-${entry.id}`
                      : `local-${entry.historyIndex}`
                  }
                  className="flex flex-col gap-2"
                >
                  <p
                    className="rounded-xl rounded-br-sm border border-gray-200
                      px-4 py-3
                      text-sm break-words text-gray-900
                      bg-white"
                  >
                    {entry.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={historyLocked || entry.historyIndex < 0}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => onEditLogJump(entry)}
                      className={previewButtonClassName(isActive)}
                    >
                      {chrome.editLog.previewLabel}
                    </button>
                    <p className="ml-auto text-xs text-gray-400">
                      {formatEntryTime(entry.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
            {pending ? (
              <li className="flex flex-col gap-2">
                {pendingText ? (
                  <p
                    className="rounded-xl rounded-bl-sm border border-gray-200 
                      px-4 py-3
                      text-sm break-words text-gray-900
                      bg-white"
                  >
                    {pendingText}
                  </p>
                ) : null}
                <div className="flex items-center gap-2 px-1">
                  <span className="shrink-0 text-gray-500">
                    <PendingIcon />
                  </span>
                  <p className="text-sm text-gray-800">
                    {chrome.editLog.pendingLabel}
                  </p>
                </div>
              </li>
            ) : null}
          </ol>
        )}
      </div>
      <form
        className="shrink-0 px-3 pb-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitEdit();
        }}
      >
        <div className="rounded-xl border border-gray-300 bg-white p-2">
          {selectedComponent ? (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-1.5">
              <p className="min-w-0 flex-1 truncate text-xs text-gray-800">
                &lt;{selectedComponent.tagName}&gt;
                {selectedComponent.preview
                  ? ` · ${selectedComponent.preview}`
                  : ""}
              </p>
              <button
                type="button"
                disabled={pending || imageUploading}
                onClick={onCancelSelection}
                className="shrink-0 text-xs text-gray-500 hover:text-gray-800 disabled:text-gray-300"
              >
                취소
              </button>
            </div>
          ) : null}
          {editError ? (
            <p role="alert" className="mb-2 px-1 text-xs text-gray-800">
              {editError}
            </p>
          ) : null}
          {uploadedImageUrl ? (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5">
              <img
                src={uploadedImageUrl}
                alt="업로드 이미지"
                className="h-8 w-8 rounded border border-gray-200 object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-gray-600">
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
          <div className="flex items-end gap-1">
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
              disabled={!selectedComponent || imageUploading || pending}
              onClick={() => imageInputRef.current?.click()}
              className="flex shrink-0 items-center justify-center
                h-8 w-8
                text-gray-700 rounded-lg
                hover:bg-gray-100
                disabled:cursor-not-allowed disabled:text-gray-300"
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
                  <path d="M12 5v14M5 12h14" />
                </svg>
              )}
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={editRequest}
              onChange={(event) => onEditRequestChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmitEdit();
                }
              }}
              disabled={pending}
              placeholder={chrome.editLog.inputPlaceholder}
              className="min-w-0 flex-1 resize-none
                px-2 py-1.5
                text-sm text-gray-900
                bg-transparent
                placeholder:text-gray-400
                focus:outline-none
                disabled:text-gray-400"
            />
            <button
              type="submit"
              aria-label={chrome.editLog.submitLabel}
              disabled={pending || !canSend || !editRequest.trim()}
              className="flex shrink-0 items-center justify-center
                h-8 w-8
                text-white
                bg-black rounded-lg
                hover:bg-gray-900
                disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5" />
                <path d="m6 11 6-6 6 6" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
