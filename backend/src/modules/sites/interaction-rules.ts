import { unwrapJsonText } from "./site-generation-response.js";

export const INTERACTION_KIND_ORDER = [
  "tab",
  "dropdown",
  "accordion",
  "mobile-nav",
  "carousel",
  "tooltip",
  "switch",
  "date-select",
] as const;

export type InteractionKind = (typeof INTERACTION_KIND_ORDER)[number];

const KEYWORD_RULES: { kind: InteractionKind; pattern: RegExp }[] = [
  { kind: "tab", pattern: /탭|\btabs?\b/i },
  { kind: "dropdown", pattern: /드롭다운|\bdropdown\b/i },
  { kind: "accordion", pattern: /자주\s*묻는|faq|아코디언|accordion|접기|펼치/i },
  { kind: "mobile-nav", pattern: /햄버거|모바일\s*메뉴|hamburger/i },
  { kind: "carousel", pattern: /사진\s*넘기|캐러셀|carousel|슬라이드|갤러리/i },
  { kind: "tooltip", pattern: /말풍선|툴팁|tooltip/i },
  { kind: "switch", pattern: /스위치|토글|toggle|켜기\s*끄기|켜기\/끄기/i },
  { kind: "date-select", pattern: /날짜\s*선택|달력|datepicker|선택\s*목록|셀렉트/i },
];

const LABEL_TO_KIND: Record<string, InteractionKind> = {
  탭: "tab",
  tab: "tab",
  드롭다운: "dropdown",
  dropdown: "dropdown",
  접기: "accordion",
  accordion: "accordion",
  "모바일 메뉴": "mobile-nav",
  "mobile-nav": "mobile-nav",
  "사진 넘기기": "carousel",
  carousel: "carousel",
  말풍선: "tooltip",
  tooltip: "tooltip",
  스위치: "switch",
  switch: "switch",
  "날짜·선택": "date-select",
  "날짜와 선택": "date-select",
  "date-select": "date-select",
};

const INTERACTION_RULES: Record<InteractionKind, string> = {
  tab: `[탭]
- html 안에 <style>, <script>, onclick 같은 인라인 이벤트 핸들러를 넣지 마세요. 화면 모양은 css 필드에만 작성하세요.
- 탭 그룹마다 radio의 name은 고유해야 합니다. 첫 radio만 checked입니다.
- radio는 패널보다 앞에 있는 형제이고, label의 for는 그 radio의 id와 같습니다.
- 탭이 3개 이상이면 radio, label, 패널, CSS의 nth 규칙을 같은 방식으로 늘리세요.

<div class="crep-tabs">
  <input class="crep-tabs__input" type="radio" name="crep-tabs-1" id="crep-tabs-1-1" checked>
  <input class="crep-tabs__input" type="radio" name="crep-tabs-1" id="crep-tabs-1-2">
  <div class="crep-tabs__bar">
    <label class="crep-tabs__tab" for="crep-tabs-1-1">1번</label>
    <label class="crep-tabs__tab" for="crep-tabs-1-2">2번</label>
  </div>
  <div class="crep-tabs__panels">
    <div class="crep-tabs__panel">1번 화면</div>
    <div class="crep-tabs__panel">2번 화면</div>
  </div>
</div>

.crep-tabs { position: relative; }
.crep-tabs__input { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
.crep-tabs__panel { display: none; }
.crep-tabs__input:nth-of-type(1):checked ~ .crep-tabs__panels .crep-tabs__panel:nth-child(1),
.crep-tabs__input:nth-of-type(2):checked ~ .crep-tabs__panels .crep-tabs__panel:nth-child(2) { display: block; }

- :checked 와 ~ 로 고른 번호의 패널만 보여 줍니다. 1번 탭은 1번 화면, 2번 탭은 2번 화면입니다.`,
  dropdown: `[드롭다운]
- script와 onclick 없이 details와 summary만 사용하세요. summary가 보이는 버튼이고, 누르면 메뉴가 열립니다.
- 패널을 display:none으로 숨기지 마세요. 열고 닫는 것은 브라우저가 처리합니다.

<details class="crep-dropdown">
  <summary>메뉴</summary>
  <div class="crep-dropdown__panel">
    <a href="#services">서비스</a>
    <a href="#contact">문의</a>
  </div>
</details>`,
  accordion: `[접기]
- 자주 묻는 질문, 아코디언, 접기/펼치기는 details와 summary를 사용하세요.
- 항목마다 따로 열고 닫을 수 있습니다.
- 한 번에 하나만 열리게 해 달라면 같은 그룹의 details에 같은 name을 주세요. 그룹마다 name은 고유해야 합니다.

<details class="crep-accordion" name="crep-accordion-1">
  <summary>질문 1</summary>
  <div>답변 1</div>
</details>
<details class="crep-accordion" name="crep-accordion-1">
  <summary>질문 2</summary>
  <div>답변 2</div>
</details>`,
  "mobile-nav": `[모바일 메뉴]
- 햄버거 메뉴, 모바일 메뉴는 checkbox와 label, CSS만 사용하세요.
- 체크박스는 메뉴 패널보다 앞에 있는 형제입니다. label의 for는 체크박스 id와 같고, id는 메뉴마다 고유해야 합니다.

<div class="crep-nav">
  <input class="crep-nav__toggle" type="checkbox" id="crep-nav-toggle">
  <label class="crep-nav__button" for="crep-nav-toggle">메뉴</label>
  <nav class="crep-nav__panel">
    <a href="#services">서비스</a>
  </nav>
</div>

.crep-nav__toggle { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
.crep-nav__panel { display: none; }
.crep-nav__toggle:checked ~ .crep-nav__panel { display: block; }`,
  carousel: `[사진 넘기기]
- 갤러리, 캐러셀, 사진 넘기기는 scroll-snap과 앵커만 사용하세요. 이전/다음은 해당 사진 id로 이동하는 a입니다.
- img src는 입력으로 받은 photoUrls만 사용하세요.

<div class="crep-carousel">
  <a href="#crep-slide-2">다음</a>
  <div class="crep-carousel__track">
    <img id="crep-slide-1" alt="첫 사진">
    <img id="crep-slide-2" alt="둘째 사진">
  </div>
  <a href="#crep-slide-1">이전</a>
</div>

.crep-carousel__track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; }
.crep-carousel__track > * { flex: 0 0 100%; scroll-snap-align: start; }`,
  tooltip: `[말풍선]
- 말풍선, 툴팁은 마우스를 올리거나 키보드 포커스가 있을 때만 보이게 하세요.
- script와 onclick을 쓰지 마세요.

<span class="crep-tip">
  <button type="button" class="crep-tip__trigger">설명</button>
  <span class="crep-tip__bubble" role="tooltip">도움말</span>
</span>

.crep-tip { position: relative; }
.crep-tip__bubble { display: none; position: absolute; }
.crep-tip:hover .crep-tip__bubble,
.crep-tip:focus-within .crep-tip__bubble { display: block; }`,
  switch: `[스위치]
- 켜기/끄기 스위치는 checkbox 하나입니다. 보이는 트랙은 CSS로만 바꿉니다.

<label class="crep-switch">
  <input class="crep-switch__input" type="checkbox">
  <span class="crep-switch__track" aria-hidden="true"></span>
  알림
</label>

.crep-switch__input { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
.crep-switch__track { display: inline-block; width: 44px; height: 24px; border-radius: 999px; background: #ccc; }
.crep-switch__input:checked + .crep-switch__track { background: #111; }`,
  "date-select": `[날짜와 선택]
- 날짜는 input type="date", 항목 고르기는 select를 사용하세요.
- 달력이나 선택 상자를 div와 script로 만들지 마세요.

<label>날짜 <input type="date"></label>
<label>항목
  <select>
    <option>선택</option>
  </select>
</label>`,
};

