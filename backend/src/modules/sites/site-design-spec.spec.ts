import { describe, expect, it } from "vitest";
import type { CreateSiteRecord } from "./sites.store.js";
import {
  fallbackSiteDesignSpec,
  parseSiteDesignSpec,
} from "./site-design-spec.js";

const input: CreateSiteRecord = {
  userId: 1,
  name: "아리아의원",
  businessType: "피부과",
  oneLineIntro: "차분한 피부 진료",
  description: null,
  address: null,
  phone: null,
  email: null,
  purpose: "inquiry",
  targetCustomer: null,
  mainColor: "#987C6D",
  atmosphere: "elegant",
  extraRequest: null,
  pageCount: 1,
  pageComponents: ["contact"],
  referenceUrl: null,
  optionalLinks: null,
  logo: null,
  photos: [{ url: "/uploads/photos/clinic.webp", originalName: "clinic.webp" }],
};

describe("parseSiteDesignSpec", () => {
  it("설계서 JSON에서 컨셉, 색, 히어로, 섹션 구성을 읽는다", () => {
    const spec = parseSiteDesignSpec(
      JSON.stringify({
        concept: {
          name: "고요한 진료",
          direction: "여백이 넓은 편집 레이아웃",
          keywords: ["차분함", "여백"],
        },
        palette: {
          primary: "#1C1917",
          accent: "#987C6D",
          background: "#F6F3EF",
          surface: "#FFFFFF",
          text: "#1C1917",
          muted: "#6B6560",
        },
        typography: {
          headingFont: "Iowan Old Style",
          bodyFont: "Apple SD Gothic Neo",
          heroSize: "clamp(3.5rem, 8vw, 6rem)",
          headingStyle: "얇은 세리프",
        },
        layout: {
          hero: "asymmetric-photo",
          contentWidth: "1120px",
          sectionSpacing: "넓은 여백",
          cornerStyle: "sharp",
          imageTreatment: "세로 사진",
        },
        pages: [
          {
            pageOrder: 1,
            visualGoal: "진료 신뢰를 첫 화면에서 보여 준다",
            sections: [
              {
                type: "hero",
                variant: "asymmetric-photo",
                composition:
                  "좌측 큰 제목, 우측 세로 사진. https://evil.example/a.jpg 는 쓰지 않는다.",
              },
              {
                type: "services",
                variant: "editorial-list",
                composition: "카드 없이 구분선으로 진료 항목을 나눈다.",
              },
            ],
          },
        ],
        designRules: ["메인 컬러는 버튼에만 쓴다"],
      }),
      ["/uploads/photos/clinic.webp"],
    );

    expect(spec?.layout.hero).toBe("asymmetric-photo");
    expect(spec?.palette.accent).toBe("#987C6D");
    expect(spec?.pages[0]?.sections[0]).toMatchObject({
      type: "hero",
      variant: "asymmetric-photo",
    });
    expect(spec?.pages[0]?.sections[0]?.composition).toContain("좌측 큰 제목");
    expect(spec?.pages[0]?.sections[0]?.composition).not.toContain(
      "https://evil.example",
    );
  });

  it("허용되지 않은 히어로 레이아웃은 설계서로 받지 않는다", () => {
    expect(
      parseSiteDesignSpec(
        JSON.stringify({
          concept: { name: "기본", direction: "단정함", keywords: ["단정"] },
          palette: {
            primary: "#111111",
            accent: "#111111",
            background: "#FFFFFF",
            surface: "#FFFFFF",
            text: "#111111",
            muted: "#666666",
          },
          typography: {
            headingFont: "sans-serif",
            bodyFont: "sans-serif",
            heroSize: "4rem",
            headingStyle: "보통",
          },
          layout: {
            hero: "split",
            contentWidth: "1120px",
            sectionSpacing: "보통",
            cornerStyle: "subtle",
            imageTreatment: "없음",
          },
          pages: [
            {
              pageOrder: 1,
              visualGoal: "소개",
              sections: [
                { type: "hero", variant: "split", composition: "좌우 분할" },
              ],
            },
          ],
          designRules: [],
        }),
        [],
      ),
    ).toBeNull();
  });
});

describe("fallbackSiteDesignSpec", () => {
  it("피부과는 비대칭 사진 히어로로 두고 메인 컬러는 강조색만 쓴다", () => {
    const spec = fallbackSiteDesignSpec(input);
    const types = spec.pages[0]?.sections.map((section) => section.type);

    expect(spec.layout.hero).toBe("asymmetric-photo");
    expect(spec.palette.accent).toBe("#987C6D");
    expect(spec.palette.background).not.toBe("#987C6D");
    expect(spec.palette.text).not.toBe("#987C6D");
    expect(types).toEqual(["hero", "services", "about", "contact", "cta"]);
    expect(spec.pages[0]?.sections[1]?.composition).toContain("구분선");
  });

  it("리뷰를 고르면 메인 CTA 앞에 리뷰 섹션을 둔다", () => {
    const spec = fallbackSiteDesignSpec({
      ...input,
      pageComponents: ["contact", "review"],
    });
    const types = spec.pages[0]?.sections.map((section) => section.type) ?? [];

    expect(types.indexOf("reviews")).toBeGreaterThan(types.indexOf("contact"));
    expect(types.at(-1)).toBe("cta");
  });

  it("사진이 없는 소프트웨어는 그래픽 히어로를 고르고 문의 섹션을 넣지 않는다", () => {
    const spec = fallbackSiteDesignSpec({
      ...input,
      businessType: "AI SaaS",
      oneLineIntro: "업무를 자동화합니다",
      purpose: "promotion",
      pageComponents: null,
      photos: [],
    });

    expect(spec.layout.hero).toBe("minimal-graphic");
    expect(
      spec.pages[0]?.sections.some((section) => section.type === "contact"),
    ).toBe(false);
    expect(
      spec.pages[0]?.sections.some((section) => section.type === "gallery"),
    ).toBe(false);
  });

  it("웹 에이전시는 타이포그래피 히어로를 고른다", () => {
    const spec = fallbackSiteDesignSpec({
      ...input,
      businessType: "AI 웹 에이전시",
      oneLineIntro: "브랜드 사이트를 만듭니다",
      purpose: "promotion",
      pageComponents: null,
    });

    expect(spec.layout.hero).toBe("typography-first");
  });

  it("건축 업종은 사진 갤러리를 서비스 설명보다 앞에 둔다", () => {
    const spec = fallbackSiteDesignSpec({
      ...input,
      businessType: "건축 설계",
      oneLineIntro: "공간을 설계합니다",
      purpose: "company_intro",
      pageComponents: null,
      photos: [
        { url: "/uploads/photos/space.webp", originalName: "space.webp" },
        { url: "/uploads/photos/detail.webp", originalName: "detail.webp" },
      ],
    });
    const types = spec.pages[0]?.sections.map((section) => section.type) ?? [];

    expect(spec.layout.hero).toBe("fullscreen-photo");
    expect(types.indexOf("gallery")).toBeGreaterThan(-1);
    expect(types.indexOf("gallery")).toBeLessThan(types.indexOf("services"));
  });
});
