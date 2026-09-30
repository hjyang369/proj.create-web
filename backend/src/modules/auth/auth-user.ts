import { UnauthorizedException } from "@nestjs/common";

export type AuthUser = {
  id: number;
  email: string;
};

export function toAuthUser(payload: {
  sub?: unknown;
  email?: unknown;
}): AuthUser {
  if (
    typeof payload.sub !== "number" ||
    !Number.isInteger(payload.sub) ||
    payload.sub <= 0 ||
    typeof payload.email !== "string" ||
    payload.email.length === 0
  ) {
    throw new UnauthorizedException("로그인이 필요합니다.");
  }

  return { id: payload.sub, email: payload.email };
}
