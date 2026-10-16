import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeBoardNamesIssue,
  describeReviewVisibilityIssue,
  describeFieldFormat,
  describeSafeExternalLink,
  describeSafeReferenceLink,
  describeSiteInputIssue,
  escapeHtml,
  formatKindForLink,
  keepEmailChars,
  keepDigits,
  type SiteInputFieldValues,
} from "./field-format.ts";

describe("describeFieldFormat", () => {
  it("비어 있으면 아직 형식을 검사하지 않는다", () => {
    assert.deepEqual(describeFieldFormat("phone", ""), {
      valid: true,
      message: null,
      hint: "숫자와 하이픈으로 입력해 주세요. 예: 010-1234-5678",
    });
    assert.equal(describeFieldFormat("email", "   ").valid, true);
    assert.equal(describeFieldFormat("url", "").valid, true);
  });

  it("휴대전화와 일반전화 형식을 받는다", () => {
    assert.equal(describeFieldFormat("phone", "010-1234-5678").valid, true);
    assert.equal(describeFieldFormat("phone", "02-123-4567").valid, true);
    assert.equal(describeFieldFormat("phone", "031-1234-5678").valid, true);
  });

  it("국번이 네 자리인 연락처도 받는다", () => {
    assert.equal(describeFieldFormat("phone", "070-0000-0000").valid, true);
    assert.equal(describeFieldFormat("phone", "0507-0000-0000").valid, true);
    assert.equal(describeFieldFormat("phone", "0502-1234-5678").valid, true);
  });

  it("연락처 형식이 아니면 안내한다", () => {
    const result = describeFieldFormat("phone", "01012345678");

    assert.equal(result.valid, false);
    assert.equal(result.message, "010-1234-5678 형식으로 입력해 주세요.");
  });

  it("이메일 형식이 아니면 안내한다", () => {
    assert.equal(describeFieldFormat("email", "contact@mycompany.com").valid, true);

    const result = describeFieldFormat("email", "contact");

    assert.equal(result.valid, false);
    assert.equal(
      result.message,
      "영문 이메일로 입력해 주세요. 예: contact@company.com",
    );
  });

  it("이메일에 한글이 있으면 받지 않는다", () => {
    const result = describeFieldFormat("email", "홍길동@회사.com");

    assert.equal(result.valid, false);
    assert.equal(
      result.message,
      "영문 이메일로 입력해 주세요. 예: contact@company.com",
    );
  });

  it("페이지 수는 숫자만 받는다", () => {
    assert.equal(describeFieldFormat("pageCount", "").valid, true);
    assert.equal(describeFieldFormat("pageCount", "5").valid, true);
    assert.equal(describeFieldFormat("pageCount", "3페이지").valid, false);
    assert.equal(
      describeFieldFormat("pageCount", "abc").message,
      "숫자만 입력해 주세요. 예: 5",
    );
  });

  it("이메일에서 영문이 아닌 글자는 지운다", () => {
    assert.equal(keepEmailChars("홍길동contact@회사.com"), "contact@.com");
  });

  it("페이지 수에서 숫자가 아닌 글자는 지운다", () => {
    assert.equal(keepDigits("3페이지"), "3");
    assert.equal(keepDigits("12a"), "12");
  });

  it("링크는 https:// 로 시작해야 한다", () => {
    assert.equal(
      describeFieldFormat("url", "https://instagram.com/xxx").valid,
      true,
    );
    assert.equal(describeFieldFormat("url", "https://naver.me/xxxxx").valid, true);
    assert.equal(describeFieldFormat("url", "https://example.com").valid, true);

    const result = describeFieldFormat("url", "instagram.com/xxx");

    assert.equal(result.valid, false);
    assert.equal(result.message, "https:// 로 시작하는 주소를 입력해 주세요.");
  });

  it("위험한 주소 스킴은 막는다", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
    ]) {
      const result = describeFieldFormat("url", value);
      assert.equal(result.valid, false);
      assert.equal(result.message, "http 또는 https 주소만 사용할 수 있습니다.");
    }
  });

  it("이상한 주소는 받지 않는다", () => {
    assert.equal(describeFieldFormat("url", "https://").valid, false);
    assert.equal(describeFieldFormat("url", "https://....").valid, false);
    assert.equal(describeFieldFormat("url", "https://그냥글자").valid, false);
    assert.equal(describeFieldFormat("url", "javascript:alert(1)").valid, false);
    assert.equal(
      describeFieldFormat("url", "https://올바른주소아님").message,
      "올바른 사이트 주소를 입력해 주세요. 예: https://example.com",
    );
  });
});

describe("formatKindForLink", () => {
  it("참고 사이트는 참고 주소 형식이고 그 외 링크는 사이트 주소 형식이다", () => {
    assert.equal(formatKindForLink("instagramLink"), "url");
    assert.equal(formatKindForLink("referenceLink"), "referenceUrl");
  });
});

describe("referenceUrl", () => {
  it("공개 웹사이트 주소는 받는다", () => {
    assert.equal(
      describeFieldFormat("referenceUrl", "https://example.com").valid,
      true,
    );
    assert.equal(
      describeFieldFormat("referenceUrl", "https://naver.com/store").valid,
      true,
    );
  });

  it("내부망·메타데이터 주소는 막는다", () => {
    const blocked = [
      "https://localhost",
      "https://localhost.localdomain",
      "https://foo.localhost",
      "https://127.0.0.1",
      "https://10.0.0.1",
      "https://192.168.0.1",
      "https://172.16.0.1",
      "https://169.254.169.254",
      "https://169.254.1.1",
      "https://100.100.100.200",
      "https://metadata.google.internal",
      "https://metadata.google.com",
      "https://printer.local",
      "https://127.0.0.1.nip.io",
      "https://192.168.1.1.sslip.io",
    ];

    for (const value of blocked) {
      const result = describeFieldFormat("referenceUrl", value);
      assert.equal(result.valid, false, value);
      assert.equal(
        result.message,
        "이 주소는 참고 사이트로 사용할 수 없습니다. 공개 웹사이트 주소만 입력해 주세요.",
        value,
      );
    }
  });
});

