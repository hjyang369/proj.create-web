import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModelUsage } from "ai";
import {
  INTERACTION_SYSTEM_RULES,
  keepAllowedActions,
} from "./interaction-actions.js";
import { buildPagesFromDesign } from "./site-design-fallback.js";
import { buildSiteDesignPrompt } from "./site-design-prompt.js";
import {
  fallbackSiteDesignSpec,
  parseSiteDesignSpec,
} from "./site-design-spec.js";
import { DESIGN_RULES } from "./section-templates.js";
import { buildSiteGenerationPrompt } from "./site-generation-prompt.js";
import {
  interactionRulesFor,
  resolveGenerationInteractionKinds,
  resolveInteractionKinds,
} from "./interaction-rules.js";
import {
  parseSiteGenerationResponse,
  sanitizeGeneratedHtml,
  unwrapJsonText,
  type GeneratedSitePage,
} from "./site-generation-response.js";
import type { SiteGenerator } from "./site-generator.js";
import type { CreateSiteRecord } from "./sites.store.js";

// ── HTML 섹션 파싱 헬퍼 ─────────────────────────────────────────────────────

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

type SectionRange = { start: number; end: number };

/**
 * HTML 문자열에서 최상위(depth=0) 태그의 시작·끝 위치 목록을 반환한다.
 * AI가 생성한 잘 형성된 HTML을 전제로 한다.
 */
function findHtmlSectionRanges(html: string): SectionRange[] {
  const ranges: SectionRange[] = [];
  let i = 0;

  while (i < html.length) {
    // 공백 건너뛰기
    if (/\s/.test(html[i])) { i++; continue; }
    // '<' 가 아니면 건너뛰기
    if (html[i] !== "<") { i++; continue; }

    // HTML 주석 건너뛰기
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i);
      i = end >= 0 ? end + 3 : i + 1;
      continue;
    }

    // 닫는 태그는 최상위에서 건너뛰기
    if (html[i + 1] === "/") {
      const end = html.indexOf(">", i);
      i = end >= 0 ? end + 1 : i + 1;
      continue;
    }

    // 태그 이름 추출
    const tagMatch = html.slice(i + 1).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!tagMatch) { i++; continue; }

    const tagName = tagMatch[1].toLowerCase();
    const sectionStart = i;

    // 여는 태그의 끝 위치
    const openTagEnd = html.indexOf(">", i);
    if (openTagEnd < 0) { i++; continue; }

    // 자체 닫는 태그 또는 void 요소
    if (html[openTagEnd - 1] === "/" || VOID_ELEMENTS.has(tagName)) {
      ranges.push({ start: sectionStart, end: openTagEnd + 1 });
      i = openTagEnd + 1;
      continue;
    }

    // 매칭되는 닫는 태그를 depth 추적으로 찾기
    let depth = 1;
    let j = openTagEnd + 1;
    let sectionEnd = -1;

    while (j < html.length && depth > 0) {
      if (html[j] !== "<") { j++; continue; }

      // 주석 건너뛰기
      if (html.startsWith("<!--", j)) {
        const end = html.indexOf("-->", j);
        j = end >= 0 ? end + 3 : j + 1;
        continue;
      }

      if (html[j + 1] === "/") {
        // 닫는 태그
        const closeMatch = html.slice(j + 2).match(/^([a-zA-Z][a-zA-Z0-9-]*)\s*>/);
        if (closeMatch && closeMatch[1].toLowerCase() === tagName) {
          depth--;
          const end = j + 2 + closeMatch[0].length;
          if (depth === 0) {
            sectionEnd = end;
            break;
          }
          j = end;
          continue;
        }
      } else {
        // 같은 이름의 여는 태그 — depth 증가
        const openMatch = html.slice(j + 1).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
        if (
          openMatch &&
          openMatch[1].toLowerCase() === tagName &&
          !VOID_ELEMENTS.has(tagName)
        ) {
          depth++;
        }
      }

      j++;
    }

    if (sectionEnd >= 0) {
      ranges.push({ start: sectionStart, end: sectionEnd });
      i = sectionEnd;
    } else {
      i++; // 닫는 태그를 못 찾으면 건너뛰기
    }
  }

  return ranges;
}

