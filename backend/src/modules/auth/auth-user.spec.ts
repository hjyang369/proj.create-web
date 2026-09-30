import { UnauthorizedException } from "@nestjs/common";
import { toAuthUser } from "./auth-user.js";

describe("toAuthUser", () => {
  it("토큰의 사용자 번호를 로그인 사용자로 바꾼다", () => {
    expect(toAuthUser({ sub: 4, email: "user@example.com" })).toEqual({
      id: 4,
      email: "user@example.com",
    });
  });

  it("사용자 번호가 정수가 아니면 로그인 사용자로 보지 않는다", () => {
    expect(() => toAuthUser({ sub: "4", email: "user@example.com" })).toThrow(
      UnauthorizedException,
    );
  });
});
