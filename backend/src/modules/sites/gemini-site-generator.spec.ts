import { describe, expect, it } from "vitest";
import type { ConfigService } from "@nestjs/config";
import {
  DEFAULT_GEMINI_MODEL,
  GeminiSiteGenerator,
  describeGeminiError,
  geminiRequestOptions,
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
