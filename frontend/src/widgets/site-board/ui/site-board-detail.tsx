"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/features/auth";
import { getMySite } from "@/entities/site";
import {
  boardWritePath,
  formatBoardDate,
  getBoardPost,
  listSiteBoards,
  type BoardPostDetail,
} from "@/entities/board";
import { BoardStatus, SiteBoardFrame } from "./site-board-frame";

export function SiteBoardDetailScreen({
  siteId,
  slug,
  postId,
}: {
  siteId: string;
  slug: string;
  postId: string;
}) {
  const { user, ready } = useSession();
  const [post, setPost] = useState<BoardPostDetail | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [status, setStatus] = useState("글을 불러오는 중입니다.");

  useEffect(() => {
    if (!ready) return;
    const id = Number(siteId);
    const parsedPostId = Number(postId);
    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !Number.isInteger(parsedPostId) ||
      parsedPostId <= 0
    ) {
      setStatus("글을 찾을 수 없습니다.");
      return;
    }

    let cancelled = false;
    listSiteBoards(id)
      .then(async (boards) => {
        const board = boards.find((item) => item.slug === slug);
        if (!board) {
          if (!cancelled) setStatus("게시판을 찾을 수 없습니다.");
          return;
        }
        const [loaded, owned] = await Promise.all([
          getBoardPost(board.id, parsedPostId),
          user
            ? getMySite(id).then(
                () => true,
                () => false,
              )
            : Promise.resolve(false),
        ]);
        if (cancelled) return;
        setPost(loaded);
        setCanWrite(owned);
        setStatus("");
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setStatus(
          loadError instanceof Error
            ? loadError.message
            : "글을 불러오지 못했습니다.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [postId, ready, siteId, slug, user]);

  return (
    <SiteBoardFrame siteId={siteId} title={post?.title ?? "글"}>
      {status ? <BoardStatus>{status}</BoardStatus> : null}
      {post ? (
        <>
          <p className="text-sm text-gray-400">
            {formatBoardDate(post.createdAt)}
          </p>
          <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-gray-800">
            {post.content}
          </p>
        </>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href={`/s/${siteId}/board/${slug}`}
          className="flex items-center
            h-10 px-4
            text-sm text-gray-800
            border border-gray-300 rounded-lg
            hover:bg-gray-50"
        >
          목록으로
        </Link>
        {canWrite && post ? (
          <button
            type="button"
            onClick={() => {
              window.open(boardWritePath(siteId, slug, post.id), "_blank");
            }}
            className="flex items-center
              h-10 px-4
              text-sm text-gray-800
              border border-gray-300 rounded-lg
              hover:bg-gray-50"
          >
            관리
          </button>
        ) : null}
      </div>
    </SiteBoardFrame>
  );
}
