import type { CreateSiteRecord } from "./sites.store.js";
import { unwrapJsonText } from "./site-generation-response.js";

export const HERO_LAYOUTS = [
  "fullscreen-photo",
  "split-editorial",
  "asymmetric-photo",
  "typography-first",
  "centered-statement",
  "overlapping-images",
  "product-showcase",
  "minimal-graphic",
] as const;

export const CORNER_STYLES = ["sharp", "subtle", "rounded"] as const;

export type HeroLayout = (typeof HERO_LAYOUTS)[number];
export type CornerStyle = (typeof CORNER_STYLES)[number];

export type DesignSection = {
  type: string;
  variant: string;
  composition: string;
};

export type SiteDesignPlan = {
  concept: {
    name: string;
    direction: string;
    keywords: string[];
  };
  palette: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    heroSize: string;
    headingStyle: string;
  };
  layout: {
    hero: HeroLayout;
    contentWidth: string;
    sectionSpacing: string;
    cornerStyle: CornerStyle;
    imageTreatment: string;
  };
  pages: Array<{
    pageOrder: number;
    visualGoal: string;
    sections: DesignSection[];
  }>;
  designRules: string[];
};

/** 기존 호출부가 같은 설계서 타입을 쓰도록 이름을 유지한다. */
export type SiteDesignSpec = SiteDesignPlan;

const SERIF = "Iowan Old Style, Apple SD Gothic Neo, serif";
const SANS = "Apple SD Gothic Neo, sans-serif";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function includesValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && values.some((item) => item === value);
}

function hexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^#([0-9a-fA-F]{6})$/);
  return match ? `#${match[1]}` : null;
}

function safeFont(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[^a-zA-Z0-9가-힣 ,.'"-]/g, "").trim();
  return cleaned.slice(0, 80) || fallback;
}

function shortText(value: unknown, fallback: string, max = 160): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

function slug(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
  return cleaned || fallback;
}

function stripForeignUrls(value: string, photoUrls: readonly string[]): string {
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) =>
      photoUrls.includes(url) ? url : "",
    )
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function textList(
  value: unknown,
  photoUrls: readonly string[],
  limit: number,
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      if (typeof item !== "string") return [];
      const cleaned = stripForeignUrls(item, photoUrls).slice(0, 160);
      return cleaned ? [cleaned] : [];
    })
    .slice(0, limit);
}

