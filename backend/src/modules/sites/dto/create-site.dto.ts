import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** 주소 하나 또는 목록을 비어 있지 않은 주소 목록으로 맞춘다. */
export function toOptionalLinkList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

export const PURPOSE_VALUES = [
  'company_intro',
  'investment',
  'sales',
  'recruitment',
  'promotion',
  'inquiry',
] as const;

export type SitePurpose = (typeof PURPOSE_VALUES)[number];

export const MOOD_VALUES = [
  'warm',
  'professional',
  'modern',
  'cute',
  'elegant',
  'bold',
] as const;

export type SiteAtmosphere = (typeof MOOD_VALUES)[number];

export class CreateSiteDto {
  /** 업종 */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  industry: string = '';

  /** 회사명 (필수) */
  @IsString({ message: '회사명을 입력해 주세요.' })
  @MaxLength(255)
  name!: string;

  /** 한줄 소개 (필수) */
  @IsString({ message: '한줄 소개를 입력해 주세요.' })
  @MaxLength(500)
  tagline!: string;

  /** 긴 설명 (선택) */
  @IsOptional()
  @IsString()
  description: string = '';

  /** 주소 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address: string = '';

  /** 연락처 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone: string = '';

  /** 이메일 */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email: string = '';

  /** 제작 목적 (필수) */
  @IsEnum(PURPOSE_VALUES, { message: '올바른 제작 목적을 선택해 주세요.' })
  purpose!: SitePurpose;

  /** 타겟 고객 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetCustomer: string = '';

  /** 메인 컬러 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mainColor: string = '';

  /** 분위기 — 비어 있으면 허용, 값이 있으면 화면의 6개만 허용 */
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsEnum(MOOD_VALUES, { message: '올바른 분위기를 선택해 주세요.' })
  mood: SiteAtmosphere | '' = '';

  /** 페이지 수 — 폼에서 문자열로 오므로 숫자로 변환 */
  @IsOptional()
  @Transform(({ value }) => {
    const n = parseInt(value as string, 10);
    return Number.isNaN(n) ? 1 : n;
  })
  @IsInt()
  @Min(1)
  pageCount: number = 1;

  /** 선택된 페이지 구성 — 다중 선택이므로 배열 또는 단일값 모두 처리 */
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  @IsArray()
  @IsString({ each: true })
  selectedPages: string[] = [];

  /** 리뷰 공개 범위. 리뷰를 켰을 때만 partial 또는 full */
  @IsOptional()
  @ValidateIf((_, value) => value !== "" && value != null)
  @IsIn(["partial", "full"], {
    message: "리뷰 공개 범위를 선택해 주세요.",
  })
  reviewVisibility: "" | "partial" | "full" = "";

  /** 게시판 칩을 켠 뒤 적는 이름. 예: 뉴스, 소식 */
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  @IsArray()
  @ArrayMaxSize(5, { message: "게시판은 5개까지 만들 수 있습니다." })
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  boardNames: string[] = [];

  /** 링크 필드들. 종류마다 주소 목록이며, 예전 요청의 주소 하나도 목록으로 받는다. */
  @IsOptional()
  @Transform(({ value }) => toOptionalLinkList(value))
  @IsArray()
  @ArrayMaxSize(5, { message: '블로그는 5개까지 넣을 수 있습니다.' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  blogLink: string[] = [];

  @IsOptional()
  @Transform(({ value }) => toOptionalLinkList(value))
  @IsArray()
  @ArrayMaxSize(5, { message: '홈페이지는 5개까지 넣을 수 있습니다.' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  websiteLink: string[] = [];

  @IsOptional()
  @Transform(({ value }) => toOptionalLinkList(value))
  @IsArray()
  @ArrayMaxSize(5, { message: '인스타그램은 5개까지 넣을 수 있습니다.' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  instagramLink: string[] = [];

  @IsOptional()
  @Transform(({ value }) => toOptionalLinkList(value))
  @IsArray()
  @ArrayMaxSize(5, { message: '유튜브는 5개까지 넣을 수 있습니다.' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  youtubeLink: string[] = [];

  /** 참고 사이트 링크 */
  @IsOptional()
  @IsString()
  referenceLink: string = '';

  /** 추가 요청 */
  @IsOptional()
  @IsString()
  extraRequest: string = '';
}
