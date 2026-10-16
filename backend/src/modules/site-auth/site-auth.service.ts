import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import {
  SITE_MEMBERS_STORE,
  type PublicSiteMember,
  type SiteMembersStore,
} from "./site-members.store.js";

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

export type SiteSignupInput = {
  email: string;
  name: string;
  password: string;
};

export type SiteLoginInput = {
  email: string;
  password: string;
};

@Injectable()
export class SiteAuthService {
  constructor(
    @Inject(SITE_MEMBERS_STORE) private readonly members: SiteMembersStore,
    private readonly jwt: JwtService,
  ) {}

  async signup(siteId: number, input: SiteSignupInput) {
    if (!(await this.members.siteExists(siteId))) {
      throw new NotFoundException("사이트를 찾을 수 없습니다.");
    }

    const existing = await this.members.findBySiteAndEmail(siteId, input.email);
    if (existing) {
      throw new ConflictException("이 사이트에 이미 가입된 이메일입니다.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    let member: PublicSiteMember;
    try {
      member = await this.members.create({
        siteId,
        email: input.email,
        name: input.name,
        passwordHash,
      });
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException("이 사이트에 이미 가입된 이메일입니다.");
      }
      throw error;
    }
    const accessToken = await this.jwt.signAsync({
      sub: member.id,
      siteId,
      type: "site-member",
    });

    return { accessToken, member };
  }

  async login(siteId: number, input: SiteLoginInput) {
    const existing = await this.members.findBySiteAndEmail(siteId, input.email);
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
      siteId,
      type: "site-member",
    });

    return {
      accessToken,
      member: {
        id: existing.id,
        siteId: existing.siteId,
        email: existing.email,
        name: existing.name,
      },
    };
  }

  async me(siteId: number, member: { id: number; siteId: number }) {
    if (member.siteId !== siteId) {
      throw new UnauthorizedException("이 사이트의 로그인이 필요합니다.");
    }

    const found = await this.members.findById(siteId, member.id);
    if (!found) {
      throw new UnauthorizedException("이 사이트의 로그인이 필요합니다.");
    }

    return found;
  }
}

export type { PublicSiteMember };
