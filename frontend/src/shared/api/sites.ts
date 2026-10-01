import { instance } from "./instance";

export interface CreateSitePayload {
  industry: string;
  name: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  purpose: string;
  targetCustomer: string;
  mainColor: string;
  mood: string;
  pageCount: string;
  selectedPages: string[];
  blogLink: string;
  websiteLink: string;
  instagramLink: string;
  youtubeLink: string;
  referenceLink: string;
  extraRequest: string;
}

export interface CreateSiteResponse {
  id: number;
}

/**
 * 사이트 생성 요청
 * 이미지는 multipart/form-data 로 전송한다.
 * Phase 5 에서 백엔드 엔드포인트(POST /sites)가 구현되면 실제로 동작한다.
 */
export async function createSite(
  payload: CreateSitePayload,
  logoFile: File | null,
  photoFiles: File[],
): Promise<CreateSiteResponse> {
  const form = new FormData();

  // 텍스트 필드
  Object.entries(payload).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => form.append(key, v));
    } else {
      form.append(key, value);
    }
  });

  // 파일 필드
  if (logoFile) {
    form.append("logo", logoFile);
  }
  photoFiles.forEach((file) => form.append("photos", file));

  const response = await instance.post<CreateSiteResponse>("/api/sites", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}
