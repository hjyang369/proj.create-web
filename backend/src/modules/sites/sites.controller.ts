import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { AuthUser } from "../auth/auth-user.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { SitesService } from "./sites.service.js";
import { CreateSiteDto } from "./dto/create-site.dto.js";

const multerOptions = {
  storage: memoryStorage(), // 파일을 메모리에 올려 서비스에서 직접 저장
  limits: {
    fileSize: 10 * 1024 * 1024, // 파일당 10 MB
    files: 21, // 로고 1 + 사이트 사진 최대 20
  },
};

@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() request: { user: AuthUser }) {
    return this.sitesService.listMine(request.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "logo", maxCount: 1 },
        { name: "photos", maxCount: 20 },
      ],
      multerOptions,
    ),
  )
  create(
    @Req() request: { user: AuthUser },
    @Body() dto: CreateSiteDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      photos?: Express.Multer.File[];
    },
  ) {
    const logoFile = files.logo?.[0];
    const photoFiles = files.photos ?? [];

    return this.sitesService.create(
      request.user.id,
      dto,
      logoFile,
      photoFiles,
    );
  }
}
