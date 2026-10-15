import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBoardDate } from "./format-board-date.ts";

describe("formatBoardDate", () => {
  it("한국 날짜를 점으로 보여 준다", () => {
    assert.equal(formatBoardDate("2026-10-15T00:00:00.000Z"), "2026.10.15");
  });

  it("날짜가 아니면 빈 문자열을 돌려준다", () => {
    assert.equal(formatBoardDate("곧"), "");
  });
});
