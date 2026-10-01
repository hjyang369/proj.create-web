export type FieldFormatKind =
  | "phone"
  | "email"
  | "url"
  | "referenceUrl"
  | "pageCount";

export type FieldFormat = {
  valid: boolean;
  message: string | null;
  hint: string;
};

const hints = {
  phone: "숫자와 하이픈으로 입력해 주세요. 예: 010-1234-5678",
  email: "영문 이메일로 입력해 주세요. 예: contact@company.com",
  url: "https:// 로 시작하는 주소를 입력해 주세요.",
  referenceUrl: "https:// 로 시작하는 공개 웹사이트 주소를 입력해 주세요.",
  pageCount: "숫자만 입력해 주세요. 예: 5",
} as const;

const messages = {
  phone: "010-1234-5678 형식으로 입력해 주세요.",
  email: "영문 이메일로 입력해 주세요. 예: contact@company.com",
  url: "https:// 로 시작하는 주소를 입력해 주세요.",
  referenceUrl: "https:// 로 시작하는 주소를 입력해 주세요.",
  pageCount: "숫자만 입력해 주세요. 예: 5",
} as const;

const blockedReferenceMessage =
  "이 주소는 참고 사이트로 사용할 수 없습니다. 공개 웹사이트 주소만 입력해 주세요.";

const patterns = {
  phone: /^(0\d{1,2}-\d{3,4}-\d{4}|1\d{3}-\d{4})$/,
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  pageCount: /^\d+$/,
} as const;

const hostPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const dangerousScheme = /^(javascript|data|file|vbscript|blob):/i;
const ipv4Pattern = /(?:^|\.)((?:\d{1,3}\.){3}\d{1,3})(?:\.|$)/;
const blockedMetadataHosts = new Set([
  "metadata.google.internal",
  "metadata.google.com",
  "metadata",
]);

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n > 255)) {
    return false;
  }

  const [a, b] = parts;

  if (a === 0 || a === 10 || a === 127) {
    return true;
  }

  if (a === 169 && b === 254) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }

  return false;
}

function isBlockedFetchHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "localhost.localdomain"
  ) {
    return true;
  }

  if (host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  if (blockedMetadataHosts.has(host)) {
    return true;
  }

  if (host === "::1" || host === "0:0:0:0:0:0:0:1" || host.startsWith("fe80:")) {
    return true;
  }

  const embeddedIp = host.match(ipv4Pattern)?.[1];

  return embeddedIp !== undefined && isBlockedIpv4(embeddedIp);
}

function isWebsiteUrl(value: string): boolean {
  const url = parseHttpUrl(value);

  return url !== null && hostPattern.test(url.hostname);
}

function isReferenceWebsiteUrl(value: string): boolean {
  const url = parseHttpUrl(value);

  return (
    url !== null &&
    hostPattern.test(url.hostname) &&
    !isBlockedFetchHost(url.hostname)
  );
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type SafeExternalLink = {
  href: string;
  label: string;
  target: "_blank";
  rel: "noopener noreferrer";
};

/** 피싱·악성 URL 검사는 나중에 TODO.md Phase 5 Safe Browsing 항목에서 붙인다. */
export function describeSafeExternalLink(
  value: string,
): SafeExternalLink | null {
  const trimmed = value.trim();

  if (dangerousScheme.test(trimmed) || !isWebsiteUrl(trimmed)) {
    return null;
  }

  return {
    href: trimmed,
    label: trimmed,
    target: "_blank",
    rel: "noopener noreferrer",
  };
}

/**
 * 참고 사이트는 나중에 서버가 직접 들어가 읽는다.
 * DNS 재확인·리다이렉트·평판 검사는 TODO.md Phase 5 참고 사이트 fetch 항목.
 */
export function describeSafeReferenceLink(
  value: string,
): SafeExternalLink | null {
  const trimmed = value.trim();

  if (dangerousScheme.test(trimmed) || !isReferenceWebsiteUrl(trimmed)) {
    return null;
  }

  return {
    href: trimmed,
    label: trimmed,
    target: "_blank",
    rel: "noopener noreferrer",
  };
}

export function describeFieldFormat(
  kind: FieldFormatKind,
  value: string,
): FieldFormat {
  const trimmed = value.trim();

  if (trimmed === "") {
    return {
      valid: true,
      message: null,
      hint: hints[kind],
    };
  }

  if (kind === "url" || kind === "referenceUrl") {
    if (dangerousScheme.test(trimmed)) {
      return {
        valid: false,
        message: "http 또는 https 주소만 사용할 수 있습니다.",
        hint: hints[kind],
      };
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      return {
        valid: false,
        message: messages[kind],
        hint: hints[kind],
      };
    }

    const url = parseHttpUrl(trimmed);

    if (kind === "referenceUrl" && url && isBlockedFetchHost(url.hostname)) {
      return {
        valid: false,
        message: blockedReferenceMessage,
        hint: hints[kind],
      };
    }

    const valid =
      kind === "referenceUrl"
        ? isReferenceWebsiteUrl(trimmed)
        : isWebsiteUrl(trimmed);

    return {
      valid,
      message: valid
        ? null
        : "올바른 사이트 주소를 입력해 주세요. 예: https://example.com",
      hint: hints[kind],
    };
  }

  const valid = patterns[kind].test(trimmed);

  return {
    valid,
    message: valid ? null : messages[kind],
    hint: hints[kind],
  };
}

export function keepEmailChars(value: string): string {
  return value.replace(/[^A-Za-z0-9@._%+-]/g, "");
}

export function keepDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatKindForLink(
  name:
    | "blogLink"
    | "websiteLink"
    | "instagramLink"
    | "youtubeLink"
    | "referenceLink",
): FieldFormatKind {
  if (name === "referenceLink") {
    return "referenceUrl";
  }

  return "url";
}
