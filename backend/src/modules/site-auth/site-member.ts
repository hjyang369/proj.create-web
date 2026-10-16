import { UnauthorizedException } from "@nestjs/common";

export type SiteMemberAuth = {
  id: number;
  siteId: number;
};

export function toSiteMember(payload: {
  sub?: unknown;
  siteId?: unknown;
  type?: unknown;
  email?: unknown;
}): SiteMemberAuth {
  if (
    payload.type !== "site-member" ||
    typeof payload.sub !== "number" ||
    !Number.isInteger(payload.sub) ||
    payload.sub <= 0 ||
    typeof payload.siteId !== "number" ||
    !Number.isInteger(payload.siteId) ||
    payload.siteId <= 0
  ) {
    throw new UnauthorizedException("이 사이트의 로그인이 필요합니다.");
  }

  return { id: payload.sub, siteId: payload.siteId };
}
