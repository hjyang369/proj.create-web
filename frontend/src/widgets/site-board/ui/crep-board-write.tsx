"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/features/auth";
import {
  createBoardPost,
  deleteBoardPost,
  getBoardPost,
  getBoardWriteContext,
  postBoardCreated,
  updateBoardPost,
  type BoardPostDetail,
  type BoardWriteContext,
} from "@/entities/board";

const inputCls = `w-full h-11 px-3
  text-sm text-gray-900
  bg-white border border-gray-300 rounded-lg
  focus:border-gray-500 focus:outline-none`;

const textareaCls = `w-full min-h-48 px-3 py-2.5
  text-sm text-gray-900
  bg-white border border-gray-300 rounded-lg
  focus:border-gray-500 focus:outline-none`;

const quietButtonCls = `flex items-center
  h-10 px-4
  text-sm text-gray-800
  bg-white border border-gray-300 rounded-lg
  hover:bg-gray-50
  disabled:opacity-40`;

const primaryButtonCls = `flex items-center
  h-10 px-4
  text-sm text-white
  bg-black rounded-lg
  hover:bg-gray-900
  disabled:opacity-40`;

export function CrepBoardWriteScreen() {
  const params = useSearchParams();
  const siteId = params.get("siteId") ?? "";
  const slug = params.get("slug") ?? "";
  const postIdRaw = params.get("postId");
  const postId =
    postIdRaw == null || postIdRaw === "" ? null : Number(postIdRaw);
  const { user, ready } = useSession();
  const [context, setContext] = useState<BoardWriteContext | null>(null);
  const [post, setPost] = useState<BoardPostDetail | null>(null);
  const [status, setStatus] = useState("글을 준비하는 중입니다.");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setContext(null);
      setStatus("");
      return;
    }

    const id = Number(siteId);
    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !/^[a-z0-9-]+$/i.test(slug) ||
      (postId != null && (!Number.isInteger(postId) || postId <= 0))
    ) {
      setContext(null);
      setPost(null);
      setStatus("게시판을 찾을 수 없습니다.");
      return;
    }

    let cancelled = false;
    setStatus("글을 준비하는 중입니다.");
    getBoardWriteContext(id, slug)
      .then(async (loaded) => {
        if (cancelled) return;
        const loadedPost =
          postId == null ? null : await getBoardPost(loaded.boardId, postId);
        if (cancelled) return;
        setContext(loaded);
        setPost(loadedPost);
        setTitle(loadedPost?.title ?? "");
        setContent(loadedPost?.content ?? "");
        setStatus("");
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setContext(null);
        setStatus(
          loadError instanceof Error
            ? loadError.message
            : "게시판을 불러오지 못했습니다.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [postId, ready, siteId, slug, user]);

  async function save() {
    if (!context) return;
    if (title.trim() === "" || content.trim() === "") {
      setError("제목과 내용을 입력해 주세요.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const input = { title: title.trim(), content: content.trim() };
      const savedPost = post
        ? await updateBoardPost(context.boardId, post.id, input)
        : await createBoardPost(context.boardId, input);
      postBoardCreated({
        siteId: context.siteId,
        slug: context.slug,
        postId: savedPost.id,
      });
      setPost(savedPost);
      setEditing(false);
      setSaved(post == null);
      setPending(false);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "글을 저장하지 못했습니다.",
      );
      setPending(false);
    }
  }

  async function remove() {
    if (!context || !post) return;
    if (!window.confirm("이 글을 삭제할까요?")) return;
    setPending(true);
    setError(null);
    try {
      await deleteBoardPost(context.boardId, post.id);
      postBoardCreated({
        siteId: context.siteId,
        slug: context.slug,
        postId: post.id,
        removed: true,
      });
      setRemoved(true);
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "글을 삭제하지 못했습니다.",
      );
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-12">
      {mounted && status ? (
        <p className="text-sm text-gray-500">{status}</p>
      ) : null}
      {!mounted ? (
        <p className="text-sm text-gray-500">글을 준비하는 중입니다.</p>
      ) : null}
      {mounted && ready && !user ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-800">글을 쓰려면 로그인해 주세요.</p>
          <Link
            href="/login"
            className="flex items-center self-start
              h-10 px-4
              text-sm text-white
              bg-black rounded-lg
              hover:bg-gray-900"
          >
            로그인
          </Link>
        </div>
      ) : null}
      {mounted && context && removed ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">{context.siteName}</p>
          <h1 className="text-2xl font-semibold text-black">
            글을 삭제했습니다.
          </h1>
        </div>
      ) : null}
      {mounted && context && saved ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">{context.siteName}</p>
          <h1 className="text-2xl font-semibold text-black">
            {context.boardName}에 글을 저장했습니다.
          </h1>
          <p className="text-sm text-gray-800">
            사이트 목록에서 이 글을 볼 수 있습니다.
          </p>
        </div>
      ) : null}
      {mounted && context && post && !saved && !removed && !editing ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">{context.siteName}</p>
          <h1 className="text-2xl font-semibold text-black">{post.title}</h1>
          <p className="whitespace-pre-wrap text-base leading-7 text-gray-800">
            {post.content}
          </p>
          {error ? (
            <p role="alert" className="text-sm text-gray-800">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTitle(post.title);
                setContent(post.content);
                setEditing(true);
                setError(null);
              }}
              className={quietButtonCls}
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={pending}
              className={quietButtonCls}
            >
              삭제
            </button>
          </div>
        </div>
      ) : null}
      {mounted && context && !saved && !removed && (post == null || editing) ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <p className="text-sm text-gray-500">{context.siteName}</p>
          <h1 className="text-2xl font-semibold text-black">
            {post ? `${context.boardName} 수정` : `${context.boardName} 글쓰기`}
          </h1>
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-800">
            제목
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputCls}
              maxLength={255}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-800">
            내용
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className={textareaCls}
              maxLength={20000}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-gray-800">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className={`${primaryButtonCls} self-start`}
          >
            {pending ? "저장 중..." : "저장"}
          </button>
        </form>
      ) : null}
    </main>
  );
}
