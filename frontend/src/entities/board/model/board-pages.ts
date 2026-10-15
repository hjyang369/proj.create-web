import { boardDetailHtml, boardListHtml } from "./board-view-html";

export type EditorBoard = {
  name: string;
  slug: string;
};

export type EditorBoardPost = {
  id: number;
  slug: string;
  title: string;
  content: string;
  createdAt: string;
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

/** 게시판 이름을 주소용 슬러그로 바꾼다. 같은 주소는 -2, -3을 붙인다. */
export function boardsFromNames(names: string[]): EditorBoard[] {
  const used = new Set<string>();

  return names.flatMap((raw, index) => {
    const name = raw.trim();
    if (!name) return [];
    const base = SLUG_BY_NAME[name] ?? `board-${index + 1}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    return [{ name, slug }];
  });
}

function boardsFromHtml(html: string): EditorBoard[] {
  const boards: EditorBoard[] = [];
  const anchors = html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi);
  for (const anchor of anchors) {
    const href = anchor[1]?.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const slug = href.match(/^\/board\/([a-z0-9-]+)\/?$/i)?.[1]?.toLowerCase();
    if (!slug) continue;
    const name =
      (anchor[2] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ||
      slug;
    boards.push({ name, slug });
  }
  return boards;
}

/** 저장된 게시판, 입력한 이름, 생성된 메뉴 링크를 한 목록으로 모은다. */
export function boardsForEditor(input: {
  pages: { html: string }[];
  names: string[];
  saved: EditorBoard[];
}): EditorBoard[] {
  const bySlug = new Map<string, EditorBoard>();

  for (const board of input.saved) {
    const slug = board.slug.trim().toLowerCase();
    if (!slug) continue;
    bySlug.set(slug, { name: board.name.trim() || slug, slug });
  }
  for (const board of boardsFromNames(input.names)) {
    if (!bySlug.has(board.slug)) bySlug.set(board.slug, board);
  }
  for (const page of input.pages) {
    for (const board of boardsFromHtml(page.html)) {
      if (!bySlug.has(board.slug)) bySlug.set(board.slug, board);
    }
  }

  return [...bySlug.values()];
}

function withBoardMain(html: string, body: string): string {
  if (!/<main\b/i.test(html)) {
    return `${html}\n${body}`;
  }
  return html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, (main) => {
    const open = main.match(/^<main\b[^>]*>/i)?.[0] ?? "<main>";
    return `${open}${body}</main>`;
  });
}

/** 코드 탭에 보여줄 게시판 페이지. 사이트 첫 페이지의 틀과 CSS를 같이 쓴다. */
export function boardPageSources(
  pages: { pageOrder: number; html: string; css: string }[],
  boards: EditorBoard[],
  boardPosts: EditorBoardPost[] = [],
): { name: string; slug: string; html: string; css: string }[] {
  const home = [...pages].sort((left, right) => left.pageOrder - right.pageOrder)[0];

  return boards.map((board) => {
    const posts = boardPosts
      .filter((post) => post.slug === board.slug)
      .sort((left, right) => right.id - left.id)
      .slice(0, 20)
      .map((post) => ({
        id: post.id,
        title: post.title,
        createdAt: post.createdAt,
      }));
    const body = boardListHtml({
      name: board.name,
      slug: board.slug,
      posts,
      page: 1,
      canWrite: false,
    });
    return {
      name: board.name,
      slug: board.slug,
      html: home ? withBoardMain(home.html, body) : body,
      css: home?.css.trim()
        ? home.css
        : ".crep-board{max-width:720px;margin:32px auto;}",
    };
  });
}

/** 글 하나의 주소 `/board/news/3`에 해당하는 상세 페이지. */
export function boardPostPageSources(
  pages: { pageOrder: number; html: string; css: string }[],
  boards: EditorBoard[],
  posts: EditorBoardPost[],
): { name: string; slug: string; id: number; html: string; css: string }[] {
  const home = [...pages].sort((left, right) => left.pageOrder - right.pageOrder)[0];
  const css = home?.css.trim()
    ? home.css
    : ".crep-board{max-width:720px;margin:32px auto;}";

  return [...posts]
    .sort((left, right) => right.id - left.id)
    .flatMap((post) => {
      const board = boards.find((item) => item.slug === post.slug);
      if (!board) return [];
      const body = boardDetailHtml({
        name: board.name,
        slug: board.slug,
        canWrite: false,
        post,
      });
      return [
        {
          name: board.name,
          slug: board.slug,
          id: post.id,
          html: home ? withBoardMain(home.html, body) : body,
          css,
        },
      ];
    });
}
