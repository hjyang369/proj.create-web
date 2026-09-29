import {
  bigint,
  datetime,
  json,
  mysqlTable,
} from "drizzle-orm/mysql-core";
import { sites } from "./sites.js";

export const siteEditHistory = mysqlTable("site_edit_history", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  siteId: bigint("site_id", { mode: "number" })
    .notNull()
    .references(() => sites.id),
  snapshot: json("snapshot").notNull(),
  createdAt: datetime("created_at").notNull().default(new Date()),
});

export type SiteEditHistory = typeof siteEditHistory.$inferSelect;
export type NewSiteEditHistory = typeof siteEditHistory.$inferInsert;
