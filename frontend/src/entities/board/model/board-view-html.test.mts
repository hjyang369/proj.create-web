import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boardDetailHtml,
  boardListHtml,
  boardStatusHtml,
  boardWriteHtml,
} from "./board-view-html.ts";

describe("사이트 안에 넣는 게시판 HTML", () => {
  it("목록은 사이트 본문에 넣을 글 제목과 글쓰기 버튼을 만든다", () => {
    const html = boardListHtml({
      name: "뉴스",
      slug: "news",
      page: 1,
      canWrite: true,
      posts: [
        {
          id: 3,
          title: "오픈 소식",
          createdAt: "2026-10-15T00:00:00.000Z",
        },
      ],
    });

    assert.match(html, /class="crep-board"/);
    assert.match(html, /뉴스/);
    assert.match(html, /href="\/board\/news\/3"/);
    assert.match(html, /오픈 소식/);
    assert.match(html, /2026\.10\.15/);
    assert.match(html, /data-crep-board="write"/);
  });

  it("글이 없거나 주인이 아니면 빈 안내만 보여 준다", () => {
    const html = boardListHtml({
      name: "소식",
      slug: "notice",
      page: 1,
      canWrite: false,
      posts: [],
    });

    assert.match(html, /아직 글이 없습니다/);
    assert.equal(html.includes("글쓰기"), false);
  });

  it("제목에 태그가 있어도 글자로만 보여 준다", () => {
    const html = boardDetailHtml({
      name: "뉴스",
      slug: "news",
      canWrite: false,
      post: {
        id: 1,
        title: "<script>alert(1)</script>",
        content: "본문",
        createdAt: "2026-10-15T00:00:00.000Z",
      },
    });

    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /본문/);
    assert.match(html, /href="\/board\/news"/);
  });

  it("주인에게는 수정과 삭제 대신 관리 버튼을 보여 준다", () => {
    const html = boardDetailHtml({
      name: "뉴스",
      slug: "news",
      canWrite: true,
      post: {
        id: 3,
        title: "오픈 소식",
        content: "본문",
        createdAt: "2026-10-15T00:00:00.000Z",
      },
    });

    assert.match(html, /data-crep-board="manage"/);
    assert.match(html, /data-post="3"/);
    assert.match(html, />관리</);
    assert.equal(html.includes(">수정<"), false);
    assert.equal(html.includes(">삭제<"), false);
  });

  it("글쓰기 폼은 사이트 안에서 저장 메시지를 보낼 수 있다", () => {
    const html = boardWriteHtml({
      name: "뉴스",
      slug: "news",
      postId: 0,
      title: "",
      content: "",
    });

    assert.match(html, /data-crep-board-form="save"/);
    assert.match(html, /data-slug="news"/);
    assert.match(html, /name="title"/);
    assert.match(html, /name="content"/);
  });

  it("안내 문구도 사이트 본문용 칸에 넣는다", () => {
    assert.match(boardStatusHtml("게시판을 찾을 수 없습니다."), /crep-board/);
  });
});
