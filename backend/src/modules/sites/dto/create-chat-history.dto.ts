import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateChatHistoryDto {
  @IsIn(["ai-edit", "regenerate"], {
    message: "채팅 종류는 AI 수정 또는 다시 만들기만 가능합니다.",
  })
  type!: "ai-edit" | "regenerate";

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "채팅 내용은 문자열이어야 합니다." })
  @MinLength(1, { message: "채팅 내용을 입력해 주세요." })
  @MaxLength(2000, { message: "채팅 내용은 2000자 이하여야 합니다." })
  label!: string;

  @IsOptional()
  @IsInt({ message: "pageOrder는 정수여야 합니다." })
  @Min(1, { message: "pageOrder는 1 이상이어야 합니다." })
  pageOrder?: number;
}
