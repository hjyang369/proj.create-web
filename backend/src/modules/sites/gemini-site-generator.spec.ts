import { describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@nestjs/config";
import type { LanguageModelUsage } from "ai";
import {
  DEFAULT_GEMINI_MODEL,
  GeminiSiteGenerator,
  describeGeminiError,
  geminiRequestOptions,
  logGeminiTokenUsage,
  splitHtmlSections,
  replaceSectionInHtml,
} from "./gemini-site-generator.js";
import type { CreateSiteRecord } from "./sites.store.js";

const input: CreateSiteRecord = {
  userId: 1,
  name: "카페",
  businessType: null,
  oneLineIntro: "좋은 커피",
  description: null,
  address: null,
  phone: null,
  email: null,
  purpose: "company_intro",
  targetCustomer: null,
  mainColor: null,
  atmosphere: "warm",
  extraRequest: null,
  pageCount: 1,
  pageComponents: null,
  referenceUrl: null,
  optionalLinks: null,
  logo: null,
  photos: [],
};

const validPage = {
  pageType: "company_intro",
  pageOrder: 1,
  html: '<main data-component-id="hero-1" data-component-type="hero"><h1>카페</h1></main>',
  css: "main { color: #111; }",
};

function config(values: Record<string, string | undefined>): ConfigService {
  return {
    get(key: string) {
      return values[key];
    },
  } as ConfigService;
}

describe("GeminiSiteGenerator", () => {
  it("API 키가 없으면 설정 안내를 한다", async () => {
    const generator = new GeminiSiteGenerator(config({}), async () => "");

    await expect(generator.generatePages(input)).rejects.toThrow(
      "GOOGLE_GENERATIVE_AI_API_KEY",
    );
  });

  it("Gemini 응답을 페이지 목록으로 바꾼다", async () => {
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async () => JSON.stringify({ pages: [validPage] }),
    );

    await expect(generator.generatePages(input)).resolves.toEqual([validPage]);
  });

  it("모델이 없으면 사용 가능한 기본 모델을 쓴다", async () => {
    let usedModel = "";
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ model }) => {
        usedModel = model;
        return JSON.stringify({ pages: [validPage] });
      },
    );

    await generator.generatePages(input);

    expect(usedModel).toBe("gemini-3.5-flash-lite");
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3.5-flash-lite");
  });
});

describe("describeGeminiError", () => {
  it("사용량이 많으면 잠시 후 다시 시도하라고 안내한다", () => {
    expect(
      describeGeminiError(
        new Error(
          "This model is currently experiencing high demand. Please try again later.",
        ),
      ),
    ).toContain("사용량");
  });

  it("모델을 쓸 수 없으면 모델 설정을 안내한다", () => {
    expect(
      describeGeminiError(
        new Error("This model models/gemini-2.5-flash is no longer available"),
      ),
    ).toContain("모델");
  });
});

describe("geminiRequestOptions", () => {
  it("실패하면 다시 보내지 않는다", () => {
    expect(geminiRequestOptions(90_000).maxRetries).toBe(0);
  });
});

describe("logGeminiTokenUsage", () => {
  it("입력, 출력, 전체 토큰을 로그에 남긴다", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const usage: LanguageModelUsage = {
      inputTokens: 120,
      outputTokens: 80,
      totalTokens: 200,
      inputTokenDetails: {
        noCacheTokens: 120,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: 80,
        reasoningTokens: undefined,
      },
    };

    logGeminiTokenUsage(usage);

    expect(spy).toHaveBeenCalledWith("Gemini 토큰", {
      inputTokens: 120,
      outputTokens: 80,
      totalTokens: 200,
    });
    spy.mockRestore();
  });
});

describe("splitHtmlSections", () => {
  it("최상위 태그를 섹션으로 분리한다", () => {
    const html = "<header>상단</header><section>본문</section><footer>하단</footer>";
    expect(splitHtmlSections(html)).toEqual([
      "<header>상단</header>",
      "<section>본문</section>",
      "<footer>하단</footer>",
    ]);
  });

  it("섹션 사이 공백을 무시한다", () => {
    const html = "  <header>상단</header>\n  <section>본문</section>\n";
    expect(splitHtmlSections(html)).toEqual([
      "<header>상단</header>",
      "<section>본문</section>",
    ]);
  });

  it("중첩된 같은 태그를 올바르게 처리한다", () => {
    const html = "<section><section>내부</section></section><footer>하단</footer>";
    expect(splitHtmlSections(html)).toEqual([
      "<section><section>내부</section></section>",
      "<footer>하단</footer>",
    ]);
  });

  it("void 요소를 별도 섹션으로 처리한다", () => {
    const html = "<header>상단</header><hr/><section>본문</section>";
    expect(splitHtmlSections(html)).toEqual([
      "<header>상단</header>",
      "<hr/>",
      "<section>본문</section>",
    ]);
  });

  it("HTML 주석을 건너뛴다", () => {
    const html = "<!-- 주석 --><header>상단</header><footer>하단</footer>";
    expect(splitHtmlSections(html)).toEqual([
      "<header>상단</header>",
      "<footer>하단</footer>",
    ]);
  });

  it("빈 문자열이면 빈 배열을 반환한다", () => {
    expect(splitHtmlSections("")).toEqual([]);
  });
});

