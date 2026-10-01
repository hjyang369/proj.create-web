import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const instance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 — 토큰이 있으면 Authorization 헤더에 자동 추가
instance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 응답 인터셉터 — 에러를 일관된 형태로 처리
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(
        new Error("응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."),
      );
    }

    const rawMessage = error.response?.data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(" ")
      : (rawMessage ?? "알 수 없는 오류가 발생했습니다.");
    return Promise.reject(new Error(message));
  }
);
