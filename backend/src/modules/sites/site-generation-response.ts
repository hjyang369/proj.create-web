import { keepAllowedActions } from "./interaction-actions.js";

export type GeneratedSitePage = {
  pageType: string;
  pageOrder: number;
  html: string;
  css: string;
};

/** 태그로 실행되거나, 속성으로 붙은 이벤트, javascript: 주소만 위험으로 본다. */
export const DANGEROUS_HTML =
  /<\s*(script|iframe|object|embed|style)\b|[\s/]on[a-z]+\s*=|javascript\s*:/i;

/**
 * AI가 넣은 실행 코드와 style 태그를 걷어 낸다.
 * style 안의 CSS는 페이지 CSS 뒤로 붙인다. 주소의 only= 같은 글자는 그대로 둔다.
 */
export function sanitizeGeneratedHtml(
  html: string,
  css: string,
): { html: string; css: string } {
  const styleCss: string[] = [];
  let cleaned = html.replace(/<!--[\s\S]*?-->/g, "");

  cleaned = cleaned.replace(
    /<\s*style\b[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi,
    (block) => {
      const inner = block
        .replace(/^[\s\S]*?>/i, "")
        .replace(/<\s*\/\s*style\s*>$/i, "")
        .replace(/<\/style/gi, "")
        .trim();
      if (inner) styleCss.push(inner);
      return "";
    },
  );

  cleaned = cleaned
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*iframe\b[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, "")
    .replace(/<\s*object\b[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi, "")
    .replace(/<\s*embed\b[^>]*>[\s\S]*?<\s*\/\s*embed\s*>/gi, "")
    .replace(/<\s*(?:script|iframe|object|embed|style)\b[^>]*\/?\s*>/gi, "")
    .replace(
      /([\s/])on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      (_match, lead: string) => (lead === "/" ? "/" : ""),
    )
    .replace(
      /(\s(?:href|src|action)\s*=\s*)(["'])\s*javascript:[^"']*\2/gi,
      '$1$2#$2',
    )
    .replace(/(\s(?:href|src|action)\s*=\s*)javascript:[^\s>]*/gi, "$1#")
    .replace(/javascript\s*:/gi, "");

  if (DANGEROUS_HTML.test(cleaned)) {
    throw new Error("AI 응답에 위험한 HTML이 포함되어 있습니다.");
  }

  return {
    html: cleaned,
    css: [css.trim(), ...styleCss].filter((part) => part !== "").join("\n"),
  };
}

export function parseSiteGenerationResponse(
  raw: string,
  expectedPageCount: number,
): GeneratedSitePage[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapJsonText(raw));
  } catch {
    throw new Error("AI 응답이 올바른 JSON이 아닙니다.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("pages" in parsed) ||
    !Array.isArray(parsed.pages)
  ) {
    throw new Error("AI 응답에 pages 배열이 없습니다.");
  }

  const pages = parsed.pages.map((page: unknown) => {
    if (typeof page !== "object" || page === null) {
      throw new Error("AI 응답의 페이지 형식이 올바르지 않습니다.");
    }

    const record = page as Record<string, unknown>;
    if (
      typeof record.pageType !== "string" ||
      record.pageType.trim() === "" ||
      typeof record.pageOrder !== "number" ||
      !Number.isInteger(record.pageOrder) ||
      typeof record.html !== "string" ||
      typeof record.css !== "string"
    ) {
      throw new Error("AI 응답의 페이지 형식이 올바르지 않습니다.");
    }

    const safe = sanitizeGeneratedHtml(record.html, record.css);

    return {
      pageType: record.pageType,
      pageOrder: record.pageOrder,
      html: keepAllowedActions(safe.html),
      css: safe.css,
    };
  });

  if (pages.length !== expectedPageCount) {
    throw new Error(
      `페이지 수가 요청과 다릅니다. 요청 ${expectedPageCount}개, 응답 ${pages.length}개`,
    );
  }

  const orders = pages.map((page) => page.pageOrder).sort((a, b) => a - b);
  const expectedOrders = Array.from(
    { length: expectedPageCount },
    (_, index) => index + 1,
  );
  if (orders.some((order, index) => order !== expectedOrders[index])) {
    throw new Error("pageOrder는 1부터 연속되어야 합니다.");
  }

  return pages;
}

function unwrapJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

export { unwrapJsonText };