describe("escapeHtml", () => {
  it("HTML 특수문자를 이스케이프한다", () => {
    assert.equal(
      escapeHtml(`<a href="javascript:alert(1)">클릭</a>`),
      "&lt;a href=&quot;javascript:alert(1)&quot;&gt;클릭&lt;/a&gt;",
    );
  });
});

const allowed = {
  purposes: ["company_intro", "sales"],
  moods: ["warm", "professional"],
};

function inputValues(
  overrides: Partial<SiteInputFieldValues> = {},
): SiteInputFieldValues {
  return {
    industry: "카페",
    name: "아침커피",
    tagline: "좋은 커피",
    description: "",
    address: "",
    phone: "",
    email: "",
    purpose: "company_intro",
    targetCustomer: "",
    mainColor: "",
    mood: "warm",
    pageCount: "1",
    selectedPages: [],
    blogLink: "",
    websiteLink: "",
    instagramLink: "",
    youtubeLink: "",
    referenceLink: "",
    extraRequest: "",
    ...overrides,
  };
}

describe("describeSiteInputIssue", () => {
  it("필수값과 형식이 맞으면 저장할 수 있다", () => {
    assert.equal(describeSiteInputIssue(inputValues(), allowed), null);
  });

  it("회사명, 한줄 소개, 제작 목적이 없으면 저장하지 않는다", () => {
    assert.equal(
      describeSiteInputIssue(inputValues({ name: "  " }), allowed),
      "회사명을 입력해 주세요.",
    );
    assert.equal(
      describeSiteInputIssue(inputValues({ tagline: "" }), allowed),
      "한줄 소개를 입력해 주세요.",
    );
    assert.equal(
      describeSiteInputIssue(inputValues({ purpose: "" }), allowed),
      "제작 목적을 선택해 주세요.",
    );
  });

  it("연락처와 페이지 수가 형식에 맞지 않으면 안내한다", () => {
    assert.equal(
      describeSiteInputIssue(inputValues({ phone: "전화" }), allowed),
      "010-1234-5678 형식으로 입력해 주세요.",
    );
    assert.equal(
      describeSiteInputIssue(inputValues({ pageCount: "0" }), allowed),
      "페이지 수는 1 이상의 숫자로 입력해 주세요.",
    );
  });
});

describe("describeSafeExternalLink", () => {
  it("안전한 http 주소만 새 탭 링크로 만든다", () => {
    assert.deepEqual(describeSafeExternalLink("https://example.com"), {
      href: "https://example.com",
      label: "https://example.com",
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });

  it("위험한 주소는 링크로 만들지 않는다", () => {
    assert.equal(describeSafeExternalLink("javascript:alert(1)"), null);
    assert.equal(describeSafeExternalLink("https://그냥글자"), null);
  });
});

describe("describeSafeReferenceLink", () => {
  it("공개 웹사이트만 참고 링크로 만든다", () => {
    assert.deepEqual(describeSafeReferenceLink("https://example.com"), {
      href: "https://example.com",
      label: "https://example.com",
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });

  it("내부망 주소는 참고 링크로 만들지 않는다", () => {
    assert.equal(describeSafeReferenceLink("https://127.0.0.1"), null);
    assert.equal(describeSafeReferenceLink("https://metadata.google.internal"), null);
    assert.equal(describeSafeReferenceLink("https://printer.local"), null);
  });
});

describe("describeBoardNamesIssue", () => {
  it("게시판을 고르지 않았으면 이름을 검사하지 않는다", () => {
    assert.equal(describeBoardNamesIssue(["about"], []), null);
  });

  it("게시판 이름이 비어 있으면 안내한다", () => {
    assert.equal(
      describeBoardNamesIssue(["board"], ["  "]),
      "게시판 이름을 입력해 주세요.",
    );
  });

  it("같은 이름은 거절한다", () => {
    assert.equal(
      describeBoardNamesIssue(["board"], ["뉴스", " 뉴스 "]),
      "게시판 이름이 중복됩니다.",
    );
  });

  it("이름이 있으면 통과한다", () => {
    assert.equal(describeBoardNamesIssue(["board"], ["뉴스", "소식"]), null);
  });
});

describe("describeReviewVisibilityIssue", () => {
  it("리뷰를 고르지 않았으면 공개 범위를 검사하지 않는다", () => {
    assert.equal(describeReviewVisibilityIssue(["about"], ""), null);
  });

  it("리뷰를 골랐는데 공개 범위가 없으면 안내한다", () => {
    assert.equal(
      describeReviewVisibilityIssue(["review"], ""),
      "리뷰 공개 범위를 선택해 주세요.",
    );
  });

  it("일부 공개는 로그인 없이도 통과한다", () => {
    assert.equal(describeReviewVisibilityIssue(["review"], "partial"), null);
  });

  it("전체 공개는 로그인·회원가입이 없으면 안내한다", () => {
    assert.equal(
      describeReviewVisibilityIssue(["review"], "full"),
      "리뷰를 전체 공개하려면 로그인·회원가입을 함께 선택해 주세요.",
    );
  });

  it("전체 공개는 로그인·회원가입이 있으면 통과한다", () => {
    assert.equal(
      describeReviewVisibilityIssue(["review", "auth"], "full"),
      null,
    );
  });
});
