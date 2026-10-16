import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { SiteAuthService } from "./site-auth.service.js";
import type { SiteMembersStore, StoredSiteMember } from "./site-members.store.js";

function memoryStore(): SiteMembersStore & { rows: StoredSiteMember[] } {
  const rows: StoredSiteMember[] = [];
  const sites = new Set<number>([1, 2]);

  return {
    rows,
    async siteExists(siteId) {
      return sites.has(siteId);
    },
    async findBySiteAndEmail(siteId, email) {
      return (
        rows.find((row) => row.siteId === siteId && row.email === email) ??
        null
      );
    },
    async findById(siteId, memberId) {
      const row = rows.find(
        (item) => item.siteId === siteId && item.id === memberId,
      );
      if (!row) return null;
      return { id: row.id, siteId: row.siteId, email: row.email, name: row.name };
    },
    async create(input) {
      const member = { id: rows.length + 1, ...input };
      rows.push(member);
      return {
        id: member.id,
        siteId: member.siteId,
        email: member.email,
        name: member.name,
      };
    },
  };
}

describe("SiteAuthService.signup", () => {
  it("비밀번호를 해시로 저장하고, 그 사이트 회원 토큰만 돌려준다", async () => {
    const store = memoryStore();
    const jwt = new JwtService({ secret: "test-secret" });
    const service = new SiteAuthService(store, jwt);

    const result = await service.signup(1, {
      email: "guest@example.com",
      name: "손님",
      password: "password123",
    });

    expect(result.member).toEqual({
      id: 1,
      siteId: 1,
      email: "guest@example.com",
      name: "손님",
    });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");
    expect(store.rows[0]?.passwordHash).not.toBe("password123");
    await expect(
      bcrypt.compare("password123", store.rows[0]!.passwordHash),
    ).resolves.toBe(true);

    const payload = jwt.verify<{
      sub: number;
      siteId: number;
      type: string;
    }>(result.accessToken);
    expect(payload).toMatchObject({
      sub: 1,
      siteId: 1,
      type: "site-member",
    });
  });

  it("같은 이메일이어도 다른 사이트에는 따로 가입된다", async () => {
    const store = memoryStore();
    const service = new SiteAuthService(
      store,
      new JwtService({ secret: "test-secret" }),
    );
    const input = {
      email: "guest@example.com",
      name: "손님",
      password: "password123",
    };

    await service.signup(1, input);
    const second = await service.signup(2, input);

    expect(second.member).toEqual({
      id: 2,
      siteId: 2,
      email: "guest@example.com",
      name: "손님",
    });
    expect(store.rows).toHaveLength(2);
  });

  it("같은 사이트에 이미 있는 이메일이면 회원을 다시 만들지 않는다", async () => {
    const store = memoryStore();
    const service = new SiteAuthService(
      store,
      new JwtService({ secret: "test-secret" }),
    );
    const input = {
      email: "guest@example.com",
      name: "손님",
      password: "password123",
    };

    await service.signup(1, input);

    await expect(service.signup(1, input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(store.rows).toHaveLength(1);
  });

  it("없는 사이트에는 가입시키지 않는다", async () => {
    const service = new SiteAuthService(
      memoryStore(),
      new JwtService({ secret: "test-secret" }),
    );

    await expect(
      service.signup(99, {
        email: "guest@example.com",
        name: "손님",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("저장 순간에 같은 사이트 이메일이 겹치면 중복 오류로 돌려준다", async () => {
    const store = memoryStore();
    store.create = async () => {
      const error = new Error("duplicate") as Error & {
        cause?: { code: string };
      };
      error.cause = { code: "ER_DUP_ENTRY" };
      throw error;
    };
    const service = new SiteAuthService(
      store,
      new JwtService({ secret: "test-secret" }),
    );

    await expect(
      service.signup(1, {
        email: "guest@example.com",
        name: "손님",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("SiteAuthService.login", () => {
  it("그 사이트에 가입한 이메일과 비밀번호가 맞으면 사이트 회원 토큰을 준다", async () => {
    const store = memoryStore();
    const jwt = new JwtService({ secret: "test-secret" });
    const service = new SiteAuthService(store, jwt);

    await service.signup(1, {
      email: "guest@example.com",
      name: "손님",
      password: "password123",
    });

    const result = await service.login(1, {
      email: "guest@example.com",
      password: "password123",
    });

    expect(result.member).toEqual({
      id: 1,
      siteId: 1,
      email: "guest@example.com",
      name: "손님",
    });
    expect(result).not.toHaveProperty("passwordHash");
    const payload = jwt.verify<{ siteId: number; type: string }>(
      result.accessToken,
    );
    expect(payload).toMatchObject({ siteId: 1, type: "site-member" });
  });

  it("다른 사이트에만 가입한 이메일로는 로그인되지 않는다", async () => {
    const service = new SiteAuthService(
      memoryStore(),
      new JwtService({ secret: "test-secret" }),
    );

    await service.signup(1, {
      email: "guest@example.com",
      name: "손님",
      password: "password123",
    });

    await expect(
      service.login(2, {
        email: "guest@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("비밀번호가 다르면 토큰을 주지 않는다", async () => {
    const service = new SiteAuthService(
      memoryStore(),
      new JwtService({ secret: "test-secret" }),
    );

    await service.signup(1, {
      email: "guest@example.com",
      name: "손님",
      password: "password123",
    });

    await expect(
      service.login(1, {
        email: "guest@example.com",
        password: "wrong-password",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("SiteAuthService.me", () => {
  it("그 사이트 회원만 자기 정보를 돌려준다", async () => {
    const store = memoryStore();
    const service = new SiteAuthService(
      store,
      new JwtService({ secret: "test-secret" }),
    );
    const signedUp = await service.signup(1, {
      email: "guest@example.com",
      name: "손님",
      password: "password123",
    });

    await expect(
      service.me(1, { id: signedUp.member.id, siteId: 1 }),
    ).resolves.toEqual({
      id: 1,
      siteId: 1,
      email: "guest@example.com",
      name: "손님",
    });
  });

  it("다른 사이트 토큰으로는 이 사이트 회원을 조회하지 않는다", async () => {
    const service = new SiteAuthService(
      memoryStore(),
      new JwtService({ secret: "test-secret" }),
    );
    const signedUp = await service.signup(1, {
      email: "guest@example.com",
      name: "손님",
      password: "password123",
    });

    await expect(
      service.me(2, { id: signedUp.member.id, siteId: 1 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
