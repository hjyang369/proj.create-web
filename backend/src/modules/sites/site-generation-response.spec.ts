import { describe, expect, it } from "vitest";
import { parseSiteGenerationResponse } from "./site-generation-response.js";

const validPage = {
  pageType: "company_intro",
  pageOrder: 1,
  html: '<main data-component-id="hero-1" data-component-type="hero"><h1>카페</h1></main>',
  css: "main { color: #111; }",
};

describe("parseSiteGenerationResponse", () => {
  it("유효한 JSON이면 페이지 목록을 돌려준다", () => {
    const pages = parseSiteGenerationResponse(
      JSON.stringify({ pages: [validPage] }),
      1,
    );

    expect(pages).toEqual([validPage]);
  });

  it("Markdown 코드 블록으로 감싼 JSON도 읽는다", () => {
    const pages = parseSiteGenerationResponse(
      `\`\`\`json\n${JSON.stringify({ pages: [validPage] })}\n\`\`\``,
      1,
    );

    expect(pages).toEqual([validPage]);
  });

  it("페이지 수가 요청과 다르면 거절한다", () => {
    expect(() =>
      parseSiteGenerationResponse(JSON.stringify({ pages: [validPage] }), 2),
    ).toThrow("페이지 수가 요청과 다릅니다");
  });

  it("pageOrder가 1부터 연속이 아니면 거절한다", () => {
    expect(() =>
      parseSiteGenerationResponse(
        JSON.stringify({
          pages: [
            validPage,
            { ...validPage, pageType: "contact", pageOrder: 3 },
          ],
        }),
        2,
      ),
    ).toThrow("pageOrder");
  });

  it("위험한 HTML이 있으면 거절한다", () => {
    expect(() =>
      parseSiteGenerationResponse(
        JSON.stringify({
          pages: [
            {
              ...validPage,
              html: '<main><script>alert(1)</script></main>',
            },
          ],
        }),
        1,
      ),
    ).toThrow("위험한");
  });

  it("JSON이 아니면 거절한다", () => {
    expect(() => parseSiteGenerationResponse("not-json", 1)).toThrow(
      "JSON",
    );
  });
});
