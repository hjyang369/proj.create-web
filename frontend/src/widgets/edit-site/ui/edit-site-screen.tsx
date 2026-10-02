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
import { EditSiteAside, type SelectedComponent } from "./edit-site-aside";

type PreviewState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "error"; message: string }
  | { kind: "ready"; site: SiteEditorDetail };

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
  const [editing, setEditing] = useState(true);
  const editingRef = useRef(true);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<SelectedComponent | null>(null);
  const [editRequest, setEditRequest] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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
        if (!editingRef.current) {
          return;
        }
        setSelectedComponent({ pageOrder, sectionIndex, tagName, preview: text, elementHtml });
        setEditRequest("");
        setEditError(null);
        setUploadedImageUrl(null);
        setSidebarOpen(true);
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

  function postPreviewMode(nextEditing: boolean) {
    previewFrameRef.current?.contentWindow?.postMessage(
      { type: "crep-set-mode", editing: nextEditing },
      "*",
    );
  }

  function changePreviewMode(nextEditing: boolean) {
    editingRef.current = nextEditing;
    setEditing(nextEditing);
    if (!nextEditing) {
      setSelectedComponent(null);
      setEditRequest("");
      setEditError(null);
      setUploadedImageUrl(null);
    }
    postPreviewMode(nextEditing);
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

  return (
    <div className="relative flex h-dvh min-h-0 flex-col bg-white lg:flex-row">
      <section
        aria-label="사이트 미리보기"
        className="min-h-0 min-w-0 flex-1 bg-gray-50"
      >
        {preview.kind === "ready" && preview.site.pages.length > 0 ? (
          <iframe
            ref={previewFrameRef}
            title={`${preview.site.name} 미리보기`}
            sandbox="allow-scripts"
            srcDoc={buildEditablePreviewDocument(preview.site.pages, API_URL)}
            className="h-full w-full border-0 bg-white"
            onLoad={() => postPreviewMode(editingRef.current)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-center text-sm text-gray-500">
              {previewMessage(preview)}
            </p>
          </div>
        )}
      </section>
      <EditSiteAside
        open={sidebarOpen}
        chrome={chrome}
        onToggle={() => setSidebarOpen((open) => !open)}
        editing={editing}
        onChangeEditing={changePreviewMode}
        canRegenerate={preview.kind === "ready" && preview.site.inputs != null}
        regenerating={regenerating}
        regenerateError={regenerateError}
        onRegenerate={openRegenerateForm}
        selectedComponent={selectedComponent}
        editRequest={editRequest}
        onEditRequestChange={setEditRequest}
        onSubmitEdit={() => void submitEditRequest()}
        editLoading={editLoading}
        editError={editError}
        uploadedImageUrl={uploadedImageUrl}
        imageUploading={imageUploading}
        onImageFile={(file) => void handleImageUpload(file)}
        onClearImage={() => setUploadedImageUrl(null)}
        onCancelSelection={() => {
          setSelectedComponent(null);
          setEditRequest("");
          setEditError(null);
          setUploadedImageUrl(null);
        }}
      />
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
