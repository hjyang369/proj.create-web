export type GeneratedSitePage = {
  pageType: string;
  pageOrder: number;
  html: string;
  css: string;
};

const DANGEROUS_HTML =
  /<\s*(script|iframe|object|embed|style)\b|on[a-z]+\s*=|javascript\s*:/i;

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

    if (DANGEROUS_HTML.test(record.html)) {
      throw new Error("AI 응답에 위험한 HTML이 포함되어 있습니다.");
    }

    return {
      pageType: record.pageType,
      pageOrder: record.pageOrder,
      html: record.html,
      css: record.css,
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
