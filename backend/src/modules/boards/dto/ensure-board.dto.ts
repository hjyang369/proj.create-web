import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class EnsureBoardDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/i, {
    message: "게시판 주소가 올바르지 않습니다.",
  })
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
