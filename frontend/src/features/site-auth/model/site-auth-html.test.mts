import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { siteAuthFormHtml, siteAuthStatusHtml } from "./site-auth-html.ts";

describe("siteAuthFormHtml", () => {
  it("사이트 본문에 넣을 로그인 폼을 만든다", () => {
    const html = siteAuthFormHtml({
      view: "login",
      email: "guest@example.com",
      error: "이메일 또는 비밀번호가 올바르지 않습니다.",
    });

    assert.match(html, /data-crep-auth-form="login"/);
    assert.match(html, /name="email"/);
    assert.match(html, /name="password"/);
    assert.match(html, /href="\/signup"/);
    assert.match(html, /guest@example\.com/);
    assert.match(html, /이메일 또는 비밀번호가 올바르지 않습니다\./);
    assert.doesNotMatch(html, /name="name"/);
  });

  it("회원가입 폼에는 이름 칸이 있다", () => {
    const html = siteAuthFormHtml({
      view: "signup",
      email: "",
      name: "손님",
    });

    assert.match(html, /data-crep-auth-form="signup"/);
    assert.match(html, /name="name"/);
    assert.match(html, /href="\/login"/);
    assert.match(html, /value="손님"/);
  });
});

describe("siteAuthStatusHtml", () => {
  it("로그인한 회원 이름과 로그아웃만 보여 준다", () => {
    const html = siteAuthStatusHtml({ name: "손님" });

    assert.match(html, /손님/);
    assert.match(html, /data-crep-auth="logout"/);
    assert.doesNotMatch(html, /password/);
  });
});
