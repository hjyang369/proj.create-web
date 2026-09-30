import { instance } from "@/shared/api";
import type { SignupResult } from "./signup";

export type LoginInput = {
  email: string;
  password: string;
};

export async function login(input: LoginInput): Promise<SignupResult> {
  const { data } = await instance.post<SignupResult>("/api/auth/login", input);
  return data;
}
