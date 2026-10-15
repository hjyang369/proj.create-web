"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/features/auth";
import { getMySite } from "@/entities/site";
import {
  BOARD_CREATED_CHANNEL,
  boardWritePath,
  ensureSiteBoard,
  formatBoardDate,
  listBoardPosts,
  listSiteBoards,
  readBoardCreatedMessage,
  type BoardPostListItem,
  type BoardSummary,
} from "@/entities/board";
import { BoardStatus, SiteBoardFrame } from "./site-board-frame";

type ListState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      board: BoardSummary;
      posts: BoardPostListItem[];
      page: number;
      canWrite: boolean;
    };

export function SiteBoardListScreen({
  siteId,
  slug,
}: {
  siteId: string;
  slug: string;
}) {
  const { user, ready } = useSession();
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const boardIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;

    const id = Number(siteId);
    if (!Number.isInteger(id) || id <= 0) {
      setState({ kind: "invalid" });
      return;
    }

    let cancelled = false;
    setState({ kind: "loading" });

    Promise.all([
      listSiteBoards(id),
      user
        ? getMySite(id).then(
            () => true,
            () => false,
          )
        : Promise.resolve(false),
    ])
      .then(async ([boards, canWrite]) => {
        if (cancelled) return;
        let board = boards.find(
          (item) => item.slug.toLowerCase() === slug.toLowerCase(),
        );
        if (!board && user) {
          try {
            board = await ensureSiteBoard(id, { slug, name: slug });
          } catch {
            board = undefined;
          }
        }
        if (!board) {
          setState({ kind: "missing" });
          return;
        }
        const posts = await listBoardPosts(board.id, 1);
        if (cancelled) return;
        boardIdRef.current = board.id;
        setState({ kind: "ready", board, posts, page: 1, canWrite });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "게시판을 불러오지 못했습니다.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [ready, siteId, slug, user]);

  useEffect(() => {
    const channel = new BroadcastChannel(BOARD_CREATED_CHANNEL);
    channel.onmessage = (event) => {
      const created = readBoardCreatedMessage(event.data);
      const boardId = boardIdRef.current;
      if (
        !created ||
        boardId == null ||
        String(created.siteId) !== siteId ||
        created.slug !== slug.toLowerCase()
      ) {
        return;
      }
      void listBoardPosts(boardId, 1).then((posts) => {
        setState((latest) =>
          latest.kind === "ready" ? { ...latest, posts, page: 1 } : latest,
        );
      });
    };
    return () => channel.close();
  }, [siteId, slug]);

  async function changePage(nextPage: number) {
    if (state.kind !== "ready") return;
    const posts = await listBoardPosts(state.board.id, nextPage);
    setState({ ...state, posts, page: nextPage });
  }

  if (state.kind === "loading") {
    return (
      <SiteBoardFrame siteId={siteId} title="게시판">
        <BoardStatus>글을 불러오는 중입니다.</BoardStatus>
      </SiteBoardFrame>
    );
  }

  if (state.kind === "invalid" || state.kind === "missing") {
    return (
      <SiteBoardFrame siteId={siteId} title="게시판">
        <BoardStatus>게시판을 찾을 수 없습니다.</BoardStatus>
      </SiteBoardFrame>
    );
  }

  if (state.kind === "error") {
    return (
      <SiteBoardFrame siteId={siteId} title="게시판">
        <BoardStatus>{state.message}</BoardStatus>
      </SiteBoardFrame>
    );
  }

  return (
    <SiteBoardFrame siteId={siteId} title={state.board.name}>
      {state.posts.length === 0 ? (
        <BoardStatus>아직 글이 없습니다.</BoardStatus>
      ) : (
        <ul className="border-t border-gray-200">
          {state.posts.map((post) => (
            <li key={post.id} className="border-b border-gray-200">
              <Link
                href={`/s/${siteId}/board/${slug}/${post.id}`}
                className="flex items-center justify-between gap-4 py-4 text-gray-900 hover:text-black"
              >
                <span className="text-base">{post.title}</span>
                <span className="shrink-0 text-sm text-gray-400">
                  {formatBoardDate(post.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {state.page > 1 ? (
            <button
              type="button"
              onClick={() => void changePage(state.page - 1)}
              className="h-10 px-4 text-sm text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              이전
            </button>
          ) : null}
          {state.posts.length === 20 ? (
            <button
              type="button"
              onClick={() => void changePage(state.page + 1)}
              className="h-10 px-4 text-sm text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              다음
            </button>
          ) : null}
        </div>
        {state.canWrite ? (
          <button
            type="button"
            onClick={() => {
              window.open(boardWritePath(siteId, slug), "_blank");
            }}
            className="flex items-center
              h-10 px-4
              text-sm text-white
              bg-black rounded-lg
              hover:bg-gray-900"
          >
            글쓰기
          </button>
        ) : null}
      </div>
    </SiteBoardFrame>
  );
}
