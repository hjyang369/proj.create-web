import {
  bigint,
  datetime,
  int,
  json,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";
import { sites } from "./sites.js";

export const sitePages = mysqlTable("site_pages", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  siteId: bigint("site_id", { mode: "number" })
    .notNull()
    .references(() => sites.id),
  pageType: varchar("page_type", { length: 100 }).notNull(),
  pageOrder: int("page_order").notNull(),
  componentData: json("component_data").notNull(),
  createdAt: datetime("created_at").notNull().default(new Date()),
  updatedAt: datetime("updated_at").notNull().default(new Date()),
});

export type SitePage = typeof sitePages.$inferSelect;
export type NewSitePage = typeof sitePages.$inferInsert;
