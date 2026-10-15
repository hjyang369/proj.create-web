import {
  bigint,
  datetime,
  index,
  int,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sites } from "./sites.js";

export const siteBoards = mysqlTable(
  "site_boards",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    siteId: bigint("site_id", { mode: "number" })
      .notNull()
      .references(() => sites.id),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    boardOrder: int("board_order").notNull().default(0),
    createdAt: datetime("created_at").notNull().default(new Date()),
  },
  (table) => [
    uniqueIndex("site_boards_site_id_slug_uniq").on(table.siteId, table.slug),
    index("site_boards_site_id_order_idx").on(table.siteId, table.boardOrder),
  ],
);

export type SiteBoard = typeof siteBoards.$inferSelect;
export type NewSiteBoard = typeof siteBoards.$inferInsert;
