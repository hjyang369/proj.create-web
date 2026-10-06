"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/features/auth";
import {
  buildEditablePreviewDocument,
  editSiteComponent,
  getMySite,
  regenerateSiteDraft,
  saveSiteDraft,
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
import { EditSiteAside, type SelectedComponent } from "./edit-site-aside";

type PreviewState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "error"; message: string }
  | { kind: "ready"; site: SiteEditorDetail };

function snapshotKey(site: SiteEditorDetail): string {
  return JSON.stringify({
    name: site.name,
    pages: site.pages.map((page) => ({
      pageType: page.pageType,
      pageOrder: page.pageOrder,
      html: page.html,
      css: page.css,
    })),
    inputs: site.inputs,
  });
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
  const [siteHistory, setSiteHistory] = useState<SiteEditorDetail[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setSidebarOpen(
      initialSidebarOpen(window.matchMedia("(min-width: 1024px)").matches),
    );
  }, []);

  const canBack = historyIndex > 0 && !saving;
  const canForward = historyIndex < siteHistory.length - 1 && !saving;
  const currentSite = historyIndex >= 0 ? siteHistory[historyIndex] : null;
  const canSave =
    currentSite != null &&
    currentSite.inputs != null &&
    snapshotKey(currentSite) !== savedKey &&
    !saving &&
    !regenerating &&
    !editLoading;

  function pushSiteHistory(site: SiteEditorDetail) {
    setSiteHistory((prev) => [...prev.slice(0, historyIndex + 1), site]);
    setHistoryIndex((prev) => prev + 1);
    setPreview({ kind: "ready", site });
  }

  function handleHistoryBack() {
    if (!canBack) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setPreview({ kind: "ready", site: siteHistory[nextIndex] });
  }

  function handleHistoryForward() {
    if (!canForward) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setPreview({ kind: "ready", site: siteHistory[nextIndex] });
  }

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
          setSiteHistory([site]);
          setHistoryIndex(0);
          setSavedKey(snapshotKey(site));
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
        const { pageOrder, sectionIndex, innerSectionIndex, tagName, preview: text, elementHtml } =
          event.data as {
            pageOrder: number;
            sectionIndex: number;
            innerSectionIndex: number;
            tagName: string;
            preview: string;
            elementHtml: string;
          };
        if (!editingRef.current) {
          return;
        }
        setSelectedComponent({ pageOrder, sectionIndex, innerSectionIndex, tagName, preview: text, elementHtml });
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
      editLoading ||
      saving
    ) {
      return;
    }

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) return;

    const page = preview.site.pages.find(
      (item) => item.pageOrder === selectedComponent.pageOrder,
    );
    if (!page) {
      setEditError("수정할 페이지를 찾지 못했습니다.");
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      const updatedPage = await editSiteComponent(id, {
        pageOrder: selectedComponent.pageOrder,
        pageType: page.pageType,
        sectionIndex: selectedComponent.sectionIndex,
        innerSectionIndex: selectedComponent.innerSectionIndex >= 0
          ? selectedComponent.innerSectionIndex
          : undefined,
        html: page.html,
        css: page.css,
        elementHtml: selectedComponent.elementHtml,
        imageUrl: uploadedImageUrl ?? undefined,
        request: editRequest.trim(),
      });

      // 미리보기 상태의 해당 페이지를 교체
      const updatedPages: typeof preview.site.pages = preview.site.pages.map(
        (p) => (p.pageOrder === updatedPage.pageOrder ? (updatedPage as SiteEditorPage) : p),
      );
      const updatedSite = { ...preview.site, pages: updatedPages };
      pushSiteHistory(updatedSite);
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
    if (preview.kind !== "ready" || regenerating || saving || !preview.site.inputs) {
      return;
    }

    setRegenerateError(null);
    setFormOpen(true);
  }

  async function submitRegenerateForm(submission: SiteFormSubmit) {
    if (
      preview.kind !== "ready" ||
      !preview.site.inputs ||
      regenerating ||
      saving
    ) {
      return;
    }

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) {
      return;
    }

    setRegenerating(true);
    setRegenerateError(null);

    try {
      const site = await regenerateSiteDraft(id, {
        values: submission.values,
        keepExistingLogo: submission.keepExistingLogo,
        keptPhotoUrls: submission.keptPhotoUrls,
        logoFile: submission.logoFile,
        photoFiles: submission.photoFiles,
      });
      pushSiteHistory(site);
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

  async function saveCurrentDraft() {
    if (!canSave || preview.kind !== "ready" || !currentSite?.inputs) {
      return;
    }

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) {
      return;
    }

    const index = historyIndex;
    setSaving(true);
    setSaveError(null);

    try {
      const saved = await saveSiteDraft(id, {
        pages: currentSite.pages,
        inputs: currentSite.inputs,
      });
      setSiteHistory((prev) =>
        prev.map((item, itemIndex) => (itemIndex === index ? saved : item)),
      );
      setHistoryIndex(index);
      setPreview({ kind: "ready", site: saved });
      setSavedKey(snapshotKey(saved));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "저장하지 못했습니다.";
      setSaveError(message);
    } finally {
      setSaving(false);
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
        chrome={{
          ...chrome,
          history: {
            back: { ...chrome.history.back, enabled: canBack },
            forward: { ...chrome.history.forward, enabled: canForward },
          },
        }}
        onToggle={() => setSidebarOpen((open) => !open)}
        editing={editing}
        onChangeEditing={changePreviewMode}
        canRegenerate={
          preview.kind === "ready" && preview.site.inputs != null && !saving
        }
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
        onHistoryBack={handleHistoryBack}
        onHistoryForward={handleHistoryForward}
        canSave={canSave}
        saving={saving}
        saveError={saveError}
        onSave={() => void saveCurrentDraft()}
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