/** HTML 최상위 섹션 문자열 배열을 반환한다. */
export function splitHtmlSections(html: string): string[] {
  return findHtmlSectionRanges(html).map(({ start, end }) =>
    html.slice(start, end),
  );
}

/**
 * 전체 HTML에서 sectionIndex 번째 최상위 섹션을 newSection으로 교체한 HTML을 반환한다.
 * 범위를 벗어나면 원본 HTML을 그대로 반환한다.
 */
export function replaceSectionInHtml(
  html: string,
  sectionIndex: number,
  newSection: string,
): string {
  const ranges = findHtmlSectionRanges(html);
  if (sectionIndex < 0 || sectionIndex >= ranges.length) {
    return html;
  }
  const { start, end } = ranges[sectionIndex];
  return html.slice(0, start) + newSection + html.slice(end);
}

/**
 * 요소의 여는 태그 이후부터 닫는 태그 직전까지의 내용을 반환한다.
 * `<main>..content..</main>` → `..content..`
 */
function extractElementContent(element: string): string {
  const openEnd = element.indexOf(">");
  const closeStart = element.lastIndexOf("</");
  if (openEnd < 0 || closeStart <= openEnd) return "";
  return element.slice(openEnd + 1, closeStart);
}

/**
 * 요소의 내부 내용을 newContent로 교체한 문자열을 반환한다.
 * `<main>..old..</main>`, `..new..` → `<main>..new..</main>`
 */
function replaceElementContent(element: string, newContent: string): string {
  const openEnd = element.indexOf(">");
  const closeStart = element.lastIndexOf("</");
  if (openEnd < 0 || closeStart <= openEnd) return element;
  return element.slice(0, openEnd + 1) + newContent + element.slice(closeStart);
}

function tagNameAt(html: string, index: number): string | null {
  if (html[index] !== "<") return null;
  const match = html.slice(index + 1).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  return match ? match[1].toLowerCase() : null;
}

function shiftRanges(ranges: SectionRange[], offset: number): SectionRange[] {
  return ranges.map((range) => ({
    start: range.start + offset,
    end: range.end + offset,
  }));
}

/**
 * 편집 화면과 같은 섹션 번호를 만든다.
 * 완전한 문서는 브라우저가 html/head/body를 걷어 내므로 body 안의 태그만 센다.
 * body가 없는 조각 HTML은 맨 바깥 태그를 그대로 센다.
 */
function editableSectionRanges(html: string): SectionRange[] {
  const top = findHtmlSectionRanges(html);
  const htmlSection = top.find((range) => tagNameAt(html, range.start) === "html");
  if (!htmlSection) return top;

  const htmlElement = html.slice(htmlSection.start, htmlSection.end);
  const htmlInner = extractElementContent(htmlElement);
  const htmlInnerStart = htmlSection.start + htmlElement.indexOf(">") + 1;
  const insideHtml = shiftRanges(findHtmlSectionRanges(htmlInner), htmlInnerStart);
  const bodySection = insideHtml.find((range) => tagNameAt(html, range.start) === "body");
  if (!bodySection) return [];

  const bodyElement = html.slice(bodySection.start, bodySection.end);
  const bodyInner = extractElementContent(bodyElement);
  const bodyInnerStart = bodySection.start + bodyElement.indexOf(">") + 1;
  return shiftRanges(findHtmlSectionRanges(bodyInner), bodyInnerStart);
}

/** 조각의 맨 바깥 태그가 하나일 때만 그 이름을 반환한다. */
function singleRootTag(html: string): string | null {
  const ranges = findHtmlSectionRanges(html);
  if (ranges.length !== 1) return null;
  return tagNameAt(html, ranges[0].start);
}

export const GEMINI_TEXT_GENERATOR = Symbol("GEMINI_TEXT_GENERATOR");
export const GEMINI_TIMEOUT_MS = 90_000;
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export const GEMINI_MAX_OUTPUT_TOKENS = 32_768;

