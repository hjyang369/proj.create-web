import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BOARDS_STORE,
  POST_PAGE_SIZE,
  type BoardPostRecord,
  type BoardsStore,
} from "./boards.store.js";

export type BoardListItem = {
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

function toDetail(post: BoardPostRecord): BoardPostDetail {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
  };
}

function readText(value: string, emptyMessage: string): string {
  const text = value.trim();
  if (!text) {
    throw new BadRequestException(emptyMessage);
  }
  return text;
}

@Injectable()
export class BoardsService {
  constructor(@Inject(BOARDS_STORE) private readonly boards: BoardsStore) {}

  async ensureOwnedBoard(
    userId: number,
    siteId: number,
    input: { name: string; slug: string },
  ): Promise<BoardListItem> {
    const ownerUserId = await this.boards.findOwnerUserId(siteId);
    if (ownerUserId == null) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }
    if (ownerUserId !== userId) {
      throw new ForbiddenException("이 사이트의 글만 작성할 수 있습니다.");
    }

    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException("게시판 주소가 올바르지 않습니다.");
    }
    const name = input.name.trim().slice(0, 100) || slug;
    const boards = await this.boards.listBySiteId(siteId);
    const existing = boards.find((board) => board.slug === slug);
    if (existing) {
      return { id: existing.id, name: existing.name, slug: existing.slug };
    }

    const created = await this.boards.insertBoard({
      siteId,
      name,
      slug,
      boardOrder: boards.length,
    });
    return { id: created.id, name: created.name, slug: created.slug };
  }

  async getWriteContext(
    userId: number,
    siteId: number,
    slugInput: string,
  ): Promise<BoardWriteContext> {
    const slug = slugInput.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException("게시판 주소가 올바르지 않습니다.");
    }

    const target = await this.boards.findWriteTarget(siteId, slug);
    if (!target) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }
    if (target.ownerUserId !== userId) {
      throw new ForbiddenException("이 사이트의 글만 작성할 수 있습니다.");
    }
    if (!target.board) {
      throw new NotFoundException("게시판을 찾을 수 없습니다.");
    }

    return {
      siteId: target.siteId,
      siteName: target.siteName,
      boardId: target.board.id,
      boardName: target.board.name,
      slug: target.board.slug,
    };
  }

  async listBySite(siteId: number): Promise<BoardListItem[]> {
    const rows = await this.boards.listBySiteId(siteId);
    return rows.map((board) => ({
      id: board.id,
      name: board.name,
      slug: board.slug,
    }));
  }

  async listPosts(boardId: number, page: number): Promise<BoardPostListItem[]> {
    const board = await this.boards.findWithOwner(boardId);
    if (!board) {
      throw new NotFoundException("게시판을 찾을 수 없습니다.");
    }

    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const rows = await this.boards.listPosts(
      boardId,
      POST_PAGE_SIZE,
      (safePage - 1) * POST_PAGE_SIZE,
    );
    return rows.map((post) => ({
      id: post.id,
      title: post.title,
      createdAt: post.createdAt.toISOString(),
    }));
  }

  async getPost(boardId: number, postId: number): Promise<BoardPostDetail> {
    const board = await this.boards.findWithOwner(boardId);
    if (!board) {
      throw new NotFoundException("게시판을 찾을 수 없습니다.");
    }

    const post = await this.boards.findPost(boardId, postId);
    if (!post) {
      throw new NotFoundException("글을 찾을 수 없습니다.");
    }
    return toDetail(post);
  }

  async createPost(
    userId: number,
    boardId: number,
    input: { title: string; content: string },
  ): Promise<BoardPostDetail> {
    await this.assertOwner(userId, boardId);
    const title = readText(input.title, "제목을 입력해 주세요.");
    const content = readText(input.content, "내용을 입력해 주세요.");
    const post = await this.boards.insertPost(boardId, { title, content });
    return toDetail(post);
  }

  async updatePost(
    userId: number,
    boardId: number,
    postId: number,
    input: { title: string; content: string },
  ): Promise<BoardPostDetail> {
    await this.assertOwner(userId, boardId);
    const title = readText(input.title, "제목을 입력해 주세요.");
    const content = readText(input.content, "내용을 입력해 주세요.");
    const post = await this.boards.updatePost(boardId, postId, {
      title,
      content,
    });
    if (!post) {
      throw new NotFoundException("글을 찾을 수 없습니다.");
    }
    return toDetail(post);
  }

  async deletePost(
    userId: number,
    boardId: number,
    postId: number,
  ): Promise<{ deleted: true }> {
    await this.assertOwner(userId, boardId);
    const deleted = await this.boards.deletePost(boardId, postId);
    if (!deleted) {
      throw new NotFoundException("글을 찾을 수 없습니다.");
    }
    return { deleted: true };
  }

  private async assertOwner(userId: number, boardId: number): Promise<void> {
    const board = await this.boards.findWithOwner(boardId);
    if (!board) {
      throw new NotFoundException("게시판을 찾을 수 없습니다.");
    }
    if (board.ownerUserId !== userId) {
      throw new ForbiddenException("이 사이트의 글만 작성할 수 있습니다.");
    }
  }
}
