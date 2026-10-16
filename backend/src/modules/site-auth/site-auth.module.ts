import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { requireJwtSecret } from "../auth/jwt-secret.js";
import { DrizzleSiteMembersStore } from "./drizzle-site-members.store.js";
import { SiteAuthController } from "./site-auth.controller.js";
import { SiteAuthService } from "./site-auth.service.js";
import { SiteMemberStrategy } from "./site-member.strategy.js";
import { SITE_MEMBERS_STORE } from "./site-members.store.js";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: requireJwtSecret(config.get<string>("JWT_SECRET")),
        signOptions: {
          expiresIn: (config.get<string>("JWT_EXPIRES_IN") ??
            "7d") as JwtSignOptions["expiresIn"],
        },
      }),
    }),
  ],
  controllers: [SiteAuthController],
  providers: [
    SiteAuthService,
    SiteMemberStrategy,
    DrizzleSiteMembersStore,
    {
      provide: SITE_MEMBERS_STORE,
      useExisting: DrizzleSiteMembersStore,
    },
  ],
})
export class SiteAuthModule {}
