import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { buildSiteGenerationPrompt } from "./site-generation-prompt.js";
import {
  parseSiteGenerationResponse,
  type GeneratedSitePage,
} from "./site-generation-response.js";
import type { SiteGenerator } from "./site-generator.js";
import type { CreateSiteRecord } from "./sites.store.js";

export const GEMINI_TEXT_GENERATOR = Symbol("GEMINI_TEXT_GENERATOR");
export const GEMINI_TIMEOUT_MS = 90_000;
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export function geminiRequestOptions(timeoutMs: number) {
  return {
    timeout: timeoutMs,
    maxRetries: 0,
  };
}

export function describeGeminiError(error: unknown): string {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }

  const message = error instanceof Error ? error.message : "";
  if (/high demand|try again later|rate|quota|429/i.test(message)) {
    return "지금은 AI 사용량이 많아서 잠시 후 다시 시도해 주세요.";
  }
  if (/no longer available|not found|not available to new users/i.test(message)) {
    return "선택한 Gemini 모델을 지금 사용할 수 없습니다. GEMINI_MODEL을 확인해 주세요.";
  }

  return "AI 사이트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export type GeminiTextGenerator = (input: {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  timeoutMs: number;
}) => Promise<string>;

export async function generateGeminiText(input: {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  timeoutMs: number;
}): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: input.apiKey });

  try {
    const { text } = await generateText({
      model: google(input.model),
      system: input.system,
      prompt: input.prompt,
      ...geminiRequestOptions(input.timeoutMs),
    });
    return text;
  } catch (error) {
    throw new Error(describeGeminiError(error));
  }
}

@Injectable()
export class GeminiSiteGenerator implements SiteGenerator {
  private readonly complete: GeminiTextGenerator;

  constructor(
    private readonly config: ConfigService,
    @Optional()
    @Inject(GEMINI_TEXT_GENERATOR)
    complete?: GeminiTextGenerator,
  ) {
    this.complete = complete ?? generateGeminiText;
  }

  async generatePages(input: CreateSiteRecord): Promise<GeneratedSitePage[]> {
    const apiKey = this.config
      .get<string>("GOOGLE_GENERATIVE_AI_API_KEY")
      ?.trim();
    if (!apiKey) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY가 비어 있습니다. backend/.env에 키를 넣어 주세요.",
      );
    }

    const model =
      this.config.get<string>("GEMINI_MODEL")?.trim() || DEFAULT_GEMINI_MODEL;
    console.log(`Gemini 모델: ${model}`);
    const { system, user } = buildSiteGenerationPrompt(input);
    const text = await this.complete({
      apiKey,
      model,
      system,
      prompt: user,
      timeoutMs: GEMINI_TIMEOUT_MS,
    });

    return parseSiteGenerationResponse(text, input.pageCount);
  }
}
