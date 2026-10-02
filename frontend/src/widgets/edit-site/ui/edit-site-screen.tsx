"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/features/auth";
import {
  buildEditablePreviewDocument,
  editSiteComponent,
  getMySite,
  regenerateSiteDraft,
  updateSiteImages,
  updateSiteInputs,
  uploadSiteImage,
  type SiteEditorDetail,
  type SiteEditorPage,
} from "@/entities/site";
import { CreateSiteForm, type SiteFormSubmit } from "@/features/create-site";
import { API_URL } from "@/shared/api";
import {
  describeEditPageChrome,
  initialSidebarOpen,
} from "../model/edit-page-layout";
import { shouldReplaceSiteImages } from "../model/should-replace-site-images";

type PreviewState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "error"; message: string }
  | { kind: "ready"; site: SiteEditorDetail };

type SelectedComponent = {
  pageOrder: number;
  sectionIndex: number;
  tagName: string;
  preview: string;
  elementHtml: string;
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
  hover:bg-gray-900`;

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
  const [regenerating, setRegenerating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<SelectedComponent | null>(null);
  const [editRequest, setEditRequest] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

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

  // iframe 내 클릭 이벤트 수신
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        typeof event.data === "object" &&
        event.data !== null &&
        event.data.type === "crep-click"
      ) {
        const { pageOrder, sectionIndex, tagName, preview: text, elementHtml } =
          event.data as {
            pageOrder: number;
            sectionIndex: number;
            tagName: string;
            preview: string;
            elementHtml: string;
          };
        setSelectedComponent({ pageOrder, sectionIndex, tagName, preview: text, elementHtml });
        setEditRequest("");
        setEditError(null);
        setUploadedImageUrl(null);
        setSidebarOpen(true);
        setTimeout(() => editInputRef.current?.focus(), 50);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function handleImageUpload(file: File) {
    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) return;

    setImageUploading(true);
    setEditError(null);
    try {
      const result = await uploadSiteImage(id, file);
      setUploadedImageUrl(result.url);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
      setEditError(message);
    } finally {
      setImageUploading(false);
    }
  }

  async function submitEditRequest() {
    if (
      preview.kind !== "ready" ||
      !selectedComponent ||
      !editRequest.trim() ||
      editLoading
    ) {
      return;
    }

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const updatedPage = await editSiteComponent(id, {
        pageOrder: selectedComponent.pageOrder,
        sectionIndex: selectedComponent.sectionIndex,
        elementHtml: selectedComponent.elementHtml,
        imageUrl: uploadedImageUrl ?? undefined,
        request: editRequest.trim(),
      });

      // 미리보기 상태의 해당 페이지를 교체
      const updatedPages: typeof preview.site.pages = preview.site.pages.map(
        (p) => (p.pageOrder === updatedPage.pageOrder ? (updatedPage as SiteEditorPage) : p),
      );
      setPreview({ kind: "ready", site: { ...preview.site, pages: updatedPages } });
      setEditRequest("");
      setUploadedImageUrl(null);
      setSelectedComponent(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "컴포넌트를 수정하지 못했습니다.";
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  }

  function openRegenerateForm() {
    if (preview.kind !== "ready" || regenerating || !preview.site.inputs) {
      return;
    }

    setRegenerateError(null);
    setFormOpen(true);
  }

  async function submitRegenerateForm(submission: SiteFormSubmit) {
    if (preview.kind !== "ready" || !preview.site.inputs || regenerating) {
      return;
    }

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) {
      return;
    }

    const inputs = preview.site.inputs;
    setRegenerating(true);
    setRegenerateError(null);

    try {
      await updateSiteInputs(id, submission.values);
      if (
        shouldReplaceSiteImages(
          {
            logoUrl: inputs.logo?.url ?? null,
            photoUrls: inputs.photos.map((photo) => photo.url),
          },
          {
            hasNewLogo: submission.logoFile != null,
            keepExistingLogo: submission.keepExistingLogo,
            newPhotoCount: submission.photoFiles.length,
            keptPhotoUrls: submission.keptPhotoUrls,
          },
        )
      ) {
        await updateSiteImages(id, {
          keepExistingLogo: submission.keepExistingLogo,
          keptPhotoUrls: submission.keptPhotoUrls,
          logoFile: submission.logoFile,
          photoFiles: submission.photoFiles,
        });
      }
      const site = await regenerateSiteDraft(id);
      setPreview({ kind: "ready", site });
      setFormOpen(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "초안을 다시 만들지 못했습니다.";
      setRegenerateError(message);
    } finally {
      setRegenerating(false);
    }
  }

  const sidebarToggle = (
    <button
      type="button"
      aria-expanded={sidebarOpen}
      aria-label={
        sidebarOpen ? chrome.sidebar.collapseLabel : chrome.sidebar.expandLabel
      }
      className={iconButtonClassName}
      onClick={() => setSidebarOpen((open) => !open)}
    >
      <SidebarIcon open={sidebarOpen} />
    </button>
  );

  return (
    <div className="relative flex h-dvh min-h-0 flex-col bg-white lg:flex-row">
      <section
        aria-label="사이트 미리보기"
        className="min-h-0 min-w-0 flex-1 bg-gray-50"
      >
        {preview.kind === "ready" && preview.site.pages.length > 0 ? (
          <iframe
            title={`${preview.site.name} 미리보기`}
            sandbox="allow-scripts"
            srcDoc={buildEditablePreviewDocument(preview.site.pages, API_URL)}
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
                {sidebarToggle}
                <button type="button" className={saveButtonClassName}>
                  {chrome.save.label}
                </button>
              </div>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-medium text-black">
                {chrome.sidebar.title}
              </h2>
            </div>
            <div className="border-b border-gray-200 px-4 py-4">
              <button
                type="button"
                disabled={
                  preview.kind !== "ready" ||
                  !preview.site.inputs ||
                  regenerating
                }
                className={regenerateButtonClassName}
                onClick={openRegenerateForm}
              >
                {regenerating
                  ? chrome.regenerate.pendingLabel
                  : chrome.regenerate.label}
              </button>
              {regenerateError ? (
                <p className="mt-3 text-sm text-gray-800">{regenerateError}</p>
              ) : null}
            </div>
            {selectedComponent ? (
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
                    onChange={(e) => setEditRequest(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        void submitEditRequest();
                      }
                    }}
                    disabled={editLoading}
                    placeholder="수정 요청을 입력하세요. (예: 배경을 어둡게 해줘)"
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  {editError ? (
                    <p className="text-xs text-gray-800">{editError}</p>
                  ) : null}
                  {/* 업로드된 이미지 썸네일 */}
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
                        onClick={() => setUploadedImageUrl(null)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="이미지 제거"
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l10 10M13 3L3 13"/></svg>
                      </button>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    {/* 숨겨진 파일 입력 */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImageUpload(file);
                        e.target.value = "";
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
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 10" /></svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={!editRequest.trim() || editLoading || imageUploading}
                      onClick={() => void submitEditRequest()}
                      className="flex-1 flex items-center justify-center h-9 rounded-lg bg-black text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {editLoading ? "수정 중..." : "AI로 수정"}
                    </button>
                    <button
                      type="button"
                      disabled={editLoading || imageUploading}
                      onClick={() => {
                        setSelectedComponent(null);
                        setEditRequest("");
                        setEditError(null);
                        setUploadedImageUrl(null);
                      }}
                      className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="px-4 py-4 text-sm text-gray-500">
                {chrome.sidebar.emptyMessage}
              </p>
            )}
          </div>
        </aside>
      ) : (
        <div className="absolute top-4 right-4">{sidebarToggle}</div>
      )}
      {formOpen && preview.kind === "ready" && preview.site.inputs ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="regenerate-inputs-title"
            className="flex h-dvh w-full max-w-5xl flex-col bg-white sm:h-[min(90dvh,920px)] sm:rounded-xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <h2
                id="regenerate-inputs-title"
                className="text-base font-medium text-black"
              >
                {chrome.regenerate.modalTitle}
              </h2>
              <button
                type="button"
                disabled={regenerating}
                className="h-10 px-3 text-sm text-gray-800 rounded-lg hover:bg-gray-100 disabled:text-gray-400"
                onClick={() => setFormOpen(false)}
              >
                {chrome.regenerate.closeLabel}
              </button>
            </div>
            {regenerateError ? (
              <p role="alert" className="px-6 pt-4 text-sm text-gray-800">
                {regenerateError}
              </p>
            ) : null}
            <CreateSiteForm
              key={preview.site.id}
              embedded
              initialValues={preview.site.inputs}
              initialLogo={preview.site.inputs.logo}
              initialPhotos={preview.site.inputs.photos}
              submitLabel={chrome.regenerate.submitLabel}
              pendingLabel={chrome.regenerate.pendingLabel}
              pendingMessage={chrome.regenerate.pendingMessage}
              onSubmitForm={submitRegenerateForm}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
