/**
 * 미리보기에서 우클릭한 요소 하나를 직접 편집하는 순수 로직.
 *
 * - 요소 위치(path)는 "페이지 래퍼 아래에서 형제 순서"를 이어 붙인 배열이다.
 *   예: [1, 0, 2] = 두 번째 섹션의 첫 번째 자식의 세 번째 자식.
 *   완전한 문서는 미리보기와 같이 body 안만 센다. script는 양쪽 모두 세지 않는다.
 * - 원본은 부모 화면이 가진 page.html 이다. iframe 안 DOM은
 *   링크·이미지 주소가 바뀐 복사본이라 값을 거기서 읽지 않는다.
 */

import { previewBodyParts } from "./site-preview";

export type NodeLike = {
  nodeType: number;
  nodeValue: string | null;
};

/** 실제 DOM Element가 그대로 만족하는 최소 모양 (테스트에서는 가짜로 대체) */
export type ElementLike = {
  tagName: string;
  children: ArrayLike<ElementLike>;
  childNodes: ArrayLike<NodeLike>;
  textContent: string | null;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
};

export type EditableKind = "image" | "link" | "text" | "unsupported";

export type EditableElement = {
  tagName: string;
  kind: EditableKind;
  /** null이면 글자는 직접 편집할 수 없다 */
  text: string | null;
  href: string | null;
  src: string | null;
  alt: string | null;
  /** null이면 글자가 없어 크기·색·굵기를 바꾸지 않는다. 빈 문자열은 아직 지정하지 않은 값 */
  fontSize: string | null;
  color: string | null;
  fontWeight: string | null;
  /** 빈 문자열은 배경이 없는 상태(투명) */
  backgroundColor: string | null;
  /** 빈 문자열은 배경 이미지가 없는 상태. 값은 /uploads 또는 http(s) 주소 */
  backgroundImage: string | null;
};

export type ElementEdit = {
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  backgroundColor?: string;
  backgroundImage?: string;
};

export type ElementEditResult = { ok: true } | { ok: false; message: string };

const TEXT_NODE = 3;
const controlOrSpace = /[\u0000-\u0020\u007f-\u009f\\]/;
const allowedLinkSchemes = ["http", "https", "mailto", "tel"];

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** 링크 주소로 쓸 수 있는지. javascript:, data: 등은 거부한다. */
export function isAllowedEditLink(value: string): boolean {
  if (value === "" || controlOrSpace.test(value) || value.startsWith("//")) {
    return false;
  }

  const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) {
    return true;
  }

  const name = scheme[1].toLowerCase();
  if (!allowedLinkSchemes.includes(name)) {
    return false;
  }

  return name === "http" || name === "https" ? isHttpUrl(value) : true;
}

/** 이미지 주소로 쓸 수 있는지. 업로드 경로 또는 http(s)만 허용한다. */
export function isAllowedEditImageSrc(value: string): boolean {
  if (value === "" || controlOrSpace.test(value)) {
    return false;
  }

  if (value.startsWith("/uploads/")) {
    return !value.includes("..");
  }

  return isHttpUrl(value);
}

/** 글자 크기. 빈 문자열은 "아직 지정 안 함". 그 외에는 1~400px 정수만 허용한다. */
export function isAllowedFontSize(value: string): boolean {
  if (value === "") {
    return true;
  }

  const match = /^(\d+)px$/.exec(value);
  if (!match) {
    return false;
  }

  const size = Number(match[1]);
  return size >= 1 && size <= 400;
}

/** 보이는 글자 크기를 px 정수로 맞춘다. rem 등은 맞출 수 없으면 null. */
export function normalizeVisibleFontSize(value: string): string | null {
  const match = /^(\d+(?:\.\d+)?)px$/i.exec(value.trim());
  if (!match) {
    return null;
  }

  const normalized = `${Math.round(Number(match[1]))}px`;
  return isAllowedFontSize(normalized) && normalized !== "0px" ? normalized : null;
}