function businessBlob(input: CreateSiteRecord): string {
  return [input.businessType, input.oneLineIntro, input.description]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

function inferHero(input: CreateSiteRecord): HeroLayout {
  const blob = businessBlob(input);
  const photos = input.photos.length;

  if (/인테리어|건축|공간|호텔|펜션|숙소|여행|리조트/.test(blob) && photos > 0) {
    return "fullscreen-photo";
  }
  if (/saas|소프트웨어|앱|플랫폼/i.test(blob)) {
    return photos > 0 ? "product-showcase" : "minimal-graphic";
  }
  if (/피부|병원|의원|클리닉|치과|한의원|뷰티|미용|성형|스파/.test(blob)) {
    return photos > 0 ? "asymmetric-photo" : "typography-first";
  }
  if (/에이전시|스튜디오|디자인|브랜드/.test(blob)) {
    return "typography-first";
  }
  if (photos === 0) return "typography-first";
  if (photos >= 3) return "overlapping-images";
  return "split-editorial";
}

function heroComposition(hero: HeroLayout): string {
  switch (hero) {
    case "fullscreen-photo":
      return "사진을 화면 가득 두고, 읽기 쉬운 오버레이 위에 짧은 제목과 CTA만 올린다.";
    case "asymmetric-photo":
      return "좌측에는 큰 제목, 우측에는 세로 사진을 비대칭으로 둔다. 카드로 감싸지 않는다.";
    case "typography-first":
      return "매우 큰 제목을 화면의 주인공으로 두고, 설명과 CTA는 제목 아래에 작게 둔다. 빈 이미지 칸은 만들지 않는다.";
    case "minimal-graphic":
      return "사진 없이 큰 글자와 CSS 면 분할로 구성한다. 장식 원형은 쓰지 않는다.";
    case "product-showcase":
      return "제공된 제품 사진을 한쪽에 크게 두고, 다른 쪽에는 한 문장과 CTA만 둔다.";
    case "overlapping-images":
      return "여러 사진의 크기와 위치를 다르게 겹친다. 같은 크기 격자만 쓰지 않는다.";
    case "centered-statement":
      return "짧은 문장을 중앙에 두되, 줄바꿈과 자간으로 흔한 중앙 정렬 템플릿과 다르게 만든다.";
    default:
      return "글과 사진의 폭을 다르게 나눈다. 정중앙 분할만 반복하지 않는다.";
  }
}

function sectionsFor(
  input: CreateSiteRecord,
  hero: HeroLayout,
): DesignSection[] {
  const blob = businessBlob(input);
  const includeContact =
    input.purpose === "inquiry" ||
    (input.pageComponents?.includes("contact") ?? false);
  const services: DesignSection = {
    type: "services",
    variant: "editorial-list",
    composition:
      "카드 대신 구분선으로 항목을 나눈다. 왼쪽은 제목, 오른쪽은 짧은 설명이다.",
  };
  const about: DesignSection = {
    type: "about",
    variant: "statement",
    composition: "넓은 여백 위에 짧은 문단만 둔다. 박스로 감싸지 않는다.",
  };
  const gallery: DesignSection = {
    type: "gallery",
    variant: "editorial-grid",
    composition:
      "같은 크기 카드로 나열하지 않고, 큰 사진과 작은 사진을 섞어 배치한다.",
  };
  const detail: DesignSection = {
    type: "detail",
    variant: "process",
    composition: "사용 순서를 번호 카드 없이 세로 흐름으로 보여 준다.",
  };
  const cta: DesignSection = {
    type: "cta",
    variant: "band",
    composition: "마지막에 한 문장과 버튼만 둔다. 새 실적 문구는 만들지 않는다.",
  };
  const contact: DesignSection = {
    type: "contact",
    variant: "plain",
    composition: "입력된 연락처만 표시한다. 없는 정보는 만들지 않는다.",
  };

  let body: DesignSection[];
  if (
    /인테리어|건축|공간|호텔|펜션|숙소|여행|리조트/.test(blob) &&
    input.photos.length >= 2
  ) {
    body = [
      { type: "hero", variant: hero, composition: heroComposition(hero) },
      gallery,
      services,
      cta,
    ];
  } else if (/피부|병원|의원|클리닉|치과|한의원|뷰티|미용|성형|스파/.test(blob)) {
    body = [
      { type: "hero", variant: hero, composition: heroComposition(hero) },
      services,
      about,
      cta,
    ];
  } else if (/saas|소프트웨어|앱|플랫폼/i.test(blob)) {
    body = [
      { type: "hero", variant: hero, composition: heroComposition(hero) },
      services,
      detail,
      cta,
    ];
  } else {
    body = [
      { type: "hero", variant: hero, composition: heroComposition(hero) },
      about,
      services,
      cta,
    ];
  }

  if (includeContact) body.splice(body.length - 1, 0, contact);
  if (input.pageComponents?.includes("review")) {
    body.splice(body.length - 1, 0, {
      type: "reviews",
      variant: "quotes",
      composition:
        "CTA 앞에 짧은 후기 문장을 나열한다. 이름, 별점, 수치는 만들지 않는다.",
    });
  }
  return body;
}

function paletteFor(input: CreateSiteRecord): SiteDesignPlan["palette"] {
  const blob = businessBlob(input);
  const warm =
    /피부|병원|의원|클리닉|호텔|건축|인테리어|공간/.test(blob) ||
    input.atmosphere === "elegant" ||
    input.atmosphere === "warm";
  const tech = /saas|소프트웨어|앱|플랫폼/i.test(blob);

  return {
    primary: "#1C1917",
    accent: hexColor(input.mainColor) ?? "#1C1917",
    background: warm ? "#F6F3EF" : tech ? "#F4F6F8" : "#FFFFFF",
    surface: "#FFFFFF",
    text: "#1C1917",
    muted: "#6B6560",
  };
}

function cornerFor(input: CreateSiteRecord, hero: HeroLayout): CornerStyle {
  if (
    hero === "minimal-graphic" ||
    /saas|소프트웨어|앱|플랫폼/i.test(businessBlob(input))
  ) {
    return "rounded";
  }
  if (
    input.atmosphere === "elegant" ||
    input.atmosphere === "warm" ||
    hero === "typography-first" ||
    hero === "asymmetric-photo"
  ) {
    return "sharp";
  }
  return "subtle";
}

function parsePalette(value: unknown): SiteDesignPlan["palette"] | null {
  if (!isRecord(value)) return null;
  const primary = hexColor(value.primary);
  const accent = hexColor(value.accent);
  const background = hexColor(value.background);
  const surface = hexColor(value.surface);
  const text = hexColor(value.text);
  const muted = hexColor(value.muted);
  if (!primary || !accent || !background || !surface || !text || !muted) {
    return null;
  }
  return { primary, accent, background, surface, text, muted };
}

function parseSections(
  value: unknown,
  photoUrls: readonly string[],
): DesignSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      if (!isRecord(item)) return [];
      const type = slug(item.type, "");
      const composition = stripForeignUrls(
        shortText(item.composition, "", 400),
        photoUrls,
      );
      if (!type || !composition) return [];
      return [
        {
          type,
          variant: slug(item.variant, type),
          composition,
        },
      ];
    })
    .slice(0, 12);
}

