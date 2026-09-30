import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type AppDatabase,
} from "../../database/database.provider.js";
import { sites } from "../../database/schema/sites.js";
import type { SitesStore, StoredSite } from "./sites.store.js";

@Injectable()
export class DrizzleSitesStore implements SitesStore {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: AppDatabase) {}

  async listByUserId(userId: number): Promise<StoredSite[]> {
    const rows = await this.db
      .select({
        id: sites.id,
        userId: sites.userId,
        name: sites.name,
        type: sites.type,
        status: sites.status,
        thumbnailUrl: sites.thumbnailUrl,
        updatedAt: sites.updatedAt,
      })
      .from(sites)
      .where(eq(sites.userId, userId))
      .orderBy(desc(sites.updatedAt));

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type,
      status: row.status,
      thumbnailUrl: row.thumbnailUrl,
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
    }));
  }
}
