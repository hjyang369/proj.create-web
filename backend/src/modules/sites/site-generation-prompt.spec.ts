import { describe, expect, it } from "vitest";
import type { CreateSiteRecord } from "./sites.store.js";
import { fallbackSiteDesignSpec } from "./site-design-spec.js";
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
    expect(prompt.system).toContain("JavaScript를 생성하지 마세요");
    expect(prompt.system).toContain('type="checkbox"');
    expect(prompt.system).toContain("scroll-behavior: smooth");
    expect(prompt.system).not.toContain("popovertarget");
    expect(prompt.system).not.toContain("crep-fold");
    expect(prompt.system).not.toContain('data-action="carousel.next"');
    expect(prompt.system).not.toContain("clipboard.copy");
    expect(prompt.system).not.toContain('data-action="tabs.select"');
    expect(prompt.system).not.toContain('data-action="video.play"');
    expect(prompt.user).not.toContain("popovertarget");
    expect(prompt.user).not.toContain('data-action="carousel.next"');
    expect(prompt.user).not.toContain("clipboard.copy");
    expect(prompt.system).not.toContain('data-action="menu.toggle"');
    expect(prompt.system).not.toContain('data-action="modal.open"');
    expect(prompt.user).not.toContain('type="radio"');
    expect(prompt.user).not.toContain("crep-switch");
    expect(prompt.user).toContain('"companyName": "크레프 스튜디오"');
    expect(prompt.user).toContain('"purpose": "서비스 홍보용"');
    expect(prompt.user).toContain('"atmosphere": "모던한"');
    expect(prompt.user).toContain('"pageCount": 2');
    expect(prompt.user).toContain('"company_intro"');
    expect(prompt.user).toContain('"/uploads/logos/logo.webp"');
    expect(prompt.user).toContain('"/uploads/photos/office.webp"');
    expect(prompt.user).not.toContain('"userId"');
  });

  it("추가 요청에 탭이 있으면 입력 프롬프트에 탭 예시만 넣는다", () => {
    const prompt = buildSiteGenerationPrompt({
      ...completeInput,
      extraRequest: "탭 메뉴와 자주 묻는 질문을 넣어 주세요.",
    });

    expect(prompt.user).toContain('data-action="tabs.select"');
    expect(prompt.user).toContain('name="crep-accordion-1"');
    expect(prompt.user).not.toContain('data-action="accordion.toggle"');
    expect(prompt.user).not.toContain('type="radio"');
    expect(prompt.user).not.toContain("crep-switch");
    expect(prompt.system).not.toContain('type="radio"');
  });

  it("사진이 두 장 이상이어도 설계서가 캐러셀을 고르지 않으면 사진 넘기기를 넣지 않는다", () => {
    const prompt = buildSiteGenerationPrompt({
      ...completeInput,
      photos: [
        ...completeInput.photos,
        {
          url: "/uploads/photos/team.webp",
          originalName: "team.webp",
        },
      ],
    });

    expect(prompt.user).not.toContain('data-action="carousel.next"');
    expect(prompt.system).not.toContain('data-action="carousel.next"');
  });

  it("설계서 섹션이 캐러셀이면 사진이 두 장 이상일 때 사진 넘기기를 넣는다", () => {
    const plan = fallbackSiteDesignSpec(completeInput);
    plan.pages[0]?.sections.push({
      type: "gallery",
      variant: "carousel",
      composition: "업로드된 사진을 넘겨 본다.",
    });
    const prompt = buildSiteGenerationPrompt(
      {
        ...completeInput,
        photos: [
          ...completeInput.photos,
          {
            url: "/uploads/photos/team.webp",
            originalName: "team.webp",
          },
        ],
      },
      [],
      plan,
    );

    expect(prompt.user).toContain('data-action="carousel.next"');
    expect(prompt.system).not.toContain('data-action="carousel.next"');
  });

  it("복사 요청이 있으면 복사 예시를 입력 프롬프트에만 넣는다", () => {
    const prompt = buildSiteGenerationPrompt({
      ...completeInput,
      extraRequest: "이메일 복사 버튼을 넣어 주세요.",
    });

    expect(prompt.user).toContain('data-action="clipboard.copy"');
    expect(prompt.system).not.toContain("clipboard.copy");
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

  it("게시판 이름과 목록 주소를 생성 요청에 넣고 글 내용은 만들지 않게 한다", () => {
    const prompt = buildSiteGenerationPrompt({
      ...completeInput,
      boardConfigs: [{ name: "뉴스", slug: "news" }],
    });

    expect(prompt.user).toContain("뉴스");
    expect(prompt.user).toContain("/board/news");
    expect(prompt.system).toContain("게시판 글 목록, 글 내용은 HTML로 만들지 않습니다");
  });

  it("설계서가 있으면 고정 히어로 템플릿 대신 섹션 구성을 생성 요청에 넣는다", () => {
    const spec = fallbackSiteDesignSpec({
      ...completeInput,
      businessType: "피부과",
      mainColor: "#987C6D",
    });
    const prompt = buildSiteGenerationPrompt(completeInput, [], spec);

    expect(prompt.system).toContain("asymmetric-photo");
    expect(prompt.system).toContain(spec.pages[0]?.sections[0]?.composition);
    expect(prompt.system).toContain("#987C6D");
    expect(prompt.system).not.toContain("첫 번째 이미지는 Hero에서만");
    expect(prompt.system).not.toContain("기본 순서:");
    expect(prompt.user).not.toContain("hero-split-01");
    expect(prompt.user).not.toContain("<hero-template");
  });
});
