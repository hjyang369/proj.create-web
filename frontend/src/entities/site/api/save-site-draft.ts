import { instance } from "@/shared/api";
import type {
  SiteEditorDetail,
  SiteEditorPage,
  SiteInputValues,
} from "./get-my-site";

export async function saveSiteDraft(
  siteId: number,
  draft: {
    pages: SiteEditorPage[];
    inputs: SiteInputValues;
  },
): Promise<SiteEditorDetail> {
  const { data } = await instance.post<SiteEditorDetail>(
    `/api/sites/${siteId}/save`,
    draft,
  );
  return data;
}
