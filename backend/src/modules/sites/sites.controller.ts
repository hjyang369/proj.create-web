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
import { CreateChatHistoryDto } from "./dto/create-chat-history.dto.js";
import { CreateSiteDto } from "./dto/create-site.dto.js";
import { UpdateSiteImagesDto } from "./dto/update-site-images.dto.js";
import { EditComponentDto } from "./dto/edit-component.dto.js";
import { RegenerateSiteDto } from "./dto/regenerate-site.dto.js";
import { SaveSiteDraftDto } from "./dto/save-site-draft.dto.js";

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
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "logo", maxCount: 1 },
        { name: "photos", maxCount: 20 },
      ],
      multerOptions,
    ),
  )
  regenerate(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RegenerateSiteDto,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      photos?: Express.Multer.File[];
    },
  ) {
    return this.sitesService.regenerateDraft(request.user.id, id, dto, {
      keepExistingLogo: dto.keepExistingLogo,
      keptPhotoUrls: dto.keptPhotoUrls ?? [],
      logoFile: files?.logo?.[0],
      photoFiles: files?.photos ?? [],
    });
  }

  @Get(":id/chat-history")
  @UseGuards(JwtAuthGuard)
  listChatHistory(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.sitesService.listChatHistory(request.user.id, id);
  }

  @Post(":id/chat-history")
  @UseGuards(JwtAuthGuard)
  addChatEntry(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateChatHistoryDto,
  ) {
    return this.sitesService.addChatEntry(request.user.id, id, {
      type: dto.type,
      label: dto.label,
      pageOrder: dto.pageOrder ?? null,
    });
  }

  @Get(":id/history")
  @UseGuards(JwtAuthGuard)
  listHistory(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.sitesService.listHistory(request.user.id, id);
  }

  @Post(":id/history/:historyId/open")
  @UseGuards(JwtAuthGuard)
  openHistory(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @Param("historyId", ParseIntPipe) historyId: number,
  ) {
    return this.sitesService.openHistory(request.user.id, id, historyId);
  }

  @Post(":id/history/:historyId/publish")
  @UseGuards(JwtAuthGuard)
  publishHistory(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @Param("historyId", ParseIntPipe) historyId: number,
  ) {
    return this.sitesService.publishHistory(request.user.id, id, historyId);
  }

  @Post(":id/save")
  @UseGuards(JwtAuthGuard)
  save(
    @Req() request: { user: AuthUser },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SaveSiteDraftDto,
  ) {
    return this.sitesService.saveDraft(request.user.id, id, {
      pages: dto.pages,
      inputs: {
        industry: dto.inputs.industry,
        name: dto.inputs.name,
        tagline: dto.inputs.tagline,
        description: dto.inputs.description,
        address: dto.inputs.address,
        phone: dto.inputs.phone,
        email: dto.inputs.email,
        purpose: dto.inputs.purpose,
        targetCustomer: dto.inputs.targetCustomer,
        mainColor: dto.inputs.mainColor,
        mood: dto.inputs.mood,
        pageCount: String(dto.inputs.pageCount),
        selectedPages: dto.inputs.selectedPages,
        blogLink: dto.inputs.blogLink,
        websiteLink: dto.inputs.websiteLink,
        instagramLink: dto.inputs.instagramLink,
        youtubeLink: dto.inputs.youtubeLink,
        referenceLink: dto.inputs.referenceLink,
        extraRequest: dto.inputs.extraRequest,
        boardNames: dto.inputs.boardNames ?? [],
        logo: dto.inputs.logo,
        photos: dto.inputs.photos ?? [],
      },
    });
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
