import { instance } from "@/shared/api";

export type SignupInput = {
  email: string;
  name: string;
  password: string;
};

export type SignupUser = {
  id: number;
  email: string;
  name: string;
};

export type SignupResult = {
  accessToken: string;
  user: SignupUser;
};

export async function signup(input: SignupInput): Promise<SignupResult> {
  const { data } = await instance.post<SignupResult>("/api/auth/signup", input);
  return data;
}
