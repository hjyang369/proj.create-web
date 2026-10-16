import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authPageChoices,
  authViewFromHref,
  rewriteAuthPageLinks,
} from "./site-auth-links.ts";

describe("authViewFromHref", () => {
  it("사이트 안의 로그인·회원가입 주소만 골라낸다", () => {
    assert.equal(authViewFromHref("/login"), "login");
    assert.equal(authViewFromHref("./signup.html"), "signup");
    assert.equal(authViewFromHref("sign-in.html#form"), "login");
    assert.equal(authViewFromHref("/register"), "signup");
    assert.equal(authViewFromHref("/about.html"), null);
    assert.equal(authViewFromHref("https://example.com/login"), null);
  });
});

describe("authPageChoices", () => {
  it("로그인·회원가입을 고른 사이트만 그 주소를 보여 준다", () => {
    assert.deepEqual(authPageChoices(["about", "auth"]), [
      { id: "auth:login", label: "/login" },
      { id: "auth:signup", label: "/signup" },
    ]);
    assert.deepEqual(authPageChoices(["about"]), []);
  });
});

describe("rewriteAuthPageLinks", () => {
  it("로그인·회원가입 html 링크를 사이트 안 주소로 바꾼다", () => {
    const html = rewriteAuthPageLinks(
      '<a href="login.html">로그인</a><a href="./about.html">소개</a>',
    );

    assert.match(html, /href="\/login"/);
    assert.match(html, /href="\.\/about\.html"/);
  });
});
