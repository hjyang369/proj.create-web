import { describe, expect, it } from "vitest";
import { insertBoardNav } from "./insert-board-nav.js";

const page = `<header><nav class="crep-nav__panel"><div><a href="#services">서비스</a></div></nav></header>`;

describe("insertBoardNav", () => {
  it("메뉴에 없는 게시판 링크를 nav 끝에 넣는다", () => {
    const html = insertBoardNav(page, [{ name: "뉴스", slug: "news" }]);

    expect(html).toContain('<a href="/board/news">뉴스</a></nav>');
    expect(html).toContain('href="#services"');
  });

  it("이미 있는 게시판 링크는 다시 넣지 않는다", () => {
    const withLink = page.replace(
      "</nav>",
      '<a href="/board/news">뉴스</a></nav>',
    );

    expect(insertBoardNav(withLink, [{ name: "뉴스", slug: "news" }])).toBe(
      withLink,
    );
  });

  it("nav가 없으면 html을 그대로 둔다", () => {
    const bare = "<main><h1>홈</h1></main>";

    expect(insertBoardNav(bare, [{ name: "뉴스", slug: "news" }])).toBe(bare);
  });

  it("게시판 이름에 태그가 있어도 글자로만 넣는다", () => {
    const html = insertBoardNav(page, [
      { name: "<script>", slug: "board-1" },
    ]);

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
