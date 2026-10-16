import { UnauthorizedException } from "@nestjs/common";
import { toSiteMember } from "./site-member.js";

describe("toSiteMember", () => {
  it("사이트 회원 토큰만 그 사이트의 회원으로 인정한다", () => {
    expect(
      toSiteMember({ sub: 3, siteId: 8, type: "site-member" }),
    ).toEqual({ id: 3, siteId: 8 });
  });

  it("사장님 로그인 토큰은 사이트 회원으로 보지 않는다", () => {
    expect(() =>
      toSiteMember({ sub: 3, email: "owner@example.com" }),
    ).toThrow(UnauthorizedException);
  });

  it("다른 종류의 토큰은 사이트 회원으로 보지 않는다", () => {
    expect(() =>
      toSiteMember({ sub: 3, siteId: 8, type: "user" }),
    ).toThrow(UnauthorizedException);
  });
});