/** 글자 굵기. 빈 문자열은 "아직 지정 안 함". 그 외에는 100~900, 100 단위만 허용한다. */
export function isAllowedFontWeight(value: string): boolean {
  return value === "" || /^(100|200|300|400|500|600|700|800|900)$/.test(value);
}

/** bold, 700, 450 같은 값을 100 단위 굵기로 맞춘다. */
export function normalizeFontWeight(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "normal") {
    return "400";
  }
  if (trimmed === "bold") {
    return "700";
  }
  if (isAllowedFontWeight(trimmed) && trimmed !== "") {
    return trimmed;
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const snapped = Math.min(900, Math.max(100, Math.round(numeric / 100) * 100));
  const normalized = String(snapped);
  return isAllowedFontWeight(normalized) ? normalized : null;
}

/** 글자 색. 빈 문자열은 "아직 지정 안 함". 그 외에는 #112233 형식만 허용한다. */
export function isAllowedTextColor(value: string): boolean {
  return value === "" || /^#[0-9a-fA-F]{6}$/.test(value);
}

/** #abc, #aabbcc, rgb()를 #aabbcc로 맞춘다. 맞출 수 없으면 null. */
export function normalizeTextColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(trimmed);
  if (hex) {
    const body = hex[1];
    return body.length === 3
      ? `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`
      : `#${body}`;
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(trimmed);
  if (!rgb) {
    return null;
  }

  const channels = [rgb[1], rgb[2], rgb[3]].map(Number);
  if (channels.some((channel) => channel > 255)) {
    return null;
  }

  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** 배경색. 투명은 빈 문자열. 맞출 수 없는 값은 null. */
export function normalizeBackgroundColor(value: string): string | null {
  const compact = value.trim().toLowerCase().replace(/\s+/g, "");
  if (compact === "" || compact === "transparent" || compact === "rgba(0,0,0,0)") {
    return "";
  }
  if (/\/0\)$/.test(compact)) {
    return "";
  }

  return normalizeTextColor(value);
}

