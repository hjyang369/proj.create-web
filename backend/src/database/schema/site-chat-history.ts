import {
  bigint,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
} from "drizzle-orm/mysql-core";
import { sites } from "./sites.js";

export const siteChatHistory = mysqlTable(
  "site_chat_history",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    siteId: bigint("site_id", { mode: "number" })
      .notNull()
      .references(() => sites.id),
    type: mysqlEnum("type", ["ai-edit", "regenerate"]).notNull(),
    label: text("label").notNull(),
    pageOrder: int("page_order"),
    createdAt: datetime("created_at").notNull().default(new Date()),
  },
  (table) => [
    index("site_chat_history_site_id_id_idx").on(table.siteId, table.id),
  ],
);

export type SiteChatHistory = typeof siteChatHistory.$inferSelect;
export type NewSiteChatHistory = typeof siteChatHistory.$inferInsert;
