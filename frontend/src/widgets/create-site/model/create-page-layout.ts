export type CreatePageSection = {
  id: string;
  title: string;
  description: string;
};

export type CreatePageLayout = {
  mode: "single-page";
  title: string;
  description: string;
  sections: CreatePageSection[];
  action: {
    label: string;
  };
};

export function describeCreatePageLayout(): CreatePageLayout {
  return {
    mode: "single-page",
    title: "사이트 만들기",
    description: "한 페이지에서 회사 정보를 입력하면 사이트를 만들 수 있습니다.",
    sections: [
      {
        id: "basics",
        title: "기본 정보",
        description: "업종, 회사명, 한줄 소개, 긴 설명을 입력합니다.",
      },
      {
        id: "company",
        title: "회사 정보",
        description: "주소, 연락처, 이메일을 입력합니다.",
      },
      {
        id: "purpose",
        title: "목적과 고객",
        description: "제작 목적과 타겟 고객을 입력합니다.",
      },
      {
        id: "design",
        title: "디자인",
        description: "메인 컬러와 분위기를 고릅니다.",
      },
      {
        id: "structure",
        title: "페이지 구성",
        description: "페이지 수, 구성, 링크, 참고 사이트를 정합니다.",
      },
      {
        id: "images",
        title: "이미지",
        description: "로고와 사이트에 쓸 사진을 올립니다.",
      },
    ],
    action: {
      label: "생성하기",
    },
  };
}
