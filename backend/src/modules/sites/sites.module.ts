import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DrizzleSitesStore } from "./drizzle-sites.store.js";
import { GeminiSiteGenerator } from "./gemini-site-generator.js";
import { SITE_GENERATOR } from "./site-generator.js";
import { SitesController } from "./sites.controller.js";
import { SitesService } from "./sites.service.js";
import { SITES_STORE } from "./sites.store.js";

@Module({
  imports: [AuthModule],
  controllers: [SitesController],
  providers: [
    SitesService,
    DrizzleSitesStore,
    GeminiSiteGenerator,
    {
      provide: SITES_STORE,
      useExisting: DrizzleSitesStore,
    },
    {
      provide: SITE_GENERATOR,
      useExisting: GeminiSiteGenerator,
    },
  ],
})
export class SitesModule {}
