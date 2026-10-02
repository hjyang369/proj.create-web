import type { GeneratedSitePage } from "./site-generation-response.js";
import type { CreateSiteRecord } from "./sites.store.js";

export type SiteGenerator = {
  generatePages: (input: CreateSiteRecord) => Promise<GeneratedSitePage[]>;
  editComponent: (input: {
    html: string;
    css: string;
    sectionIndex: number;
    request: string;
    elementHtml?: string;
    imageUrl?: string;
  }) => Promise<{ html: string; css: string }>;
};

export const SITE_GENERATOR = Symbol("SITE_GENERATOR");