describe("replaceSectionInHtml", () => {
  it("지정한 인덱스 섹션만 교체한다", () => {
    const html = "<header>상단</header><section>본문</section><footer>하단</footer>";
    const result = replaceSectionInHtml(html, 1, "<section>새 본문</section>");
    expect(result).toBe(
      "<header>상단</header><section>새 본문</section><footer>하단</footer>",
    );
  });

  it("첫 번째 섹션을 교체한다", () => {
    const html = "<header>상단</header><footer>하단</footer>";
    const result = replaceSectionInHtml(html, 0, "<header>새 상단</header>");
    expect(result).toBe("<header>새 상단</header><footer>하단</footer>");
  });

  it("마지막 섹션을 교체한다", () => {
    const html = "<header>상단</header><footer>하단</footer>";
    const result = replaceSectionInHtml(html, 1, "<footer>새 하단</footer>");
    expect(result).toBe("<header>상단</header><footer>새 하단</footer>");
  });

  it("범위를 벗어난 인덱스면 원본을 반환한다", () => {
    const html = "<header>상단</header>";
    expect(replaceSectionInHtml(html, 5, "<section>새 섹션</section>")).toBe(html);
    expect(replaceSectionInHtml(html, -1, "<section>새 섹션</section>")).toBe(html);
  });

  it("섹션 앞뒤 공백을 보존한다", () => {
    const html = "  <header>상단</header>\n  <footer>하단</footer>\n";
    const result = replaceSectionInHtml(html, 0, "<header>새 상단</header>");
    expect(result).toBe("  <header>새 상단</header>\n  <footer>하단</footer>\n");
  });
});

describe("GeminiSiteGenerator.editComponent", () => {
  it("AI에게 전체 HTML 대신 해당 섹션만 보낸다", async () => {
    let capturedPrompt = "";
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ prompt }) => {
        capturedPrompt = prompt;
        return JSON.stringify({ html: "<section>수정됨</section>", css: "section{}" });
      },
    );

    await generator.editComponent({
      html: "<header>상단</header><section>본문</section><footer>하단</footer>",
      css: "body{}",
      sectionIndex: 1,
      request: "배경을 어둡게",
    });

    // 전체 HTML이 아닌 해당 섹션만 포함
    expect(capturedPrompt).toContain("<section>본문</section>");
    expect(capturedPrompt).not.toContain("<header>상단</header>");
    expect(capturedPrompt).not.toContain("<footer>하단</footer>");
  });

  it("AI가 반환한 섹션을 원래 위치에 끼워넣어 전체 HTML을 복원한다", async () => {
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async () =>
        JSON.stringify({ html: "<section>수정됨</section>", css: "section{color:red}" }),
    );

    const result = await generator.editComponent({
      html: "<header>상단</header><section>본문</section><footer>하단</footer>",
      css: "body{}",
      sectionIndex: 1,
      request: "배경을 어둡게",
    });

    expect(result.html).toBe(
      "<header>상단</header><section>수정됨</section><footer>하단</footer>",
    );
    expect(result.css).toBe("section{color:red}");
  });

  it("섹션 추출에 실패하면 전체 HTML을 폴백으로 사용한다", async () => {
    let capturedPrompt = "";
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ prompt }) => {
        capturedPrompt = prompt;
        return JSON.stringify({ html: "<main>수정됨</main>", css: "" });
      },
    );

    await generator.editComponent({
      html: "<main>단일 섹션</main>",
      css: "",
      sectionIndex: 99, // 범위 벗어남
      request: "바꿔줘",
    });

    // 폴백: 전체 HTML을 전달
    expect(capturedPrompt).toContain("<main>단일 섹션</main>");
  });

  it("innerSectionIndex가 있으면 outer 안의 inner 섹션만 AI에 보낸다", async () => {
    let capturedPrompt = "";
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ prompt }) => {
        capturedPrompt = prompt;
        return JSON.stringify({ html: "<section id='about'>수정됨</section>", css: "" });
      },
    );

    const html =
      "<header>상단</header>" +
      "<main><section id='hero'>히어로</section><section id='about'>소개</section></main>" +
      "<footer>하단</footer>";

    await generator.editComponent({
      html,
      css: "body{}",
      sectionIndex: 1,        // <main>
      innerSectionIndex: 1,   // <section id='about'>
      request: "소개 글 바꿔줘",
    });

    // inner 섹션만 전달
    expect(capturedPrompt).toContain("<section id='about'>소개</section>");
    expect(capturedPrompt).not.toContain("<section id='hero'>히어로</section>");
    expect(capturedPrompt).not.toContain("<header>상단</header>");
  });

  it("innerSectionIndex 수정 결과를 원래 위치에 정확히 끼워넣는다", async () => {
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async () =>
        JSON.stringify({ html: "<section id='about'>수정됨</section>", css: "body{}" }),
    );

    const html =
      "<header>상단</header>" +
      "<main><section id='hero'>히어로</section><section id='about'>소개</section></main>" +
      "<footer>하단</footer>";

    const result = await generator.editComponent({
      html,
      css: "body{}",
      sectionIndex: 1,
      innerSectionIndex: 1,
      request: "소개 글 바꿔줘",
    });

    expect(result.html).toBe(
      "<header>상단</header>" +
      "<main><section id='hero'>히어로</section><section id='about'>수정됨</section></main>" +
      "<footer>하단</footer>",
    );
  });
});
