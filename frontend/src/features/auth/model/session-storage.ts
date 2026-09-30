import type { SignupUser } from "../api/signup";

let snapshot: SignupUser | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function readStoredUser(): SignupUser | null {
  const raw = localStorage.getItem("auth_user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SignupUser;
  } catch {
    return null;
  }
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionSnapshot(): SignupUser | null | undefined {
  if (!loaded) {
    loaded = true;
    snapshot = readStoredUser();
  }

  return snapshot;
}

export function getServerSessionSnapshot(): SignupUser | null | undefined {
  return undefined;
}

export function persistSession(user: SignupUser) {
  localStorage.setItem("auth_user", JSON.stringify(user));
  snapshot = user;
  loaded = true;
  listeners.forEach((listener) => listener());
}
