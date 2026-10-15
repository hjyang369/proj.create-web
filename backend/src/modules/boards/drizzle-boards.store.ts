import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type AppDatabase,
} from "../../database/database.provider.js";
import { siteBoards } from "../../database/schema/site-boards.js";
import { sitePosts } from "../../database/schema/site-posts.js";
import { sites } from "../../database/schema/sites.js";
import type {
  BoardPostListRow,
  BoardPostRecord,
  BoardRecord,
  BoardsStore,
  BoardWriteTarget,
} from "./boards.store.js";

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

@Injectable()
export class DrizzleBoardsStore implements BoardsStore {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: AppDatabase) {}

  async findOwnerUserId(siteId: number): Promise<number | null> {
    const rows = await this.db
      .select({ userId: sites.userId })
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1);

    return rows[0]?.userId ?? null;
  }

  async findWriteTarget(
    siteId: number,
    slug: string,
  ): Promise<BoardWriteTarget | null> {
    const rows = await this.db
      .select({
        siteId: sites.id,
        siteName: sites.name,
        ownerUserId: sites.userId,
        boardId: siteBoards.id,
        boardName: siteBoards.name,
        boardSlug: siteBoards.slug,
        boardOrder: siteBoards.boardOrder,
      })
      .from(sites)
      .leftJoin(
        siteBoards,
        and(eq(siteBoards.siteId, sites.id), eq(siteBoards.slug, slug)),
      )
      .where(eq(sites.id, siteId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const board: BoardRecord | null =
      row.boardId == null
        ? null
        : {
            id: row.boardId,
            siteId: row.siteId,
            name: row.boardName ?? "",
            slug: row.boardSlug ?? slug,
            boardOrder: row.boardOrder ?? 0,
          };

    return {
      siteId: row.siteId,
      siteName: row.siteName,
      ownerUserId: row.ownerUserId,
      board,
    };
  }

  async insertBoard(input: {
    siteId: number;
    name: string;
    slug: string;
    boardOrder: number;
  }): Promise<BoardRecord> {
    const [result] = await this.db.insert(siteBoards).values({
      siteId: input.siteId,
      name: input.name,
      slug: input.slug,
      boardOrder: input.boardOrder,
      createdAt: new Date(),
    });

    return {
      id: result.insertId,
      siteId: input.siteId,
      name: input.name,
      slug: input.slug,
      boardOrder: input.boardOrder,
    };
  }

  async listBySiteId(siteId: number): Promise<BoardRecord[]> {
    return this.db
      .select({
        id: siteBoards.id,
        siteId: siteBoards.siteId,
        name: siteBoards.name,
        slug: siteBoards.slug,
        boardOrder: siteBoards.boardOrder,
      })
      .from(siteBoards)
      .where(eq(siteBoards.siteId, siteId))
      .orderBy(asc(siteBoards.boardOrder), asc(siteBoards.id));
  }

  async findWithOwner(
    boardId: number,
  ): Promise<(BoardRecord & { ownerUserId: number }) | null> {
    const rows = await this.db
      .select({
        id: siteBoards.id,
        siteId: siteBoards.siteId,
        name: siteBoards.name,
        slug: siteBoards.slug,
        boardOrder: siteBoards.boardOrder,
        ownerUserId: sites.userId,
      })
      .from(siteBoards)
      .innerJoin(sites, eq(sites.id, siteBoards.siteId))
      .where(eq(siteBoards.id, boardId))
      .limit(1);

    return rows[0] ?? null;
  }

  async listPosts(
    boardId: number,
    limit: number,
    offset: number,
  ): Promise<BoardPostListRow[]> {
    const rows = await this.db
      .select({
        id: sitePosts.id,
        title: sitePosts.title,
        createdAt: sitePosts.createdAt,
      })
      .from(sitePosts)
      .where(eq(sitePosts.boardId, boardId))
      .orderBy(desc(sitePosts.id))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: asDate(row.createdAt),
    }));
  }

  async findPost(
    boardId: number,
    postId: number,
  ): Promise<BoardPostRecord | null> {
    const rows = await this.db
      .select({
        id: sitePosts.id,
        boardId: sitePosts.boardId,
        title: sitePosts.title,
        content: sitePosts.content,
        createdAt: sitePosts.createdAt,
        updatedAt: sitePosts.updatedAt,
      })
      .from(sitePosts)
      .where(and(eq(sitePosts.boardId, boardId), eq(sitePosts.id, postId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      createdAt: asDate(row.createdAt),
      updatedAt: asDate(row.updatedAt),
    };
  }

  async insertPost(
    boardId: number,
    input: { title: string; content: string },
  ): Promise<BoardPostRecord> {
    const now = new Date();
    const [result] = await this.db.insert(sitePosts).values({
      boardId,
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.findPost(boardId, result.insertId);
    if (!saved) {
      throw new Error("글을 저장하지 못했습니다.");
    }
    return saved;
  }

  async updatePost(
    boardId: number,
    postId: number,
    input: { title: string; content: string },
  ): Promise<BoardPostRecord | null> {
    const [result] = await this.db
      .update(sitePosts)
      .set({
        title: input.title,
        content: input.content,
        updatedAt: new Date(),
      })
      .where(and(eq(sitePosts.boardId, boardId), eq(sitePosts.id, postId)));

    if (result.affectedRows === 0) {
      return null;
    }
    return this.findPost(boardId, postId);
  }

  async deletePost(boardId: number, postId: number): Promise<boolean> {
    const [result] = await this.db
      .delete(sitePosts)
      .where(and(eq(sitePosts.boardId, boardId), eq(sitePosts.id, postId)));

    return result.affectedRows > 0;
  }
}
