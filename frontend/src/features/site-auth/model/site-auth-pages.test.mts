import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authPageSources } from "./site-auth-pages.ts";

const home = {
  pageOrder: 1,
  html: "<header><nav>메뉴</nav></header><main><h1>본문</h1></main><footer>끝</footer>",
  css: "body{margin:0}",
};

describe("authPageSources", () => {
  it("로그인·회원가입을 고르지 않으면 코드 페이지를 만들지 않는다", () => {
    assert.deepEqual(authPageSources([home], ["company_intro"]), []);
  });

  it("로그인·회원가입을 고르면 사이트 메뉴와 푸터를 유지한 두 페이지를 만든다", () => {
    const pages = authPageSources([home], ["auth"]);

    assert.deepEqual(
      pages.map((page) => page.fileLabel),
      ["로그인", "회원가입"],
    );
    assert.match(pages[0]?.html ?? "", /<header>/);
    assert.match(pages[0]?.html ?? "", /<footer>끝<\/footer>/);
    assert.match(pages[0]?.html ?? "", /data-crep-auth-form="login"/);
    assert.equal(pages[0]?.html.includes("<h1>본문</h1>"), false);
    assert.match(pages[1]?.html ?? "", /data-crep-auth-form="signup"/);
    assert.equal(pages[0]?.css, "body{margin:0}");
    assert.equal(pages[1]?.css, "body{margin:0}");
  });
});
