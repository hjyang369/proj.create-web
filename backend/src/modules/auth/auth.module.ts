import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { DrizzleUsersStore } from "./drizzle-users.store.js";
import { requireJwtSecret } from "./jwt-secret.js";
import { USERS_STORE } from "./users.store.js";

@Module({
  imports: [
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
  controllers: [AuthController],
  providers: [
    AuthService,
    DrizzleUsersStore,
    {
      provide: USERS_STORE,
      useExisting: DrizzleUsersStore,
    },
  ],
})
export class AuthModule {}
