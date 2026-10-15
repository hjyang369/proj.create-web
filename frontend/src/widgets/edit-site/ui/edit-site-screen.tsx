"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/features/auth";
import {
  boardDetailHtml,
  boardListHtml,
  boardPageSources,
  boardPostPageSources,
  BOARD_CREATED_CHANNEL,
  boardStatusHtml,
  boardWriteBase,
  boardWriteHtml,
  boardWritePath,
  boardsForEditor,
  createBoardPost,
  deleteBoardPost,
  ensureSiteBoard,
  getBoardPost,
  listBoardPosts,
  listSiteBoards,
  readBoardCreatedMessage,
  updateBoardPost,
} from "@/entities/board";
import {
  addSiteChatEntry,
  buildEditablePreviewDocument,
  diffElementEdit,
  editHtmlElement,
  editSiteComponent,
  elementEditOf,
  getMySite,
  getSiteChatHistory,
  isAllowedBackgroundImage,
  isAllowedEditImageSrc,
  isAllowedEditLink,
  isAllowedFontSize,
  isAllowedFontWeight,
  isAllowedTextColor,
  listSiteHistory,
  normalizeBackgroundImage,
  openSiteHistory,
  publishSiteHistory,
  visibleTextStyle,
  readEditableFromHtml,
  regenerateSiteDraft,
  saveSiteDraft,
  editorPageChoices,
  previewPathForPages,
  toPreviewAssetUrl,
  toPreviewHref,
  uploadSiteImage,
  applyOpenedVersion,
  type EditableElement,
  type ElementEdit,
  type SiteEditorDetail,
  type SiteEditorPage,
  type SiteVersionList,
} from "@/entities/site";
import { CreateSiteForm, type SiteFormSubmit } from "@/features/create-site";
import { API_URL } from "@/shared/api";
import { storedChatsToEditLog } from "../model/edit-log-chat";
import {
  describeEditPageChrome,
  initialSidebarOpen,
} from "../model/edit-page-layout";
import { EditSiteAside, type SelectedComponent } from "./edit-site-aside";
import { EditSiteChatPanel, type EditLogEntry } from "./edit-site-chat-panel";
import { EditSiteHistoryDialog } from "./edit-site-history-dialog";
import { EditSiteManualPanel } from "./edit-site-manual-panel";
import { EditSiteCodeView } from "./edit-site-code-view";
import {
  EditSitePreviewBar,
  type PreviewViewport,
  type SiteViewMode,
} from "./edit-site-preview-bar";

/** 우클릭으로 고른, 직접 편집 중인 요소 */
type ManualTarget = {
  pageOrder: number;
  path: number[];
  /** 배경색·배경 이미지가 들어가는 요소. 글자를 감싼 div일 수 있다. */
  backgroundPath: number[];
  backgroundTag: string;
  element: EditableElement;
  /** 우클릭 당시의 style 속성. 취소하면 이 값으로 미리보기를 되돌린다. */
  styleAttr: string;
  backgroundStyleAttr: string;
};

