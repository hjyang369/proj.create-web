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
