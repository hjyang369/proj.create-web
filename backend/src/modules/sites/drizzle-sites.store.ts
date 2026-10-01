import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type AppDatabase,
} from "../../database/database.provider.js";
import { sites } from "../../database/schema/sites.js";
import { siteInputs } from "../../database/schema/site-inputs.js";
import { siteImages } from "../../database/schema/site-images.js";
import { sitePages } from "../../database/schema/site-pages.js";
import type { GeneratedSitePage } from "./site-generation-response.js";
import { readStoredPageContent } from "./site-page-content.js";
import type {
  SitesStore,
  StoredOwnedSite,
  StoredSite,
  CreateSiteRecord,
} from "./sites.store.js";

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

  async create(data: CreateSiteRecord): Promise<{ id: number }> {
    const now = new Date();

    return this.db.transaction(async (tx) => {
      // ── 1. sites 테이블에 행 삽입
      const [siteResult] = await tx.insert(sites).values({
        userId: data.userId,
        name: data.name,
        type: "web",
        status: "generating",
        createdAt: now,
        updatedAt: now,
      });

      const siteId = siteResult.insertId;

      // ── 2. site_inputs 테이블에 입력 데이터 저장
      await tx.insert(siteInputs).values({
        siteId,
        businessType: data.businessType ?? null,
        companyName: data.name,
        oneLineIntro: data.oneLineIntro,
        description: data.description ?? null,
        address: data.address ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        purpose: data.purpose,
        targetCustomer: data.targetCustomer ?? null,
        mainColor: data.mainColor ?? null,
        atmosphere: data.atmosphere ?? null,
        extraRequest: data.extraRequest ?? null,
        pageCount: data.pageCount,
        pageComponents: data.pageComponents ?? null,
        referenceUrl: data.referenceUrl ?? null,
        optionalLinks: data.optionalLinks ?? null,
        createdAt: now,
        updatedAt: now,
      });

      // ── 3. site_images 테이블에 이미지 저장 (있을 때만)
      const imageRows: Array<{
        siteId: number;
        type: "logo" | "site_image";
        url: string;
        originalName: string;
        order: number;
        createdAt: Date;
      }> = [];

      if (data.logo) {
        imageRows.push({
          siteId,
          type: "logo",
          url: data.logo.url,
          originalName: data.logo.originalName,
          order: 0,
          createdAt: now,
        });
      }

      data.photos.forEach((photo, index) => {
        imageRows.push({
          siteId,
          type: "site_image",
          url: photo.url,
          originalName: photo.originalName,
          order: index,
          createdAt: now,
        });
      });

      if (imageRows.length > 0) {
        await tx.insert(siteImages).values(imageRows);
      }

      return { id: siteId };
    });
  }

  async saveGeneratedPages(
    siteId: number,
    pages: GeneratedSitePage[],
  ): Promise<void> {
    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx.insert(sitePages).values(
        pages.map((page) => ({
          siteId,
          pageType: page.pageType,
          pageOrder: page.pageOrder,
          componentData: {
            html: page.html,
            css: page.css,
          },
          createdAt: now,
          updatedAt: now,
        })),
      );

      await tx
        .update(sites)
        .set({
          status: "draft",
          updatedAt: now,
        })
        .where(eq(sites.id, siteId));
    });
  }

  async findOwnedWithPages(
    userId: number,
    siteId: number,
  ): Promise<StoredOwnedSite | null> {
    const rows = await this.db
      .select({
        id: sites.id,
        userId: sites.userId,
        name: sites.name,
        pageType: sitePages.pageType,
        pageOrder: sitePages.pageOrder,
        componentData: sitePages.componentData,
      })
      .from(sites)
      .leftJoin(sitePages, eq(sitePages.siteId, sites.id))
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .orderBy(asc(sitePages.pageOrder));

    const first = rows[0];
    if (!first) {
      return null;
    }

    const pages: StoredOwnedSite["pages"] = [];
    for (const row of rows) {
      if (row.pageType == null || row.pageOrder == null) {
        continue;
      }

      const content = readStoredPageContent(row.componentData);
      if (!content) {
        continue;
      }

      pages.push({
        pageType: row.pageType,
        pageOrder: row.pageOrder,
        html: content.html,
        css: content.css,
      });
    }

    return {
      id: first.id,
      userId: first.userId,
      name: first.name,
      pages,
    };
  }
}
