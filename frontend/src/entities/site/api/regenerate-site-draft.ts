import { instance } from "@/shared/api";
import type { SiteEditorDetail, SiteInputValues } from "./get-my-site";

export type RegenerateSiteInput = {
  values: Omit<SiteInputValues, "logo" | "photos">;
  keepExistingLogo: boolean;
  keptPhotoUrls: string[];
  logoFile: File | null;
  photoFiles: File[];
};

export async function regenerateSiteDraft(
  siteId: number,
  input: RegenerateSiteInput,
): Promise<SiteEditorDetail> {
  const form = new FormData();

  Object.entries(input.values).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => form.append(key, item));
      return;
    }
    form.append(key, value);
  });
  form.append("keepExistingLogo", input.keepExistingLogo ? "true" : "false");
  for (const url of input.keptPhotoUrls) {
    form.append("keptPhotoUrls", url);
  }
  if (input.logoFile) {
    form.append("logo", input.logoFile);
  }
  for (const file of input.photoFiles) {
    form.append("photos", file);
  }

  const { data } = await instance.post<SiteEditorDetail>(
    `/api/sites/${siteId}/regenerate`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    },
  );
  return data;
}
