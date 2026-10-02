import { describe, expect, it } from "vitest";
import { toCreateSiteRecord } from "./site-input-record.js";

describe("toCreateSiteRecord", () => {
  it("저장된 site_inputs와 이미지를 AI 입력으로 되돌린다", () => {
    const record = toCreateSiteRecord(
      {
        userId: 7,
        businessType: "카페",
        companyName: "아침커피",
        oneLineIntro: "좋은 커피",
        description: "원두를 직접 볶습니다",
        address: "서울",
        phone: "010-0000-0000",
        email: "cafe@example.com",
        purpose: "company_intro",
        targetCustomer: "직장인",
        mainColor: "#111111",
        atmosphere: "warm",
        extraRequest: "로고를 크게",
        pageCount: 2,
        pageComponents: ["company_intro", "contact"],
        referenceUrl: "https://example.com",
        optionalLinks: {
          naver_blog: "https://blog.naver.com/cafe",
          homepage: "",
        },
      },
      [
        {
          type: "site_image",
          url: "/uploads/photos/b.png",
          originalName: "b.png",
          order: 1,
        },
        {
          type: "logo",
          url: "/uploads/logos/logo.png",
          originalName: "logo.png",
          order: 0,
        },
        {
          type: "site_image",
          url: "/uploads/photos/a.png",
          originalName: null,
          order: 0,
        },
      ],
    );

    expect(record).toEqual({
      userId: 7,
      name: "아침커피",
      businessType: "카페",
      oneLineIntro: "좋은 커피",
      description: "원두를 직접 볶습니다",
      address: "서울",
      phone: "010-0000-0000",
      email: "cafe@example.com",
      purpose: "company_intro",
      targetCustomer: "직장인",
      mainColor: "#111111",
      atmosphere: "warm",
      extraRequest: "로고를 크게",
      pageCount: 2,
      pageComponents: ["company_intro", "contact"],
      referenceUrl: "https://example.com",
      optionalLinks: {
        naver_blog: "https://blog.naver.com/cafe",
      },
      logo: {
        url: "/uploads/logos/logo.png",
        originalName: "logo.png",
      },
      photos: [
        { url: "/uploads/photos/a.png", originalName: "a.png" },
        { url: "/uploads/photos/b.png", originalName: "b.png" },
      ],
    });
  });

  it("비어 있는 선택 값은 빼고, 사진 원본 이름이 없으면 파일 이름으로 둔다", () => {
    const record = toCreateSiteRecord(
      {
        userId: 1,
        businessType: null,
        companyName: "카페",
        oneLineIntro: "좋은 커피",
        description: null,
        address: null,
        phone: null,
        email: null,
        purpose: "sales",
        targetCustomer: null,
        mainColor: null,
        atmosphere: null,
        extraRequest: null,
        pageCount: 1,
        pageComponents: null,
        referenceUrl: null,
        optionalLinks: null,
      },
      [
        {
          type: "site_image",
          url: "/uploads/photos/a.png",
          originalName: null,
          order: 0,
        },
      ],
    );

    expect(record.businessType).toBeNull();
    expect(record.pageComponents).toBeNull();
    expect(record.optionalLinks).toBeNull();
    expect(record.logo).toBeNull();
    expect(record.photos).toEqual([
      { url: "/uploads/photos/a.png", originalName: "a.png" },
    ]);
  });
});
