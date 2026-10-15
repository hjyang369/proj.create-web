import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type AppDatabase,
} from "../../database/database.provider.js";
import { sites } from "../../database/schema/sites.js";
import { siteInputs } from "../../database/schema/site-inputs.js";
import { siteImages } from "../../database/schema/site-images.js";
import { siteChatHistory } from "../../database/schema/site-chat-history.js";
import { siteEditHistory } from "../../database/schema/site-edit-history.js";
import { sitePages } from "../../database/schema/site-pages.js";
import { siteBoards } from "../../database/schema/site-boards.js";
import type { GeneratedSitePage } from "./site-generation-response.js";
import {
  toCreateSiteRecord,
  type StoredGenerationInput,
} from "./site-input-record.js";
import { readStoredPageContent } from "./site-page-content.js";
import {
  editorPages,
  readHistorySnapshot,
  snapshotFromPages,
} from "./site-version.js";
import type {
  CreateSiteRecord,
  NewChatEntry,
  OwnedVersionList,
  SavedDraftVersion,
  SitesStore,
  StoredChatEntry,
  StoredOwnedSite,
  StoredSite,
  StoredSitePageContent,
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
        boardConfigs: data.boardConfigs ?? null,
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

      await ensureSiteBoards(tx, siteId, data.boardConfigs, now);

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
    const owned = await this.db
      .select({
        id: sites.id,
        userId: sites.userId,
        name: sites.name,
        editingHistoryId: sites.editingHistoryId,
        publishedHistoryId: sites.publishedHistoryId,
        snapshot: siteEditHistory.snapshot,
      })
      .from(sites)
      .leftJoin(
        siteEditHistory,
        and(
          eq(siteEditHistory.id, sites.editingHistoryId),
          eq(siteEditHistory.siteId, sites.id),
        ),
      )
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .limit(1);

    const site = owned[0];
    if (!site) {
      return null;
    }

    const livePages = await this.loadOwnedPages(siteId);

    return {
      id: site.id,
      userId: site.userId,
      name: site.name,
      editingHistoryId: site.editingHistoryId,
      publishedHistoryId: site.publishedHistoryId,
      pages: editorPages(
        livePages,
        site.editingHistoryId == null ? null : site.snapshot,
      ),
    };
  }

  private async loadOwnedPages(
    siteId: number,
  ): Promise<StoredSitePageContent[]> {
    const rows = await this.db
      .select({
        pageType: sitePages.pageType,
        pageOrder: sitePages.pageOrder,
        componentData: sitePages.componentData,
      })
      .from(sitePages)
      .where(eq(sitePages.siteId, siteId))
      .orderBy(asc(sitePages.pageOrder));

    const pages: StoredSitePageContent[] = [];
    for (const row of rows) {
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

    return pages;
  }

  private async loadOwnedInputRow(
    userId: number,
    siteId: number,
  ): Promise<StoredGenerationInput | null> {
    const rows = await this.db
      .select({
        userId: sites.userId,
        businessType: siteInputs.businessType,
        companyName: siteInputs.companyName,
        oneLineIntro: siteInputs.oneLineIntro,
        description: siteInputs.description,
        address: siteInputs.address,
        phone: siteInputs.phone,
        email: siteInputs.email,
        purpose: siteInputs.purpose,
        targetCustomer: siteInputs.targetCustomer,
        mainColor: siteInputs.mainColor,
        atmosphere: siteInputs.atmosphere,
        extraRequest: siteInputs.extraRequest,
        pageCount: siteInputs.pageCount,
        pageComponents: siteInputs.pageComponents,
        boardConfigs: siteInputs.boardConfigs,
        referenceUrl: siteInputs.referenceUrl,
        optionalLinks: siteInputs.optionalLinks,
      })
      .from(sites)
      .innerJoin(siteInputs, eq(siteInputs.siteId, sites.id))
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .limit(1);

    return rows[0] ?? null;
  }

  async findOwnedInputs(
    userId: number,
    siteId: number,
  ): Promise<CreateSiteRecord | null> {
    return this.findOwnedGenerationInput(userId, siteId);
  }

  async updateOwnedInputs(
    userId: number,
    siteId: number,
    data: Omit<CreateSiteRecord, "userId" | "logo" | "photos">,
  ): Promise<boolean> {
    const now = new Date();

    return this.db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: sites.id })
        .from(sites)
        .innerJoin(siteInputs, eq(siteInputs.siteId, sites.id))
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
        .limit(1);

      if (!owned[0]) {
        return false;
      }

      await tx
        .update(siteInputs)
        .set({
          businessType: data.businessType,
          companyName: data.name,
          oneLineIntro: data.oneLineIntro,
          description: data.description,
          address: data.address,
          phone: data.phone,
          email: data.email,
          purpose: data.purpose,
          targetCustomer: data.targetCustomer,
          mainColor: data.mainColor,
          atmosphere: data.atmosphere,
          extraRequest: data.extraRequest,
          pageCount: data.pageCount,
          pageComponents: data.pageComponents,
          ...(data.boardConfigs
            ? { boardConfigs: data.boardConfigs }
            : {}),
          referenceUrl: data.referenceUrl,
          optionalLinks: data.optionalLinks,
          updatedAt: now,
        })
        .where(eq(siteInputs.siteId, siteId));

      await ensureSiteBoards(tx, siteId, data.boardConfigs, now);

      await tx
        .update(sites)
        .set({
          name: data.name,
          updatedAt: now,
        })
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)));

      return true;
    });
  }

  async replaceOwnedImages(
    userId: number,
    siteId: number,
    images: {
      logo: CreateSiteRecord["logo"];
      photos: CreateSiteRecord["photos"];
    },
  ): Promise<boolean> {
    const now = new Date();

    return this.db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: sites.id })
        .from(sites)
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
        .limit(1);

      if (!owned[0]) {
        return false;
      }

      await tx.delete(siteImages).where(eq(siteImages.siteId, siteId));

      const rows: Array<{
        siteId: number;
        type: "logo" | "site_image";
        url: string;
        originalName: string;
        order: number;
        createdAt: Date;
      }> = [];

      if (images.logo) {
        rows.push({
          siteId,
          type: "logo",
          url: images.logo.url,
          originalName: images.logo.originalName,
          order: 0,
          createdAt: now,
        });
      }

      images.photos.forEach((photo, index) => {
        rows.push({
          siteId,
          type: "site_image",
          url: photo.url,
          originalName: photo.originalName,
          order: index + 1,
          createdAt: now,
        });
      });

      if (rows.length > 0) {
        await tx.insert(siteImages).values(rows);
      }

      await tx
        .update(sites)
        .set({ updatedAt: now })
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)));

      return true;
    });
  }

  async findOwnedGenerationInput(
    userId: number,
    siteId: number,
  ): Promise<CreateSiteRecord | null> {
    const input = await this.loadOwnedInputRow(userId, siteId);
    if (!input) {
      return null;
    }

    const images = await this.db
      .select({
        type: siteImages.type,
        url: siteImages.url,
        originalName: siteImages.originalName,
        order: siteImages.order,
      })
      .from(siteImages)
      .where(eq(siteImages.siteId, siteId))
      .orderBy(asc(siteImages.order));

    return toCreateSiteRecord(input, images);
  }

  async saveOwnedDraft(
    userId: number,
    siteId: number,
    draft: {
      inputs: Omit<CreateSiteRecord, "userId" | "logo" | "photos">;
      images: {
        logo: CreateSiteRecord["logo"];
        photos: CreateSiteRecord["photos"];
      };
      pages: GeneratedSitePage[];
    },
  ): Promise<SavedDraftVersion | null> {
    if (draft.pages.length === 0) {
      throw new Error("생성된 페이지가 없습니다.");
    }

    const now = new Date();

    return this.db.transaction(async (tx) => {
      const owned = await tx
        .select({
          id: sites.id,
          publishedHistoryId: sites.publishedHistoryId,
        })
        .from(sites)
        .innerJoin(siteInputs, eq(siteInputs.siteId, sites.id))
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
        .limit(1);

      if (!owned[0]) {
        return null;
      }

      await tx
        .update(siteInputs)
        .set({
          businessType: draft.inputs.businessType,
          companyName: draft.inputs.name,
          oneLineIntro: draft.inputs.oneLineIntro,
          description: draft.inputs.description,
          address: draft.inputs.address,
          phone: draft.inputs.phone,
          email: draft.inputs.email,
          purpose: draft.inputs.purpose,
          targetCustomer: draft.inputs.targetCustomer,
          mainColor: draft.inputs.mainColor,
          atmosphere: draft.inputs.atmosphere,
          extraRequest: draft.inputs.extraRequest,
          pageCount: draft.inputs.pageCount,
          pageComponents: draft.inputs.pageComponents,
          ...(draft.inputs.boardConfigs
            ? { boardConfigs: draft.inputs.boardConfigs }
            : {}),
          referenceUrl: draft.inputs.referenceUrl,
          optionalLinks: draft.inputs.optionalLinks,
          updatedAt: now,
        })
        .where(eq(siteInputs.siteId, siteId));

      await ensureSiteBoards(tx, siteId, draft.inputs.boardConfigs, now);

      await tx.delete(siteImages).where(eq(siteImages.siteId, siteId));

      const imageRows: Array<{
        siteId: number;
        type: "logo" | "site_image";
        url: string;
        originalName: string;
        order: number;
        createdAt: Date;
      }> = [];

      if (draft.images.logo) {
        imageRows.push({
          siteId,
          type: "logo",
          url: draft.images.logo.url,
          originalName: draft.images.logo.originalName,
          order: 0,
          createdAt: now,
        });
      }

      draft.images.photos.forEach((photo, index) => {
        imageRows.push({
          siteId,
          type: "site_image",
          url: photo.url,
          originalName: photo.originalName,
          order: index + 1,
          createdAt: now,
        });
      });

      if (imageRows.length > 0) {
        await tx.insert(siteImages).values(imageRows);
      }

      await tx.delete(sitePages).where(eq(sitePages.siteId, siteId));
      await tx.insert(sitePages).values(
        draft.pages.map((page) => ({
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

      const [historyResult] = await tx.insert(siteEditHistory).values({
        siteId,
        snapshot: snapshotFromPages(draft.pages),
        createdAt: now,
      });
      const historyId = historyResult.insertId;

      await tx
        .update(sites)
        .set({
          name: draft.inputs.name,
          editingHistoryId: historyId,
          updatedAt: now,
        })
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)));

      return {
        historyId,
        publishedHistoryId: owned[0].publishedHistoryId,
      };
    });
  }

  async listOwnedVersions(
    userId: number,
    siteId: number,
  ): Promise<OwnedVersionList | null> {
    const owned = await this.db
      .select({
        editingHistoryId: sites.editingHistoryId,
        publishedHistoryId: sites.publishedHistoryId,
      })
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .limit(1);

    const site = owned[0];
    if (!site) {
      return null;
    }

    const rows = await this.db
      .select({
        id: siteEditHistory.id,
        createdAt: siteEditHistory.createdAt,
      })
      .from(siteEditHistory)
      .where(eq(siteEditHistory.siteId, siteId))
      .orderBy(desc(siteEditHistory.id));

    return {
      editingHistoryId: site.editingHistoryId,
      publishedHistoryId: site.publishedHistoryId,
      items: rows.map((row) => ({
        id: row.id,
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt
            : new Date(row.createdAt),
      })),
    };
  }

  async openOwnedVersion(
    userId: number,
    siteId: number,
    historyId: number,
  ): Promise<{
    pages: StoredSitePageContent[];
    publishedHistoryId: number | null;
  } | null> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({
          snapshot: siteEditHistory.snapshot,
          publishedHistoryId: sites.publishedHistoryId,
        })
        .from(siteEditHistory)
        .innerJoin(sites, eq(sites.id, siteEditHistory.siteId))
        .where(
          and(
            eq(siteEditHistory.id, historyId),
            eq(siteEditHistory.siteId, siteId),
            eq(sites.userId, userId),
          ),
        )
        .limit(1);

      const version = rows[0];
      const pages = version ? readHistorySnapshot(version.snapshot) : null;
      if (!version || !pages) {
        return null;
      }

      await tx
        .update(sites)
        .set({
          editingHistoryId: historyId,
          updatedAt: new Date(),
        })
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)));

      return {
        pages,
        publishedHistoryId: version.publishedHistoryId,
      };
    });
  }

  async publishOwnedVersion(
    userId: number,
    siteId: number,
    historyId: number,
  ): Promise<{
    editingHistoryId: number | null;
    publishedHistoryId: number;
  } | null> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({
          editingHistoryId: sites.editingHistoryId,
        })
        .from(siteEditHistory)
        .innerJoin(sites, eq(sites.id, siteEditHistory.siteId))
        .where(
          and(
            eq(siteEditHistory.id, historyId),
            eq(siteEditHistory.siteId, siteId),
            eq(sites.userId, userId),
          ),
        )
        .limit(1);

      const version = rows[0];
      if (!version) {
        return null;
      }

      await tx
        .update(sites)
        .set({
          publishedHistoryId: historyId,
          status: "published",
          updatedAt: new Date(),
        })
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)));

      return {
        editingHistoryId: version.editingHistoryId,
        publishedHistoryId: historyId,
      };
    });
  }

  async replaceGeneratedPages(
    siteId: number,
    pages: GeneratedSitePage[],
  ): Promise<void> {
    if (pages.length === 0) {
      throw new Error("생성된 페이지가 없습니다.");
    }

    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx.delete(sitePages).where(eq(sitePages.siteId, siteId));
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

  async updateOwnedPageContent(
    userId: number,
    siteId: number,
    pageOrder: number,
    content: { html: string; css: string },
  ): Promise<import("./sites.store.js").StoredSitePageContent | null> {
    const owned = await this.db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .limit(1);

    if (!owned[0]) {
      return null;
    }

    const now = new Date();

    await this.db
      .update(sitePages)
      .set({
        componentData: { html: content.html, css: content.css },
        updatedAt: now,
      })
      .where(
        and(eq(sitePages.siteId, siteId), eq(sitePages.pageOrder, pageOrder)),
      );

    await this.db
      .update(sites)
      .set({ updatedAt: now })
      .where(eq(sites.id, siteId));

    const rows = await this.db
      .select({
        pageType: sitePages.pageType,
        pageOrder: sitePages.pageOrder,
        componentData: sitePages.componentData,
      })
      .from(sitePages)
      .where(
        and(eq(sitePages.siteId, siteId), eq(sitePages.pageOrder, pageOrder)),
      )
      .limit(1);

    if (!rows[0]) {
      return null;
    }

    const pageContent = readStoredPageContent(rows[0].componentData);
    if (!pageContent) {
      return null;
    }

    return {
      pageType: rows[0].pageType,
      pageOrder: rows[0].pageOrder,
      html: pageContent.html,
      css: pageContent.css,
    };
  }

  async addSiteImage(
    userId: number,
    siteId: number,
    image: { url: string; originalName: string },
  ): Promise<{ url: string } | null> {
    // 소유권 확인
    const owned = await this.db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .limit(1);

    if (!owned[0]) {
      return null;
    }

    // 현재 최대 order 조회
    const existing = await this.db
      .select({ order: siteImages.order })
      .from(siteImages)
      .where(eq(siteImages.siteId, siteId))
      .orderBy(desc(siteImages.order))
      .limit(1);

    const nextOrder = (existing[0]?.order ?? -1) + 1;
    const now = new Date();

    await this.db.insert(siteImages).values({
      siteId,
      type: "site_image",
      url: image.url,
      originalName: image.originalName,
      order: nextOrder,
      createdAt: now,
    });

    return { url: image.url };
  }

  async listOwnedChatHistory(
    userId: number,
    siteId: number,
  ): Promise<StoredChatEntry[] | null> {
    const owned = await this.db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .limit(1);

    if (!owned[0]) {
      return null;
    }

    const rows = await this.db
      .select({
        id: siteChatHistory.id,
        type: siteChatHistory.type,
        label: siteChatHistory.label,
        pageOrder: siteChatHistory.pageOrder,
        createdAt: siteChatHistory.createdAt,
      })
      .from(siteChatHistory)
      .where(eq(siteChatHistory.siteId, siteId))
      .orderBy(asc(siteChatHistory.id));

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      label: row.label,
      pageOrder: row.pageOrder,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt
          : new Date(row.createdAt),
    }));
  }

  async addOwnedChatEntry(
    userId: number,
    siteId: number,
    entry: NewChatEntry,
  ): Promise<StoredChatEntry | null> {
    const owned = await this.db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .limit(1);

    if (!owned[0]) {
      return null;
    }

    const createdAt = new Date();
    const [result] = await this.db.insert(siteChatHistory).values({
      siteId,
      type: entry.type,
      label: entry.label,
      pageOrder: entry.pageOrder,
      createdAt,
    });

    return {
      id: result.insertId,
      type: entry.type,
      label: entry.label,
      pageOrder: entry.pageOrder,
      createdAt,
    };
  }
}

async function ensureSiteBoards(
  tx: Pick<AppDatabase, "select" | "insert">,
  siteId: number,
  configs: Array<{ name: string; slug: string }> | null | undefined,
  now: Date,
): Promise<void> {
  if (!configs?.length) {
    return;
  }

  const existing = await tx
    .select({ slug: siteBoards.slug })
    .from(siteBoards)
    .where(eq(siteBoards.siteId, siteId));
  const have = new Set(existing.map((row) => row.slug));
  const rows = configs.flatMap((config, index) =>
    have.has(config.slug)
      ? []
      : [
          {
            siteId,
            name: config.name,
            slug: config.slug,
            boardOrder: index,
            createdAt: now,
          },
        ],
  );

  if (rows.length > 0) {
    await tx.insert(siteBoards).values(rows);
  }
}
