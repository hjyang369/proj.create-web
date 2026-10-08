import { unwrapJsonText } from "./site-generation-response.js";
import type { CreateSiteRecord } from "./sites.store.js";

export const INTERACTION_KIND_ORDER = [
  "tab",
  "dropdown",
  "accordion",
  "mobile-nav",
  "carousel",
  "tooltip",
  "switch",
  "date-select",
  "modal",
  "video",
  "clipboard",
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
  { kind: "modal", pattern: /모달|팝업|\bmodal\b/i },
  { kind: "video", pattern: /영상\s*재생|비디오|\bvideo\b/i },
  { kind: "clipboard", pattern: /복사|클립보드|\bclipboard\b/i },
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
  모달: "modal",
  modal: "modal",
  영상: "video",
  video: "video",
  복사: "clipboard",
  clipboard: "clipboard",
};

const INTERACTION_RULES: Record<InteractionKind, string> = {
  tab: `[탭]
- JavaScript, <script>, onclick을 쓰지 마세요. 화면 모양은 css에만 작성하세요.
- 탭 전환은 data-action="tabs.select"만 사용하세요.
- 묶음은 data-tabs입니다. 각 화면은 data-tab-panel과 고유 id입니다.
- 처음 보이는 화면만 hidden이 없고, 나머지는 hidden입니다.

<div data-tabs>
  <button type="button" data-action="tabs.select" data-target="crep-tab-1-intro" aria-selected="true">소개</button>
  <button type="button" data-action="tabs.select" data-target="crep-tab-1-price" aria-selected="false">가격</button>
  <section id="crep-tab-1-intro" data-tab-panel>소개 내용</section>
  <section id="crep-tab-1-price" data-tab-panel hidden>가격 내용</section>
</div>`,
  dropdown: `[드롭다운]
- details와 summary만 사용하세요. script, onclick, data-action은 쓰지 마세요.
- 내용은 grid-template-rows가 0fr에서 1fr로 0.3초 동안 열리게 하세요.

<details class="crep-dropdown">
  <summary>메뉴</summary>
  <div class="crep-dropdown__body"><div>
    <a href="#services">서비스</a>
  </div></div>
</details>
.crep-dropdown__body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
.crep-dropdown[open] .crep-dropdown__body { grid-template-rows: 1fr; }
.crep-dropdown__body > div { overflow: hidden; }`,
  accordion: `[접기]
- 자주 묻는 질문, 아코디언, 접기/펼치기는 details와 summary를 사용하세요.
- 같은 그룹은 같은 name을 주세요. 하나를 열면 나머지가 닫힙니다.
- script, onclick, data-action은 쓰지 마세요.
- 답은 grid-template-rows가 0fr에서 1fr로 0.3초 동안 열리게 하세요.

<details class="crep-accordion" name="crep-accordion-1">
  <summary>질문 1</summary>
  <div class="crep-accordion__body"><div>답변 1</div></div>
</details>
<details class="crep-accordion" name="crep-accordion-1">
  <summary>질문 2</summary>
  <div class="crep-accordion__body"><div>답변 2</div></div>
</details>
.crep-accordion__body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
.crep-accordion[open] .crep-accordion__body { grid-template-rows: 1fr; }
.crep-accordion__body > div { overflow: hidden; }`,
  "mobile-nav": `[모바일 메뉴]
- 햄버거 메뉴는 화면 밖에 숨긴 checkbox와 label만 사용하세요.
- script, onclick, data-action은 쓰지 마세요.
- 메뉴는 grid-template-rows가 0fr에서 1fr로 0.3초 동안 열리게 하세요.
- checkbox id는 메뉴마다 고유해야 하고, label의 for와 같습니다.

<div class="crep-nav">
  <input class="crep-nav__toggle" type="checkbox" id="crep-nav-toggle">
  <label class="crep-nav__button" for="crep-nav-toggle">메뉴</label>
  <nav class="crep-nav__panel"><div>
    <a href="#services">서비스</a>
  </div></nav>
</div>
.crep-nav__toggle { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
.crep-nav__panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
.crep-nav__panel > div { overflow: hidden; }
.crep-nav__toggle:checked ~ .crep-nav__panel { grid-template-rows: 1fr; }`,
  carousel: `[사진 넘기기]
- 이전/다음은 data-action="carousel.prev"와 data-action="carousel.next"만 사용하세요.
- data-target은 data-carousel 요소의 id입니다.
- 각 사진은 data-carousel-slide입니다. 첫 장만 보이고 나머지는 hidden입니다.
- img src는 입력으로 받은 photoUrls만 사용하세요.

<div id="crep-gallery-1" data-carousel>
  <button type="button" data-action="carousel.prev" data-target="crep-gallery-1">이전</button>
  <div>
    <img data-carousel-slide alt="첫 사진">
    <img data-carousel-slide alt="둘째 사진" hidden>
  </div>
  <button type="button" data-action="carousel.next" data-target="crep-gallery-1">다음</button>
</div>`,
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
  modal: `[모달]
- popovertarget과 popover만 사용하세요. script, onclick, data-action은 쓰지 마세요.
- 바깥을 누르면 닫힙니다. 닫기 버튼은 popovertargetaction="hide"입니다.
- 열릴 때 투명도가 0에서 1로 바뀌게 하세요.

<button type="button" popovertarget="crep-modal-1">상세보기</button>
<div id="crep-modal-1" popover>
  <button type="button" popovertarget="crep-modal-1" popovertargetaction="hide">닫기</button>
  <p>상세 내용</p>
</div>
[popover] { opacity: 0; transform: translateY(8px); transition: opacity 0.2s ease, transform 0.2s ease, display 0.2s allow-discrete, overlay 0.2s allow-discrete; }
[popover]:popover-open { opacity: 1; transform: none; }
@starting-style { [popover]:popover-open { opacity: 0; transform: translateY(8px); } }`,
  video: `[영상]
- data-action="video.play"만 사용하세요. script로 재생하지 마세요.

<button type="button" data-action="video.play" data-target="crep-video-1">재생</button>
<video id="crep-video-1" controls></video>`,
  clipboard: `[복사]
- data-action="clipboard.copy"만 사용하세요. script로 복사하지 마세요.
- data-value에 복사할 글자를 넣으세요.

<button type="button" data-action="clipboard.copy" data-value="hello@example.com">복사</button>`,
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
허용된 이름: 탭, 드롭다운, 접기, 모바일 메뉴, 사진 넘기기, 말풍선, 스위치, 날짜·선택, 모달, 영상, 복사
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

const PURPOSE_LABELS: Record<CreateSiteRecord["purpose"], string> = {
  company_intro: "회사소개용",
  investment: "투자·IR용",
  sales: "고객 영업용",
  recruitment: "채용 브랜딩용",
  promotion: "서비스 홍보용",
  inquiry: "문의·상담 전환용",
};

const PAGE_COMPONENT_LABELS: Record<string, string> = {
  about: "회사소개",
  service: "서비스소개",
  contact: "문의",
  faq: "FAQ",
  location: "찾아오는 길",
  board: "게시판",
  auth: "로그인·회원가입",
  review: "리뷰",
};

const GENERATION_CLASSIFIER_SYSTEM = `사이트 입력에 필요한 화면 동작만 고르세요.
설명이나 Markdown 없이 JSON 객체만 반환하세요.
형식: {"종류":["탭"]}
허용된 이름: 탭, 드롭다운, 접기, 사진 넘기기, 말풍선, 스위치, 날짜·선택, 모달, 영상, 복사
모바일 메뉴와 구역 이동은 모든 사이트에 이미 있으므로 넣지 마세요.
일반 섹션을 쌓으면 되면 {"종류":[]}
입력에 그 동작이 분명할 때만 고르세요.
추가 요청에 적힌 동작은 빠뜨리지 마세요.
허용되지 않은 이름은 넣지 마세요.

예시
- 소개, 가격, 후기를 한자리에서 바꿔 보여 주세요 → {"종류":["탭"]}
- 좋은 커피를 소개하는 사이트 → {"종류":[]}
- 자주 묻는 질문을 넣어 주세요 → {"종류":["접기"]}
- 상세 내용은 팝업으로 → {"종류":["모달"]}
- 이메일 복사 버튼 → {"종류":["복사"]}`;

function generationInteractionPrompt(input: CreateSiteRecord): string {
  const lines = [
    `회사명: ${input.name}`,
    `한 줄 소개: ${input.oneLineIntro}`,
    `목적: ${PURPOSE_LABELS[input.purpose]}`,
  ];
  if (input.businessType?.trim()) lines.push(`업종: ${input.businessType.trim()}`);
  if (input.description?.trim()) lines.push(`설명: ${input.description.trim()}`);
  if (input.targetCustomer?.trim()) {
    lines.push(`대상 고객: ${input.targetCustomer.trim()}`);
  }
  if (input.extraRequest?.trim()) {
    lines.push(`추가 요청: ${input.extraRequest.trim()}`);
  }
  if (input.pageComponents && input.pageComponents.length > 0) {
    const labels = input.pageComponents.map(
      (component) => PAGE_COMPONENT_LABELS[component] ?? component,
    );
    lines.push(`페이지 구성: ${labels.join(", ")}`);
  }
  lines.push(`사진 수: ${input.photos.length}`);
  return lines.join("\n");
}

export async function resolveGenerationInteractionKinds(
  input: CreateSiteRecord,
  complete: (input: { system: string; prompt: string }) => Promise<string>,
): Promise<InteractionKind[]> {
  const prompt = generationInteractionPrompt(input);
  const selected = new Set(matchInteractionKeywords(prompt));
  const text = await complete({
    system: GENERATION_CLASSIFIER_SYSTEM,
    prompt,
  });
  for (const kind of parseInteractionKinds(text)) selected.add(kind);
  return INTERACTION_KIND_ORDER.filter((kind) => selected.has(kind));
}
