import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { extname, join } from "path";
import { mkdir, writeFile } from "fs/promises";
import {
  SITES_STORE,
  type CreateSiteRecord,
  type SitesStore,
  type StoredSite,
  type StoredSitePageContent,
} from "./sites.store.js";
import type { CreateSiteDto } from "./dto/create-site.dto.js";
import {
  planSiteImages,
  toSiteInputForm,
  type SiteInputForm,
} from "./site-input-record.js";
import {
  SITE_GENERATOR,
  type SiteGenerator,
} from "./site-generator.js";

export type SiteListItem = {
  id: number;
  name: string;
  type: StoredSite["type"];
  status: StoredSite["status"];
  thumbnailUrl: string | null;
  updatedAt: string;
};

export type SiteEditorDetail = {
  id: number;
  name: string;
  pages: StoredSitePageContent[];
  inputs: SiteInputForm | null;
};

type SiteInputUpdate = Omit<CreateSiteRecord, "userId" | "logo" | "photos">;

function toInputFields(dto: CreateSiteDto): SiteInputUpdate {
  const optionalLinks: Record<string, string> = {};
  if (dto.blogLink) optionalLinks.naver_blog = dto.blogLink;
  if (dto.websiteLink) optionalLinks.homepage = dto.websiteLink;
  if (dto.instagramLink) optionalLinks.instagram = dto.instagramLink;
  if (dto.youtubeLink) optionalLinks.youtube = dto.youtubeLink;

  return {
    name: dto.name,
    businessType: dto.industry || null,
    oneLineIntro: dto.tagline,
    description: dto.description || null,
    address: dto.address || null,
    phone: dto.phone || null,
    email: dto.email || null,
    purpose: dto.purpose,
    targetCustomer: dto.targetCustomer || null,
    mainColor: dto.mainColor || null,
    atmosphere: dto.mood || null,
    extraRequest: dto.extraRequest || null,
    pageCount: dto.pageCount,
    pageComponents: dto.selectedPages.length > 0 ? dto.selectedPages : null,
    referenceUrl: dto.referenceLink || null,
    optionalLinks:
      Object.keys(optionalLinks).length > 0 ? optionalLinks : null,
  };
}

function toListItem(site: StoredSite): SiteListItem {
  return {
    id: site.id,
    name: site.name,
    type: site.type,
    status: site.status,
    thumbnailUrl: site.thumbnailUrl,
    updatedAt: site.updatedAt.toISOString(),
  };
}

/** 업로드 루트 디렉터리 (프로젝트 루트 기준) */
const UPLOADS_ROOT = join(process.cwd(), "uploads");

/** 파일을 디스크에 저장하고 접근 가능한 URL 경로를 반환한다 */
async function saveFile(
  file: Express.Multer.File,
  subDir: string,
): Promise<{ url: string; originalName: string }> {
  const dir = join(UPLOADS_ROOT, subDir);
  await mkdir(dir, { recursive: true });

  const ext = extname(file.originalname) || ".bin";
  const filename = `${randomUUID()}${ext}`;
  await writeFile(join(dir, filename), file.buffer);

  return {
    url: `/uploads/${subDir}/${filename}`,
    originalName: file.originalname,
  };
}

@Injectable()
export class SitesService {
  constructor(
    @Inject(SITES_STORE) private readonly sites: SitesStore,
    @Inject(SITE_GENERATOR) private readonly generator: SiteGenerator,
  ) {}

