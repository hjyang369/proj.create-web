import { instance } from "@/shared/api";
import type { SiteEditorDetail } from "./get-my-site";

export async function regenerateSiteDraft(
  siteId: number,
): Promise<SiteEditorDetail> {
  const { data } = await instance.post<SiteEditorDetail>(
    `/api/sites/${siteId}/regenerate`,
    {},
    { timeout: 120_000 },
  );
  return data;
}
