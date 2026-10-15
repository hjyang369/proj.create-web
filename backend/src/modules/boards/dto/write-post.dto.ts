import { IsString, MaxLength, MinLength } from "class-validator";

export class WritePostDto {
  @IsString({ message: "제목을 입력해 주세요." })
  @MinLength(1, { message: "제목을 입력해 주세요." })
  @MaxLength(255, { message: "제목은 255자 이하로 적어 주세요." })
  title!: string;

  @IsString({ message: "내용을 입력해 주세요." })
  @MinLength(1, { message: "내용을 입력해 주세요." })
  @MaxLength(20000, { message: "내용은 20000자 이하로 적어 주세요." })
  content!: string;
}
