import {
  bigint,
  datetime,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { sites } from "./sites.js";

export const siteInputs = mysqlTable("site_inputs", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  siteId: bigint("site_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => sites.id),
  businessType: varchar("business_type", { length: 255 }),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  oneLineIntro: varchar("one_line_intro", { length: 500 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  extraContact: text("extra_contact"),
  purpose: mysqlEnum("purpose", [
    "company_intro",
    "investment",
    "sales",
    "recruitment",
    "promotion",
    "inquiry",
  ]).notNull(),
  targetCustomer: varchar("target_customer", { length: 500 }),
  mainColor: varchar("main_color", { length: 100 }),
  atmosphere: varchar("atmosphere", { length: 255 }),
  pageCount: int("page_count").notNull().default(1),
  pageComponents: json("page_components"),
  referenceUrl: varchar("reference_url", { length: 500 }),
  optionalLinks: json("optional_links"),
  createdAt: datetime("created_at").notNull().default(new Date()),
  updatedAt: datetime("updated_at").notNull().default(new Date()),
});

export type SiteInput = typeof siteInputs.$inferSelect;
export type NewSiteInput = typeof siteInputs.$inferInsert;
