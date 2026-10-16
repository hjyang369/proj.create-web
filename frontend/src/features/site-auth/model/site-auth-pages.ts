import { siteAuthFormHtml } from "./site-auth-html";

export type AuthCodePage = {
  fileLabel: string;
  pageType: "login" | "signup";
  html: string;
  css: string;
};

function withMain(html: string, body: string): string {
  if (!/<main\b/i.test(html)) {
    return `${html}\n${body}`;
  }
  return html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, (main) => {
    const open = main.match(/^<main\b[^>]*>/i)?.[0] ?? "<main>";
    return `${open}${body}</main>`;
  });
}

/** 코드 보기에 넣을 로그인·회원가입 페이지. 첫 페이지의 메뉴와 푸터를 유지한다. */
export function authPageSources(
  pages: { pageOrder: number; html: string; css: string }[],
  selectedPages: string[],
): AuthCodePage[] {
  if (!selectedPages.includes("auth")) return [];

  const home = [...pages].sort(
    (left, right) => left.pageOrder - right.pageOrder,
  )[0];
  const css = home?.css ?? "";
  const views = [
    { fileLabel: "로그인", pageType: "login", view: "login" },
    { fileLabel: "회원가입", pageType: "signup", view: "signup" },
  ] as const;

  return views.map((item) => {
    const body = siteAuthFormHtml({ view: item.view, email: "", name: "" });
    return {
      fileLabel: item.fileLabel,
      pageType: item.pageType,
      html: home ? withMain(home.html, body) : body,
      css,
    };
  });
}
