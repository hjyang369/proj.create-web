import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { requireJwtSecret } from "../auth/jwt-secret.js";
import { toSiteMember, type SiteMemberAuth } from "./site-member.js";

@Injectable()
export class SiteMemberStrategy extends PassportStrategy(
  Strategy,
  "site-member",
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(config.get<string>("JWT_SECRET")),
    });
  }

  validate(payload: {
    sub?: unknown;
    siteId?: unknown;
    type?: unknown;
    email?: unknown;
  }): SiteMemberAuth {
    return toSiteMember(payload);
  }
}
