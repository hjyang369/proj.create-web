import { describe, expect, it } from "vitest";
import {
  interactionRulesFor,
  matchInteractionKeywords,
  parseInteractionKinds,
  resolveGenerationInteractionKinds,
  resolveInteractionKinds,
} from "./interaction-rules.js";
import type { CreateSiteRecord } from "./sites.store.js";

function generationInput(
  overrides: Partial<CreateSiteRecord> = {},
): CreateSiteRecord {
  return {
    userId: 1,
    name: "카페",
    businessType: null,
    oneLineIntro: "좋은 커피",
    description: null,
    address: "서울",
    phone: "02-0000-0000",
    email: "cafe@example.com",
    purpose: "company_intro",
    targetCustomer: null,
    mainColor: null,
    atmosphere: null,
    extraRequest: null,
    pageCount: 1,
    pageComponents: null,
    referenceUrl: null,
    optionalLinks: null,
    logo: null,
    photos: [],
    ...overrides,
  };
}

describe("matchInteractionKeywords", () => {
  it.each([
    ["탭 메뉴를 추가해 줘", ["tab"]],
    ["위쪽에 탭 넣어 줘", ["tab"]],
    ["Add a tab menu", ["tab"]],
    ["드롭다운 메뉴", ["dropdown"]],
    ["자주 묻는 질문", ["accordion"]],
    ["FAQ 넣어 줘", ["accordion"]],
    ["접기 펼치기", ["accordion"]],
    ["햄버거 메뉴", ["mobile-nav"]],
    ["모바일 메뉴 열어 줘", ["mobile-nav"]],
    ["사진 넘기기", ["carousel"]],
    ["캐러셀로 보여 줘", ["carousel"]],
    ["말풍선 설명", ["tooltip"]],
    ["툴팁 추가", ["tooltip"]],
    ["켜기 끄기 스위치", ["switch"]],
    ["토글 버튼", ["switch"]],
    ["날짜 선택할 수 있게", ["date-select"]],
    ["선택 목록", ["date-select"]],
    ["상세 모달로 보여 줘", ["modal"]],
    ["영상 재생 버튼", ["video"]],
    ["이메일 복사 버튼", ["clipboard"]],
    ["버튼 색만 바꿔 줘", []],
    ["제목을 짧게", []],
    ["이 사진으로 바꿔 줘", []],
    ["누르면 아래 화면이 바뀌게", []],
    ["사진처럼 만들어 줘", []],
    ["탭이랑 자주 묻는 질문", ["tab", "accordion"]],
    ["드롭다운이랑 햄버거", ["dropdown", "mobile-nav"]],
  ])("%s → %j", (request, kinds) => {
    expect(matchInteractionKeywords(request)).toEqual(kinds);
  });
});

describe("interactionRulesFor", () => {
  it("고른 종류의 예시만 반환한다", () => {
    const rules = interactionRulesFor(["tab"]);

    expect(rules).toContain('data-action="tabs.select"');
    expect(rules).toContain("data-tab-panel");
    expect(rules).not.toContain('type="radio"');
    expect(rules).not.toContain('data-action="dropdown.toggle"');
    expect(rules).not.toContain("crep-switch");
  });

  it("아무 종류도 없으면 예시를 비운다", () => {
    expect(interactionRulesFor([])).toBe("");
  });

  it("드롭다운과 접기와 모달은 HTML만 사용한다", () => {
    const dropdown = interactionRulesFor(["dropdown"]);
    const accordion = interactionRulesFor(["accordion"]);
    const modal = interactionRulesFor(["modal"]);

    expect(dropdown).toContain("<details");
    expect(dropdown).toContain("<summary>");
    expect(dropdown).not.toContain('data-action="');
    expect(accordion).toContain('name="crep-accordion-1"');
    expect(accordion).not.toContain('data-action="');
    expect(modal).toContain("popovertarget");
    expect(modal).not.toContain('data-action="');
  });

  it("복사 요청에는 clipboard.copy 예시만 넣는다", () => {
    const rules = interactionRulesFor(["clipboard"]);

    expect(rules).toContain('data-action="clipboard.copy"');
    expect(rules).toContain("data-value");
    expect(rules).not.toContain("popovertarget");
    expect(rules).not.toContain('data-action="tabs.select"');
  });
});

