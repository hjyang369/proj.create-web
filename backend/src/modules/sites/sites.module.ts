import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DrizzleSitesStore } from "./drizzle-sites.store.js";
import { SitesController } from "./sites.controller.js";
import { SitesService } from "./sites.service.js";
import { SITES_STORE } from "./sites.store.js";

@Module({
  imports: [AuthModule],
  controllers: [SitesController],
  providers: [
    SitesService,
    DrizzleSitesStore,
    {
      provide: SITES_STORE,
      useExisting: DrizzleSitesStore,
    },
  ],
})
export class SitesModule {}