const unsafeCssUrl = /["'();\s\\]/;

/** 배경 이미지 주소. 빈 문자열은 "이미지 없음". url() 밖으로 새는 문자는 거부한다. */
export function isAllowedBackgroundImage(value: string): boolean {
  return value === "" || (isAllowedEditImageSrc(value) && !unsafeCssUrl.test(value));
}

/** background-image의 url()이나 이미지 주소에서 저장할 주소만 꺼낸다. 없으면 null, none이면 빈 문자열. */
export function normalizeBackgroundImage(value: string, assetOrigin = ""): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || /^none$/i.test(trimmed)) {
    return "";
  }

  const match = /url\(\s*(["']?)([^"')]+)\1\s*\)/i.exec(trimmed);
  if (!match && /url\(/i.test(trimmed)) {
    return null;
  }

  let url = match ? match[2] : trimmed;
  const origin = assetOrigin.replace(/\/$/, "");
  if (origin !== "" && url.startsWith(`${origin}/uploads/`)) {
    url = url.slice(origin.length);
  }

  return isAllowedBackgroundImage(url) ? url : null;
}

function backgroundImageCss(url: string): string {
  return `url("${url}")`;
}

function splitStyle(style: string): Array<{ prop: string; value: string }> {
  const parts: Array<{ prop: string; value: string }> = [];
  for (const chunk of style.split(";")) {
    const index = chunk.indexOf(":");
    if (index <= 0) {
      continue;
    }

    const prop = chunk.slice(0, index).trim().toLowerCase();
    const value = chunk.slice(index + 1).trim();
    if (prop !== "" && value !== "") {
      parts.push({ prop, value });
    }
  }
  return parts;
}

function readStyleProp(style: string, prop: string): string | null {
  return splitStyle(style).find((item) => item.prop === prop)?.value ?? null;
}

function writeStyleProp(element: ElementLike, prop: string, value: string): void {
  const next = splitStyle(element.getAttribute("style") ?? "").filter(
    (item) => item.prop !== prop,
  );
  if (value !== "") {
    next.push({ prop, value });
  }

  if (next.length === 0) {
    element.removeAttribute("style");
    return;
  }

  element.setAttribute(
    "style",
    next.map((item) => `${item.prop}: ${item.value}`).join("; "),
  );
}

function textLook(
  element: ElementLike,
  hasText: boolean,
): { fontSize: string | null; color: string | null; fontWeight: string | null } {
  if (!hasText) {
    return { fontSize: null, color: null, fontWeight: null };
  }

  const style = element.getAttribute("style") ?? "";
  const size = readStyleProp(style, "font-size");
  const color = readStyleProp(style, "color");
  const weight = readStyleProp(style, "font-weight");

  return {
    fontSize: size === null ? "" : (normalizeVisibleFontSize(size) ?? ""),
    color: color === null ? "" : (normalizeTextColor(color) ?? ""),
    fontWeight: weight === null ? "" : (normalizeFontWeight(weight) ?? ""),
  };
}

function readBackground(element: ElementLike): string {
  const value = readStyleProp(element.getAttribute("style") ?? "", "background-color");
  if (value === null) {
    return "";
  }

  return normalizeBackgroundColor(value) ?? "";
}

/** 자식 태그가 img 하나뿐이면 그 사진이 이 칸의 배경이다. */
function soleChildImage(element: ElementLike): ElementLike | null {
  const children = elementChildren(element);
  if (children.length === 1 && children[0].tagName.toLowerCase() === "img") {
    return children[0];
  }

  return null;
}

function cssBackgroundImage(element: ElementLike): string {
  const style = element.getAttribute("style") ?? "";
  const image = readStyleProp(style, "background-image");
  if (image !== null) {
    return normalizeBackgroundImage(image) ?? "";
  }

  // background: url(...) center / cover 처럼 한 줄로 적힌 경우
  const shorthand = readStyleProp(style, "background");
  if (shorthand === null) {
    return "";
  }

  return normalizeBackgroundImage(shorthand) ?? "";
}

function readBackgroundImage(element: ElementLike): string {
  const fromCss = cssBackgroundImage(element);
  if (fromCss !== "") {
    return fromCss;
  }

  const picture = soleChildImage(element);
  if (!picture) {
    return "";
  }

  return normalizeBackgroundImage(picture.getAttribute("src") ?? "") ?? "";
}

/** 우클릭 때 사이드바 시작값. CSS로만 지정된 크기·색·굵기·배경도 화면에 보이는 값으로 채운다. */
export function visibleTextStyle(
  element: EditableElement,
  seen: {
    fontSize?: unknown;
    color?: unknown;
    fontWeight?: unknown;
    backgroundColor?: unknown;
    backgroundImage?: unknown;
  },
): EditableElement {
  const backgroundColor =
    typeof seen.backgroundColor === "string"
      ? normalizeBackgroundColor(seen.backgroundColor)
      : null;
  const backgroundImage =
    typeof seen.backgroundImage === "string" &&
    seen.backgroundImage !== "" &&
    isAllowedBackgroundImage(seen.backgroundImage)
      ? seen.backgroundImage
      : null;
  const withBackground = {
    ...element,
    backgroundColor: backgroundColor ?? element.backgroundColor,
    backgroundImage: backgroundImage ?? element.backgroundImage,
  };

  if (element.text === null) {
    return withBackground;
  }

  const fontSize =
    typeof seen.fontSize === "string" ? normalizeVisibleFontSize(seen.fontSize) : null;
  const color = typeof seen.color === "string" ? normalizeTextColor(seen.color) : null;
  const fontWeight =
    typeof seen.fontWeight === "string" ? normalizeFontWeight(seen.fontWeight) : null;

  return {
    ...withBackground,
    fontSize: fontSize ?? element.fontSize,
    color: color ?? element.color,
    fontWeight: fontWeight ?? element.fontWeight,
  };
}

function elementChildren(element: ElementLike): ElementLike[] {
  return Array.from(element.children).filter(
    (child) => child.tagName.toLowerCase() !== "script",
  );
}

export function findElementByPath(
  root: ElementLike,
  path: number[],
): ElementLike | null {
  if (path.length === 0) {
    return null;
  }

  let current: ElementLike = root;
  for (const index of path) {
    if (!Number.isInteger(index) || index < 0) {
      return null;
    }

    const next = elementChildren(current)[index];
    if (!next) {
      return null;
    }
    current = next;
  }

  return current;
}

type TextTarget =
  | { whole: true }
  | { whole: false; node: NodeLike }
  | { breaks: true };

function tagNameOf(node: NodeLike): string {
  const tag = (node as { tagName?: string }).tagName;
  return typeof tag === "string" ? tag.toLowerCase() : "";
}

/** 자식 태그가 br뿐이면 줄바꿈 글자다. 아이콘이나 span이 있으면 아니다. */
function isBreakOnly(element: ElementLike): boolean {
  const children = elementChildren(element);
  return (
    children.length > 0 &&
    children.every((child) => child.tagName.toLowerCase() === "br")
  );
}

/**
 * 글자를 바꿀 자리를 찾는다.
 * - 자식 태그가 없으면 요소 전체 글자
 * - 자식이 br뿐이면 줄을 나눈 글자
 * - 그 외에는 글자 조각이 딱 하나일 때만 그 조각 (아이콘 등을 지키기 위해)
 */
function findTextTarget(element: ElementLike): TextTarget | null {
  if (elementChildren(element).length === 0) {
    return { whole: true };
  }

  if (isBreakOnly(element)) {
    return { breaks: true };
  }

  const pieces = Array.from(element.childNodes).filter(
    (node) => node.nodeType === TEXT_NODE && (node.nodeValue ?? "").trim() !== "",
  );

  return pieces.length === 1 ? { whole: false, node: pieces[0] } : null;
}

/** br마다 줄을 나누고, 줄 끝의 공백은 뺀다. */
function readBreakText(element: ElementLike): string {
  const lines = [""];
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === TEXT_NODE) {
      lines[lines.length - 1] += node.nodeValue ?? "";
    } else if (tagNameOf(node) === "br") {
      lines.push("");
    }
  }

  return lines.map((line) => line.trim()).join("\n");
}

function writeBreakLines(element: ElementLike, text: string): void {
  const lines = text.split("\n");
  const dom = element as Element;
  if (typeof dom.replaceChildren === "function" && dom.ownerDocument) {
    const nodes: Node[] = [];
    lines.forEach((line, index) => {
      if (index > 0) nodes.push(dom.ownerDocument.createElement("br"));
      nodes.push(dom.ownerDocument.createTextNode(line));
    });
    dom.replaceChildren(...nodes);
    return;
  }

  const nodes: NodeLike[] = [];
  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push({ nodeType: 1, nodeValue: null, tagName: "br" } as NodeLike);
    }
    nodes.push({ nodeType: TEXT_NODE, nodeValue: line });
  });
  (element as { childNodes: NodeLike[] }).childNodes = nodes;
}

