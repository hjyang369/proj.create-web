import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class EditComponentDto {
  @Type(() => Number)
  @IsInt({ message: "pageOrder는 정수여야 합니다." })
  @Min(1, { message: "pageOrder는 1 이상이어야 합니다." })
  pageOrder: number;

  @Type(() => Number)
  @IsInt({ message: "sectionIndex는 정수여야 합니다." })
  @Min(0, { message: "sectionIndex는 0 이상이어야 합니다." })
  sectionIndex: number;

  @IsString({ message: "request는 문자열이어야 합니다." })
  @MinLength(1, { message: "수정 요청을 입력해 주세요." })
  request: string;

  @IsOptional()
  @IsString()
  elementHtml?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString({ message: "pageType은 문자열이어야 합니다." })
  @MinLength(1, { message: "페이지 종류가 필요합니다." })
  pageType: string;

  @IsString({ message: "html은 문자열이어야 합니다." })
  @MinLength(1, { message: "수정할 페이지 내용이 필요합니다." })
  html: string;

  @IsString({ message: "css는 문자열이어야 합니다." })
  css: string;
}
