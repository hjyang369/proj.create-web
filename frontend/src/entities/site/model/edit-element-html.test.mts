import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyElementEdit,
  diffElementEdit,
  elementEditOf,
  findElementByPath,
  isAllowedEditImageSrc,
  isAllowedEditLink,
  isAllowedFontSize,
  isAllowedBackgroundImage,
  isAllowedFontWeight,
  isAllowedTextColor,
  normalizeBackgroundImage,
  visibleTextStyle,
  editHtmlElement,
  readEditableElement,
  readEditableFromHtml,
  type ElementLike,
  type NodeLike,
} from "./edit-element-html.ts";

// DOMParser는 Node에 없으므로, 필요한 부분만 흉내 낸 가짜 요소로 테스트한다.
type FakeNode = FakeElement | FakeText;

class FakeText implements NodeLike {
  nodeType = 3;
  nodeValue: string | null;

  constructor(nodeValue: string | null) {
    this.nodeValue = nodeValue;
  }
}

class FakeElement implements ElementLike {
  nodeType = 1;
  nodeValue = null;
  tagName: string;
  private attrs = new Map<string, string>();
  childNodes: FakeNode[];

  constructor(
    tagName: string,
    attrs: Record<string, string> = {},
    children: Array<FakeNode | string> = [],
  ) {
    this.tagName = tagName;
    for (const [key, value] of Object.entries(attrs)) {
      this.attrs.set(key, value);
    }
    this.childNodes = children.map((child) =>
      typeof child === "string" ? new FakeText(child) : child,
    );
  }

  get children(): FakeElement[] {
    return this.childNodes.filter((node) => node.nodeType === 1) as FakeElement[];
  }

  get textContent(): string {
    return this.childNodes
      .map((node) =>
        node instanceof FakeElement ? node.textContent : (node.nodeValue ?? ""),
      )
      .join("");
  }

  set textContent(value: string | null) {
    this.childNodes = [new FakeText(value ?? "")];
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }
}

function el(
  tagName: string,
  attrs: Record<string, string> = {},
  children: Array<FakeNode | string> = [],
): FakeElement {
  return new FakeElement(tagName.toUpperCase(), attrs, children);
}

/** 페이지 래퍼 아래에 섹션 두 개가 있는 가짜 페이지 */
function buildPage() {
  const logo = el("img", { src: "/uploads/logos/a.png", alt: "로고", srcset: "x 2x" });
  const button = el("a", { href: "about.html" }, [el("i"), "소개"]);
  const logoLink = el("a", { href: "#top" }, [logo]);
  const title = el("h1", {}, ["안녕하세요"]);
  const mixed = el("p", {}, ["첫줄", el("br"), "둘째줄"]);
  const box = el("div", {}, [el("span", {}, ["자식 태그"])]);
  const header = el("header", {}, [logoLink, el("script"), button]);
  const hero = el("section", {}, [title, mixed, box]);
  const root = el("div", {}, [header, hero]);
  return { root, logo, button, logoLink, title, mixed, box, header, hero };
}

describe("isAllowedEditLink", () => {
  it("웹 주소, 메일, 전화, 앵커, 사이트 안 페이지 링크를 허용한다", () => {
    for (const value of [
      "https://example.com/a?b=1",
      "http://example.com",
      "mailto:hello@example.com",
      "tel:010-1234-5678",
      "#contact",
      "about.html",
      "./about.html#team",
      "/contact",
    ]) {
      assert.equal(isAllowedEditLink(value), true, value);
    }
  });

  it("위험한 스킴과 빈 값, 공백이 섞인 값은 거부한다", () => {
    for (const value of [
      "",
      "   ",
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "java\tscript:alert(1)",
      " javascript:alert(1)",
      "data:text/html,<b>x</b>",
      "vbscript:x",
      "file:///etc/passwd",
      "//evil.example.com",
      "https://exa mple.com",
    ]) {
      assert.equal(isAllowedEditLink(value), false, JSON.stringify(value));
    }
  });
});

