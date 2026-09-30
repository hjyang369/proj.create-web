import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../auth/auth-user.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { SitesService } from "./sites.service.js";

@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() request: { user: AuthUser }) {
    return this.sitesService.listMine(request.user.id);
  }
}
