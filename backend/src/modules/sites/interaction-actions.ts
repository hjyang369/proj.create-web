/** 프론트 `site-interactions.ts`의 동작 이름과 같아야 한다. */
export const SITE_ACTIONS = [
  "tabs.select",
  "carousel.next",
  "carousel.prev",
  "clipboard.copy",
  "video.play",
] as const;

const ALLOWED_ACTIONS = new Set<string>(SITE_ACTIONS);

export const INTERACTION_SYSTEM_RULES = `[동작]
JavaScript를 생성하지 마세요.
<script>, onclick, onerror, onload, javascript: URL을 넣지 마세요.
data-action은 이 요청에 붙은 동작 예시에 있는 이름만 사용하세요.
버튼은 type="button"으로 두세요. 화면 모양은 css에만 작성하세요.`;

export function keepAllowedActions(html: string): string {
  return html.replace(
    /\sdata-action\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
    (
      full,
      doubleQuoted: string | undefined,
      singleQuoted: string | undefined,
      bare: string | undefined,
    ) => {
      const value = (doubleQuoted ?? singleQuoted ?? bare ?? "").trim();
      return ALLOWED_ACTIONS.has(value) ? full : "";
    },
  );
}
