"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeSession,
} from "./session-storage";

export function useSession() {
  const stored = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  return {
    user: stored ?? null,
    ready: stored !== undefined,
  };
}
