import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAppNavActions } from "./app-nav-actions.ts";

describe("getAppNavActions", () => {
  it("로그인 전에는 로그인 링크만 보여 준다", () => {
    assert.deepEqual(getAppNavActions(null), [
      { href: "/login", label: "로그인" },
    ]);
  });

  it("로그인 후에는 이름과 사이트 만들기 링크를 보여 준다", () => {
    assert.deepEqual(getAppNavActions({ name: "하나" }), [
      { label: "하나님" },
      { href: "/create", label: "사이트 만들기" },
    ]);
  });
});
