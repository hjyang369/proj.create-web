import { create } from "zustand";
import type { SignupUser } from "../api/signup";
import { clearSession, persistSession } from "./session-storage";

type AuthState = {
  user: SignupUser | null;
  setSession: (accessToken: string, user: SignupUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setSession: (accessToken, user) => {
    localStorage.setItem("access_token", accessToken);
    persistSession(user);
    set({ user });
  },
  logout: () => {
    clearSession();
    set({ user: null });
  },
}));
