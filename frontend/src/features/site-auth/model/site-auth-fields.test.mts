import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { siteAuthFieldError } from "./site-auth-fields.ts";

describe("siteAuthFieldError", () => {
  it("회원가입은 이름과 8자 이상 비밀번호가 있어야 한다", () => {
    assert.equal(
      siteAuthFieldError({
        view: "signup",
        email: "guest@example.com",
        name: "손",
        password: "password123",
      }),
      "이름은 2자 이상이어야 합니다.",
    );
    assert.equal(
      siteAuthFieldError({
        view: "signup",
        email: "guest@example.com",
        name: "손님",
        password: "short",
      }),
      "비밀번호는 8자 이상이어야 합니다.",
    );
    assert.equal(
      siteAuthFieldError({
        view: "signup",
        email: "guest@example.com",
        name: "손님",
        password: "password123",
      }),
      null,
    );
  });

  it("로그인은 그 사이트 이메일과 비밀번호만 확인한다", () => {
    assert.equal(
      siteAuthFieldError({
        view: "login",
        email: "guest@example.com",
        name: "",
        password: "short",
      }),
      null,
    );
  });
});
