import { instance } from "@/shared/api";
import type { SiteEditorPage } from "./get-my-site";

export type SiteVersionItem = {
  id: number;
  createdAt: string;
  isEditing: boolean;
  isPublished: boolean;
};

export type SiteVersionList = {
  editingHistoryId: number | null;
  publishedHistoryId: number | null;
  items: SiteVersionItem[];
};

export type OpenedSiteVersion = {
  historyId: number;
  editingHistoryId: number;
  publishedHistoryId: number | null;
  pages: SiteEditorPage[];
};

export type PublishedSiteVersion = {
  editingHistoryId: number | null;
  publishedHistoryId: number;
};

export async function listSiteHistory(
  siteId: number,
): Promise<SiteVersionList> {
  const { data } = await instance.get<SiteVersionList>(
    `/api/sites/${siteId}/history`,
  );
  return data;
}

export async function openSiteHistory(
  siteId: number,
  historyId: number,
): Promise<OpenedSiteVersion> {
  const { data } = await instance.post<OpenedSiteVersion>(
    `/api/sites/${siteId}/history/${historyId}/open`,
  );
  return data;
}

export async function publishSiteHistory(
  siteId: number,
  historyId: number,
): Promise<PublishedSiteVersion> {
  const { data } = await instance.post<PublishedSiteVersion>(
    `/api/sites/${siteId}/history/${historyId}/publish`,
  );
  return data;
}
