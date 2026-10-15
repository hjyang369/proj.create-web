import { IsString, Matches } from "class-validator";

export class WriteContextQueryDto {
  @IsString({ message: "게시판 주소가 올바르지 않습니다." })
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: "게시판 주소가 올바르지 않습니다.",
  })
  slug!: string;
}
