import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { AuthService } from "./auth.service.js";

type StoredUser = {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
};

type UsersStore = {
  findByEmail: (email: string) => Promise<StoredUser | null>;
  create: (input: {
    email: string;
    name: string;
    passwordHash: string;
  }) => Promise<{ id: number; email: string; name: string }>;
};

function memoryStore(): UsersStore & { rows: StoredUser[] } {
  const rows: StoredUser[] = [];

  return {
    rows,
    async findByEmail(email) {
      return rows.find((row) => row.email === email) ?? null;
    },
    async create(input) {
      const user = { id: rows.length + 1, ...input };
      rows.push(user);
      return { id: user.id, email: user.email, name: user.name };
    },
  };
}

describe("AuthService.signup", () => {
  it("비밀번호를 해시로 저장하고, 토큰과 공개 사용자 정보만 돌려준다", async () => {
    const store = memoryStore();
    const jwt = new JwtService({ secret: "test-secret" });
    const service = new AuthService(store, jwt);

    const result = await service.signup({
      email: "user@example.com",
      name: "홍길동",
      password: "password123",
    });

    expect(result.user).toEqual({
      id: 1,
      email: "user@example.com",
      name: "홍길동",
    });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");
    expect(store.rows[0]?.passwordHash).not.toBe("password123");
    await expect(
      bcrypt.compare("password123", store.rows[0]!.passwordHash),
    ).resolves.toBe(true);

    const payload = jwt.verify<{ sub: number; email: string }>(
      result.accessToken,
    );
    expect(payload.sub).toBe(1);
    expect(payload.email).toBe("user@example.com");
  });

  it("이미 등록된 이메일이면 사용자를 다시 만들지 않는다", async () => {
    const store = memoryStore();
    const jwt = new JwtService({ secret: "test-secret" });
    const service = new AuthService(store, jwt);
    const input = {
      email: "user@example.com",
      name: "홍길동",
      password: "password123",
    };

    await service.signup(input);

    await expect(service.signup(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(store.rows).toHaveLength(1);
  });

  it("저장 순간에 이메일이 겹치면 중복 오류로 돌려준다", async () => {
    const store = memoryStore();
    store.create = async () => {
      const error = new Error("duplicate") as Error & {
        cause?: { code: string };
      };
      error.cause = { code: "ER_DUP_ENTRY" };
      throw error;
    };
    const service = new AuthService(store, new JwtService({ secret: "test-secret" }));

    await expect(
      service.signup({
        email: "user@example.com",
        name: "홍길동",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("AuthService.login", () => {
  it("이메일과 비밀번호가 맞으면 토큰과 공개 사용자 정보만 돌려준다", async () => {
    const store = memoryStore();
    const jwt = new JwtService({ secret: "test-secret" });
    const service = new AuthService(store, jwt);

    await service.signup({
      email: "user@example.com",
      name: "홍길동",
      password: "password123",
    });

    const result = await service.login({
      email: "user@example.com",
      password: "password123",
    });

    expect(result.user).toEqual({
      id: 1,
      email: "user@example.com",
      name: "홍길동",
    });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");

    const payload = jwt.verify<{ sub: number; email: string }>(
      result.accessToken,
    );
    expect(payload.sub).toBe(1);
    expect(payload.email).toBe("user@example.com");
  });

  it("비밀번호가 다르면 토큰을 주지 않는다", async () => {
    const store = memoryStore();
    const service = new AuthService(store, new JwtService({ secret: "test-secret" }));

    await service.signup({
      email: "user@example.com",
      name: "홍길동",
      password: "password123",
    });

    await expect(
      service.login({
        email: "user@example.com",
        password: "wrong-password",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("등록되지 않은 이메일이면 토큰을 주지 않는다", async () => {
    const service = new AuthService(
      memoryStore(),
      new JwtService({ secret: "test-secret" }),
    );

    await expect(
      service.login({
        email: "missing@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