function readText(target: TextTarget | null, element: ElementLike): string | null {
  if (!target) {
    return null;
  }

  if ("breaks" in target) {
    return readBreakText(element);
  }

  return target.whole ? (element.textContent ?? "") : (target.node.nodeValue ?? "");
}

export function readEditableElement(
  root: ElementLike,
  path: number[],
): EditableElement | null {
  const element = findElementByPath(root, path);
  if (!element) {
    return null;
  }

  const tagName = element.tagName.toLowerCase();

  if (tagName === "img") {
    return {
      tagName,
      kind: "image",
      text: null,
      href: null,
      src: element.getAttribute("src") ?? "",
      alt: element.getAttribute("alt") ?? "",
      fontSize: null,
      color: null,
      fontWeight: null,
      backgroundColor: readBackground(element),
      backgroundImage: readBackgroundImage(element),
    };
  }

  const text = readText(findTextTarget(element), element);
  const look = textLook(element, text !== null);

  if (tagName === "a") {
    return {
      tagName,
      kind: "link",
      text,
      href: element.getAttribute("href") ?? "",
      src: null,
      alt: null,
      ...look,
      backgroundColor: readBackground(element),
      backgroundImage: readBackgroundImage(element),
    };
  }

  return {
    tagName,
    kind: text === null ? "unsupported" : "text",
    text,
    href: null,
    src: null,
    alt: null,
    ...look,
    backgroundColor: readBackground(element),
    backgroundImage: readBackgroundImage(element),
  };
}

