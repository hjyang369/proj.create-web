"use client";

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

export function EditSiteChatPanel({
  chrome,
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
      className="hidden min-h-0 w-80 shrink-0 flex-col
        border-r border-gray-200 bg-gray-50
        lg:flex"
    >
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <p className="text-sm font-medium text-black">{chrome.editLog.title}</p>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {turns.length === 0 && !pending ? (
          <p className="text-sm text-gray-500">{chrome.editLog.emptyMessage}</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {turns.map((entry) => {
              const isActive = entry.historyIndex === currentHistoryIndex;
              const cardTitle =
                entry.type === "regenerate"
                  ? chrome.editLog.regenerateLabel
                  : entry.label;
              return (
                <li
                  key={
                    entry.id != null
                      ? `chat-${entry.id}`
                      : `local-${entry.historyIndex}`
                  }
                  className="flex flex-col gap-2"
                >
                  <div className="flex justify-end">
                    <p
                      className="max-w-[85%] rounded-xl  rounded-br-sm
                        px-4 py-3
                        text-sm break-words text-gray-900
                        bg-white border border-gray-200"
                    >
                      {entry.label}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl rounded-bl-sm border p-4 
                      ${isActive ? "border-gray-200 bg-gray-100" : "border-gray-200 bg-white"}`}
                  >
                    <p className="text-sm font-medium break-words text-black">
                      {cardTitle}
                    </p>
                    <button
                      type="button"
                      disabled={historyLocked || entry.historyIndex < 0}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => onEditLogJump(entry)}
                      className="flex items-center justify-center
                        mt-3 h-9 w-full px-4
                        text-sm text-gray-800
                        bg-white rounded-lg border border-gray-300
                        hover:bg-gray-100
                        disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white"
                    >
                      {chrome.editLog.previewLabel}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatEntryTime(entry.createdAt)}
                  </p>
                </li>
              );
            })}
            {pending ? (
              <li className="flex flex-col gap-2">
                {pendingText ? (
                  <div className="flex justify-end">
                    <p
                      className="max-w-[85%] rounded-xl
                        px-4 py-3
                        text-sm break-words text-gray-900
                        bg-white border border-gray-200"
                    >
                      {pendingText}
                    </p>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4">
                  <span className="shrink-0 text-gray-500">
                    <PendingIcon />
                  </span>
                  <p className="text-sm font-medium text-black">
                    {chrome.editLog.pendingLabel}
                  </p>
                </div>
              </li>
            ) : null}
          </ol>
        )}
      </div>
      <form
        className="shrink-0 border-t border-gray-200 bg-white px-3 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitEdit();
        }}
      >
        {selectedComponent ? (
          <div className="mb-2">
            <p className="mb-1 text-xs font-medium text-gray-500">
              선택된 요소
            </p>
            <p className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800">
              &lt;{selectedComponent.tagName}&gt;
            </p>
            {selectedComponent.preview ? (
              <p className="mt-1 truncate text-xs text-gray-500">
                {selectedComponent.preview}
              </p>
            ) : null}
          </div>
        ) : null}
        {editError ? (
          <p role="alert" className="mb-2 text-xs text-gray-800">
            {editError}
          </p>
        ) : null}
        {uploadedImageUrl ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
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
        <div className="flex items-end gap-2">
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
            className="flex h-10 shrink-0 items-center justify-center
              px-3
              text-sm text-gray-700
              rounded-lg border border-gray-300
              hover:bg-gray-100
              disabled:cursor-not-allowed disabled:text-gray-400"
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
          <textarea
            ref={inputRef}
            rows={2}
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
            className="min-w-0 flex-1 resize-none rounded-lg
              px-3 py-2
              text-sm text-gray-900
              bg-white border border-gray-300
              placeholder:text-gray-400
              focus:border-gray-500 focus:outline-none
              disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={pending || !canSend || !editRequest.trim()}
            className="flex shrink-0 items-center justify-center
              h-10 px-3
              text-sm font-medium text-white
              bg-black rounded-lg
              hover:bg-gray-900
              disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
          >
            {chrome.editLog.submitLabel}
          </button>
          {selectedComponent ? (
            <button
              type="button"
              disabled={pending || imageUploading}
              onClick={onCancelSelection}
              className="flex h-10 shrink-0 items-center justify-center
                px-3
                text-sm text-gray-700
                rounded-lg border border-gray-300
                hover:bg-gray-100
                disabled:text-gray-400"
            >
              취소
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
