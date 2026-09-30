import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import {
  USERS_STORE,
  type PublicUser,
  type UsersStore,
} from "./users.store.js";

function isDuplicateEntry(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && current.code === "ER_DUP_ENTRY") {
      return true;
    }
    if ("errno" in current && current.errno === 1062) {
      return true;
    }
    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}

export type SignupInput = {
  email: string;
  name: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_STORE) private readonly users: UsersStore,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: SignupInput) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException("이미 사용 중인 이메일입니다.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    let user: PublicUser;
    try {
      user = await this.users.create({
        email: input.email,
        name: input.name,
        passwordHash,
      });
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException("이미 사용 중인 이메일입니다.");
      }
      throw error;
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { accessToken, user };
  }

  async login(input: LoginInput) {
    const existing = await this.users.findByEmail(input.email);
    const passwordMatches =
      existing !== null &&
      (await bcrypt.compare(input.password, existing.passwordHash));

    if (!existing || !passwordMatches) {
      throw new UnauthorizedException(
        "이메일 또는 비밀번호가 올바르지 않습니다.",
      );
    }

    const accessToken = await this.jwt.signAsync({
      sub: existing.id,
      email: existing.email,
    });

    return {
      accessToken,
      user: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
      },
    };
  }
}
