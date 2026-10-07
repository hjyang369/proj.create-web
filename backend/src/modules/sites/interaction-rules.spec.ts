import { describe, expect, it } from "vitest";
import {
  interactionRulesFor,
  matchInteractionKeywords,
  parseInteractionKinds,
  resolveInteractionKinds,
} from "./interaction-rules.js";

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

    expect(rules).toContain('type="radio"');
    expect(rules).toContain("1번 탭은 1번 화면");
    expect(rules).not.toContain('<details class="crep-dropdown">');
    expect(rules).not.toContain("crep-switch");
  });

  it("아무 종류도 없으면 예시를 비운다", () => {
    expect(interactionRulesFor([])).toBe("");
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
