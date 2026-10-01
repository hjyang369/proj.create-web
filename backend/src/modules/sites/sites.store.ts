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
  referenceUrl: string | null;
  optionalLinks: Record<string, string> | null;
  /** 로고 이미지 (있으면) */
  logo: { url: string; originalName: string } | null;
  /** 사이트용 사진 목록 */
  photos: Array<{ url: string; originalName: string }>;
};

export type SitesStore = {
  listByUserId: (userId: number) => Promise<StoredSite[]>;
  create: (data: CreateSiteRecord) => Promise<{ id: number }>;
};

export const SITES_STORE = Symbol("SITES_STORE");
