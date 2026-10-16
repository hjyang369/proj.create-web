const LOGIN_PATHS = new Set(["login", "signin", "sign-in"]);
const SIGNUP_PATHS = new Set(["signup", "sign-up", "register", "join"]);

/** 사이트 안 로그인·회원가입 주소면 그 화면 이름을 돌려준다. 바깥 주소는 null. */
export function authViewFromHref(href: string): "login" | "signup" | null {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(trimmed)) return null;

  const path = (trimmed.split(/[?#]/)[0] ?? "")
    .replace(/^\.?\//, "")
    .replace(/^\//, "")
    .replace(/\.html$/i, "")
    .toLowerCase();

  if (LOGIN_PATHS.has(path)) return "login";
  if (SIGNUP_PATHS.has(path)) return "signup";
  return null;
}

/** 페이지 구성에 로그인·회원가입이 있을 때만 주소창에 넣는다. */
export function authPageChoices(
  selectedPages: string[],
): { id: string; label: string }[] {
  if (!selectedPages.includes("auth")) return [];
  return [
    { id: "auth:login", label: "/login" },
    { id: "auth:signup", label: "/signup" },
  ];
}

/** 로그인·회원가입 html 링크만 `/login`, `/signup`으로 바꾼다. */
export function rewriteAuthPageLinks(html: string): string {
  return html.replace(
    /\bhref\s*=\s*(["'])([^"']+)\1/gi,
    (full, quote: string, href: string) => {
      const view = authViewFromHref(href);
      if (!view) return full;
      return `href=${quote}/${view}${quote}`;
    },
  );
}
