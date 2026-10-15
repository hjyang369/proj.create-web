import { instance } from "@/shared/api";

export type BoardSummary = {
  id: number;
  name: string;
  slug: string;
};

export type BoardPostListItem = {
  id: number;
  title: string;
  createdAt: string;
};

export type BoardPostDetail = BoardPostListItem & {
  content: string;
};

export type BoardWriteContext = {
  siteId: number;
  siteName: string;
  boardId: number;
  boardName: string;
  slug: string;
};

export async function ensureSiteBoard(
  siteId: number,
  input: { slug: string; name: string },
): Promise<BoardSummary> {
  const { data } = await instance.post<BoardSummary>(
    `/api/boards/site/${siteId}`,
    input,
  );
  return data;
}

export async function getBoardWriteContext(
  siteId: number,
  slug: string,
): Promise<BoardWriteContext> {
  const { data } = await instance.get<BoardWriteContext>(
    `/api/boards/site/${siteId}/write-context`,
    { params: { slug } },
  );
  return data;
}

export async function listSiteBoards(siteId: number): Promise<BoardSummary[]> {
  const { data } = await instance.get<BoardSummary[]>(
    `/api/boards/site/${siteId}`,
  );
  return data;
}

export async function listBoardPosts(
  boardId: number,
  page = 1,
): Promise<BoardPostListItem[]> {
  const { data } = await instance.get<BoardPostListItem[]>(
    `/api/boards/${boardId}/posts`,
    { params: { page } },
  );
  return data;
}

export async function getBoardPost(
  boardId: number,
  postId: number,
): Promise<BoardPostDetail> {
  const { data } = await instance.get<BoardPostDetail>(
    `/api/boards/${boardId}/posts/${postId}`,
  );
  return data;
}

export async function createBoardPost(
  boardId: number,
  input: { title: string; content: string },
): Promise<BoardPostDetail> {
  const { data } = await instance.post<BoardPostDetail>(
    `/api/boards/${boardId}/posts`,
    input,
  );
  return data;
}

export async function updateBoardPost(
  boardId: number,
  postId: number,
  input: { title: string; content: string },
): Promise<BoardPostDetail> {
  const { data } = await instance.put<BoardPostDetail>(
    `/api/boards/${boardId}/posts/${postId}`,
    input,
  );
  return data;
}

export async function deleteBoardPost(
  boardId: number,
  postId: number,
): Promise<void> {
  await instance.delete(`/api/boards/${boardId}/posts/${postId}`);
}
