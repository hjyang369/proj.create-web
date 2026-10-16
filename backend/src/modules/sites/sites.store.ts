import type { GeneratedSitePage } from "./site-generation-response.js";

export type StoredSite = {
  id: number;
  userId: number;
  name: string;
  type: "web" | "app";
  status: "generating" | "draft" | "published";
  thumbnailUrl: string | null;
  updatedAt: Date;
};

export type CreateSiteRecord = {
  userId: number;
  name: string;
  businessType: string | null;
  oneLineIntro: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  purpose:
    | "company_intro"
    | "investment"
    | "sales"
    | "recruitment"
    | "promotion"
    | "inquiry";
  targetCustomer: string | null;
  mainColor: string | null;
  atmosphere:
    | "warm"
    | "professional"
    | "modern"
    | "cute"
    | "elegant"
    | "bold"
    | null;
  extraRequest: string | null;
  pageCount: number;
  pageComponents: string[] | null;
  /** 리뷰 공개 범위. 리뷰를 끄면 null이다. */
  reviewVisibility?: "partial" | "full" | null;
  /** 게시판 이름과 주소. 없으면 게시판을 만들지 않는다. */
  boardConfigs?: Array<{ name: string; slug: string }> | null;
  referenceUrl: string | null;
  optionalLinks: Record<string, string> | null;
  /** 로고 이미지 (있으면) */
  logo: { url: string; originalName: string } | null;
  /** 사이트용 사진 목록 */
  photos: Array<{ url: string; originalName: string }>;
};

export type StoredSitePageContent = {
  pageType: string;
  pageOrder: number;
  html: string;
  css: string;
};

export type StoredOwnedSite = {
  id: number;
  userId: number;
  name: string;
  pages: StoredSitePageContent[];
  editingHistoryId: number | null;
  publishedHistoryId: number | null;
};

export type SavedDraftVersion = {
  historyId: number;
  publishedHistoryId: number | null;
};

export type OwnedVersionList = {
  editingHistoryId: number | null;
  publishedHistoryId: number | null;
  items: Array<{ id: number; createdAt: Date }>;
};

export type SitesStore = {
  listByUserId: (userId: number) => Promise<StoredSite[]>;
  create: (data: CreateSiteRecord) => Promise<{ id: number }>;
  saveGeneratedPages: (
    siteId: number,
    pages: GeneratedSitePage[],
  ) => Promise<void>;
  findOwnedWithPages: (
    userId: number,
    siteId: number,
  ) => Promise<StoredOwnedSite | null>;
  findOwnedGenerationInput: (
    userId: number,
    siteId: number,
  ) => Promise<CreateSiteRecord | null>;
  findOwnedInputs: (
    userId: number,
    siteId: number,
  ) => Promise<CreateSiteRecord | null>;
  updateOwnedInputs: (
    userId: number,
    siteId: number,
    data: Omit<CreateSiteRecord, "userId" | "logo" | "photos">,
  ) => Promise<boolean>;
  replaceOwnedImages: (
    userId: number,
    siteId: number,
    images: {
      logo: CreateSiteRecord["logo"];
      photos: CreateSiteRecord["photos"];
    },
  ) => Promise<boolean>;
  replaceGeneratedPages: (
    siteId: number,
    pages: GeneratedSitePage[],
  ) => Promise<void>;
  saveOwnedDraft: (
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
  ) => Promise<SavedDraftVersion | null>;
  listOwnedVersions: (
    userId: number,
    siteId: number,
  ) => Promise<OwnedVersionList | null>;
  openOwnedVersion: (
    userId: number,
    siteId: number,
    historyId: number,
  ) => Promise<{
    pages: StoredSitePageContent[];
    publishedHistoryId: number | null;
  } | null>;
  publishOwnedVersion: (
    userId: number,
    siteId: number,
    historyId: number,
  ) => Promise<{
    editingHistoryId: number | null;
    publishedHistoryId: number;
  } | null>;
  updateOwnedPageContent: (
    userId: number,
    siteId: number,
    pageOrder: number,
    content: { html: string; css: string },
  ) => Promise<StoredSitePageContent | null>;
  addSiteImage: (
    userId: number,
    siteId: number,
    image: { url: string; originalName: string },
  ) => Promise<{ url: string } | null>;
  listOwnedChatHistory: (
    userId: number,
    siteId: number,
  ) => Promise<StoredChatEntry[] | null>;
  addOwnedChatEntry: (
    userId: number,
    siteId: number,
    entry: NewChatEntry,
  ) => Promise<StoredChatEntry | null>;
};

export type StoredChatEntry = {
  id: number;
  type: "ai-edit" | "regenerate";
  label: string;
  pageOrder: number | null;
  createdAt: Date;
};

export type NewChatEntry = {
  type: "ai-edit" | "regenerate";
  label: string;
  pageOrder: number | null;
};

export const SITES_STORE = Symbol("SITES_STORE");
