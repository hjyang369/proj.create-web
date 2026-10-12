import { describe, expect, it } from "vitest";
import { heroTemplateFor } from "./section-templates.js";

describe("heroTemplateFor", () => {
  it("분할 히어로는 글과 사진을 좌우로 나누는 구조를 준다", () => {
    const template = heroTemplateFor("split-editorial");

    expect(template.id).toBe("hero-split-editorial");
    expect(template.html).toContain("hero-split");
    expect(template.html).toContain("hero-split__copy");
    expect(template.html).toContain("hero-split__media");
    expect(template.cssNotes).toContain("grid-template-columns");
  });

  it("사진이 없는 타이포그래피 히어로는 이미지 칸을 만들지 않는다", () => {
    const template = heroTemplateFor("typography-first");

    expect(template.html).toContain("hero-type");
    expect(template.html).not.toContain("<img");
  });

  it("여덟 가지 히어로 레이아웃마다 서로 다른 템플릿을 준다", () => {
    const ids = [
      heroTemplateFor("fullscreen-photo").id,
      heroTemplateFor("split-editorial").id,
      heroTemplateFor("asymmetric-photo").id,
      heroTemplateFor("typography-first").id,
      heroTemplateFor("centered-statement").id,
      heroTemplateFor("overlapping-images").id,
      heroTemplateFor("product-showcase").id,
      heroTemplateFor("minimal-graphic").id,
    ];

    expect(new Set(ids).size).toBe(8);
  });
});
