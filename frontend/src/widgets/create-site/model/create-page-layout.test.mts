import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeCreatePageLayout } from "./create-page-layout.ts";

describe("describeCreatePageLayout", () => {
  it("한 페이지에 섹션을 순서대로 두고 단계 이동 버튼은 두지 않는다", () => {
    const layout = describeCreatePageLayout();

    assert.equal(layout.mode, "single-page");
    assert.equal(layout.title, "사이트 만들기");
    assert.deepEqual(
      layout.sections.map((section) => section.id),
      ["basics", "company", "purpose", "design", "structure", "images"],
    );
    assert.deepEqual(layout.action, { label: "생성하기" });
    assert.equal("previousLabel" in layout, false);
    assert.equal("nextLabel" in layout, false);
  });

  it("각 섹션은 나중에 입력 칸이 들어갈 자리를 설명한다", () => {
    const layout = describeCreatePageLayout();

    assert.deepEqual(
      layout.sections.map((section) => section.title),
      ["기본 정보", "회사 정보", "목적과 고객", "디자인", "페이지 구성", "이미지"],
    );
    assert.ok(layout.sections.every((section) => section.description.length > 0));
  });
});
