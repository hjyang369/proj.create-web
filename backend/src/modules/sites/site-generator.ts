import type { GeneratedSitePage } from "./site-generation-response.js";
import type { CreateSiteRecord } from "./sites.store.js";

export type SiteGenerator = {
  generatePages: (input: CreateSiteRecord) => Promise<GeneratedSitePage[]>;
};

export const SITE_GENERATOR = Symbol("SITE_GENERATOR");
