import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boardWriteBase,
  boardWritePath,
  readBoardCreatedMessage,
} from "./board-write-path.ts";

describe("크랩 AI 글쓰기 주소", () => {
  it("사이트 번호와 게시판 주소를 글쓰기 화면에 넘긴다", () => {
    assert.equal(boardWritePath(10, "News"), "/write?siteId=10&slug=news");
  });

  it("관리할 글 번호를 글쓰기 화면에 함께 넘긴다", () => {
    assert.equal(
      boardWritePath(14, "news", 3),
      "/write?siteId=14&slug=news&postId=3",
    );
  });

  it("미리보기에서는 글쓰기 주소 뒤에 게시판 주소를 붙인다", () => {
    assert.equal(
      boardWriteBase("http://localhost:3000", 10),
      "http://localhost:3000/write?siteId=10&slug=",
    );
  });

  it("저장 알림에서 사이트 번호와 게시판 주소만 읽는다", () => {
    assert.deepEqual(
      readBoardCreatedMessage({
        type: "crep-board-created",
        siteId: 10,
        slug: "news",
      }),
      { siteId: 10, slug: "news", postId: null, removed: false },
    );
    assert.deepEqual(
      readBoardCreatedMessage({
        type: "crep-board-created",
        siteId: 10,
        slug: "news",
        postId: 3,
        removed: true,
      }),
      { siteId: 10, slug: "news", postId: 3, removed: true },
    );
    assert.equal(readBoardCreatedMessage({ type: "crep-board" }), null);
    assert.equal(
      readBoardCreatedMessage({
        type: "crep-board-created",
        siteId: 10,
        slug: "뉴스",
      }),
      null,
    );
  });
});
