import { instance } from "@/shared/api";
import type { SiteEditorPage } from "./get-my-site";

export type EditComponentRequest = {
  pageOrder: number;
  pageType: string;
  sectionIndex: number;
  request: string;
  html: string;
  css: string;
  elementHtml?: string;
  imageUrl?: string;
};

export async function editSiteComponent(
  siteId: number,
  body: EditComponentRequest,
): Promise<SiteEditorPage> {
  const { data } = await instance.post<SiteEditorPage>(
    `/api/sites/${siteId}/edit-component`,
    body,
  );
  return data;
}
