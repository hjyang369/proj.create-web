import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { LoginDto } from "../auth/dto/login.dto.js";
import { SignupDto } from "../auth/dto/signup.dto.js";
import type { SiteMemberAuth } from "./site-member.js";
import { SiteMemberGuard } from "./site-member.guard.js";
import { SiteAuthService } from "./site-auth.service.js";

@Controller("s/:siteId/auth")
export class SiteAuthController {
  constructor(private readonly siteAuth: SiteAuthService) {}

  @Post("signup")
  signup(
    @Param("siteId", ParseIntPipe) siteId: number,
    @Body() dto: SignupDto,
  ) {
    return this.siteAuth.signup(siteId, dto);
  }

  @Post("login")
  login(@Param("siteId", ParseIntPipe) siteId: number, @Body() dto: LoginDto) {
    return this.siteAuth.login(siteId, dto);
  }

  @Get("me")
  @UseGuards(SiteMemberGuard)
  me(
    @Req() request: { user: SiteMemberAuth },
    @Param("siteId", ParseIntPipe) siteId: number,
  ) {
    return this.siteAuth.me(siteId, request.user);
  }
}
