import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { SITES_STORE, type SitesStore, type StoredSite } from "./sites.store.js";

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
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map(toListItem);
  }
}