describe("parseInteractionKinds", () => {
  it("허용된 이름만 고른다", () => {
    expect(parseInteractionKinds('{"종류":["탭","접기","없는이름"]}')).toEqual([
      "tab",
      "accordion",
    ]);
  });

  it("JSON이 아니면 빈 목록이다", () => {
    expect(parseInteractionKinds("잘 모르겠습니다")).toEqual([]);
  });
});

describe("resolveInteractionKinds", () => {
  it("단어가 분명하면 분류 모델을 부르지 않는다", async () => {
    let calls = 0;

    const kinds = await resolveInteractionKinds(
      "탭 메뉴를 추가해 줘",
      {},
      async () => {
        calls += 1;
        return '{"종류":[]}';
      },
    );

    expect(kinds).toEqual(["tab"]);
    expect(calls).toBe(0);
  });

  it("애매한 문장은 분류 결과만 사용한다", async () => {
    let capturedPrompt = "";

    const kinds = await resolveInteractionKinds(
      "누르면 아래 화면이 바뀌게",
      {
        elementHtml: "<div>메뉴</div>",
        imageUrl: "/uploads/photos/reference.webp",
      },
      async ({ prompt }) => {
        capturedPrompt = prompt;
        return '{"종류":["탭"]}';
      },
    );

    expect(kinds).toEqual(["tab"]);
    expect(capturedPrompt).toContain("누르면 아래 화면이 바뀌게");
    expect(capturedPrompt).toContain("<div>메뉴</div>");
    expect(capturedPrompt).toContain("/uploads/photos/reference.webp");
  });

  it("색만 바꾸는 요청은 빈 분류를 그대로 둔다", async () => {
    const kinds = await resolveInteractionKinds(
      "버튼 색만 바꿔 줘",
      {},
      async () => '{"종류":[]}',
    );

    expect(kinds).toEqual([]);
  });
});

describe("resolveGenerationInteractionKinds", () => {
  it("추가 요청이 없어도 폼 전체를 보고 분류한 탭을 고른다", async () => {
    let capturedPrompt = "";

    const kinds = await resolveGenerationInteractionKinds(
      generationInput({
        description: "소개, 가격, 후기를 한자리에서 바꿔 보여 주세요.",
        oneLineIntro: "컨설팅",
      }),
      async ({ prompt }) => {
        capturedPrompt = prompt;
        return '{"종류":["탭"]}';
      },
    );

    expect(kinds).toEqual(["tab"]);
    expect(capturedPrompt).toContain("소개, 가격, 후기를 한자리에서 바꿔 보여 주세요.");
    expect(capturedPrompt).toContain("컨설팅");
    expect(capturedPrompt).toContain("카페");
    expect(capturedPrompt).not.toContain("02-0000-0000");
    expect(capturedPrompt).not.toContain("cafe@example.com");
    expect(capturedPrompt).not.toContain("서울");
  });

  it("추가 요청의 탭은 분류가 비어도 남고, 분류는 폼 전체를 본다", async () => {
    let calls = 0;
    let capturedPrompt = "";

    const kinds = await resolveGenerationInteractionKinds(
      generationInput({
        extraRequest: "탭 메뉴를 넣어 주세요.",
        description: "가격표는 팝업으로 보여 주세요.",
      }),
      async ({ prompt }) => {
        calls += 1;
        capturedPrompt = prompt;
        return '{"종류":["모달"]}';
      },
    );

    expect(calls).toBe(1);
    expect(kinds).toEqual(["tab", "modal"]);
    expect(capturedPrompt).toContain("탭 메뉴를 넣어 주세요.");
    expect(capturedPrompt).toContain("가격표는 팝업으로 보여 주세요.");
  });

  it("평범한 소개이고 분류가 비면 동작 예시를 고르지 않는다", async () => {
    const kinds = await resolveGenerationInteractionKinds(
      generationInput(),
      async () => '{"종류":[]}',
    );

    expect(kinds).toEqual([]);
  });

  it("페이지 구성의 FAQ는 접기로 고른다", async () => {
    const kinds = await resolveGenerationInteractionKinds(
      generationInput({ pageComponents: ["faq"] }),
      async () => '{"종류":[]}',
    );

    expect(kinds).toEqual(["accordion"]);
  });
});