const editKeys = [
  "text",
  "href",
  "src",
  "alt",
  "fontSize",
  "color",
  "fontWeight",
  "backgroundColor",
  "backgroundImage",
] as const;

/** 읽은 요소의 편집 가능한 값을 그대로 ElementEdit으로 만든다. (초안 시작값, 되돌리기용) */
export function elementEditOf(element: EditableElement): ElementEdit {
  const edit: ElementEdit = {};
  for (const key of editKeys) {
    const value = element[key];
    if (typeof value === "string") {
      edit[key] = value;
    }
  }
  return edit;
}

/** 초안에서 원래 값과 달라진 항목만 돌려준다. */
export function diffElementEdit(
  original: EditableElement,
  draft: ElementEdit,
): ElementEdit {
  const changed: ElementEdit = {};
  for (const key of editKeys) {
    const value = draft[key];
    if (value !== undefined && value !== original[key]) {
      changed[key] = value;
    }
  }
  return changed;
}

/** 검사를 모두 통과한 뒤에만 요소를 바꾼다. 하나라도 거부되면 아무것도 바꾸지 않는다. */
export function applyElementEdit(
  root: ElementLike,
  path: number[],
  edit: ElementEdit,
): ElementEditResult {
  const element = findElementByPath(root, path);
  if (!element) {
    return { ok: false, message: "수정할 요소를 찾지 못했습니다." };
  }

  const tagName = element.tagName.toLowerCase();
  const textTarget = findTextTarget(element);

  if (edit.text !== undefined && (tagName === "img" || !textTarget)) {
    return { ok: false, message: "이 요소의 글자는 직접 편집할 수 없습니다. AI로 수정해 주세요." };
  }

  if (edit.fontSize !== undefined || edit.color !== undefined || edit.fontWeight !== undefined) {
    if (tagName === "img" || !textTarget) {
      return { ok: false, message: "글자가 있는 요소만 크기, 색, 굵기를 바꿀 수 있습니다." };
    }
    if (edit.fontSize !== undefined && !isAllowedFontSize(edit.fontSize)) {
      return { ok: false, message: "글자 크기는 1~400px로 입력해 주세요." };
    }
    if (edit.color !== undefined && !isAllowedTextColor(edit.color)) {
      return { ok: false, message: "글자 색은 #112233 형식으로 입력해 주세요." };
    }
    if (edit.fontWeight !== undefined && !isAllowedFontWeight(edit.fontWeight)) {
      return { ok: false, message: "글자 굵기는 100부터 900까지 100 단위로 고를 수 있습니다." };
    }
  }

  if (edit.backgroundColor !== undefined && !isAllowedTextColor(edit.backgroundColor)) {
    return { ok: false, message: "배경색은 #112233 형식으로 입력해 주세요." };
  }

  if (edit.backgroundImage !== undefined && !isAllowedBackgroundImage(edit.backgroundImage)) {
    return { ok: false, message: "배경 이미지는 업로드한 사진이나 http, https 주소만 사용할 수 있습니다." };
  }

  if (edit.href !== undefined) {
    if (tagName !== "a") {
      return { ok: false, message: "링크는 a 요소에서만 바꿀 수 있습니다." };
    }
    if (!isAllowedEditLink(edit.href)) {
      return {
        ok: false,
        message: "http, https, mailto, tel, #앵커, 사이트 안 페이지 주소만 사용할 수 있습니다.",
      };
    }
  }

  if (edit.src !== undefined || edit.alt !== undefined) {
    if (tagName !== "img") {
      return { ok: false, message: "이미지 항목은 img 요소에서만 바꿀 수 있습니다." };
    }
    if (edit.src !== undefined && !isAllowedEditImageSrc(edit.src)) {
      return { ok: false, message: "올바른 이미지 주소가 아닙니다." };
    }
  }

  if (edit.text !== undefined && textTarget) {
    // 엔터는 화면의 <br>이 되어야 하고, 엔터를 지우면 <br>도 빠져야 한다.
    // textContent에 넣으면 줄바꿈이 공백으로 접혀 보이지 않는다.
    if ("breaks" in textTarget || textTarget.whole) {
      writeBreakLines(element, edit.text);
    } else {
      textTarget.node.nodeValue = edit.text;
    }
  }

  if (edit.href !== undefined) {
    element.setAttribute("href", edit.href);
  }

  if (edit.src !== undefined) {
    element.setAttribute("src", edit.src);
    // srcset이 남아 있으면 브라우저가 새 src 대신 옛 이미지를 고른다.
    element.removeAttribute("srcset");
  }

  if (edit.alt !== undefined) {
    element.setAttribute("alt", edit.alt);
  }

  if (edit.fontSize !== undefined) {
    writeStyleProp(element, "font-size", edit.fontSize);
  }

  if (edit.color !== undefined) {
    writeStyleProp(element, "color", edit.color);
  }

  if (edit.fontWeight !== undefined) {
    writeStyleProp(element, "font-weight", edit.fontWeight);
  }

  if (edit.backgroundColor !== undefined) {
    writeStyleProp(element, "background-color", edit.backgroundColor);
  }

  if (edit.backgroundImage !== undefined) {
    const picture = soleChildImage(element);
    if (picture && cssBackgroundImage(element) === "") {
      picture.setAttribute("src", edit.backgroundImage);
      picture.removeAttribute("srcset");
      writeStyleProp(picture, "display", edit.backgroundImage === "" ? "none" : "");
    } else {
      writeStyleProp(
        element,
        "background-image",
        edit.backgroundImage === "" ? "" : backgroundImageCss(edit.backgroundImage),
      );
      writeStyleProp(element, "background-size", edit.backgroundImage === "" ? "" : "cover");
      writeStyleProp(element, "background-position", edit.backgroundImage === "" ? "" : "center");
    }
  }

  return { ok: true };
}

