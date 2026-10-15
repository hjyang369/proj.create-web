import { describe, expect, it } from "vitest";
import { assignBoardSlugs } from "./board-slug.js";

describe("assignBoardSlugs", () => {
  it("알려진 한글 이름은 고정된 영문 주소로 바꾼다", () => {
    expect(assignBoardSlugs(["뉴스", "소식", "블로그"])).toEqual([
      { name: "뉴스", slug: "news" },
      { name: "소식", slug: "notice" },
      { name: "블로그", slug: "blog" },
    ]);
  });

  it("목록에 없는 이름은 순서 번호 주소를 쓴다", () => {
    expect(assignBoardSlugs(["우리이야기"])).toEqual([
      { name: "우리이야기", slug: "board-1" },
    ]);
  });

  it("같은 주소가 겹치면 뒤에 번호를 붙인다", () => {
    expect(assignBoardSlugs(["소식", "공지사항"])).toEqual([
      { name: "소식", slug: "notice" },
      { name: "공지사항", slug: "notice-2" },
    ]);
  });

  it("앞뒤 공백은 이름에서 뺀다", () => {
    expect(assignBoardSlugs(["  갤러리  "])).toEqual([
      { name: "갤러리", slug: "gallery" },
    ]);
  });
});
