import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class SiteMemberGuard extends AuthGuard("site-member") {
  handleRequest<TUser>(error: unknown, user: TUser): TUser {
    if (error || !user) {
      throw new UnauthorizedException("이 사이트의 로그인이 필요합니다.");
    }

    return user;
  }
}
