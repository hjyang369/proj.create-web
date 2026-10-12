import { describe, expect, it } from "vitest";
import { fallbackSiteDesignSpec } from "./site-design-spec.js";
import { buildPagesFromDesign } from "./site-design-fallback.js";
import type { CreateSiteRecord } from "./sites.store.js";

const input: CreateSiteRecord = {
  userId: 1,
  name: "카페",
  businessType: null,
  oneLineIntro: "좋은 커피",
  description: "직접 볶은 원두를 내립니다.",
  address: "서울",
  phone: "02-000-0000",
  email: "hello@example.com",
  purpose: "company_intro",
  targetCustomer: null,
  mainColor: "#987C6D",
  atmosphere: "warm",
  extraRequest: null,
  pageCount: 1,
  pageComponents: null,
  referenceUrl: null,
  optionalLinks: null,
  logo: null,
  photos: [],
};

describe("buildPagesFromDesign", () => {
  it("빈 모델 응답 대신 설계서의 히어로와 회사 정보로 페이지를 만든다", () => {
    const pages = buildPagesFromDesign(input, fallbackSiteDesignSpec(input));

    expect(pages).toHaveLength(1);
    expect(pages[0]?.pageOrder).toBe(1);
    expect(pages[0]?.html).toContain("카페");
    expect(pages[0]?.html).toContain("좋은 커피");
    expect(pages[0]?.html).toContain("hero-type");
    expect(pages[0]?.html).not.toContain("HERO_IMAGE");
    expect(pages[0]?.html).not.toContain("<script");
    expect(pages[0]?.css).toContain("#987C6D");
    expect(pages[0]?.css).toContain("#F6F3EF");
  });

  it("회사명에 태그가 있어도 HTML로 해석하지 않는다", () => {
    const pages = buildPagesFromDesign(
      { ...input, name: "<script>alert(1)</script>" },
      fallbackSiteDesignSpec(input),
    );

    expect(pages[0]?.html).not.toContain("<script>alert(1)</script>");
    expect(pages[0]?.html).toContain("&lt;script&gt;");
  });
});
