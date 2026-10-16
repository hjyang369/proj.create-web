import {
  bigint,
  datetime,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sites } from "./sites.js";

export const siteMembers = mysqlTable(
  "site_members",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    siteId: bigint("site_id", { mode: "number" })
      .notNull()
      .references(() => sites.id),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: datetime("created_at").notNull().default(new Date()),
    updatedAt: datetime("updated_at").notNull().default(new Date()),
  },
  (table) => [
    uniqueIndex("site_members_site_id_email_uniq").on(table.siteId, table.email),
  ],
);

export type SiteMember = typeof siteMembers.$inferSelect;
export type NewSiteMember = typeof siteMembers.$inferInsert;
