import { describe, expect, it } from "vitest";
import type { CreateSiteRecord } from "./sites.store.js";
import { buildSiteGenerationPrompt } from "./site-generation-prompt.js";

const completeInput: CreateSiteRecord = {
  userId: 7,
  name: "크레프 스튜디오",
  businessType: "AI 웹 에이전시",
  oneLineIntro: "아이디어를 빠르게 웹사이트로 만듭니다.",
  description: "초기 기업을 위한 웹사이트 제작 서비스입니다.",
  address: "서울특별시 강남구",
  phone: "02-1234-5678",
  email: "hello@example.com",
  purpose: "promotion",
  targetCustomer: "초기 스타트업",
  mainColor: "#111111",
  atmosphere: "modern",
  extraRequest: "첫 화면에 상담 버튼을 강조해 주세요.",
  pageCount: 2,
  pageComponents: ["company_intro", "contact"],
  referenceUrl: "https://example.com/reference",
  optionalLinks: {
    instagram: "https://instagram.com/crep",
  },
  logo: {
    url: "/uploads/logos/logo.webp",
    originalName: "logo.webp",
  },
  photos: [
    {
      url: "/uploads/photos/office.webp",
      originalName: "office.webp",
    },
  ],
};

describe("buildSiteGenerationPrompt", () => {
  it("사이트 입력과 이미지 URL을 AI가 이해할 수 있는 생성 요청으로 구성한다", () => {
    const prompt = buildSiteGenerationPrompt(completeInput);

    expect(prompt.system).toContain("JSON");
    expect(prompt.system).toContain("data-component-id");
    expect(prompt.system).toContain("<script>");
    expect(prompt.system).toContain("인라인 이벤트 핸들러");
    expect(prompt.user).toContain('"companyName": "크레프 스튜디오"');
    expect(prompt.user).toContain('"purpose": "서비스 홍보용"');
    expect(prompt.user).toContain('"atmosphere": "모던한"');
    expect(prompt.user).toContain('"pageCount": 2');
    expect(prompt.user).toContain('"company_intro"');
    expect(prompt.user).toContain('"/uploads/logos/logo.webp"');
    expect(prompt.user).toContain('"/uploads/photos/office.webp"');
    expect(prompt.user).not.toContain('"userId"');
  });

  it("비어 있는 선택 입력은 프롬프트 데이터에서 제외한다", () => {
    const prompt = buildSiteGenerationPrompt({
      ...completeInput,
      businessType: null,
      description: null,
      address: null,
      phone: null,
      email: null,
      targetCustomer: null,
      mainColor: null,
      atmosphere: null,
      extraRequest: null,
      pageComponents: null,
      referenceUrl: null,
      optionalLinks: null,
      logo: null,
      photos: [],
    });

    expect(prompt.user).not.toContain('"businessType"');
    expect(prompt.user).not.toContain('"description"');
    expect(prompt.user).not.toContain('"logoUrl"');
    expect(prompt.user).not.toContain('"photoUrls"');
    expect(prompt.user).toContain('"companyName": "크레프 스튜디오"');
  });
});
