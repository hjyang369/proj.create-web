import { create } from "zustand";
import type { SignupUser } from "../api/signup";
import { persistSession } from "./session-storage";

type AuthState = {
  user: SignupUser | null;
  setSession: (accessToken: string, user: SignupUser) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setSession: (accessToken, user) => {
    localStorage.setItem("access_token", accessToken);
    persistSession(user);
    set({ user });
  },
}));
