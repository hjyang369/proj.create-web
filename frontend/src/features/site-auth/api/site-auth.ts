import axios from "axios";
import { API_URL } from "@/shared/api";
import type { SiteMember } from "../model/site-member-session";

export type SiteAuthResult = {
  accessToken: string;
  member: SiteMember;
};

function errorMessage(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const raw = error.response?.data?.message;
    const message = Array.isArray(raw)
      ? raw.join(" ")
      : typeof raw === "string" && raw.trim()
        ? raw
        : fallback;
    return new Error(message);
  }
  return new Error(fallback);
}

export async function loginSiteMember(
  siteId: number,
  input: { email: string; password: string },
): Promise<SiteAuthResult> {
  try {
    const { data } = await axios.post<SiteAuthResult>(
      `${API_URL}/api/s/${siteId}/auth/login`,
      input,
      { headers: { "Content-Type": "application/json" } },
    );
    return data;
  } catch (error) {
    throw errorMessage(error, "로그인에 실패했습니다.");
  }
}

export async function signupSiteMember(
  siteId: number,
  input: { email: string; name: string; password: string },
): Promise<SiteAuthResult> {
  try {
    const { data } = await axios.post<SiteAuthResult>(
      `${API_URL}/api/s/${siteId}/auth/signup`,
      input,
      { headers: { "Content-Type": "application/json" } },
    );
    return data;
  } catch (error) {
    throw errorMessage(error, "회원가입에 실패했습니다.");
  }
}
