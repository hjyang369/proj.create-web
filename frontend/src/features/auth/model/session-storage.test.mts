import assert from "node:assert/strict";
import { describe, it } from "node:test";

const memory = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem(key: string) {
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
    removeItem(key: string) {
      memory.delete(key);
    },
    clear() {
      memory.clear();
    },
  },
});

const { clearSession, getSessionSnapshot, persistSession, subscribeSession } =
  await import("./session-storage.ts");

describe("clearSession", () => {
  it("로그아웃하면 저장된 로그인 정보가 사라지고 화면이 비로그인으로 바뀐다", () => {
    localStorage.setItem("access_token", "token-1");
    persistSession({
      id: 1,
      email: "hana@example.com",
      name: "하나",
    });

    let notified = 0;
    const unsubscribe = subscribeSession(() => {
      notified += 1;
    });

    clearSession();

    assert.equal(localStorage.getItem("access_token"), null);
    assert.equal(localStorage.getItem("auth_user"), null);
    assert.equal(getSessionSnapshot(), null);
    assert.equal(notified, 1);
    unsubscribe();
  });
});
