import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  BadRequestException,
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
import { UpdateSiteImagesDto } from "./dto/update-site-images.dto.js";
import { EditComponentDto } from "./dto/edit-component.dto.js";

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

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getOne(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.sitesService.getMine(request.user.id, id);
  }

  @Patch(":id/images")
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
  updateImages(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSiteImagesDto,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      photos?: Express.Multer.File[];
    },
  ) {
    return this.sitesService.updateImages(request.user.id, id, {
      keepExistingLogo: dto.keepExistingLogo,
      keptPhotoUrls: dto.keptPhotoUrls ?? [],
      logoFile: files?.logo?.[0],
      photoFiles: files?.photos ?? [],
    });
  }

  @Patch(":id/inputs")
  @UseGuards(JwtAuthGuard)
  updateInputs(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateSiteDto,
  ) {
    return this.sitesService.updateInputs(request.user.id, id, dto);
  }

  @Post(":id/regenerate")
  @UseGuards(JwtAuthGuard)
  regenerate(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.sitesService.regenerateDraft(request.user.id, id);
  }

  @Post(":id/edit-component")
  @UseGuards(JwtAuthGuard)
  editComponent(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: EditComponentDto,
  ) {
    return this.sitesService.editComponent(request.user.id, id, dto);
  }

  @Post(":id/upload-image")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "image", maxCount: 1 }], {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  uploadImage(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @UploadedFiles() files?: { image?: Express.Multer.File[] },
  ) {
    const file = files?.image?.[0];
    if (!file) {
      throw new BadRequestException("이미지 파일을 선택해 주세요.");
    }
    return this.sitesService.uploadSiteImage(request.user.id, id, file);
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
