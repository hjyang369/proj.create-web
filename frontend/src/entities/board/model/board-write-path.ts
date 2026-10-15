export const BOARD_CREATED_CHANNEL = "crep-board";

/** 다른 탭에 보낸 저장 알림. */
export type BoardChangedNotice = {
  siteId: number;
  slug: string;
  postId: number | null;
  removed: boolean;
};

/** 크랩 AI 글쓰기 화면 주소. 글을 고를 때는 글 번호도 담는다. */
export function boardWritePath(
  siteId: string | number,
  slug: string,
  postId?: number,
): string {
  const params = new URLSearchParams({
    siteId: String(siteId).trim(),
    slug: slug.trim().toLowerCase(),
  });
  if (typeof postId === "number" && Number.isInteger(postId) && postId > 0) {
    params.set("postId", String(postId));
  }
  return `/write?${params.toString()}`;
}

/** 미리보기가 글쓰기 버튼에서 바로 뒤에 게시판 주소를 붙이는 앞부분. */
export function boardWriteBase(
  origin: string,
  siteId: string | number,
): string {
  return `${origin}${boardWritePath(siteId, "")}`;
}

/** 다른 탭에 보낸 저장 알림. 형식이 다르면 null. */
export function readBoardCreatedMessage(
  data: unknown,
): BoardChangedNotice | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record.type !== "crep-board-created") return null;
  if (
    typeof record.siteId !== "number" ||
    !Number.isInteger(record.siteId) ||
    record.siteId <= 0
  ) {
    return null;
  }
  if (typeof record.slug !== "string" || !/^[a-z0-9-]+$/.test(record.slug)) {
    return null;
  }
  let postId: number | null = null;
  if (record.postId != null) {
    if (
      typeof record.postId !== "number" ||
      !Number.isInteger(record.postId) ||
      record.postId <= 0
    ) {
      return null;
    }
    postId = record.postId;
  }
  return {
    siteId: record.siteId,
    slug: record.slug,
    postId,
    removed: record.removed === true,
  };
}

/** 글을 저장한 탭이 사이트 탭에게 새로고침을 알린다. */
export function postBoardCreated(input: {
  siteId: number;
  slug: string;
  postId?: number;
  removed?: boolean;
}): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(BOARD_CREATED_CHANNEL);
  channel.postMessage({
    type: "crep-board-created",
    siteId: input.siteId,
    slug: input.slug,
    postId: input.postId,
    removed: input.removed === true,
  });
  channel.close();
}