export function matchInteractionKeywords(request: string): InteractionKind[] {
  return INTERACTION_KIND_ORDER.filter((kind) =>
    KEYWORD_RULES.some(
      (rule) => rule.kind === kind && rule.pattern.test(request),
    ),
  );
}

export function interactionRulesFor(kinds: InteractionKind[]): string {
  return kinds.map((kind) => INTERACTION_RULES[kind]).join("\n\n");
}

export function parseInteractionKinds(raw: string): InteractionKind[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapJsonText(raw));
  } catch {
    return [];
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("종류" in parsed) ||
    !Array.isArray((parsed as { 종류: unknown }).종류)
  ) {
    return [];
  }

  const selected = new Set<InteractionKind>();
  for (const item of (parsed as { 종류: unknown[] }).종류) {
    if (typeof item !== "string") continue;
    const kind = LABEL_TO_KIND[item.trim()];
    if (kind) selected.add(kind);
  }

  return INTERACTION_KIND_ORDER.filter((kind) => selected.has(kind));
}

const CLASSIFIER_SYSTEM = `수정 요청에 필요한 화면 동작만 고르세요.
설명이나 Markdown 없이 JSON 객체만 반환하세요.
형식: {"종류":["탭"]}
허용된 이름: 탭, 드롭다운, 접기, 모바일 메뉴, 사진 넘기기, 말풍선, 스위치, 날짜·선택
해당 없으면 {"종류":[]}
글자, 색, 여백, 문구, 이미지 교체만이면 {"종류":[]}
애매하면 해당할 수 있는 이름을 포함하세요. 허용되지 않은 이름은 넣지 마세요.

예시
- 탭 메뉴 넣어 줘 → {"종류":["탭"]}
- 버튼 색만 바꿔 줘 → {"종류":[]}
- 누르면 아래 화면이 바뀌게 → {"종류":["탭"]}
- 자주 묻는 질문이랑 드롭다운 → {"종류":["드롭다운","접기"]}
- 사진처럼 위 메뉴를 누르면 내용이 바뀌게 → {"종류":["탭"]}
- 제목을 짧게 → {"종류":[]}`;

export async function resolveInteractionKinds(
  request: string,
  context: { elementHtml?: string; imageUrl?: string },
  complete: (input: { system: string; prompt: string }) => Promise<string>,
): Promise<InteractionKind[]> {
  const matched = matchInteractionKeywords(request);
  if (matched.length > 0 || request.trim() === "") {
    return matched;
  }

  const text = await complete({
    system: CLASSIFIER_SYSTEM,
    prompt: `요청: ${request}
클릭한 요소:
${context.elementHtml?.trim() || "없음"}
첨부 사진:
${context.imageUrl?.trim() || "없음"}`,
  });

  return parseInteractionKinds(text);
}
