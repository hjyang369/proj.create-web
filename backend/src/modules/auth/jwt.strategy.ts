import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { toAuthUser, type AuthUser } from "./auth-user.js";
import { requireJwtSecret } from "./jwt-secret.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(config.get<string>("JWT_SECRET")),
    });
  }

  validate(payload: { sub?: unknown; email?: unknown }): AuthUser {
    return toAuthUser(payload);
  }
}
