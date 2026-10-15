import {
  bigint,
  datetime,
  index,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { siteBoards } from "./site-boards.js";

export const sitePosts = mysqlTable(
  "site_posts",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    boardId: bigint("board_id", { mode: "number" })
      .notNull()
      .references(() => siteBoards.id),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    createdAt: datetime("created_at").notNull().default(new Date()),
    updatedAt: datetime("updated_at").notNull().default(new Date()),
  },
  (table) => [
    index("site_posts_board_id_id_idx").on(table.boardId, table.id),
  ],
);

export type SitePost = typeof sitePosts.$inferSelect;
export type NewSitePost = typeof sitePosts.$inferInsert;
