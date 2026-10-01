export type SelectOption = {
  value: string;
  label: string;
};

export type LinkField = {
  name: "blogLink" | "websiteLink" | "instagramLink" | "youtubeLink";
  label: string;
  placeholder: string;
};

/** 제작 목적 (6가지, 단일 선택 필수) */
export const PURPOSE_OPTIONS: SelectOption[] = [
  { value: "company_intro", label: "회사소개용" },
  { value: "investment", label: "투자·IR용" },
  { value: "sales", label: "고객 영업용" },
  { value: "recruitment", label: "채용 브랜딩용" },
  { value: "promotion", label: "서비스 홍보용" },
  { value: "inquiry", label: "문의·상담 전환용" },
];

/** 분위기 (단일 선택) */
export const MOOD_OPTIONS: SelectOption[] = [
  { value: "warm", label: "따뜻한" },
  { value: "professional", label: "전문적인" },
  { value: "modern", label: "모던한" },
  { value: "cute", label: "귀여운" },
  { value: "elegant", label: "우아한" },
  { value: "bold", label: "강렬한" },
];

/** 페이지 구성 (다중 선택) */
export const PAGE_OPTIONS: SelectOption[] = [
  { value: "about", label: "회사소개" },
  { value: "service", label: "서비스소개" },
  { value: "contact", label: "문의" },
  { value: "faq", label: "FAQ" },
  { value: "location", label: "찾아오는 길" },
  { value: "board", label: "게시판" },
  { value: "auth", label: "로그인·회원가입" },
  { value: "review", label: "리뷰" },
];

/** 링크 입력 */
export const LINK_FIELDS: LinkField[] = [
  {
    name: "blogLink",
    label: "블로그",
    placeholder: "예: https://blog.naver.com/xxx",
  },
  {
    name: "websiteLink",
    label: "홈페이지",
    placeholder: "예: https://mycompany.com",
  },
  {
    name: "instagramLink",
    label: "인스타그램",
    placeholder: "예: https://instagram.com/xxx",
  },
  {
    name: "youtubeLink",
    label: "유튜브",
    placeholder: "예: https://youtube.com/@xxx",
  },
];
