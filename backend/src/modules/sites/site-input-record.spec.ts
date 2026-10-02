import { describe, expect, it } from "vitest";
import {
  planSiteImages,
  toCreateSiteRecord,
  toSiteInputForm,
} from "./site-input-record.js";

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

describe("toSiteInputForm", () => {
  it("저장된 입력을 편집 폼 값으로 되돌린다", () => {
    expect(
      toSiteInputForm({
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
          homepage: "https://cafe.example",
          instagram: "https://instagram.com/cafe",
          youtube: "https://youtube.com/@cafe",
        },
        logo: { url: "/uploads/logos/logo.png", originalName: "logo.png" },
        photos: [
          { url: "/uploads/photos/a.png", originalName: "a.png" },
        ],
      }),
    ).toEqual({
      industry: "카페",
      name: "아침커피",
      tagline: "좋은 커피",
      description: "원두를 직접 볶습니다",
      address: "서울",
      phone: "010-0000-0000",
      email: "cafe@example.com",
      purpose: "company_intro",
      targetCustomer: "직장인",
      mainColor: "#111111",
      mood: "warm",
      pageCount: "2",
      selectedPages: ["company_intro", "contact"],
      blogLink: "https://blog.naver.com/cafe",
      websiteLink: "https://cafe.example",
      instagramLink: "https://instagram.com/cafe",
      youtubeLink: "https://youtube.com/@cafe",
      referenceLink: "https://example.com",
      extraRequest: "로고를 크게",
      logo: { url: "/uploads/logos/logo.png", originalName: "logo.png" },
      photos: [{ url: "/uploads/photos/a.png", originalName: "a.png" }],
    });
  });

  it("비어 있는 선택 값은 빈 문자열과 빈 목록으로 둔다", () => {
    expect(
      toSiteInputForm({
        userId: 1,
        name: "카페",
        businessType: null,
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
        logo: null,
        photos: [],
      }),
    ).toMatchObject({
      industry: "",
      description: "",
      mood: "",
      pageCount: "1",
      selectedPages: [],
      blogLink: "",
      websiteLink: "",
      referenceLink: "",
      extraRequest: "",
      logo: null,
      photos: [],
    });
  });
});

describe("planSiteImages", () => {
  const current = {
    logo: { url: "/uploads/logos/logo.png", originalName: "logo.png" },
    photos: [
      { url: "/uploads/photos/a.png", originalName: "a.png" },
      { url: "/uploads/photos/b.png", originalName: "b.png" },
    ],
  };

  it("남기라고 한 기존 이미지만 유지하고 새 파일을 뒤에 붙인다", () => {
    expect(
      planSiteImages(current, {
        keepExistingLogo: true,
        keptPhotoUrls: ["/uploads/photos/b.png", "/uploads/photos/other.png"],
        logo: null,
        photos: [{ url: "/uploads/photos/c.png", originalName: "c.png" }],
      }),
    ).toEqual({
      logo: current.logo,
      photos: [
        { url: "/uploads/photos/b.png", originalName: "b.png" },
        { url: "/uploads/photos/c.png", originalName: "c.png" },
      ],
    });
  });

  it("새 로고가 있으면 기존 로고 대신 쓴다", () => {
    expect(
      planSiteImages(current, {
        keepExistingLogo: true,
        keptPhotoUrls: [],
        logo: { url: "/uploads/logos/new.png", originalName: "new.png" },
        photos: [],
      }).logo,
    ).toEqual({ url: "/uploads/logos/new.png", originalName: "new.png" });
  });

  it("로고를 빼면 로고 없이 둔다", () => {
    expect(
      planSiteImages(current, {
        keepExistingLogo: false,
        keptPhotoUrls: [],
        logo: null,
        photos: [],
      }),
    ).toEqual({ logo: null, photos: [] });
  });
});