function samePath(left: number[], right: number[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isIndexPath(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 50 &&
    value.every((index) => Number.isInteger(index) && index >= 0)
  );
}

function isBackgroundKey(key: keyof ElementEdit): boolean {
  return key === "backgroundColor" || key === "backgroundImage";
}

function describeDraftIssue(draft: ElementEdit): string | null {
  if (draft.href !== undefined && !isAllowedEditLink(draft.href)) {
    return "링크는 http, https, mailto, tel, #앵커, 사이트 안 페이지 주소만 사용할 수 있습니다.";
  }

  if (draft.src !== undefined && !isAllowedEditImageSrc(draft.src)) {
    return "올바른 이미지 주소가 아닙니다.";
  }

  if (draft.fontSize !== undefined && !isAllowedFontSize(draft.fontSize)) {
    return "글자 크기는 1~400px로 입력해 주세요.";
  }

  if (draft.color !== undefined && !isAllowedTextColor(draft.color)) {
    return "글자 색은 #112233 형식으로 입력해 주세요.";
  }

  if (
    draft.fontWeight !== undefined &&
    !isAllowedFontWeight(draft.fontWeight)
  ) {
    return "글자 굵기는 100부터 900까지 100 단위로 고를 수 있습니다.";
  }

  if (
    draft.backgroundColor !== undefined &&
    !isAllowedTextColor(draft.backgroundColor)
  ) {
    return "배경색은 #112233 형식으로 입력해 주세요.";
  }

  if (
    draft.backgroundImage !== undefined &&
    !isAllowedBackgroundImage(draft.backgroundImage)
  ) {
    return "배경 이미지는 업로드한 사진이나 http, https 주소만 사용할 수 있습니다.";
  }

  return null;
}

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
  const boardTicket = useRef(0);
  const boardPageOrderRef = useRef(0);
  const previewBoardPathRef = useRef<string | null>(null);
  const { ready, user } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ kind: "loading" });
  const [regenerating, setRegenerating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [view, setView] = useState<SiteViewMode>("edit");
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const editing = view === "edit";
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
  const [editLog, setEditLog] = useState<EditLogEntry[]>([]);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versionList, setVersionList] = useState<SiteVersionList | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [busyHistoryId, setBusyHistoryId] = useState<number | null>(null);
  const [publishingHistoryId, setPublishingHistoryId] = useState<number | null>(
    null,
  );
  // 미리보기 iframe에 넣는 문서. 직접 편집을 "적용"할 때는 바꾸지 않아서
  // iframe이 다시 그려지지 않는다. (스크롤·깜빡임 유지)
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [previewPageOrder, setPreviewPageOrder] = useState<number | null>(null);
  const [previewBoardPath, setPreviewBoardPath] = useState<string | null>(null);
  const [savedBoards, setSavedBoards] = useState<
    { id: number; name: string; slug: string }[]
  >([]);
  const [boardPosts, setBoardPosts] = useState<
    {
      id: number;
      slug: string;
      title: string;
      content: string;
      createdAt: string;
    }[]
  >([]);
  const postsEpoch = useRef(0);
  const [manualTarget, setManualTargetState] = useState<ManualTarget | null>(
    null,
  );
  const manualTargetRef = useRef<ManualTarget | null>(null);
  const [manualDraft, setManualDraft] = useState<ElementEdit>({});
  const [manualNotice, setManualNotice] = useState<string | null>(null);
  const [manualUploading, setManualUploading] = useState(false);
  const previewRef = useRef<PreviewState>(preview);
  const frameMessageRef = useRef<(data: unknown) => void>(() => {});

  useEffect(() => {
    previewRef.current = preview;
  });

  useEffect(() => {
    setSidebarOpen(
      initialSidebarOpen(window.matchMedia("(min-width: 1024px)").matches),
    );
  }, []);

  const historyLocked =
    saving || editLoading || regenerating || busyHistoryId !== null;
  const canStepBack = historyIndex > 0 && !historyLocked;
  const canStepForward =
    historyIndex < siteHistory.length - 1 && !historyLocked;
  const currentSite = historyIndex >= 0 ? siteHistory[historyIndex] : null;
  const canSave =
    currentSite != null &&
    currentSite.inputs != null &&
    snapshotKey(currentSite) !== savedKey &&
    !saving &&
    !regenerating &&
    !editLoading;

  function setManualTarget(target: ManualTarget | null) {
    manualTargetRef.current = target;
    setManualTargetState(target);
    setManualDraft(target ? elementEditOf(target.element) : {});
    setManualNotice(null);
  }

  function postFrame(message: Record<string, unknown>) {
    previewFrameRef.current?.contentWindow?.postMessage(message, "*");
  }

  function showPreviewPage(pageOrder: number) {
    setPreviewPageOrder(pageOrder);
    postFrame({ type: "crep-show-page", pageOrder });
  }

  /** 미리보기 iframe의 요소에 수정값을 바로 보여준다. (저장·history와 무관) */
  function postPreviewPatch(
    target: ManualTarget,
    edit: ElementEdit,
    restore = false,
  ) {
    const textMessage: Record<string, unknown> = {
      type: "crep-patch",
      pageOrder: target.pageOrder,
      path: target.path,
    };
    const backgroundMessage: Record<string, unknown> = {
      type: "crep-patch",
      pageOrder: target.pageOrder,
      path: target.backgroundPath,
    };

    if (restore) {
      textMessage.style = target.styleAttr;
      if (edit.text !== undefined) textMessage.text = edit.text;
      if (edit.alt !== undefined) textMessage.alt = edit.alt;
      if (edit.href !== undefined && isAllowedEditLink(edit.href)) {
        textMessage.href = toPreviewHref(edit.href);
      }
      if (edit.src !== undefined && isAllowedEditImageSrc(edit.src)) {
        textMessage.src = toPreviewAssetUrl(edit.src, API_URL);
      }
      postFrame(textMessage);
      if (!samePath(target.path, target.backgroundPath)) {
        backgroundMessage.style = target.backgroundStyleAttr;
        postFrame(backgroundMessage);
      }
      return;
    }

    if (edit.text !== undefined) textMessage.text = edit.text;
    if (edit.alt !== undefined) textMessage.alt = edit.alt;
    if (edit.href !== undefined && isAllowedEditLink(edit.href)) {
      textMessage.href = toPreviewHref(edit.href);
    }
    if (edit.src !== undefined && isAllowedEditImageSrc(edit.src)) {
      textMessage.src = toPreviewAssetUrl(edit.src, API_URL);
    }
    if (edit.fontSize !== undefined && isAllowedFontSize(edit.fontSize)) {
      textMessage.fontSize = edit.fontSize;
    }
    if (edit.color !== undefined && isAllowedTextColor(edit.color)) {
      textMessage.color = edit.color;
    }
    if (edit.fontWeight !== undefined && isAllowedFontWeight(edit.fontWeight)) {
      textMessage.fontWeight = edit.fontWeight;
    }
    if (
      edit.backgroundColor !== undefined &&
      isAllowedTextColor(edit.backgroundColor)
    ) {
      backgroundMessage.backgroundColor = edit.backgroundColor;
    }
    if (
      edit.backgroundImage !== undefined &&
      isAllowedBackgroundImage(edit.backgroundImage)
    ) {
      backgroundMessage.backgroundImage =
        edit.backgroundImage === ""
          ? ""
          : toPreviewAssetUrl(edit.backgroundImage, API_URL);
    }

    if (Object.keys(textMessage).length > 3) {
      postFrame(textMessage);
    }
    if (Object.keys(backgroundMessage).length > 3) {
      postFrame(backgroundMessage);
    }
  }

  /** 직접 편집을 닫는다. revert가 true면 아직 적용 안 한 미리보기 변경을 되돌린다. */
  function closeManualEdit(revert: boolean) {
    const target = manualTargetRef.current;
    if (!target) return;
    if (revert) {
      const edit = elementEditOf(target.element);
      delete edit.fontSize;
      delete edit.color;
      delete edit.fontWeight;
      delete edit.backgroundColor;
      delete edit.backgroundImage;
      postPreviewPatch(target, edit, true);
    }
    setManualTarget(null);
  }

  /** iframe을 새 사이트 내용으로 다시 그린다. (AI 수정, 재생성, 수정 내역 이동, 저장 버전 열기) */
  function previewDocument(pages: SiteEditorDetail["pages"]) {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return buildEditablePreviewDocument(
      pages,
      API_URL,
      origin ? boardWriteBase(origin, siteId) : "",
    );
  }

  function showSite(site: SiteEditorDetail) {
    setPreviewDoc(site.pages.length > 0 ? previewDocument(site.pages) : null);
    setManualTarget(null);
    setPreview({ kind: "ready", site });
  }

  function pushSiteHistory(
    site: SiteEditorDetail,
    options: { redraw: boolean } = { redraw: true },
  ) {
    const newIndex = historyIndex + 1;
    setSiteHistory((prev) => [...prev.slice(0, newIndex), site]);
    setHistoryIndex(newIndex);
    // 현재 위치 이후의 로그 항목은 덮어쓰이므로 제거한다.
    setEditLog((prev) => prev.filter((entry) => entry.historyIndex < newIndex));
    if (options.redraw) {
      showSite(site);
    } else {
      setPreview({ kind: "ready", site });
    }
  }

  function handleStepBack() {
    if (historyIndex <= 0 || historyLocked) {
      return;
    }
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    showSite(siteHistory[nextIndex]);
  }

  function handleStepForward() {
    if (historyIndex >= siteHistory.length - 1 || historyLocked) {
      return;
    }
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    showSite(siteHistory[nextIndex]);
  }

  function handleEditLogJump(entry: EditLogEntry) {
    if (
      historyLocked ||
      entry.historyIndex < 0 ||
      entry.historyIndex >= siteHistory.length
    ) {
      return;
    }
    setHistoryIndex(entry.historyIndex);
    showSite(siteHistory[entry.historyIndex]);
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

    const chatHistory = getSiteChatHistory(id).catch(() => []);

    getMySite(id)
      .then(async (site) => {
        if (cancelled) {
          return;
        }
        setSiteHistory([site]);
        setHistoryIndex(0);
        setSavedKey(snapshotKey(site));
        setPreviewDoc(
          site.pages.length > 0 ? previewDocument(site.pages) : null,
        );
        manualTargetRef.current = null;
        setManualTargetState(null);
        setPreview({ kind: "ready", site });
        const history = await chatHistory;
        if (!cancelled) {
          setEditLog((prev) => {
            const stored = storedChatsToEditLog(history);
            const session = prev.filter((entry) => entry.historyIndex >= 0);
            return session.length === 0 ? stored : [...session, ...stored];
          });
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

  function postBoardHtml(pageOrder: number, html: string) {
    previewFrameRef.current?.contentWindow?.postMessage(
      { type: "crep-board-show", pageOrder, html },
      "*",
    );
  }

  /** 미리보기 사이트의 본문만 게시판으로 바꾼다. 헤더와 메뉴는 그대로 둔다. */
  async function openSiteBoard(data: object) {
    const record = data as Record<string, unknown>;
    const slug = typeof record.slug === "string" ? record.slug : "";
    const siteNumber = Number(siteId);
    if (
      !/^[a-z0-9-]+$/i.test(slug) ||
      !Number.isInteger(siteNumber) ||
      siteNumber <= 0
    ) {
      return;
    }

    const pageOrder =
      typeof record.pageOrder === "number" && Number.isInteger(record.pageOrder)
        ? record.pageOrder
        : boardPageOrderRef.current;
    boardPageOrderRef.current = pageOrder;
    const postId =
      typeof record.postId === "number" &&
      Number.isInteger(record.postId) &&
      record.postId > 0
        ? record.postId
        : 0;
    const page =
      typeof record.page === "number" && record.page >= 1
        ? Math.floor(record.page)
        : 1;
    const view = typeof record.view === "string" ? record.view : "list";
    const title = typeof record.title === "string" ? record.title : "";
    const content = typeof record.content === "string" ? record.content : "";
    const label =
      typeof record.label === "string" ? record.label.trim().slice(0, 100) : "";
    const ticket = ++boardTicket.current;

    try {
      const boards = await listSiteBoards(siteNumber);
      if (ticket !== boardTicket.current) return;
      let board = boards.find(
        (item) => item.slug.toLowerCase() === slug.toLowerCase(),
      );
      if (!board && user) {
        try {
          board = await ensureSiteBoard(siteNumber, {
            slug: slug.toLowerCase(),
            name: label || slug,
          });
          if (board) {
            const added = board;
            setSavedBoards((prev) =>
              prev.some((item) => item.slug === added.slug)
                ? prev
                : [...prev, added],
            );
          }
        } catch {
          board = undefined;
        }
      }
      if (!board || ticket !== boardTicket.current) {
        if (ticket === boardTicket.current) {
          postBoardHtml(pageOrder, boardStatusHtml("게시판을 찾을 수 없습니다."));
        }
        return;
      }

      const boardPath = `/board/${slug.toLowerCase()}`;
      setPreviewBoardPath(boardPath);

      const canWrite = user
        ? await getMySite(siteNumber).then(
            () => true,
            () => false,
          )
        : false;
      if (ticket !== boardTicket.current) return;

      async function showList(nextPage: number) {
        const posts = await listBoardPosts(board!.id, nextPage);
        if (ticket !== boardTicket.current) return;
        postBoardHtml(
          pageOrder,
          boardListHtml({
            name: board!.name,
            slug: board!.slug,
            posts,
            page: nextPage,
            canWrite,
          }),
        );
      }

      if (record.type === "crep-board-save") {
        if (!canWrite) {
          await showList(1);
          return;
        }
        if (title.trim() === "" || content.trim() === "") {
          postBoardHtml(
            pageOrder,
            boardWriteHtml({
              name: board.name,
              slug: board.slug,
              postId,
              title,
              content,
              error: "제목과 내용을 입력해 주세요.",
            }),
          );
          return;
        }
        const input = { title: title.trim(), content: content.trim() };
        const saved =
          postId > 0
            ? await updateBoardPost(board.id, postId, input)
            : await createBoardPost(board.id, input);
        if (ticket !== boardTicket.current) return;
        postsEpoch.current += 1;
        setBoardPosts((prev) => [
          {
            id: saved.id,
            slug: board.slug,
            title: saved.title,
            content: saved.content,
            createdAt: saved.createdAt,
          },
          ...prev.filter(
            (item) => !(item.slug === board.slug && item.id === saved.id),
          ),
        ]);
        setPreviewBoardPath(`/board/${board.slug}/${saved.id}`);
        postBoardHtml(
          pageOrder,
          boardDetailHtml({
            name: board.name,
            slug: board.slug,
            canWrite: true,
            post: saved,
          }),
        );
        return;
      }

      if (view === "delete") {
        if (canWrite && postId > 0) {
          await deleteBoardPost(board.id, postId);
          postsEpoch.current += 1;
          setBoardPosts((prev) =>
            prev.filter(
              (item) => !(item.slug === board.slug && item.id === postId),
            ),
          );
        }
        setPreviewBoardPath(boardPath);
        await showList(1);
        return;
      }

      if (view === "write") {
        await showList(1);
        return;
      }

      if (view === "edit") {
        if (!canWrite || postId <= 0) {
          await showList(1);
          return;
        }
        const post = await getBoardPost(board.id, postId);
        if (ticket !== boardTicket.current) return;
        postBoardHtml(
          pageOrder,
          boardWriteHtml({
            name: board.name,
            slug: board.slug,
            postId: post.id,
            title: post.title,
            content: post.content,
          }),
        );
        return;
      }

      if (view === "detail" && postId > 0) {
        const post = await getBoardPost(board.id, postId);
        if (ticket !== boardTicket.current) return;
        setPreviewBoardPath(`/board/${board.slug}/${post.id}`);
        postBoardHtml(
          pageOrder,
          boardDetailHtml({
            name: board.name,
            slug: board.slug,
            canWrite,
            post,
          }),
        );
        return;
      }

      await showList(page);
    } catch (error: unknown) {
      if (ticket !== boardTicket.current) return;
      postBoardHtml(
        pageOrder,
        boardStatusHtml(
          error instanceof Error
            ? error.message
            : "게시판을 불러오지 못했습니다.",
        ),
      );
    }
  }

  // iframe 안 클릭(AI 수정)·우클릭(직접 편집) 메시지를 받는다.
  // 최신 상태를 쓰기 위해 처리 함수는 ref로 넘긴다.
  function handleFrameMessage(data: unknown) {
    if (typeof data !== "object" || data === null) {
      return;
    }

    const message = data as { type?: unknown; pageOrder?: unknown };

    if (message.type === "crep-board") {
      const record = data as Record<string, unknown>;
      const boardView = typeof record.view === "string" ? record.view : "";
      const slug = typeof record.slug === "string" ? record.slug : "";
      if (
        (boardView === "write" || boardView === "manage") &&
        /^[a-z0-9-]+$/i.test(slug)
      ) {
        const rawPostId =
          typeof record.postId === "number" ? record.postId : 0;
        window.open(
          boardWritePath(
            siteId,
            slug,
            boardView === "manage" ? rawPostId : undefined,
          ),
          "_blank",
        );
        return;
      }
    }

    if (message.type === "crep-board" || message.type === "crep-board-save") {
      void openSiteBoard(data);
      return;
    }

    if (message.type === "crep-page") {
      if (
        typeof message.pageOrder === "number" &&
        Number.isInteger(message.pageOrder)
      ) {
        setPreviewPageOrder(message.pageOrder);
      }
      return;
    }

    if (!editingRef.current) {
      return;
    }

    if (message.type === "crep-click") {
      const {
        pageOrder,
        sectionIndex,
        innerSectionIndex,
        tagName,
        preview: text,
        elementHtml,
      } = data as {
        pageOrder: number;
        sectionIndex: number;
        innerSectionIndex: number;
        tagName: string;
        preview: string;
        elementHtml: string;
      };
      closeManualEdit(true);
      setSelectedComponent({
        pageOrder,
        sectionIndex,
        innerSectionIndex,
        tagName,
        preview: text,
        elementHtml,
      });
      setEditRequest("");
      setEditError(null);
      setUploadedImageUrl(null);
      return;
    }

    if (message.type === "crep-contextmenu") {
      const {
        pageOrder,
        path,
        backgroundPath: rawBackgroundPath,
        backgroundTag: rawBackgroundTag,
        tagName,
        fontSize,
        color,
        fontWeight,
        backgroundColor,
        backgroundImage,
        style,
        backgroundStyle,
      } = data as {
        pageOrder?: unknown;
        path?: unknown;
        backgroundPath?: unknown;
        backgroundTag?: unknown;
        tagName?: unknown;
        fontSize?: unknown;
        color?: unknown;
        fontWeight?: unknown;
        backgroundColor?: unknown;
        backgroundImage?: unknown;
        style?: unknown;
        backgroundStyle?: unknown;
      };
      const currentPreview = previewRef.current;
      if (
        currentPreview.kind !== "ready" ||
        typeof pageOrder !== "number" ||
        typeof tagName !== "string" ||
        !Array.isArray(path) ||
        path.length === 0 ||
        path.length > 50 ||
        !path.every((index) => Number.isInteger(index) && index >= 0)
      ) {
        return;
      }

      const page = currentPreview.site.pages.find(
        (item) => item.pageOrder === pageOrder,
      );
      if (!page) {
        return;
      }

      // 이전에 적용하지 않은 직접 편집은 되돌리고, AI 수정 선택은 닫는다.
      closeManualEdit(true);
      setSelectedComponent(null);
      setEditRequest("");
      setEditError(null);
      setUploadedImageUrl(null);

      const indexes = path as number[];
      const backgroundIndexes = isIndexPath(rawBackgroundPath)
        ? rawBackgroundPath
        : indexes;
      const read = readEditableFromHtml(page.html, indexes);
      const backgroundRead = samePath(indexes, backgroundIndexes)
        ? read
        : readEditableFromHtml(page.html, backgroundIndexes);
      const parsedImage =
        typeof backgroundImage === "string"
          ? normalizeBackgroundImage(backgroundImage, API_URL)
          : null;
      const element = read
        ? visibleTextStyle(
            {
              ...read,
              backgroundColor:
                backgroundRead?.backgroundColor ?? read.backgroundColor,
              backgroundImage:
                backgroundRead?.backgroundImage ?? read.backgroundImage,
            },
            {
              fontSize,
              color,
              fontWeight,
              backgroundColor,
              backgroundImage: parsedImage || undefined,
            },
          )
        : {
            tagName,
            kind: "unsupported" as const,
            text: null,
            href: null,
            src: null,
            alt: null,
            fontSize: null,
            color: null,
            fontWeight: null,
            backgroundColor: null,
            backgroundImage: null,
          };
      setManualTarget({
        pageOrder,
        path: indexes,
        backgroundPath: backgroundIndexes,
        backgroundTag:
          typeof rawBackgroundTag === "string"
            ? rawBackgroundTag.toLowerCase()
            : "",
        element,
        styleAttr:
          typeof style === "string" && style.length <= 4000 ? style : "",
        backgroundStyleAttr:
          typeof backgroundStyle === "string" && backgroundStyle.length <= 4000
            ? backgroundStyle
            : "",
      });
      if (!read) {
        setManualNotice("요소를 찾지 못했습니다. AI로 수정해 주세요.");
      }
      setSidebarOpen(true);
    }
  }

  useEffect(() => {
    frameMessageRef.current = handleFrameMessage;
    previewBoardPathRef.current = previewBoardPath;
  });

  useEffect(() => {
    const channel = new BroadcastChannel(BOARD_CREATED_CHANNEL);
    channel.onmessage = (event) => {
      const created = readBoardCreatedMessage(event.data);
      if (!created || String(created.siteId) !== siteId) return;
      const path = previewBoardPathRef.current;
      const listPath = `/board/${created.slug}`;
      const detailPath =
        created.postId == null ? null : `${listPath}/${created.postId}`;
      if (path !== listPath && path !== detailPath) return;
      frameMessageRef.current({
        type: "crep-board",
        slug: created.slug,
        view: created.removed || path === listPath ? "list" : "detail",
        postId: created.postId ?? 0,
        page: 1,
        pageOrder: boardPageOrderRef.current,
      });
    };
    return () => channel.close();
  }, [siteId]);

  useEffect(() => {
    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) return;
    let cancelled = false;
    const epoch = postsEpoch.current;
    listSiteBoards(id).then(
      async (boards) => {
        if (cancelled) return;
        setSavedBoards(boards);
        const groups = await Promise.all(
          boards.map(async (board) => {
            try {
              const items: {
                id: number;
                title: string;
                createdAt: string;
              }[] = [];
              for (let page = 1; page <= 10; page += 1) {
                const chunk = await listBoardPosts(board.id, page);
                items.push(...chunk);
                if (chunk.length < 20) break;
              }
              const details = await Promise.all(
                items.map((item) => getBoardPost(board.id, item.id)),
              );
              return details.map((post) => ({
                id: post.id,
                slug: board.slug,
                title: post.title,
                content: post.content,
                createdAt: post.createdAt,
              }));
            } catch {
              return [];
            }
          }),
        );
        if (!cancelled && epoch === postsEpoch.current) {
          setBoardPosts(groups.flat());
        }
      },
      () => {
        if (!cancelled && epoch === postsEpoch.current) {
          setSavedBoards([]);
          setBoardPosts([]);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [siteId, currentSite]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== previewFrameRef.current?.contentWindow) {
        return;
      }
      frameMessageRef.current(event.data);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function changeManualDraft(patch: ElementEdit) {
    const target = manualTargetRef.current;
    if (!target) return;
    setManualDraft((prev) => ({ ...prev, ...patch }));
    setManualNotice(null);
    postPreviewPatch(target, patch);
  }

  async function handleBackgroundImageUpload(file: File) {
    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) return;

    setManualUploading(true);
    setManualNotice(null);
    try {
      const result = await uploadSiteImage(id, file);
      if (!isAllowedBackgroundImage(result.url)) {
        setManualNotice("이 이미지는 배경으로 사용할 수 없습니다.");
        return;
      }
      changeManualDraft({ backgroundImage: result.url });
    } catch (error: unknown) {
      setManualNotice(
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다.",
      );
    } finally {
      setManualUploading(false);
    }
  }

  async function handleManualImageUpload(file: File) {
    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) return;

    setManualUploading(true);
    setManualNotice(null);
    try {
      const result = await uploadSiteImage(id, file);
      changeManualDraft({ src: result.url });
    } catch (error: unknown) {
      setManualNotice(
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다.",
      );
    } finally {
      setManualUploading(false);
    }
  }

  function applyManualEdit() {
    const target = manualTargetRef.current;
    if (preview.kind !== "ready" || !target || saving) return;

    const changed = diffElementEdit(target.element, manualDraft);
    if (Object.keys(changed).length === 0) {
      closeManualEdit(false);
      return;
    }

    const page = preview.site.pages.find(
      (item) => item.pageOrder === target.pageOrder,
    );
    if (!page) {
      setManualNotice("수정할 페이지를 찾지 못했습니다.");
      return;
    }

    const backgroundEdit: ElementEdit = {};
    const textEdit: ElementEdit = {};
    for (const key of Object.keys(changed) as Array<keyof ElementEdit>) {
      if (isBackgroundKey(key)) {
        backgroundEdit[key] = changed[key] as never;
      } else {
        textEdit[key] = changed[key] as never;
      }
    }

    let html = page.html;
    if (samePath(target.path, target.backgroundPath)) {
      const result = editHtmlElement(html, target.path, changed);
      if (!result.ok) {
        setManualNotice(result.message);
        return;
      }
      html = result.html;
    } else {
      if (Object.keys(textEdit).length > 0) {
        const result = editHtmlElement(html, target.path, textEdit);
        if (!result.ok) {
          setManualNotice(result.message);
          return;
        }
        html = result.html;
      }
      if (Object.keys(backgroundEdit).length > 0) {
        const result = editHtmlElement(
          html,
          target.backgroundPath,
          backgroundEdit,
        );
        if (!result.ok) {
          setManualNotice(result.message);
          return;
        }
        html = result.html;
      }
    }

    const updatedSite: SiteEditorDetail = {
      ...preview.site,
      pages: preview.site.pages.map((item) =>
        item.pageOrder === page.pageOrder ? { ...item, html } : item,
      ),
    };
    // 미리보기는 이미 바뀌어 있으므로 iframe을 다시 그리지 않는다.
    pushSiteHistory(updatedSite, { redraw: false });
    setManualTarget(null);
  }

  const manualDirty =
    manualTarget !== null &&
    Object.keys(diffElementEdit(manualTarget.element, manualDraft)).length > 0;

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
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다.";
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
        innerSectionIndex:
          selectedComponent.innerSectionIndex >= 0
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
        (p) =>
          p.pageOrder === updatedPage.pageOrder
            ? (updatedPage as SiteEditorPage)
            : p,
      );
      const updatedSite = { ...preview.site, pages: updatedPages };
      const requestLabel = editRequest.trim();
      const requestPageOrder = selectedComponent.pageOrder;
      pushSiteHistory(updatedSite);
      setEditLog((prev) => [
        {
          historyIndex: historyIndex + 1,
          type: "ai-edit",
          label: requestLabel,
          pageOrder: requestPageOrder,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      void addSiteChatEntry(id, {
        type: "ai-edit",
        label: requestLabel,
        pageOrder: requestPageOrder,
      }).catch(() => {});
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

  function changeView(nextView: SiteViewMode) {
    const nextEditing = nextView === "edit";
    editingRef.current = nextEditing;
    setView(nextView);
    if (!nextEditing) {
      closeManualEdit(true);
      setSelectedComponent(null);
      setEditRequest("");
      setEditError(null);
      setUploadedImageUrl(null);
    }
    postPreviewMode(nextEditing);
  }

  function openRegenerateForm() {
    if (
      preview.kind !== "ready" ||
      regenerating ||
      saving ||
      !preview.site.inputs
    ) {
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
      setEditLog((prev) => [
        {
          historyIndex: historyIndex + 1,
          type: "regenerate",
          label: chrome.editLog.regenerateLabel,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      void addSiteChatEntry(id, {
        type: "regenerate",
        label: chrome.editLog.regenerateLabel,
        pageOrder: null,
      }).catch(() => {});
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

  async function loadVersionList(id: number) {
    const list = await listSiteHistory(id);
    setVersionList(list);
  }

  async function openHistoryPanel() {
    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) {
      return;
    }

    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      await loadVersionList(id);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "버전 목록을 불러오지 못했습니다.";
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openSavedVersion(historyId: number) {
    if (preview.kind !== "ready" || !currentSite || busyHistoryId !== null) {
      return;
    }

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) {
      return;
    }

    setBusyHistoryId(historyId);
    setHistoryError(null);

    try {
      const opened = await openSiteHistory(id, historyId);
      const next = applyOpenedVersion(currentSite, opened);
      pushSiteHistory(next);
      setSavedKey(snapshotKey(next));
      await loadVersionList(id);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "버전을 열지 못했습니다.";
      setHistoryError(message);
    } finally {
      setBusyHistoryId(null);
    }
  }

  async function publishSavedVersion(historyId: number) {
    if (preview.kind !== "ready" || busyHistoryId !== null) {
      return;
    }

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) {
      return;
    }

    setBusyHistoryId(historyId);
    setPublishingHistoryId(historyId);
    setHistoryError(null);

    try {
      const published = await publishSiteHistory(id, historyId);
      const index = historyIndex;
      setSiteHistory((prev) =>
        prev.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                editingHistoryId: published.editingHistoryId,
                publishedHistoryId: published.publishedHistoryId,
              }
            : item,
        ),
      );
      setPreview({
        kind: "ready",
        site: {
          ...preview.site,
          editingHistoryId: published.editingHistoryId,
          publishedHistoryId: published.publishedHistoryId,
        },
      });
      await loadVersionList(id);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "배포하지 못했습니다.";
      setHistoryError(message);
    } finally {
      setBusyHistoryId(null);
      setPublishingHistoryId(null);
    }
  }

  function refreshPreview() {
    if (!currentSite || historyLocked || currentSite.pages.length === 0) {
      return;
    }
    // 문서 글자가 같아도 iframe을 다시 만들어 스크롤·버튼 상태를 처음으로 돌린다.
    setPreviewPageOrder(null);
    showSite(currentSite);
    setPreviewReloadKey((key) => key + 1);
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
      if (historyOpen) {
        await loadVersionList(id);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "저장하지 못했습니다.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  const editorBoards = boardsForEditor({
    pages: currentSite?.pages ?? [],
    names: currentSite?.inputs?.boardNames ?? [],
    saved: savedBoards,
  });
  const codePages = [
    ...(preview.kind === "ready" ? preview.site.pages : []),
    ...boardPageSources(
      preview.kind === "ready" ? preview.site.pages : [],
      editorBoards,
      boardPosts,
    ).map((board, index) => ({
      pageOrder: 1000 + index,
      pageType: board.slug,
      folder: "boards",
      fileLabel: board.name,
      html: board.html,
      css: board.css,
    })),
    ...boardPostPageSources(
      preview.kind === "ready" ? preview.site.pages : [],
      editorBoards,
      boardPosts,
    ).map((post) => ({
      pageOrder: 2000 + post.id,
      pageType: `${post.slug}-${post.id}`,
      folder: "boards",
      fileLabel: `${post.slug}-${post.id}`,
      html: post.html,
      css: post.css,
    })),
  ];

  function selectEditorPage(pageId: string) {
    const postMatch = /^post:([a-z0-9-]+):(\d+)$/i.exec(pageId);
    if (postMatch) {
      const slug = postMatch[1].toLowerCase();
      const board = editorBoards.find((item) => item.slug === slug);
      void openSiteBoard({
        type: "crep-board",
        slug,
        view: "detail",
        postId: Number(postMatch[2]),
        pageOrder: currentSite?.pages[0]?.pageOrder ?? 1,
        label: board?.name ?? slug,
      });
      return;
    }
    if (pageId.startsWith("board:")) {
      const slug = pageId.slice("board:".length);
      const board = editorBoards.find((item) => item.slug === slug);
      void openSiteBoard({
        type: "crep-board",
        slug,
        view: "list",
        page: 1,
        pageOrder: currentSite?.pages[0]?.pageOrder ?? 1,
        label: board?.name ?? slug,
      });
      return;
    }
    if (!pageId.startsWith("page:")) return;
    const pageOrder = Number(pageId.slice("page:".length));
    if (!Number.isInteger(pageOrder)) return;
    setPreviewBoardPath(null);
    postFrame({ type: "crep-board-hide" });
    showPreviewPage(pageOrder);
  }

  return (
    <div className="relative flex h-dvh min-h-0 flex-col bg-white lg:flex-row">
      <EditSiteChatPanel
        chrome={chrome}
        siteName={currentSite?.name ?? null}
        editLog={editLog}
        currentHistoryIndex={historyIndex}
        historyLocked={historyLocked}
        onEditLogJump={handleEditLogJump}
        editLoading={editLoading}
        regenerating={regenerating}
        editRequest={editRequest}
        onEditRequestChange={setEditRequest}
        onSubmitEdit={() => void submitEditRequest()}
        canSend={
          editing &&
          selectedComponent !== null &&
          preview.kind === "ready" &&
          !saving &&
          !imageUploading
        }
        editError={editError}
        selectedComponent={selectedComponent}
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EditSitePreviewBar
          chrome={chrome}
          pagePath={
            previewBoardPath ??
            previewPathForPages(currentSite?.pages ?? [], previewPageOrder)
          }
          pages={editorPageChoices(
            currentSite?.pages ?? [],
            editorBoards,
            boardPosts,
          )}
          onSelectPage={selectEditorPage}
          viewport={viewport}
          onChangeViewport={setViewport}
          view={view}
          onChangeView={changeView}
          canStepBack={canStepBack}
          canStepForward={canStepForward}
          onStepBack={handleStepBack}
          onStepForward={handleStepForward}
          canRefresh={
            currentSite != null &&
            currentSite.pages.length > 0 &&
            !historyLocked
          }
          onRefresh={refreshPreview}
          canOpenHistory={preview.kind === "ready"}
          historyLocked={historyLocked}
          onOpenHistory={() => void openHistoryPanel()}
          canRegenerate={
            preview.kind === "ready" && preview.site.inputs != null && !saving
          }
          regenerating={regenerating}
          regenerateError={regenerateError}
          onRegenerate={openRegenerateForm}
          canSave={canSave}
          saving={saving}
          saveError={saveError}
          onSave={() => void saveCurrentDraft()}
        />
        <section
          aria-label="사이트 미리보기"
          className="m-2 flex min-h-0 flex-1 justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
        >
          {preview.kind === "ready" &&
          preview.site.pages.length > 0 &&
          previewDoc !== null ? (
            <div
              className={
                viewport === "mobile" && view !== "code"
                  ? "flex h-full w-full max-w-sm flex-col overflow-hidden border-x border-gray-300 bg-white"
                  : "flex h-full w-full flex-col"
              }
            >
              <iframe
                key={previewReloadKey}
                ref={previewFrameRef}
                title={`${preview.site.name} 미리보기`}
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                srcDoc={previewDoc}
                className={
                  view === "code" ? "hidden" : "h-full w-full border-0 bg-white"
                }
                onLoad={() => postPreviewMode(editingRef.current)}
              />
              {view === "code" ? (
                <EditSiteCodeView pages={codePages} />
              ) : null}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6">
              <p className="text-center text-sm text-gray-500">
                {previewMessage(preview)}
              </p>
            </div>
          )}
        </section>
      </div>
      <EditSiteAside
        open={sidebarOpen}
        chrome={chrome}
        onToggle={() => setSidebarOpen((open) => !open)}
        editing={editing}
        manualPanel={
          manualTarget ? (
            <EditSiteManualPanel
              element={manualTarget.element}
              backgroundTag={manualTarget.backgroundTag}
              draft={manualDraft}
              message={describeDraftIssue(manualDraft) ?? manualNotice}
              dirty={manualDirty}
              imageUploading={manualUploading}
              onChange={changeManualDraft}
              onImageFile={(file) => void handleManualImageUpload(file)}
              onBackgroundImageFile={(file) =>
                void handleBackgroundImageUpload(file)
              }
              onApply={applyManualEdit}
              onCancel={() => closeManualEdit(true)}
            />
          ) : null
        }
      />
      {historyOpen ? (
        <EditSiteHistoryDialog
          chrome={chrome.history}
          list={versionList}
          loading={historyLoading}
          error={historyError}
          busyHistoryId={busyHistoryId}
          publishingHistoryId={publishingHistoryId}
          onClose={() => setHistoryOpen(false)}
          onOpenVersion={(historyId) => void openSavedVersion(historyId)}
          onPublishVersion={(historyId) => void publishSavedVersion(historyId)}
        />
      ) : null}
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
