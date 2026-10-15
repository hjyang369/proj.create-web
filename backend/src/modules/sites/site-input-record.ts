import type { CreateSiteRecord } from "./sites.store.js";

export type StoredGenerationInput = {
  userId: number;
  businessType: string | null;
  companyName: string;
  oneLineIntro: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  purpose: string;
  targetCustomer: string | null;
  mainColor: string | null;
  atmosphere: string | null;
  extraRequest: string | null;
  pageCount: number;
  pageComponents: unknown;
  boardConfigs?: unknown;
  referenceUrl: string | null;
  optionalLinks: unknown;
};

export type StoredGenerationImage = {
  type: "logo" | "site_image";
  url: string;
  originalName: string | null;
  order: number;
};

const PURPOSES = [
  "company_intro",
  "investment",
  "sales",
  "recruitment",
  "promotion",
  "inquiry",
] as const;

const ATMOSPHERES = [
  "warm",
  "professional",
  "modern",
  "cute",
  "elegant",
  "bold",
] as const;

function readPurpose(value: string): CreateSiteRecord["purpose"] {
  const purpose = PURPOSES.find((item) => item === value);
  if (!purpose) {
    throw new Error("저장된 제작 목적을 다시 사용할 수 없습니다.");
  }
  return purpose;
}

function readAtmosphere(
  value: string | null,
): CreateSiteRecord["atmosphere"] {
  if (!value) {
    return null;
  }
  return ATMOSPHERES.find((item) => item === value) ?? null;
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );
  return items.length > 0 ? items : null;
}

function readBoardConfigs(
  value: unknown,
): Array<{ name: string; slug: string }> | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const configs = value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    const record = item as { name?: unknown; slug?: unknown };
    if (
      typeof record.name !== "string" ||
      record.name.trim() === "" ||
      typeof record.slug !== "string" ||
      record.slug.trim() === ""
    ) {
      return [];
    }
    return [{ name: record.name.trim(), slug: record.slug.trim() }];
  });

  return configs.length > 0 ? configs : null;
}

function readLinks(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const links: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.trim() !== "") {
      links[key] = item;
    }
  }

  return Object.keys(links).length > 0 ? links : null;
}

function fileNameFromUrl(url: string): string {
  const name = url.split("/").pop()?.split("?")[0]?.trim() ?? "";
  return name || "image";
}

export type SiteInputForm = {
  industry: string;
  name: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  purpose: CreateSiteRecord["purpose"];
  targetCustomer: string;
  mainColor: string;
  mood: string;
  pageCount: string;
  selectedPages: string[];
  blogLink: string;
  websiteLink: string;
  instagramLink: string;
  youtubeLink: string;
  referenceLink: string;
  extraRequest: string;
  boardNames: string[];
  logo: { url: string; originalName: string } | null;
  photos: Array<{ url: string; originalName: string }>;
};

function textOrEmpty(value: string | null): string {
  return value ?? "";
}

function linkOrEmpty(
  links: Record<string, string> | null,
  key: string,
): string {
  return links?.[key] ?? "";
}

/** 저장된 생성 입력을 편집 화면 폼이 쓰는 필드로 되돌린다. */
export function toSiteInputForm(record: CreateSiteRecord): SiteInputForm {
  return {
    industry: textOrEmpty(record.businessType),
    name: record.name,
    tagline: record.oneLineIntro,
    description: textOrEmpty(record.description),
    address: textOrEmpty(record.address),
    phone: textOrEmpty(record.phone),
    email: textOrEmpty(record.email),
    purpose: record.purpose,
    targetCustomer: textOrEmpty(record.targetCustomer),
    mainColor: textOrEmpty(record.mainColor),
    mood: textOrEmpty(record.atmosphere),
    pageCount: String(record.pageCount),
    selectedPages: record.pageComponents ?? [],
    blogLink: linkOrEmpty(record.optionalLinks, "naver_blog"),
    websiteLink: linkOrEmpty(record.optionalLinks, "homepage"),
    instagramLink: linkOrEmpty(record.optionalLinks, "instagram"),
    youtubeLink: linkOrEmpty(record.optionalLinks, "youtube"),
    referenceLink: textOrEmpty(record.referenceUrl),
    extraRequest: textOrEmpty(record.extraRequest),
    boardNames: record.boardConfigs?.map((board) => board.name) ?? [],
    logo: record.logo,
    photos: record.photos,
  };
}

type StoredSiteImageFile = { url: string; originalName: string };

/** 기존 이미지 중 남길 것과 새로 올린 파일을 합친다. */
export function planSiteImages(
  current: {
    logo: StoredSiteImageFile | null;
    photos: StoredSiteImageFile[];
  },
  change: {
    keepExistingLogo: boolean;
    keptPhotoUrls: string[];
    logo: StoredSiteImageFile | null;
    photos: StoredSiteImageFile[];
  },
): { logo: StoredSiteImageFile | null; photos: StoredSiteImageFile[] } {
  const kept = new Set(change.keptPhotoUrls);

  return {
    logo: change.logo ?? (change.keepExistingLogo ? current.logo : null),
    photos: [
      ...current.photos.filter((photo) => kept.has(photo.url)),
      ...change.photos,
    ],
  };
}

export function toCreateSiteRecord(
  input: StoredGenerationInput,
  images: StoredGenerationImage[],
): CreateSiteRecord {
  const ordered = [...images].sort((left, right) => left.order - right.order);
  const logo = ordered.find((image) => image.type === "logo") ?? null;

  return {
    userId: input.userId,
    name: input.companyName,
    businessType: input.businessType,
    oneLineIntro: input.oneLineIntro,
    description: input.description,
    address: input.address,
    phone: input.phone,
    email: input.email,
    purpose: readPurpose(input.purpose),
    targetCustomer: input.targetCustomer,
    mainColor: input.mainColor,
    atmosphere: readAtmosphere(input.atmosphere),
    extraRequest: input.extraRequest,
    pageCount: input.pageCount,
    pageComponents: readStringList(input.pageComponents),
    boardConfigs: readBoardConfigs(input.boardConfigs),
    referenceUrl: input.referenceUrl,
    optionalLinks: readLinks(input.optionalLinks),
    logo: logo
      ? {
          url: logo.url,
          originalName: logo.originalName?.trim() || fileNameFromUrl(logo.url),
        }
      : null,
    photos: ordered
      .filter((image) => image.type === "site_image")
      .map((image) => ({
        url: image.url,
        originalName: image.originalName?.trim() || fileNameFromUrl(image.url),
      })),
  };
}