describe("isAllowedEditImageSrc", () => {
  it("업로드 경로와 http(s) 주소만 허용한다", () => {
    assert.equal(isAllowedEditImageSrc("/uploads/photos/a.png"), true);
    assert.equal(isAllowedEditImageSrc("https://example.com/a.png"), true);
    assert.equal(isAllowedEditImageSrc("javascript:alert(1)"), false);
    assert.equal(isAllowedEditImageSrc("data:image/png;base64,AAAA"), false);
    assert.equal(isAllowedEditImageSrc("/uploads/../etc/passwd"), false);
    assert.equal(isAllowedEditImageSrc("/etc/passwd"), false);
    assert.equal(isAllowedEditImageSrc(""), false);
  });
});

describe("findElementByPath", () => {
  it("형제 순서로 요소를 찾고 script는 세지 않는다", () => {
    const { root, header, hero, title, button } = buildPage();

    assert.equal(findElementByPath(root, [0]), header);
    assert.equal(findElementByPath(root, [1]), hero);
    assert.equal(findElementByPath(root, [1, 0]), title);
    // header 자식: [logoLink, script, button] → script를 빼면 button은 1번
    assert.equal(findElementByPath(root, [0, 1]), button);
  });

  it("없는 길이나 빈 길은 null이다", () => {
    const { root } = buildPage();

    assert.equal(findElementByPath(root, []), null);
    assert.equal(findElementByPath(root, [5]), null);
    assert.equal(findElementByPath(root, [0, 9]), null);
    assert.equal(findElementByPath(root, [-1]), null);
  });
});

describe("readEditableElement", () => {
  it("img는 주소와 대체 텍스트를 돌려준다", () => {
    const { root } = buildPage();

    assert.deepEqual(readEditableElement(root, [0, 0, 0]), {
      tagName: "img",
      kind: "image",
      text: null,
      href: null,
      src: "/uploads/logos/a.png",
      alt: "로고",
      fontSize: null,
      color: null,
      fontWeight: null,
      backgroundColor: "",
      backgroundImage: "",
    });
  });

  it("a는 아이콘 같은 자식 태그가 있어도 글자 조각이 하나면 글자와 링크를 돌려준다", () => {
    const { root } = buildPage();

    assert.deepEqual(readEditableElement(root, [0, 1]), {
      tagName: "a",
      kind: "link",
      text: "소개",
      href: "about.html",
      src: null,
      alt: null,
      fontSize: "",
      color: "",
      fontWeight: "",
      backgroundColor: "",
      backgroundImage: "",
    });
  });

  it("글자가 없는 a(이미지만 감싼 링크)는 링크만 편집된다", () => {
    const { root } = buildPage();
    const result = readEditableElement(root, [0, 0]);

    assert.equal(result?.kind, "link");
    assert.equal(result?.text, null);
    assert.equal(result?.href, "#top");
  });

  it("자식이 없는 요소는 전체 글자를 돌려준다", () => {
    const { root } = buildPage();
    const result = readEditableElement(root, [1, 0]);

    assert.equal(result?.kind, "text");
    assert.equal(result?.text, "안녕하세요");
  });

  it("br만 끼어 있으면 태그 종류와 상관없이 줄바꿈 글자로 읽는다", () => {
    const { root } = buildPage();
    const paragraph = readEditableElement(root, [1, 1]);

    assert.equal(paragraph?.tagName, "p");
    assert.equal(paragraph?.kind, "text");
    assert.equal(paragraph?.text, "첫줄\n둘째줄");

    const page = el("div", {}, [
      el("h1", {}, ["\n  전통과 현대를 잇는", el("br"), "\n  결과 나무의 시간\n"]),
      el("a", { href: "#x" }, ["첫", el("br"), "둘"]),
      el("p", {}, ["하나", el("em", {}, ["강조"]), "둘"]),
    ]);

    assert.equal(
      readEditableElement(page, [0])?.text,
      "전통과 현대를 잇는\n결과 나무의 시간",
    );
    assert.equal(readEditableElement(page, [1])?.kind, "link");
    assert.equal(readEditableElement(page, [1])?.text, "첫\n둘");
    assert.equal(readEditableElement(page, [1])?.href, "#x");
    assert.equal(readEditableElement(page, [2])?.kind, "unsupported");
    assert.equal(readEditableElement(page, [2])?.text, null);
    assert.equal(readEditableElement(root, [1, 2])?.kind, "unsupported");
  });

  it("글자가 있으면 인라인 크기와 색을 읽고, 짧은 색 코드는 여섯 자리로 맞춘다", () => {
    const root = el("div", {}, [
      el("h1", { style: "font-weight: bold; font-size: 18px; color: #abc" }, ["제목"]),
    ]);

    const result = readEditableElement(root, [0]);

    assert.equal(result?.fontSize, "18px");
    assert.equal(result?.color, "#aabbcc");
    assert.equal(result?.fontWeight, "700");
    assert.equal(result?.backgroundColor, "");
  });

  it("background 한 줄에 적힌 이미지도 읽어 온다", () => {
    const root = el("div", {}, [
      el(
        "section",
        { style: 'background: url("/uploads/photos/a.png") center / cover' },
        [el("h1", {}, ["제목"])],
      ),
    ]);

    assert.equal(
      readEditableElement(root, [0])?.backgroundImage,
      "/uploads/photos/a.png",
    );
  });

  it("자식이 img 하나뿐인 div는 그 사진을 배경 이미지로 읽는다", () => {
    const photo = el("img", {
      src: "/uploads/photos/a.jpeg",
      alt: "카르폰 전경",
    });
    const root = el("div", {}, [el("div", { class: "hero-bg" }, [photo])]);

    assert.equal(
      readEditableElement(root, [0])?.backgroundImage,
      "/uploads/photos/a.jpeg",
    );
    assert.equal(
      readEditableElement(el("div", {}, [el("div", {}, [photo, el("h1", {}, ["제목"])])]), [0])
        ?.backgroundImage,
      "",
    );
  });

  it("없는 위치는 null이다", () => {
    const { root } = buildPage();

    assert.equal(readEditableElement(root, [9]), null);
  });
});

