import { describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@nestjs/config";
import {
  DEFAULT_GEMINI_MODEL,
  GeminiSiteGenerator,
  describeGeminiError,
  geminiProviderOptions,
  splitHtmlSections,
  replaceSectionInHtml,
  textFromGeminiAttempts,
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

  it("생성 전에 폼을 보고 고른 탭 예시만 사이트 작성 프롬프트에 붙인다", async () => {
    const prompts: string[] = [];
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ prompt }) => {
        prompts.push(prompt);
        if (prompts.length === 1) return '{"종류":["탭"]}';
        return JSON.stringify({ pages: [validPage] });
      },
    );

    await generator.generatePages({
      ...input,
      oneLineIntro: "컨설팅",
      description: "소개, 가격, 후기를 한자리에서 바꿔 보여 주세요.",
    });

    expect(prompts).toHaveLength(3);
    expect(prompts[0]).toContain("소개, 가격, 후기를 한자리에서 바꿔 보여 주세요.");
    expect(prompts[2]).toContain('data-action="tabs.select"');
    expect(prompts[2]).not.toContain("popovertarget");
  });

  it("디자인 설계를 먼저 받은 뒤 그 섹션 구성으로 페이지를 만든다", async () => {
    const prompts: string[] = [];
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ prompt, system }) => {
        prompts.push(`${system}\n${prompt}`);
        if (prompts.length === 1) return '{"종류":[]}';
        if (prompts.length === 2) {
          return JSON.stringify({
            concept: {
              name: "고요한 진료",
              direction: "비대칭 편집",
              keywords: ["여백"],
            },
            palette: {
              primary: "#1C1917",
              accent: "#987C6D",
              background: "#F7F4F1",
              surface: "#FFFFFF",
              text: "#1C1917",
              muted: "#6B6560",
            },
            typography: {
              headingFont: "Iowan Old Style",
              bodyFont: "Apple SD Gothic Neo",
              heroSize: "clamp(3.5rem, 8vw, 6rem)",
              headingStyle: "얇은 세리프",
            },
            layout: {
              hero: "asymmetric-photo",
              contentWidth: "1120px",
              sectionSpacing: "넓은 여백",
              cornerStyle: "sharp",
              imageTreatment: "세로 사진",
            },
            pages: [
              {
                pageOrder: 1,
                visualGoal: "진료 신뢰",
                sections: [
                  {
                    type: "hero",
                    variant: "asymmetric-photo",
                    composition: "좌측 큰 제목과 우측 세로 사진",
                  },
                ],
              },
            ],
            designRules: ["강조색은 버튼에만"],
          });
        }
        return JSON.stringify({ pages: [validPage] });
      },
    );

    await generator.generatePages({
      ...input,
      businessType: "피부과",
      mainColor: "#987C6D",
    });

    expect(prompts).toHaveLength(3);
    expect(prompts[1]).toContain("HTML이나 CSS를 생성하지 마세요");
    expect(prompts[1]).toContain("피부과");
    expect(prompts[2]).toContain("좌측 큰 제목과 우측 세로 사진");
    expect(prompts[2]).not.toContain("hero-split-01");
  });

  it("HTML 응답이 비어 있으면 디자인 설계서로 페이지를 만든다", async () => {
    let calls = 0;
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async () => {
        calls += 1;
        if (calls < 3) return '{"종류":[]}';
        throw new Error("AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도해 주세요.");
      },
    );

    const pages = await generator.generatePages(input);

    expect(calls).toBe(3);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.html).toContain("카페");
    expect(pages[0]?.html).toContain("좋은 커피");
    expect(pages[0]?.html).toContain("hero-type");
  });
});

describe("geminiProviderOptions", () => {
  it("긴 HTML을 쓸 수 있게 출력 한도를 두고 생각 토큰은 줄인다", () => {
    expect(geminiProviderOptions("gemini-3.5-flash-lite")).toEqual({
      maxOutputTokens: 32768,
      providerOptions: {
        google: { thinkingConfig: { thinkingLevel: "minimal" } },
      },
    });
    expect(geminiProviderOptions("gemini-2.5-flash").providerOptions).toEqual({
      google: { thinkingConfig: { thinkingBudget: 0 } },
    });
  });
});