function parsePages(
  value: unknown,
  photoUrls: readonly string[],
): SiteDesignPlan["pages"] | null {
  if (!Array.isArray(value)) return null;
  const pages = value
    .flatMap((item) => {
      if (!isRecord(item) || typeof item.pageOrder !== "number") return [];
      const sections = parseSections(item.sections, photoUrls);
      if (sections.length === 0) return [];
      return [
        {
          pageOrder: Math.max(1, Math.round(item.pageOrder)),
          visualGoal: stripForeignUrls(
            shortText(item.visualGoal, "페이지 목적에 맞는 구성", 160),
            photoUrls,
          ),
          sections,
        },
      ];
    })
    .sort((left, right) => left.pageOrder - right.pageOrder)
    .slice(0, 8);

  if (pages.length === 0 || pages[0]?.sections[0]?.type !== "hero") return null;
  return pages;
}

export function parseSiteDesignSpec(
  raw: string,
  photoUrls: readonly string[] = [],
): SiteDesignPlan | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapJsonText(raw));
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.concept) || !isRecord(parsed.layout)) {
    return null;
  }
  if (!includesValue(HERO_LAYOUTS, parsed.layout.hero)) return null;

  const palette = parsePalette(parsed.palette);
  const pages = parsePages(parsed.pages, photoUrls);
  if (!palette || !pages) return null;

  const typography = isRecord(parsed.typography) ? parsed.typography : {};
  const concept = parsed.concept;
  const keywords = textList(concept.keywords, photoUrls, 6);

  return {
    concept: {
      name: shortText(concept.name, "브랜드", 40),
      direction: stripForeignUrls(
        shortText(concept.direction, "업종에 맞는 시각 방향", 160),
        photoUrls,
      ),
      keywords: keywords.length > 0 ? keywords : ["브랜드"],
    },
    palette,
    typography: {
      headingFont: safeFont(typography.headingFont, SANS),
      bodyFont: safeFont(typography.bodyFont, SANS),
      heroSize: shortText(typography.heroSize, "clamp(3rem, 8vw, 6rem)", 80),
      headingStyle: shortText(typography.headingStyle, "명확한 위계", 80),
    },
    layout: {
      hero: parsed.layout.hero,
      contentWidth: shortText(parsed.layout.contentWidth, "1120px", 40),
      sectionSpacing: shortText(parsed.layout.sectionSpacing, "넓은 여백", 80),
      cornerStyle: includesValue(CORNER_STYLES, parsed.layout.cornerStyle)
        ? parsed.layout.cornerStyle
        : "subtle",
      imageTreatment: stripForeignUrls(
        shortText(
          parsed.layout.imageTreatment,
          "업로드된 사진만 사용",
          120,
        ),
        photoUrls,
      ),
    },
    pages,
    designRules: textList(parsed.designRules, photoUrls, 8),
  };
}

export function fallbackSiteDesignSpec(input: CreateSiteRecord): SiteDesignPlan {
  const hero = inferHero(input);
  const editorial =
    hero === "typography-first" ||
    hero === "asymmetric-photo" ||
    hero === "fullscreen-photo" ||
    input.atmosphere === "elegant" ||
    input.atmosphere === "warm";
  const pageCount = Math.max(1, input.pageCount);
  const pages: SiteDesignPlan["pages"] = [
    {
      pageOrder: 1,
      visualGoal: "첫 화면에서 업종과 핵심 메시지가 바로 보이게 한다.",
      sections: sectionsFor(input, hero),
    },
  ];

  for (let pageOrder = 2; pageOrder <= pageCount; pageOrder += 1) {
    pages.push({
      pageOrder,
      visualGoal: "메인과 다른 구성으로 상세 내용만 보여 준다.",
      sections: [
        {
          type: "detail",
          variant: "editorial",
          composition:
            "메인 히어로를 반복하지 않고 제목과 본문의 위계만 크게 잡는다.",
        },
        {
          type: "cta",
          variant: "band",
          composition: "페이지 끝에 하나의 행동만 제안한다.",
        },
      ],
    });
  }

  return {
    concept: {
      name: input.businessType?.trim() || input.name,
      direction:
        input.photos.length > 0
          ? "업로드된 사진의 역할에 맞춰 레이아웃을 고른다."
          : "사진 없이 타이포그래피와 여백으로 브랜드를 보여 준다.",
      keywords: [input.atmosphere ?? "명확함"],
    },
    palette: paletteFor(input),
    typography: {
      headingFont: editorial ? SERIF : SANS,
      bodyFont: SANS,
      heroSize:
        hero === "typography-first"
          ? "clamp(4rem, 10vw, 7.5rem)"
          : "clamp(3rem, 7vw, 5.5rem)",
      headingStyle: "자간을 약간 좁힌 제목",
    },
    layout: {
      hero,
      contentWidth: "1120px",
      sectionSpacing: "섹션마다 다른 세로 여백",
      cornerStyle: cornerFor(input, hero),
      imageTreatment:
        input.photos.length > 0
          ? "사진 비율을 유지하고, 첫 사진을 히어로에 고정하지 않는다."
          : "빈 이미지 칸을 만들지 않고 글과 면으로 구성한다.",
    },
    pages,
    designRules: [
      "메인 컬러는 버튼과 작은 강조에만 쓴다.",
      "같은 카드 구성을 연속으로 반복하지 않는다.",
      "입력에 없는 실적과 후기를 만들지 않는다.",
    ],
  };
}
