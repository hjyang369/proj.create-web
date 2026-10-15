import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boardPageSources,
  boardPostPageSources,
  boardsForEditor,
} from "./board-pages.ts";

describe("편집 화면용 게시판 페이지", () => {
  it("입력한 이름, 저장된 게시판, 메뉴 링크를 빠짐없이 모은다", () => {
    const boards = boardsForEditor({
      names: ["뉴스", "소식"],
      saved: [{ name: "뉴스", slug: "news" }],
      pages: [
        {
          html: '<nav><a href="/board/news">뉴스</a><a href="/board/gallery">갤러리</a></nav>',
        },
      ],
    });

    assert.deepEqual(boards, [
      { name: "뉴스", slug: "news" },
      { name: "소식", slug: "notice" },
      { name: "갤러리", slug: "gallery" },
    ]);
  });

  it("게시판 코드는 사이트 본문만 게시판으로 바꾸고 CSS는 남긴다", () => {
    const [page] = boardPageSources(
      [
        {
          pageOrder: 1,
          html: "<header><nav>메뉴</nav></header><main><h1>본문</h1></main><footer>끝</footer>",
          css: "body{margin:0}",
        },
      ],
      [{ name: "뉴스", slug: "news" }],
    );

    assert.equal(page?.name, "뉴스");
    assert.match(page?.html ?? "", /<header>/);
    assert.match(page?.html ?? "", /<footer>/);
    assert.match(page?.html ?? "", /뉴스/);
    assert.equal(page?.html.includes("<h1>본문</h1>"), false);
    assert.equal(page?.css, "body{margin:0}");
  });

  it("글은 /board/게시판/글번호 페이지로 만든다", () => {
    const [page] = boardPostPageSources(
      [
        {
          pageOrder: 1,
          html: "<header>메뉴</header><main>본문</main>",
          css: "body{margin:0}",
        },
      ],
      [{ name: "뉴스", slug: "news" }],
      [
        {
          id: 8,
          slug: "news",
          title: "오픈 소식",
          content: "오늘 문을 엽니다",
          createdAt: "2026-10-15T00:00:00.000Z",
        },
      ],
    );

    assert.equal(page?.id, 8);
    assert.equal(page?.slug, "news");
    assert.match(page?.html ?? "", /오픈 소식/);
    assert.match(page?.html ?? "", /오늘 문을 엽니다/);
    assert.match(page?.html ?? "", /<header>메뉴<\/header>/);
  });
});
