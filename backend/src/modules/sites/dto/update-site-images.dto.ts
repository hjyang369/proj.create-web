import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateSiteImagesDto {
  /** 기존 로고를 유지할지. 새 로고 파일이 오면 그 파일이 우선한다. */
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  keepExistingLogo = false;

  /** 남겨 둘 기존 사진 주소. 이 사이트에 있는 주소만 남는다. */
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  @IsArray()
  @IsString({ each: true })
  keptPhotoUrls: string[] = [];
}
