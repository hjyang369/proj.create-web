import { UnauthorizedException } from "@nestjs/common";
import { SitesService } from "./sites.service.js";
import type { StoredSite } from "./sites.store.js";

const rows: StoredSite[] = [
  {
    id: 1,
    userId: 1,
    name: "카페",
    type: "web",
    status: "draft",
    thumbnailUrl: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: 2,
    userId: 2,
    name: "남의 가게",
    type: "app",
    status: "published",
    thumbnailUrl: null,
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
  },
  {
    id: 3,
    userId: 1,
    name: "공방",
    type: "web",
    status: "generating",
    thumbnailUrl: "https://example.com/a.png",
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  },
];

describe("SitesService.listMine", () => {
  it("요청한 사용자의 사이트만 최근 수정순으로 돌려준다", async () => {
    const service = new SitesService({
      async listByUserId() {
        return rows;
      },
    });

    await expect(service.listMine(1)).resolves.toEqual([
      {
        id: 3,
        name: "공방",
        type: "web",
        status: "generating",
        thumbnailUrl: "https://example.com/a.png",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
      {
        id: 1,
        name: "카페",
        type: "web",
        status: "draft",
        thumbnailUrl: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("사용자 번호가 없으면 사이트를 조회하지 않는다", async () => {
    let called = false;
    const service = new SitesService({
      async listByUserId() {
        called = true;
        return rows;
      },
    });

    await expect(service.listMine(0)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(called).toBe(false);
  });
});
