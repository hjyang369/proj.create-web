import { describe, expect, it } from "vitest";
import { BoardNameError, boardConfigsFromNames } from "./board-names.js";

describe("boardConfigsFromNames", () => {
  it("공백을 정리하고 주소까지 만든다", () => {
    expect(boardConfigsFromNames([" 뉴스 ", "블로그"])).toEqual([
      { name: "뉴스", slug: "news" },
      { name: "블로그", slug: "blog" },
    ]);
  });

  it("비어 있는 이름은 뺀다", () => {
    expect(boardConfigsFromNames(["", "  ", "소식"])).toEqual([
      { name: "소식", slug: "notice" },
    ]);
  });

  it("같은 이름은 거절한다", () => {
    expect(() => boardConfigsFromNames(["뉴스", " 뉴스 "])).toThrow(
      BoardNameError,
    );
    expect(() => boardConfigsFromNames(["뉴스", "뉴스"])).toThrow(
      "게시판 이름이 중복됩니다.",
    );
  });

  it("6개 이상은 거절한다", () => {
    expect(() =>
      boardConfigsFromNames(["1", "2", "3", "4", "5", "6"]),
    ).toThrow("게시판은 5개까지 만들 수 있습니다.");
  });
});
