export type BoardConfig = {
  name: string;
  slug: string;
};

const SLUG_BY_NAME: Record<string, string> = {
  뉴스: "news",
  소식: "notice",
  공지: "notice",
  공지사항: "notice",
  블로그: "blog",
  자유게시판: "free",
  자유: "free",
  갤러리: "gallery",
  후기: "review",
  리뷰: "review",
  이벤트: "events",
};

export function assignBoardSlugs(names: string[]): BoardConfig[] {
  const used = new Set<string>();

  return names.map((raw, index) => {
    const name = raw.trim();
    const base = SLUG_BY_NAME[name] ?? `board-${index + 1}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    return { name, slug };
  });
}
