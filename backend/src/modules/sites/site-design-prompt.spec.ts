import { describe, expect, it } from "vitest";
import type { CreateSiteRecord } from "./sites.store.js";
import { buildSiteDesignPrompt } from "./site-design-prompt.js";

const input: CreateSiteRecord = {
  userId: 3,
  name: "아리아의원",
  businessType: "피부과",
  oneLineIntro: "차분한 피부 진료",
  description: "첫 방문 상담을 안내합니다.",
  address: null,
  phone: null,
  email: null,
  purpose: "inquiry",
  targetCustomer: "30대 직장인",
  mainColor: "#987C6D",
  atmosphere: "elegant",
  extraRequest: "고급스럽게",
  pageCount: 1,
  pageComponents: ["contact"],
  referenceUrl: "https://example.com/clinic",
  optionalLinks: null,
  logo: null,
  photos: [{ url: "/uploads/photos/clinic.webp", originalName: "clinic.webp" }],
};

describe("buildSiteDesignPrompt", () => {
  it("HTML 없이 디자인 설계서만 요청하고 회사 정보를 함께 넘긴다", () => {
    const prompt = buildSiteDesignPrompt(input);

    expect(prompt.system).toContain("HTML이나 CSS를 생성하지 마세요");
    expect(prompt.system).toContain("fullscreen-photo");
    expect(prompt.system).toContain("typography-first");
    expect(prompt.system).toContain("minimal-graphic");
    expect(prompt.system).toContain("composition");
    expect(prompt.system).not.toContain("병원, 뷰티, 전문 서비스는 split");
    expect(prompt.user).toContain("아리아의원");
    expect(prompt.user).toContain("피부과");
    expect(prompt.user).toContain("#987C6D");
    expect(prompt.user).toContain("https://example.com/clinic");
    expect(prompt.user).toContain("/uploads/photos/clinic.webp");
    expect(prompt.user).not.toContain('"userId"');
  });

  it("리뷰를 고르면 설계서에 리뷰 섹션을 요구한다", () => {
    const prompt = buildSiteDesignPrompt({
      ...input,
      pageComponents: ["contact", "review"],
    });

    expect(prompt.system).toContain('type "reviews"');
    expect(prompt.user).toContain('"review"');
  });
});
