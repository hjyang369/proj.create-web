import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { CreateSiteDto } from "./create-site.dto.js";

export class SaveSiteImageDto {
  @IsString()
  @MinLength(1)
  url!: string;

  @IsString()
  originalName!: string;
}

export class SaveSiteInputsDto extends CreateSiteDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SaveSiteImageDto)
  logo: SaveSiteImageDto | null = null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveSiteImageDto)
  photos: SaveSiteImageDto[] = [];
}

export class SaveSitePageDto {
  @IsString()
  @MinLength(1)
  pageType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageOrder!: number;

  @IsString()
  @MinLength(1)
  html!: string;

  @IsString()
  css!: string;
}

export class SaveSiteDraftDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveSitePageDto)
  pages!: SaveSitePageDto[];

  @ValidateNested()
  @Type(() => SaveSiteInputsDto)
  inputs!: SaveSiteInputsDto;
}
