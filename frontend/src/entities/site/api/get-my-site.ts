import { instance } from "@/shared/api";
import type { SitePreviewPage } from "../model/site-preview";

export type SiteEditorPage = SitePreviewPage & {
  pageType: string;
};

export type SiteEditorDetail = {
  id: number;
  name: string;
  pages: SiteEditorPage[];
};

export async function getMySite(siteId: number): Promise<SiteEditorDetail> {
  const { data } = await instance.get<SiteEditorDetail>(`/api/sites/${siteId}`);
  return data;
}
