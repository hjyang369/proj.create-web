export const REVIEW_VISIBILITY_VALUES = ["partial", "full"] as const;

export type ReviewVisibility = (typeof REVIEW_VISIBILITY_VALUES)[number];

export class ReviewVisibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewVisibilityError";
  }
}

/** 리뷰를 켰을 때만 공개 범위를 남긴다. 전체 공개는 로그인·회원가입이 있어야 한다. */
export function resolveReviewVisibility(input: {
  selectedPages: readonly string[];
  reviewVisibility: string | null | undefined;
}): ReviewVisibility | null {
  if (!input.selectedPages.includes("review")) {
    return null;
  }

  const value = input.reviewVisibility?.trim() ?? "";
  if (value !== "partial" && value !== "full") {
    throw new ReviewVisibilityError("리뷰 공개 범위를 선택해 주세요.");
  }
  if (value === "full" && !input.selectedPages.includes("auth")) {
    throw new ReviewVisibilityError(
      "리뷰를 전체 공개하려면 로그인·회원가입을 함께 선택해 주세요.",
    );
  }
  return value;
}

/** 생성 프롬프트에 넣을 리뷰 규칙. 리뷰를 끄면 빈 문자열이다. */
export function reviewPromptRules(
  visibility: ReviewVisibility | null | undefined,
): string {
  if (visibility !== "partial" && visibility !== "full") {
    return "";
  }

  const login =
    visibility === "full"
      ? "각 리뷰 article 안에 <a href=\"/login\" data-review-login>로그인</a>를 넣으세요."
      : "리뷰 안에 로그인 링크를 넣지 마세요.";

  return `
[리뷰]
- 메인 페이지 main의 CTA 앞에 id="reviews" 섹션을 넣으세요.
- 모든 페이지 nav에 "리뷰" 링크를 넣으세요. 메인은 href="#reviews", 서브페이지는 href="index.html#reviews"입니다.
- 각 리뷰는 article data-review이고, 본문 요소에 data-review-content를 붙이세요. 본문에는 전문을 적으세요.
- 사람 이름, 별점, 이용자 수, 매출은 만들지 마세요. 업종에 맞는 짧은 후기 문장을 2개 이상 쓰세요.
- ${login}
`;
}

function reviewHref(pageOrder: number): string {
  return pageOrder === 1 ? "#reviews" : "index.html#reviews";
}

function insertReviewNav(html: string, href: string): string {
  if (html.includes(`href="${href}"`) || html.includes(`href='${href}'`)) {
    return html;
  }

  const navClose = html.search(/<\/nav>/i);
  if (navClose < 0) {
    return html;
  }

  return (
    html.slice(0, navClose) +
    `<a href="${href}">리뷰</a>` +
    html.slice(navClose)
  );
}

function ensureReviewSection(html: string): string {
  if (/\bid\s*=\s*["']reviews["']/i.test(html)) {
    return html;
  }

  const section =
    '<section id="reviews" data-component-id="reviews" data-component-type="reviews"><h2>리뷰</h2><article data-review><p data-review-content>방문자 후기를 준비 중입니다.</p></article></section>';
  const mainClose = html.search(/<\/main>/i);
  if (mainClose < 0) {
    return html;
  }

  return html.slice(0, mainClose) + section + html.slice(mainClose);
}

function applyLoginLinks(html: string, visibility: ReviewVisibility): string {
  if (visibility === "partial") {
    return html.replace(
      /<a\b[^>]*\bdata-review-login\b[^>]*>[\s\S]*?<\/a>/gi,
      "",
    );
  }

  return html.replace(
    /<article\b[^>]*\bdata-review\b[^>]*>[\s\S]*?<\/article>/gi,
    (article) => {
      if (/\bdata-review-login\b/i.test(article)) {
        return article;
      }
      return article.replace(
        /<\/article>/i,
        '<a href="/login" data-review-login>로그인</a></article>',
      );
    },
  );
}

/** 생성된 HTML에 리뷰 메뉴와 본문 표시를 맞춘다. AI가 빼먹은 것만 보탠다. */
export function applyReviewMarkup(
  html: string,
  pageOrder: number,
  visibility: ReviewVisibility,
): string {
  const withNav = insertReviewNav(html, reviewHref(pageOrder));
  const withSection = pageOrder === 1 ? ensureReviewSection(withNav) : withNav;
  return applyLoginLinks(withSection, visibility);
}
