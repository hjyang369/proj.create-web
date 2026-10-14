// pages 배열을 VS Code 스타일 파일 트리로 변환하는 순수 함수 모음

export type CodePage = {
  pageOrder: number;
  pageType: string;
  html: string;
  css: string;
};

export type CodeFile = {
  /** 트리에 표시할 경로. e.g. "pages/홈.html" */
  path: string;
  /** 파일 이름만. e.g. "홈.html" */
  name: string;
  /** 부모 폴더 경로. e.g. "pages" */
  folder: string;
  /** 파일 언어 */
  lang: "html" | "css";
  /** 실제 코드 내용 */
  content: string;
};

export type CodeFolder = {
  path: string;
  name: string;
  files: CodeFile[];
};

export type CodeTree = CodeFolder[];

const PAGE_TYPE_LABEL: Record<string, string> = {
  company_intro: "홈",
  service_intro: "서비스",
  contact: "문의",
  about: "소개",
  blog: "블로그",
  portfolio: "포트폴리오",
  pricing: "요금제",
  faq: "자주 묻는 질문",
  team: "팀",
  home: "홈",
};

function pageLabel(page: CodePage): string {
  return (
    PAGE_TYPE_LABEL[page.pageType] ??
    (page.pageType || `페이지${page.pageOrder + 1}`)
  );
}

/**
 * pages 배열 → CodeTree 변환.
 * 모든 파일은 "pages/" 폴더 아래에 배치된다.
 * css가 빈 문자열이면 .css 파일을 만들지 않는다.
 */
export function buildCodeTree(pages: CodePage[]): CodeTree {
  const sorted = [...pages].sort((a, b) => a.pageOrder - b.pageOrder);
  const files: CodeFile[] = [];

  for (const page of sorted) {
    const label = pageLabel(page);
    files.push({
      path: `pages/${label}.html`,
      name: `${label}.html`,
      folder: "pages",
      lang: "html",
      content: page.html,
    });
    if (page.css.trim() !== "") {
      files.push({
        path: `pages/${label}.css`,
        name: `${label}.css`,
        folder: "pages",
        lang: "css",
        content: page.css,
      });
    }
  }

  if (files.length === 0) return [];

  return [{ path: "pages", name: "pages", files }];
}

/**
 * 검색어로 파일 목록을 필터링한다.
 * 폴더 안에 매칭 파일이 없으면 폴더도 제거한다.
 */
export function filterCodeTree(tree: CodeTree, query: string): CodeTree {
  if (!query.trim()) return tree;
  const lower = query.toLowerCase();
  return tree
    .map((folder) => ({
      ...folder,
      files: folder.files.filter((f) =>
        f.name.toLowerCase().includes(lower),
      ),
    }))
    .filter((folder) => folder.files.length > 0);
}
