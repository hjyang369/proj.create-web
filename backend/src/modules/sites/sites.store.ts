export type StoredSite = {
  id: number;
  userId: number;
  name: string;
  type: "web" | "app";
  status: "generating" | "draft" | "published";
  thumbnailUrl: string | null;
  updatedAt: Date;
};

export type SitesStore = {
  listByUserId: (userId: number) => Promise<StoredSite[]>;
};

export const SITES_STORE = Symbol("SITES_STORE");