/**
 * page.html을 미리보기와 같은 범위로 파싱한다. 브라우저 전용.
 * 완전한 문서는 body 안만 래퍼에 넣어, 우클릭 번호가 head의 meta·title 때문에 밀리지 않게 한다.
 */
function parsePageRoot(html: string): {
  root: Element;
  before: string;
  after: string;
} | null {
  const parts = previewBodyParts(html);
  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body><div>${parts.inner}</div></body></html>`,
    "text/html",
  );
  const root = doc.body.firstElementChild;
  if (!root) return null;

  return { root, before: parts.before, after: parts.after };
}

export function readEditableFromHtml(
  html: string,
  path: number[],
): EditableElement | null {
  const parsed = parsePageRoot(html);

  return parsed ? readEditableElement(parsed.root, path) : null;
}

export type EditHtmlResult =
  | { ok: true; html: string }
  | { ok: false; message: string };

export function editHtmlElement(
  html: string,
  path: number[],
  edit: ElementEdit,
): EditHtmlResult {
  const parsed = parsePageRoot(html);
  if (!parsed) {
    return { ok: false, message: "페이지를 읽지 못했습니다." };
  }

  const result = applyElementEdit(parsed.root, path, edit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    html: parsed.before + parsed.root.innerHTML + parsed.after,
  };
}
