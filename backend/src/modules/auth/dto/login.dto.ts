import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "올바른 이메일 형식이 아닙니다." })
  @MaxLength(255, { message: "이메일은 255자 이하여야 합니다." })
  email: string;

  @IsString({ message: "비밀번호를 입력해 주세요." })
  @MinLength(1, { message: "비밀번호를 입력해 주세요." })
  @MaxLength(72, { message: "비밀번호는 72자 이하여야 합니다." })
  password: string;
}