  async listMine(userId: number): Promise<SiteListItem[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    const rows = await this.sites.listByUserId(userId);

    return rows
      .filter((site) => site.userId === userId)
      .sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      )
      .map(toListItem);
  }

  async getMine(userId: number, siteId: number): Promise<SiteEditorDetail> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    if (!Number.isInteger(siteId) || siteId <= 0) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const [site, input] = await Promise.all([
      this.sites.findOwnedWithPages(userId, siteId),
      this.sites.findOwnedInputs(userId, siteId),
    ]);
    if (!site || site.userId !== userId) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    return {
      id: site.id,
      name: site.name,
      pages: [...site.pages].sort(
        (left, right) => left.pageOrder - right.pageOrder,
      ),
      inputs: input && input.userId === userId ? toSiteInputForm(input) : null,
    };
  }

  async updateInputs(
    userId: number,
    siteId: number,
    dto: CreateSiteDto,
  ): Promise<SiteInputForm> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    if (!Number.isInteger(siteId) || siteId <= 0) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const fields = toInputFields(dto);
    const updated = await this.sites.updateOwnedInputs(userId, siteId, fields);
    if (!updated) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    return toSiteInputForm({
      userId,
      ...fields,
      logo: null,
      photos: [],
    });
  }

  async updateImages(
    userId: number,
    siteId: number,
    change: {
      keepExistingLogo: boolean;
      keptPhotoUrls: string[];
      logoFile: Express.Multer.File | undefined;
      photoFiles: Express.Multer.File[];
    },
  ): Promise<void> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    if (!Number.isInteger(siteId) || siteId <= 0) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const current = await this.sites.findOwnedGenerationInput(userId, siteId);
    if (!current || current.userId !== userId) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const logo = change.logoFile
      ? await saveFile(change.logoFile, "logos")
      : null;
    const photos: Array<{ url: string; originalName: string }> = [];
    for (const file of change.photoFiles) {
      photos.push(await saveFile(file, "photos"));
    }

    const next = planSiteImages(current, {
      keepExistingLogo: change.keepExistingLogo,
      keptPhotoUrls: change.keptPhotoUrls,
      logo,
      photos,
    });
    const replaced = await this.sites.replaceOwnedImages(userId, siteId, next);
    if (!replaced) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }
  }

  async create(
    userId: number,
    dto: CreateSiteDto,
    logoFile: Express.Multer.File | undefined,
    photoFiles: Express.Multer.File[],
  ): Promise<{ id: number }> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    // ── 이미지 파일 디스크 저장 (순차 처리 — I/O 집중 방지)
    const logoResult = logoFile ? await saveFile(logoFile, "logos") : null;

    const photoResults: Array<{ url: string; originalName: string }> = [];
    for (const file of photoFiles) {
      photoResults.push(await saveFile(file, "photos"));
    }

    const record: CreateSiteRecord = {
      userId,
      ...toInputFields(dto),
      logo: logoResult,
      photos: photoResults,
    };

    const created = await this.sites.create(record);

    try {
      const pages = await this.generator.generatePages(record);
      await this.sites.saveGeneratedPages(created.id, pages);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "사이트를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      throw new BadGatewayException(message);
    }

    return created;
  }

  async regenerateDraft(
    userId: number,
    siteId: number,
    dto: CreateSiteDto,
    change: {
      keepExistingLogo: boolean;
      keptPhotoUrls: string[];
      logoFile: Express.Multer.File | undefined;
      photoFiles: Express.Multer.File[];
    },
  ): Promise<SiteEditorDetail> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    if (!Number.isInteger(siteId) || siteId <= 0) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const current = await this.sites.findOwnedGenerationInput(userId, siteId);
    if (!current || current.userId !== userId) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const logo = change.logoFile
      ? await saveFile(change.logoFile, "logos")
      : null;
    const photos: Array<{ url: string; originalName: string }> = [];
    for (const file of change.photoFiles) {
      photos.push(await saveFile(file, "photos"));
    }

    const images = planSiteImages(current, {
      keepExistingLogo: change.keepExistingLogo,
      keptPhotoUrls: change.keptPhotoUrls,
      logo,
      photos,
    });
    const record: CreateSiteRecord = {
      userId,
      ...toInputFields(dto),
      logo: images.logo,
      photos: images.photos,
    };

    let pages;
    try {
      pages = await this.generator.generatePages(record);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "사이트를 다시 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
      throw new BadGatewayException(message);
    }

    return {
      id: siteId,
      name: record.name,
      pages: [...pages].sort((left, right) => left.pageOrder - right.pageOrder),
      inputs: toSiteInputForm(record),
    };
  }

  async editComponent(
    userId: number,
    siteId: number,
    dto: {
      pageOrder: number;
      pageType: string;
      sectionIndex: number;
      innerSectionIndex?: number;
      request: string;
      html: string;
      css: string;
      elementHtml?: string;
      imageUrl?: string;
    },
  ): Promise<StoredSitePageContent> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    if (!Number.isInteger(siteId) || siteId <= 0) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const site = await this.sites.findOwnedWithPages(userId, siteId);
    if (!site || site.userId !== userId) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    let updated: { html: string; css: string };
    try {
      updated = await this.generator.editComponent({
        html: dto.html,
        css: dto.css,
        sectionIndex: dto.sectionIndex,
        innerSectionIndex: dto.innerSectionIndex,
        request: dto.request,
        elementHtml: dto.elementHtml,
        imageUrl: dto.imageUrl,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "컴포넌트를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      throw new BadGatewayException(message);
    }

    return {
      pageType: dto.pageType,
      pageOrder: dto.pageOrder,
      html: updated.html,
      css: updated.css,
    };
  }

  async saveDraft(
    userId: number,
    siteId: number,
    draft: {
      pages: StoredSitePageContent[];
      inputs: SiteInputForm;
    },
  ): Promise<SiteEditorDetail> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    if (!Number.isInteger(siteId) || siteId <= 0) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    if (draft.pages.length === 0) {
      throw new BadRequestException("저장할 페이지가 없습니다.");
    }

    const images = [draft.inputs.logo, ...draft.inputs.photos].filter(
      (image): image is { url: string; originalName: string } => image != null,
    );
    for (const image of images) {
      if (
        !image.url.startsWith("/uploads/") ||
        image.url.includes("..") ||
        image.url.includes("\\")
      ) {
        throw new BadRequestException("이미지 주소가 올바르지 않습니다.");
      }
    }

    const owned = await this.sites.findOwnedGenerationInput(userId, siteId);
    if (!owned || owned.userId !== userId) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const pageCount = Number.parseInt(String(draft.inputs.pageCount), 10);
    const fields = toInputFields({
      industry: draft.inputs.industry,
      name: draft.inputs.name,
      tagline: draft.inputs.tagline,
      description: draft.inputs.description,
      address: draft.inputs.address,
      phone: draft.inputs.phone,
      email: draft.inputs.email,
      purpose: draft.inputs.purpose,
      targetCustomer: draft.inputs.targetCustomer,
      mainColor: draft.inputs.mainColor,
      mood: draft.inputs.mood as CreateSiteDto["mood"],
      pageCount: Number.isInteger(pageCount) && pageCount > 0 ? pageCount : 1,
      selectedPages: draft.inputs.selectedPages,
      blogLink: draft.inputs.blogLink,
      websiteLink: draft.inputs.websiteLink,
      instagramLink: draft.inputs.instagramLink,
      youtubeLink: draft.inputs.youtubeLink,
      referenceLink: draft.inputs.referenceLink,
      extraRequest: draft.inputs.extraRequest,
    });
    const nextImages = {
      logo: draft.inputs.logo,
      photos: draft.inputs.photos,
    };
    const saved = await this.sites.saveOwnedDraft(userId, siteId, {
      inputs: fields,
      images: nextImages,
      pages: draft.pages,
    });
    if (!saved) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    return {
      id: siteId,
      name: fields.name,
      pages: [...draft.pages].sort(
        (left, right) => left.pageOrder - right.pageOrder,
      ),
      inputs: toSiteInputForm({
        userId,
        ...fields,
        ...nextImages,
      }),
    };
  }

  async uploadSiteImage(
    userId: number,
    siteId: number,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("로그인이 필요합니다.");
    }

    if (!Number.isInteger(siteId) || siteId <= 0) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const saved = await saveFile(file, "site-images");
    const result = await this.sites.addSiteImage(userId, siteId, saved);
    if (!result) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    return result;
  }
}