export function geminiRequestOptions(timeoutMs: number) {
  return {
    timeout: timeoutMs,
    maxRetries: 0,
  };
}

export function geminiProviderOptions(model: string) {
  const usesGemini3 = /(?:^|\/)gemini-3(?:[.-]|$)/i.test(model);
  return {
    maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    providerOptions: {
      google: {
        thinkingConfig: usesGemini3
          ? { thinkingLevel: "minimal" as const }
          : { thinkingBudget: 0 },
      },
    },
  };
}

export async function textFromGeminiAttempts(
  request: () => Promise<string>,
): Promise<string> {
  const first = await request();
  if (first.trim()) return first;

  const second = await request();
  if (!second.trim()) {
    throw new Error("AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return second;
}

export function logGeminiTokenUsage(usage: LanguageModelUsage) {
  console.log("Gemini 토큰", {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  });
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
  const generation = geminiProviderOptions(input.model);

  try {
    return await textFromGeminiAttempts(async () => {
      const result = await generateText({
        model: google(input.model),
        system: input.system,
        prompt: input.prompt,
        maxOutputTokens: generation.maxOutputTokens,
        providerOptions: generation.providerOptions,
        ...geminiRequestOptions(input.timeoutMs),
      });
      logGeminiTokenUsage(result.usage);
      if (!result.text.trim()) {
        console.warn("Gemini 빈 응답", {
          finishReason: result.finishReason,
          warnings: result.warnings,
        });
      }
      return result.text;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("빈 응답을 반환했습니다")
    ) {
      throw error;
    }
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
    const designPrompt = buildSiteDesignPrompt(input);
    const [kinds, designText] = await Promise.all([
      resolveGenerationInteractionKinds(input, ({ system, prompt }) =>
        this.complete({
          apiKey,
          model,
          system,
          prompt,
          timeoutMs: GEMINI_TIMEOUT_MS,
        }),
      ),
      this.complete({
        apiKey,
        model,
        system: designPrompt.system,
        prompt: designPrompt.user,
        timeoutMs: GEMINI_TIMEOUT_MS,
      }),
    ]);
    const design =
      parseSiteDesignSpec(
        designText,
        input.photos.map((photo) => photo.url),
      ) ?? fallbackSiteDesignSpec(input);
    const { system, user } = buildSiteGenerationPrompt(input, kinds, design);
    try {
      const text = await this.complete({
        apiKey,
        model,
        system,
        prompt: user,
        timeoutMs: GEMINI_TIMEOUT_MS,
      });
      return parseSiteGenerationResponse(text, input.pageCount);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("빈 응답을 반환했습니다")
      ) {
        console.warn("HTML 응답이 비어 디자인 설계서로 페이지를 조립합니다.");
        return buildPagesFromDesign(input, design);
      }
      throw error;
    }
  }

  async editComponent(input: {
    html: string;
    css: string;
    sectionIndex: number;
    innerSectionIndex?: number;
    request: string;
    elementHtml?: string;
    imageUrl?: string;
  }): Promise<{ html: string; css: string }> {
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

    // 화면과 같은 번호로 섹션을 자른다. 없으면 페이지 전체를 보내지 않는다.
    const outerRanges = editableSectionRanges(input.html);
    const outerRange = outerRanges[input.sectionIndex];
    if (!outerRange) {
      throw new Error("수정할 위치를 찾지 못했습니다.");
    }

    const useInner =
      input.innerSectionIndex != null && input.innerSectionIndex >= 0;

    let sectionHtml: string;
    let innerRange: SectionRange | undefined;
    let outerSection: string | undefined;
    let innerContent: string | undefined;

    if (useInner) {
      outerSection = input.html.slice(outerRange.start, outerRange.end);
      innerContent = extractElementContent(outerSection);
      const innerRanges = findHtmlSectionRanges(innerContent);
      innerRange = innerRanges[input.innerSectionIndex!];
      if (!innerRange) {
        throw new Error("수정할 위치를 찾지 못했습니다.");
      }
      sectionHtml = innerContent.slice(innerRange.start, innerRange.end);
    } else {
      sectionHtml = input.html.slice(outerRange.start, outerRange.end);
    }

    const kinds = await resolveInteractionKinds(
      input.request,
      { elementHtml: input.elementHtml, imageUrl: input.imageUrl },
      ({ system, prompt }) =>
        this.complete({
          apiKey,
          model,
          system,
          prompt,
          timeoutMs: GEMINI_TIMEOUT_MS,
        }),
    );
    const rules = interactionRulesFor(kinds);

    const system = `You are a web developer editing a single section of a website page.
Return ONLY a valid JSON object with "html" and "css" keys.
"html" must contain the same section you were given, with only the requested change.
받은 섹션과 같은 맨 바깥 태그를 유지하세요. 다른 요소는 지우지 마세요. 페이지 전체나 html 문서를 만들지 마세요.
"css" must contain the complete updated page CSS.
Do not wrap the section in any extra tags.
Do not include any explanation or markdown code fences.
html 안에 <style>, <script>, onclick 같은 인라인 이벤트 핸들러, javascript: URL을 넣지 마세요.
화면 모양은 css 필드에만 작성하세요.
${INTERACTION_SYSTEM_RULES}
${DESIGN_RULES}`;

    const imageContext = input.imageUrl
      ? `\nA new image has been uploaded and is available at this URL: ${input.imageUrl}\nIf the request involves an image, use this URL as the image src.`
      : "";

    const elementContext = input.elementHtml
      ? `\nThe user clicked on this specific element:\n${input.elementHtml}\n\n그 요소만 요청대로 고치세요. 섹션 안의 다른 요소는 지우지 마세요.`
      : `\n섹션을 요청대로 고치세요. 요청과 관계없는 요소는 지우지 마세요.`;

    const prompt = `Current section HTML to modify:
${sectionHtml}

Current page CSS:
${input.css}
${elementContext}${imageContext}
User's modification request: ${input.request}
${rules ? `\n이 요청에 필요한 동작만 아래 방식으로 구현하세요.\n${rules}\n` : ""}
Return a JSON object like: {"html":"...","css":"..."}
"html" = 받은 섹션 전체. 맨 바깥 태그는 받은 섹션과 같아야 합니다. 다른 요소는 지우지 마세요.
"css" = the complete updated page CSS`;

    const text = await this.complete({
      apiKey,
      model,
      system,
      prompt,
      timeoutMs: GEMINI_TIMEOUT_MS,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(unwrapJsonText(text));
    } catch {
      throw new Error("AI 응답이 올바른 JSON이 아닙니다.");
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).html !== "string" ||
      typeof (parsed as Record<string, unknown>).css !== "string"
    ) {
      throw new Error("AI 응답 형식이 올바르지 않습니다.");
    }

    const result = parsed as { html: string; css: string };

    const safe = sanitizeGeneratedHtml(result.html, result.css);
    result.html = keepAllowedActions(safe.html);
    result.css = safe.css;

    const sentTag = singleRootTag(sectionHtml);
    const receivedTag = singleRootTag(result.html);
    if (!sentTag || sentTag !== receivedTag) {
      throw new Error("AI 응답이 수정 중인 구역과 다릅니다.");
    }

    // 수정된 섹션을 원래 위치에 끼워넣어 전체 HTML 복원
    let updatedHtml: string;

    if (useInner && innerRange && outerSection != null && innerContent != null) {
      const newInnerContent =
        innerContent.slice(0, innerRange.start) +
        result.html +
        innerContent.slice(innerRange.end);
      const newOuterSection = replaceElementContent(outerSection, newInnerContent);
      updatedHtml =
        input.html.slice(0, outerRange.start) +
        newOuterSection +
        input.html.slice(outerRange.end);
    } else {
      updatedHtml =
        input.html.slice(0, outerRange.start) +
        result.html +
        input.html.slice(outerRange.end);
    }

    return { html: updatedHtml, css: result.css };
  }
}
