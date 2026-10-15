export type BoardRecord = {
  id: number;
  siteId: number;
  name: string;
  slug: string;
  boardOrder: number;
};

export type BoardPostRecord = {
  id: number;
  boardId: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BoardPostListRow = Pick<
  BoardPostRecord,
  "id" | "title" | "createdAt"
>;

/** 글쓰기 화면이 열릴 사이트. 게시판이 없으면 board는 null. */
export type BoardWriteTarget = {
  siteId: number;
  siteName: string;
  ownerUserId: number;
  board: BoardRecord | null;
};

export type BoardsStore = {
  listBySiteId: (siteId: number) => Promise<BoardRecord[]>;
  findOwnerUserId: (siteId: number) => Promise<number | null>;
  findWriteTarget: (
    siteId: number,
    slug: string,
  ) => Promise<BoardWriteTarget | null>;
  insertBoard: (input: {
    siteId: number;
    name: string;
    slug: string;
    boardOrder: number;
  }) => Promise<BoardRecord>;
  findWithOwner: (
    boardId: number,
  ) => Promise<(BoardRecord & { ownerUserId: number }) | null>;
  listPosts: (
    boardId: number,
    limit: number,
    offset: number,
  ) => Promise<BoardPostListRow[]>;
  findPost: (
    boardId: number,
    postId: number,
  ) => Promise<BoardPostRecord | null>;
  insertPost: (
    boardId: number,
    input: { title: string; content: string },
  ) => Promise<BoardPostRecord>;
  updatePost: (
    boardId: number,
    postId: number,
    input: { title: string; content: string },
  ) => Promise<BoardPostRecord | null>;
  deletePost: (boardId: number, postId: number) => Promise<boolean>;
};

export const BOARDS_STORE = Symbol("BOARDS_STORE");

export const POST_PAGE_SIZE = 20;
