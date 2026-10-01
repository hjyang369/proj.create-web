import {
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { extname, join } from "path";
import { mkdir, writeFile } from "fs/promises";
import {
  SITES_STORE,
  type SitesStore,
  type StoredSite,
} from "./sites.store.js";
import type { CreateSiteDto } from "./dto/create-site.dto.js";

export type SiteListItem = {
  id: number;
  name: string;
  type: StoredSite["type"];
  status: StoredSite["status"];
  thumbnailUrl: string | null;
  updatedAt: string;
};

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
  constructor(@Inject(SITES_STORE) private readonly sites: SitesStore) {}

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

    // ── optional_links JSON 구성
    const optionalLinks: Record<string, string> = {};
    if (dto.blogLink) optionalLinks.naver_blog = dto.blogLink;
    if (dto.websiteLink) optionalLinks.homepage = dto.websiteLink;
    if (dto.instagramLink) optionalLinks.instagram = dto.instagramLink;
    if (dto.youtubeLink) optionalLinks.youtube = dto.youtubeLink;

    return this.sites.create({
      userId,
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
      logo: logoResult,
      photos: photoResults,
    });
  }
}