describe("textFromGeminiAttempts", () => {
  it("첫 응답이 비어 있으면 한 번 더 요청한다", async () => {
    const responses = ["", '{"pages":[]}'];
    const text = await textFromGeminiAttempts(async () => responses.shift() ?? "");

    expect(text).toBe('{"pages":[]}');
  });

  it("두 번 모두 비어 있으면 빈 응답이라고 안내한다", async () => {
    await expect(textFromGeminiAttempts(async () => "  ")).rejects.toThrow(
      "빈 응답",
    );
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
  it("탭 요청의 입력 프롬프트에만 탭 예시를 넣는다", async () => {
    let calls = 0;
    let capturedPrompt = "";
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ prompt }) => {
        calls += 1;
        capturedPrompt = prompt;
        return JSON.stringify({ html: "<section>수정됨</section>", css: "" });
      },
    );

    await generator.editComponent({
      html: "<section>본문</section>",
      css: "body{}",
      sectionIndex: 0,
      request: "탭 메뉴를 추가해 줘",
    });

    expect(calls).toBe(1);
    expect(capturedPrompt).toContain('data-action="tabs.select"');
    expect(capturedPrompt).toContain("data-tab-panel");
    expect(capturedPrompt).not.toContain('type="radio"');
    expect(capturedPrompt).not.toContain("crep-switch");
  });

  it("색만 바꾸는 요청에는 동작 예시를 넣지 않는다", async () => {
    let capturedSystem = "";
    let capturedPrompt = "";
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ system, prompt }) => {
        capturedSystem = system;
        capturedPrompt = prompt;
        return JSON.stringify({ html: "<section>수정됨</section>", css: "" });
      },
    );

    await generator.editComponent({
      html: "<section>본문</section>",
      css: "body{}",
      sectionIndex: 0,
      request: "버튼 색만 바꿔 줘",
    });

    expect(capturedPrompt).not.toContain('type="radio"');
    expect(capturedPrompt).not.toContain('data-action="dropdown.toggle"');
    expect(capturedSystem).toContain("JavaScript를 생성하지 마세요");
    expect(capturedSystem).not.toContain("popovertarget");
    expect(capturedSystem).not.toContain("crep-fold");
    expect(capturedSystem).not.toContain("clipboard.copy");
    expect(capturedSystem).not.toContain('data-action="carousel.next"');
    expect(capturedSystem).not.toContain('data-action="tabs.select"');
    expect(capturedSystem).not.toContain('data-action="video.play"');
  });

  it("섹션 수정 결과에서 허용되지 않은 data-action은 지운다", async () => {
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async () =>
        JSON.stringify({
          html: '<section><button type="button" data-action="alert(1)">나쁜 버튼</button><button type="button" data-action="menu.toggle" data-target="nav">메뉴</button><button type="button" data-action="tabs.select" data-target="tab-price">가격</button></section>',
          css: "section{}",
        }),
    );

    const result = await generator.editComponent({
      html: "<section>본문</section>",
      css: "body{}",
      sectionIndex: 0,
      request: "버튼 색만 바꿔 줘",
    });

    expect(result.html).toContain('data-action="tabs.select"');
    expect(result.html).not.toContain('data-action="menu.toggle"');
    expect(result.html).not.toContain('data-action="alert(1)"');
    expect(result.html).toContain("나쁜 버튼");
  });

  it("애매한 요청은 분류 결과가 탭이면 입력 프롬프트에 탭 예시를 넣는다", async () => {
    const prompts: string[] = [];
    const generator = new GeminiSiteGenerator(
      config({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
      async ({ prompt }) => {
        prompts.push(prompt);
        if (prompts.length === 1) return '{"종류":["탭"]}';
        return JSON.stringify({ html: "<section>수정됨</section>", css: "" });
      },
    );

    await generator.editComponent({
      html: "<section>본문</section>",
      css: "body{}",
      sectionIndex: 0,
      request: "누르면 아래 화면이 바뀌게",
    });

    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain('data-action="tabs.select"');
    expect(prompts[1]).not.toContain('type="radio"');
    expect(prompts[1]).not.toContain("crep-switch");
  });

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
