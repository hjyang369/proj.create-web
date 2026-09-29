import {
  bigint,
  datetime,
  int,
  mysqlEnum,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";
import { sites } from "./sites.js";

export const siteImages = mysqlTable("site_images", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  siteId: bigint("site_id", { mode: "number" })
    .notNull()
    .references(() => sites.id),
  type: mysqlEnum("type", ["logo", "site_image"]).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  originalName: varchar("original_name", { length: 255 }),
  order: int("order").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(new Date()),
});

export type SiteImage = typeof siteImages.$inferSelect;
export type NewSiteImage = typeof siteImages.$inferInsert;
