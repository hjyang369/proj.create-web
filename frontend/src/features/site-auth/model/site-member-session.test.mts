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

const { clearSiteMember, readSiteMember, saveSiteMember } = await import(
  "./site-member-session.ts"
);

const member = {
  id: 3,
  siteId: 8,
  email: "guest@example.com",
  name: "손님",
};

describe("site member session", () => {
  it("사이트 회원을 그 사이트 칸에만 저장하고 사장님 로그인은 건드리지 않는다", () => {
    memory.clear();
    localStorage.setItem("access_token", "owner-token");
    localStorage.setItem("auth_user", "owner");

    saveSiteMember(8, "member-token", member);

    assert.equal(localStorage.getItem("access_token"), "owner-token");
    assert.equal(localStorage.getItem("auth_user"), "owner");
    assert.deepEqual(readSiteMember(8), {
      accessToken: "member-token",
      member,
    });
    assert.equal(readSiteMember(9), null);
  });

  it("그 사이트에서 로그아웃하면 그 회원만 지운다", () => {
    memory.clear();
    saveSiteMember(8, "member-token", member);
    localStorage.setItem("access_token", "owner-token");

    clearSiteMember(8);

    assert.equal(readSiteMember(8), null);
    assert.equal(localStorage.getItem("access_token"), "owner-token");
  });
});
