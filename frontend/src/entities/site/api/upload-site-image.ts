import { instance } from "@/shared/api";

export async function uploadSiteImage(
  siteId: number,
  file: File,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("image", file);
  const { data } = await instance.post<{ url: string }>(
    `/api/sites/${siteId}/upload-image`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}
