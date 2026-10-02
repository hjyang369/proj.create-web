import { instance } from "@/shared/api";
import type { SiteInputValues } from "./get-my-site";

export async function updateSiteInputs(
  siteId: number,
  values: Omit<SiteInputValues, "logo" | "photos">,
): Promise<SiteInputValues> {
  const { data } = await instance.patch<SiteInputValues>(
    `/api/sites/${siteId}/inputs`,
    values,
  );
  return data;
}