describe("applyElementEdit", () => {
  it("자식이 없는 요소의 글자를 바꾼다", () => {
    const { root, title } = buildPage();
    const result = applyElementEdit(root, [1, 0], { text: "새 제목" });

    assert.deepEqual(result, { ok: true });
    assert.equal(title.textContent, "새 제목");
  });

  it("엔터를 넣으면 br이 생기고, 엔터를 지우면 br도 사라진다", () => {
    const root = el("div", {}, [
      el("p", {}, ["안녕하세요"]),
      el("h1", {}, ["전통과 현대를 잇는", el("br"), "결과 나무의 시간"]),
    ]);

    const added = applyElementEdit(root, [0], { text: "안녕\n하세요" });
    const removed = applyElementEdit(root, [1], { text: "전통과 현대를 잇는 결과 나무의 시간" });

    assert.deepEqual(added, { ok: true });
    assert.deepEqual(removed, { ok: true });
    assert.equal(readEditableElement(root, [0])?.text, "안녕\n하세요");
    assert.equal(readEditableElement(root, [1])?.text, "전통과 현대를 잇는 결과 나무의 시간");

    const paragraphBreaks = findElementByPath(root, [0])?.childNodes.filter(
      (node) => node.nodeType === 1,
    );
    const headingBreaks = findElementByPath(root, [1])?.childNodes.filter(
      (node) => node.nodeType === 1,
    );
    assert.equal(paragraphBreaks?.length, 1);
    assert.equal((paragraphBreaks?.[0] as FakeElement).tagName.toLowerCase(), "br");
    assert.equal(headingBreaks?.length, 0);
  });

  it("br만 있는 글자를 바꾸면 줄마다 br을 다시 넣고 다른 태그는 그대로 둔다", () => {
    const root = el("div", {}, [
      el("h2", {}, ["전통과 현대를 잇는", el("br"), "결과 나무의 시간"]),
      el("a", { href: "#x" }, ["첫", el("br"), "둘"]),
    ]);

    const heading = applyElementEdit(root, [0], { text: "한 줄\n두 줄\n세 줄" });
    const link = applyElementEdit(root, [1], { text: "위\n아래" });

    assert.deepEqual(heading, { ok: true });
    assert.deepEqual(link, { ok: true });
    assert.equal(readEditableElement(root, [0])?.text, "한 줄\n두 줄\n세 줄");
    assert.equal(readEditableElement(root, [1])?.text, "위\n아래");
    assert.equal(readEditableElement(root, [1])?.href, "#x");

    const breaks = findElementByPath(root, [0])?.childNodes.filter(
      (node) => node.nodeType === 1,
    );
    assert.equal(breaks?.length, 2);
    assert.equal(
      breaks?.every((node) => (node as FakeElement).tagName.toLowerCase() === "br"),
      true,
    );
  });

  it("a의 글자만 바꾸고 아이콘 같은 자식 태그는 유지한다", () => {
    const { root, button } = buildPage();
    const result = applyElementEdit(root, [0, 1], {
      text: "문의하기",
      href: "https://example.com/contact",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(button.children.length, 1);
    assert.equal(button.children[0].tagName, "I");
    assert.equal(button.textContent, "문의하기");
    assert.equal(button.getAttribute("href"), "https://example.com/contact");
  });

  it("위험한 링크는 거부하고 어떤 것도 바꾸지 않는다", () => {
    const { root, button } = buildPage();
    const result = applyElementEdit(root, [0, 1], {
      text: "바뀌면 안 됨",
      href: "javascript:alert(1)",
    });

    assert.equal(result.ok, false);
    assert.equal(button.textContent, "소개");
    assert.equal(button.getAttribute("href"), "about.html");
  });

  it("img 주소를 바꾸면 srcset을 지워 새 이미지가 보이게 한다", () => {
    const { root, logo } = buildPage();
    const result = applyElementEdit(root, [0, 0, 0], {
      src: "/uploads/photos/new.png",
      alt: "새 로고",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(logo.getAttribute("src"), "/uploads/photos/new.png");
    assert.equal(logo.getAttribute("alt"), "새 로고");
    assert.equal(logo.getAttribute("srcset"), null);
  });

  it("허용되지 않는 이미지 주소는 거부한다", () => {
    const { root, logo } = buildPage();
    const result = applyElementEdit(root, [0, 0, 0], { src: "javascript:x" });

    assert.equal(result.ok, false);
    assert.equal(logo.getAttribute("src"), "/uploads/logos/a.png");
  });

  it("그 요소에 맞지 않는 항목은 거부한다", () => {
    const { root } = buildPage();

    assert.equal(applyElementEdit(root, [1, 0], { href: "#a" }).ok, false);
    assert.equal(applyElementEdit(root, [1, 0], { src: "/uploads/a.png" }).ok, false);
    assert.equal(applyElementEdit(root, [0, 0, 0], { text: "글자" }).ok, false);
    assert.equal(applyElementEdit(root, [1, 2], { text: "글자" }).ok, false);
  });

  it("없는 위치는 거부한다", () => {
    const { root } = buildPage();

    assert.equal(applyElementEdit(root, [9], { text: "x" }).ok, false);
  });

  it("글자 크기와 색만 바꾸고 다른 style은 유지한다", () => {
    const title = el(
      "h1",
      { style: "font-weight: 700; color: rgb(0, 0, 0)" },
      ["제목"],
    );
    const root = el("div", {}, [title]);
    const result = applyElementEdit(root, [0], {
      fontSize: "20px",
      color: "#112233",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(title.textContent, "제목");
    assert.match(title.getAttribute("style") ?? "", /font-weight:\s*700/);
    assert.match(title.getAttribute("style") ?? "", /font-size:\s*20px/);
    assert.match(title.getAttribute("style") ?? "", /color:\s*#112233/);
  });

  it("글자 굵기를 100 단위로 바꾼다", () => {
    const title = el("h1", { style: "color: #111111" }, ["제목"]);
    const root = el("div", {}, [title]);
    const result = applyElementEdit(root, [0], { fontWeight: "700" });

    assert.deepEqual(result, { ok: true });
    assert.match(title.getAttribute("style") ?? "", /font-weight:\s*700/);
    assert.match(title.getAttribute("style") ?? "", /color:\s*#111111/);
  });

  it("크기나 색에 다른 css가 섞이면 거부하고 아무것도 바꾸지 않는다", () => {
    const title = el("h1", { style: "font-weight: 700" }, ["제목"]);
    const root = el("div", {}, [title]);

    assert.equal(applyElementEdit(root, [0], { fontSize: "20px; color: red" }).ok, false);
    assert.equal(applyElementEdit(root, [0], { color: "red; background: url(http://evil)" }).ok, false);
    assert.equal(applyElementEdit(root, [0], { fontSize: "0px" }).ok, false);
    assert.equal(applyElementEdit(root, [0], { fontWeight: "bold" }).ok, false);
    assert.equal(title.getAttribute("style"), "font-weight: 700");
  });

  it("배경 이미지를 넣으면 요소를 채우고, 글자 색은 유지한다", () => {
    const title = el("h1", { style: "color: #111111" }, ["제목"]);
    const root = el("div", {}, [title]);
    const result = applyElementEdit(root, [0], {
      backgroundImage: "/uploads/photos/a.png",
    });

    assert.deepEqual(result, { ok: true });
    const style = title.getAttribute("style") ?? "";
    assert.match(style, /background-image:\s*url\("\/uploads\/photos\/a\.png"\)/);
    assert.match(style, /background-size:\s*cover/);
    assert.match(style, /background-position:\s*center/);
    assert.match(style, /color:\s*#111111/);
  });

  it("img 하나만 감싼 div의 배경 이미지는 그 img 주소로 바꾼다", () => {
    const photo = el("img", { src: "/uploads/photos/old.jpeg", alt: "옛 사진" });
    const box = el("div", { class: "hero-bg" }, [photo]);
    const root = el("div", {}, [box]);

    const result = applyElementEdit(root, [0], {
      backgroundImage: "/uploads/photos/new.jpeg",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(photo.getAttribute("src"), "/uploads/photos/new.jpeg");
    assert.equal(box.getAttribute("style"), null);

    assert.deepEqual(applyElementEdit(root, [0], { backgroundImage: "" }), { ok: true });
    assert.equal(photo.getAttribute("src"), "");
    assert.match(photo.getAttribute("style") ?? "", /display:\s*none/);
  });

  it("위험한 배경 이미지 주소는 거부한다", () => {
    const title = el("h1", {}, ["제목"]);
    const root = el("div", {}, [title]);

    assert.equal(applyElementEdit(root, [0], { backgroundImage: "javascript:alert(1)" }).ok, false);
    assert.equal(
      applyElementEdit(root, [0], { backgroundImage: 'https://example.com/a").png' }).ok,
      false,
    );
    assert.equal(title.getAttribute("style"), null);
  });

  it("배경색만 바꾸고 다른 style은 유지한다", () => {
    const title = el("h1", { style: "color: #111111" }, ["제목"]);
    const root = el("div", {}, [title]);
    const result = applyElementEdit(root, [0], { backgroundColor: "#abcdef" });

    assert.deepEqual(result, { ok: true });
    assert.match(title.getAttribute("style") ?? "", /background-color:\s*#abcdef/);
    assert.match(title.getAttribute("style") ?? "", /color:\s*#111111/);
  });

  it("글자가 없는 요소도 배경색은 바꿀 수 있다", () => {
    const { root, logo } = buildPage();

    assert.equal(applyElementEdit(root, [0, 0, 0], { backgroundColor: "#112233" }).ok, true);
    assert.match(logo.getAttribute("style") ?? "", /background-color:\s*#112233/);
    assert.equal(applyElementEdit(root, [1, 1], { backgroundColor: "red" }).ok, false);
  });

  it("글자가 없는 요소의 크기와 색은 거부한다", () => {
    const { root, logo } = buildPage();

    assert.equal(applyElementEdit(root, [0, 0, 0], { fontSize: "20px" }).ok, false);
    assert.equal(applyElementEdit(root, [0, 0, 0], { fontWeight: "700" }).ok, false);
    assert.equal(applyElementEdit(root, [1, 2], { color: "#112233" }).ok, false);
    assert.equal(logo.getAttribute("style"), null);
  });
});

describe("isAllowedFontSize / isAllowedTextColor", () => {
  it("1~400px 정수와 여섯 자리 색, 100 단위 굵기만 허용한다", () => {
    assert.equal(isAllowedFontSize(""), true);
    assert.equal(isAllowedFontSize("1px"), true);
    assert.equal(isAllowedFontSize("16px"), true);
    assert.equal(isAllowedFontSize("400px"), true);
    assert.equal(isAllowedFontSize("16.5px"), false);
    assert.equal(isAllowedFontSize("0px"), false);
    assert.equal(isAllowedFontSize("401px"), false);
    assert.equal(isAllowedFontSize("16rem"), false);
    assert.equal(isAllowedFontSize("16px; color: red"), false);

    assert.equal(isAllowedFontWeight(""), true);
    assert.equal(isAllowedFontWeight("400"), true);
    assert.equal(isAllowedFontWeight("700"), true);
    assert.equal(isAllowedFontWeight("bold"), false);
    assert.equal(isAllowedFontWeight("450"), false);
    assert.equal(isAllowedFontWeight("700; color: red"), false);

    assert.equal(isAllowedTextColor(""), true);
    assert.equal(isAllowedTextColor("#112233"), true);
    assert.equal(isAllowedTextColor("#AABBCC"), true);
    assert.equal(isAllowedTextColor("#abc"), false);
    assert.equal(isAllowedTextColor("red"), false);
    assert.equal(isAllowedTextColor("#112233; background: url(x)"), false);
  });
});

describe("normalizeBackgroundImage", () => {
  it("url()에서 주소만 꺼내고, 미리보기용 업로드 주소는 저장 경로로 되돌린다", () => {
    assert.equal(normalizeBackgroundImage('url("/uploads/photos/a.png")'), "/uploads/photos/a.png");
    assert.equal(normalizeBackgroundImage("none"), "");
    assert.equal(
      normalizeBackgroundImage(
        'url("http://localhost:3001/uploads/photos/a.png")',
        "http://localhost:3001",
      ),
      "/uploads/photos/a.png",
    );
    assert.equal(
      normalizeBackgroundImage(
        'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("http://localhost:3001/uploads/photos/a.png")',
        "http://localhost:3001",
      ),
      "/uploads/photos/a.png",
    );
    assert.equal(
      normalizeBackgroundImage(
        "http://localhost:3001/uploads/photos/a.jpeg",
        "http://localhost:3001",
      ),
      "/uploads/photos/a.jpeg",
    );
    assert.equal(normalizeBackgroundImage("linear-gradient(red, blue)"), null);
    assert.equal(isAllowedBackgroundImage("javascript:alert(1)"), false);
    assert.equal(isAllowedBackgroundImage('https://example.com/a").png'), false);
  });
});

describe("visibleTextStyle", () => {
  const heading = {
    tagName: "h1",
    kind: "text" as const,
    text: "제목",
    href: null,
    src: null,
    alt: null,
    fontSize: "",
    color: "",
    fontWeight: "",
    backgroundColor: "",
    backgroundImage: "",
  };

  it("인라인 값이 없어도 화면에 보이는 크기, 색, 굵기를 채운다", () => {
    assert.deepEqual(
      visibleTextStyle(heading, {
        fontSize: "48.4px",
        color: "rgb(255, 255, 255)",
        fontWeight: "bold",
      }),
      {
        ...heading,
        fontSize: "48px",
        color: "#ffffff",
        fontWeight: "700",
      },
    );
  });

  it("글자가 없는 요소는 글자 스타일을 채우지 않고, 배경색은 채운다", () => {
    const image = {
      ...heading,
      tagName: "img",
      kind: "image" as const,
      text: null,
      fontSize: null,
      color: null,
      fontWeight: null,
    };

    const result = visibleTextStyle(image, {
      fontSize: "16px",
      color: "#ffffff",
      fontWeight: "700",
      backgroundColor: "rgb(10, 20, 30)",
    });

    assert.equal(result.fontSize, null);
    assert.equal(result.backgroundColor, "#0a141e");
  });

  it("화면에 보이는 배경 이미지 주소를 채운다", () => {
    assert.equal(
      visibleTextStyle(heading, { backgroundImage: "/uploads/photos/a.png" }).backgroundImage,
      "/uploads/photos/a.png",
    );
    assert.equal(visibleTextStyle(heading, { backgroundImage: "" }).backgroundImage, "");
    assert.equal(
      visibleTextStyle(
        { ...heading, backgroundImage: "/uploads/photos/a.png" },
        { backgroundImage: "" },
      ).backgroundImage,
      "/uploads/photos/a.png",
    );
  });

  it("투명한 배경은 비워 둔다", () => {
    assert.equal(
      visibleTextStyle(heading, { backgroundColor: "rgba(0, 0, 0, 0)" }).backgroundColor,
      "",
    );
    assert.equal(
      visibleTextStyle(heading, { backgroundColor: "transparent" }).backgroundColor,
      "",
    );
    assert.equal(
      visibleTextStyle(heading, { backgroundColor: "#112233" }).backgroundColor,
      "#112233",
    );
  });
});

describe("elementEditOf / diffElementEdit", () => {
  const link = {
    tagName: "a",
    kind: "link" as const,
    text: "소개",
    href: "about.html",
    src: null,
    alt: null,
    fontSize: "16px",
    color: "#111111",
    fontWeight: "400",
    backgroundColor: "",
    backgroundImage: "",
  };

  it("읽은 요소의 편집 가능한 값만 원래 값으로 돌려준다", () => {
    assert.deepEqual(elementEditOf(link), {
      text: "소개",
      href: "about.html",
      fontSize: "16px",
      color: "#111111",
      fontWeight: "400",
      backgroundColor: "",
      backgroundImage: "",
    });
  });

  it("초안에서 실제로 바뀐 항목만 추린다", () => {
    assert.deepEqual(diffElementEdit(link, { text: "소개", href: "#new" }), {
      href: "#new",
    });
    assert.deepEqual(diffElementEdit(link, { text: "소개", href: "about.html" }), {});
    assert.deepEqual(diffElementEdit(link, {}), {});
  });
});

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

class ParserElement {
  nodeType = 1;
  nodeValue: string | null = null;
  tagName: string;
  private attrs = new Map<string, string>();
  childNodes: Array<ParserElement | { nodeType: number; nodeValue: string | null }> = [];

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  get children(): ParserElement[] {
    return this.childNodes.filter((node) => node.nodeType === 1) as ParserElement[];
  }

  get firstElementChild(): ParserElement | null {
    return this.children[0] ?? null;
  }

  get textContent(): string {
    return this.childNodes
      .map((node) => (node.nodeType === 3 ? (node.nodeValue ?? "") : (node as ParserElement).textContent))
      .join("");
  }

  set textContent(value: string) {
    this.childNodes = [{ nodeType: 3, nodeValue: value }];
  }

  get innerHTML(): string {
    return this.childNodes
      .map((node) => {
        if (node.nodeType === 3) return node.nodeValue ?? "";
        const element = node as ParserElement;
        const name = element.tagName.toLowerCase();
        const attrs = [...element.attrs].map(([key, attr]) => ` ${key}="${attr}"`).join("");
        if (voidTags.has(name)) return `<${name}${attrs}>`;
        return `<${name}${attrs}>${element.innerHTML}</${name}>`;
      })
      .join("");
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }
}

function parseElements(html: string): ParserElement {
  const root = new ParserElement("document");
  const stack = [root];
  const token = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)([^>]*)>/gi;
  let cursor = 0;

  for (const match of html.matchAll(token)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      stack.at(-1)?.childNodes.push({
        nodeType: 3,
        nodeValue: html.slice(cursor, index),
      });
    }
    cursor = index + match[0].length;
    if (match[0].startsWith("<!") || match[0].startsWith("<!--")) continue;

    if (match[1]) {
      const name = match[1].toLowerCase();
      while (stack.length > 1 && stack.at(-1)?.tagName.toLowerCase() !== name) {
        stack.pop();
      }
      if (stack.length > 1) stack.pop();
      continue;
    }

    const element = new ParserElement(match[2] ?? "div");
    const attrs = match[3] ?? "";
    for (const attr of attrs.matchAll(
      /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    )) {
      element.setAttribute(attr[1] ?? "", attr[2] ?? attr[3] ?? "");
    }
    stack.at(-1)?.childNodes.push(element);
    const selfClosing = attrs.trimEnd().endsWith("/");
    if (!voidTags.has(element.tagName.toLowerCase()) && !selfClosing) {
      stack.push(element);
    }
  }

  if (cursor < html.length) {
    stack.at(-1)?.childNodes.push({ nodeType: 3, nodeValue: html.slice(cursor) });
  }

  return root;
}

function findTag(element: ParserElement, tagName: string): ParserElement | null {
  if (element.tagName.toLowerCase() === tagName) return element;
  for (const child of element.children) {
    const found = findTag(child, tagName);
    if (found) return found;
  }
  return null;
}

function installDomParser(): void {
  class DOMParser {
    parseFromString(html: string): { body: ParserElement } {
      const tree = parseElements(html);
      return { body: findTag(tree, "body") ?? tree };
    }
  }

  (globalThis as { DOMParser?: unknown }).DOMParser = DOMParser;
}

describe("완전한 문서의 우클릭 위치", () => {
  const page = [
    "<!doctype html><html><head>",
    '<meta charset="utf-8"><title>T</title>',
    "</head><body>",
    "<a>skip</a><header>헤더</header><main><h1>제목</h1></main>",
    "</body></html>",
  ].join("");

  it("body 안 번호로 제목을 찾고, 고치면 head는 그대로 둔다", () => {
    installDomParser();

    const found = readEditableFromHtml(page, [2, 0]);
    assert.equal(found?.tagName, "h1");
    assert.equal(found?.text, "제목");

    const edited = editHtmlElement(page, [2, 0], { text: "새 제목" });
    assert.equal(edited.ok, true);
    if (!edited.ok) return;
    assert.match(edited.html, /^<!doctype html>/);
    assert.match(edited.html, /<title>T<\/title>/);
    assert.match(edited.html, /<h1>새 제목<\/h1>/);
    assert.equal(edited.html.includes("<meta"), true);
  });

  it("body가 없는 조각은 맨 바깥 태그 번호로 찾고 head를 붙이지 않는다", () => {
    installDomParser();
    const html = "<h1>제목</h1><p>본문</p>";

    assert.equal(readEditableFromHtml(html, [0])?.tagName, "h1");

    const edited = editHtmlElement(html, [0], { text: "새 제목" });
    assert.equal(edited.ok, true);
    if (!edited.ok) return;
    assert.match(edited.html, /<h1>새 제목<\/h1>/);
    assert.equal(edited.html.includes("<!doctype"), false);
    assert.equal(edited.html.includes("<title>"), false);
  });
});
