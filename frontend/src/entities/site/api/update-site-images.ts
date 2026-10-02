import { instance } from "@/shared/api";

export async function updateSiteImages(
  siteId: number,
  input: {
    keepExistingLogo: boolean;
    keptPhotoUrls: string[];
    logoFile: File | null;
    photoFiles: File[];
  },
): Promise<void> {
  const form = new FormData();
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

  await instance.patch(`/api/sites/${siteId}/images`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
