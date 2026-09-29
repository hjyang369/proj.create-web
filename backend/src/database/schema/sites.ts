import {
  bigint,
  datetime,
  mysqlEnum,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./users.js";

export const sites = mysqlTable("sites", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["web", "app"]).notNull(),
  status: mysqlEnum("status", ["generating", "draft", "published"])
    .notNull()
    .default("draft"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  createdAt: datetime("created_at").notNull().default(new Date()),
  updatedAt: datetime("updated_at").notNull().default(new Date()),
});

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
