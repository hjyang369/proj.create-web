import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { BoardsService } from "./boards.service.js";
import type {
  BoardPostRecord,
  BoardRecord,
  BoardsStore,
} from "./boards.store.js";

function memoryStore(ownerUserId = 7): BoardsStore & {
  posts: BoardPostRecord[];
} {
  const boards: BoardRecord[] = [
    {
      id: 3,
      siteId: 10,
      name: "뉴스",
      slug: "news",
      boardOrder: 0,
    },
  ];
  const posts: BoardPostRecord[] = [];
  let nextId = 1;

  return {
    posts,
    async listBySiteId(siteId) {
      return boards
        .filter((board) => board.siteId === siteId)
        .sort((left, right) => left.boardOrder - right.boardOrder);
    },
    async findWithOwner(boardId) {
      const board = boards.find((item) => item.id === boardId);
      return board ? { ...board, ownerUserId } : null;
    },
    async listPosts(boardId, limit, offset) {
      return posts
        .filter((post) => post.boardId === boardId)
        .sort((left, right) => right.id - left.id)
        .slice(offset, offset + limit)
        .map((post) => ({
          id: post.id,
          title: post.title,
          createdAt: post.createdAt,
        }));
    },
    async findPost(boardId, postId) {
      return (
        posts.find((post) => post.boardId === boardId && post.id === postId) ??
        null
      );
    },
    async insertPost(boardId, input) {
      const now = new Date("2026-10-15T00:00:00.000Z");
      const post: BoardPostRecord = {
        id: nextId,
        boardId,
        title: input.title,
        content: input.content,
        createdAt: now,
        updatedAt: now,
      };
      nextId += 1;
      posts.push(post);
      return post;
    },
    async updatePost(boardId, postId, input) {
      const post = posts.find(
        (item) => item.boardId === boardId && item.id === postId,
      );
      if (!post) return null;
      post.title = input.title;
      post.content = input.content;
      post.updatedAt = new Date("2026-10-15T01:00:00.000Z");
      return post;
    },
    async findOwnerUserId(siteId) {
      return siteId === 10 ? ownerUserId : null;
    },
    async findWriteTarget(siteId, slug) {
      if (siteId !== 10) return null;
      const board =
        boards.find((item) => item.siteId === siteId && item.slug === slug) ??
        null;
      return {
        siteId,
        siteName: "크랩 카페",
        ownerUserId,
        board,
      };
    },
    async insertBoard(input) {
      const board: BoardRecord = {
        id: boards.length + 10,
        siteId: input.siteId,
        name: input.name,
        slug: input.slug,
        boardOrder: input.boardOrder,
      };
      boards.push(board);
      return board;
    },
    async deletePost(boardId, postId) {
      const index = posts.findIndex(
        (item) => item.boardId === boardId && item.id === postId,
      );
      if (index < 0) return false;
      posts.splice(index, 1);
      return true;
    },
  };
}

describe("BoardsService", () => {
  it("사이트 게시판 목록을 순서대로 돌려준다", async () => {
    const service = new BoardsService(memoryStore());

    await expect(service.listBySite(10)).resolves.toEqual([
      { id: 3, name: "뉴스", slug: "news" },
    ]);
  });

  it("글 목록은 최신 20개만 제목과 작성일로 돌려준다", async () => {
    const store = memoryStore();
    const service = new BoardsService(store);
    for (let index = 0; index < 21; index += 1) {
      await store.insertPost(3, {
        title: `글 ${index + 1}`,
        content: "본문",
      });
    }

    const page = await service.listPosts(3, 1);

    expect(page).toHaveLength(20);
    expect(page[0]).toMatchObject({ id: 21, title: "글 21" });
    expect(page[0]?.createdAt).toBe("2026-10-15T00:00:00.000Z");
    expect(page.some((post) => post.id === 1)).toBe(false);
    expect(page[0]).not.toHaveProperty("content");
  });

  it("다른 사람 사이트에는 글을 쓰지 못한다", async () => {
    const service = new BoardsService(memoryStore(7));

    await expect(
      service.createPost(8, 3, { title: "제목", content: "본문" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("빈 제목은 저장하지 않는다", async () => {
    const store = memoryStore();
    const service = new BoardsService(store);

    await expect(
      service.createPost(7, 3, { title: "  ", content: "본문" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(store.posts).toHaveLength(0);
  });

  it("없는 게시판의 글은 찾을 수 없다", async () => {
    const service = new BoardsService(memoryStore());

    await expect(service.listPosts(99, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("주인만 글을 지울 수 있다", async () => {
    const store = memoryStore();
    const service = new BoardsService(store);
    const created = await service.createPost(7, 3, {
      title: "제목",
      content: "본문",
    });

    await expect(service.deletePost(8, 3, created.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(store.posts).toHaveLength(1);

    await expect(service.deletePost(7, 3, created.id)).resolves.toEqual({
      deleted: true,
    });
    expect(store.posts).toHaveLength(0);
  });

  it("주인만 아직 없는 게시판을 만들 수 있다", async () => {
    const service = new BoardsService(memoryStore());

    await expect(
      service.ensureOwnedBoard(8, 10, { name: "소식", slug: "Notice" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.ensureOwnedBoard(7, 10, { name: "소식", slug: "Notice" }),
    ).resolves.toMatchObject({ name: "소식", slug: "notice" });

    await expect(service.listBySite(10)).resolves.toEqual([
      { id: 3, name: "뉴스", slug: "news" },
      { id: 11, name: "소식", slug: "notice" },
    ]);
  });

  it("주인은 글 내용을 고치고 다시 읽는다", async () => {
    const service = new BoardsService(memoryStore());
    const created = await service.createPost(7, 3, {
      title: "제목",
      content: "본문",
    });

    const updated = await service.updatePost(7, 3, created.id, {
      title: "고친 제목",
      content: "고친 본문",
    });

    await expect(service.getPost(3, created.id)).resolves.toEqual(updated);
    expect(updated.content).toBe("고친 본문");
  });

  it("주인에게 글쓰기 화면용 사이트 이름과 게시판 이름을 돌려준다", async () => {
    const service = new BoardsService(memoryStore());

    await expect(service.getWriteContext(7, 10, "News")).resolves.toEqual({
      siteId: 10,
      siteName: "크랩 카페",
      boardId: 3,
      boardName: "뉴스",
      slug: "news",
    });
  });

  it("다른 사람은 글쓰기 화면 정보를 받지 못한다", async () => {
    const service = new BoardsService(memoryStore());

    await expect(service.getWriteContext(8, 10, "news")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("없는 게시판이면 글쓰기 화면을 열 수 없다", async () => {
    const service = new BoardsService(memoryStore());

    await expect(service.getWriteContext(7, 10, "blog")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("없는 사이트면 글쓰기 화면을 열 수 없다", async () => {
    const service = new BoardsService(memoryStore());

    await expect(
      service.getWriteContext(7, 99, "news"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("이상한 게시판 주소는 사이트를 조회하지 않는다", async () => {
    const store = memoryStore();
    store.findWriteTarget = async () => {
      throw new Error("should not query");
    };
    const service = new BoardsService(store);

    await expect(
      service.getWriteContext(7, 10, "뉴스!"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
