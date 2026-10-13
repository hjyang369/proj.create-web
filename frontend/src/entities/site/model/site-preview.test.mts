import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_INTERACTION_SCRIPT } from "./site-interactions.ts";
import {
  buildEditablePreviewDocument,
  buildSitePreviewDocument,
  toPreviewAssetUrl,
  toPreviewHref,
} from "./site-preview.ts";

describe("toPreviewHref / toPreviewAssetUrl", () => {
  it("사이트 안 .html 링크는 미리보기에서 앵커로 바꾸고 나머지는 그대로 둔다", () => {
    assert.equal(toPreviewHref("about.html"), "#");
    assert.equal(toPreviewHref("./about.html#team"), "#team");
    assert.equal(toPreviewHref("/index.html#services"), "#services");
    assert.equal(toPreviewHref("https://example.com/a.html"), "https://example.com/a.html");
    assert.equal(toPreviewHref("mailto:a@b.com"), "mailto:a@b.com");
    assert.equal(toPreviewHref("#contact"), "#contact");
  });

  it("/uploads 경로만 백엔드 주소를 붙인다", () => {
    assert.equal(
      toPreviewAssetUrl("/uploads/photos/a.png", "http://localhost:3001/"),
      "http://localhost:3001/uploads/photos/a.png",
    );
    assert.equal(
      toPreviewAssetUrl("https://example.com/a.png", "http://localhost:3001"),
      "https://example.com/a.png",
    );
  });
});

describe("buildSitePreviewDocument", () => {
  it("페이지 번호 순으로 html과 css를 한 문서로 합친다", () => {
    const document = buildSitePreviewDocument([
      {
        pageOrder: 2,
        html: "<main>두번째</main>",
        css: "main { color: black; }",
      },
      {
        pageOrder: 1,
        html: "<main>첫번째</main>",
        css: "h1 { font-size: 2rem; }",
      },
    ]);

    const first = document.indexOf("첫번째");
    const second = document.indexOf("두번째");

    assert.ok(first >= 0);
    assert.ok(second > first);
    assert.match(document, /h1 \{ font-size: 2rem; \}/);
    assert.match(document, /main \{ color: black; \}/);
  });

  it("이용자 HTML의 script는 빼고, 서비스 동작 스크립트만 넣는다", () => {
    const document = buildSitePreviewDocument([
      {
        pageOrder: 1,
        html: '<main>안녕<script>alert(1)</script><button type="button" onclick="alert(2)" data-action="alert(3)" data-target="x">버튼</button><button type="button" data-action="modal.open" data-target="m">열기</button><button type="button" data-action="tabs.select" data-target="tab-price">가격</button><a href="javascript:alert(4)">링크</a></main>',
        css: "a {}</style><script>alert(1)</script>",
      },
    ]);

    assert.equal(document.includes("<script>alert(1)"), false);
    assert.equal(document.includes("onclick"), false);
    assert.equal(document.includes("javascript:"), false);
    assert.equal(document.includes('data-action="alert(3)"'), false);
    assert.equal(document.includes('data-action="modal.open"'), false);
    assert.equal(document.includes('data-action="tabs.select"'), true);
    assert.equal(document.includes(SITE_INTERACTION_SCRIPT), true);
    assert.equal(document.includes("</style><script>"), false);
    assert.match(document, /안녕/);
  });

  it("섹션 링크는 미리보기 문서 안에서 이동한다", () => {
    const document = buildSitePreviewDocument([
      {
        pageOrder: 1,
        html: '<a href="#services">이동</a><section id="services">서비스</section>',
        css: "",
      },
    ]);

    assert.match(document, /<base href="about:srcdoc">/);
    assert.match(document, /href="#services"/);
  });

  it("다른 페이지의 섹션 링크도 같은 미리보기 안에서 이동한다", () => {
    const document = buildSitePreviewDocument([
      {
        pageOrder: 2,
        html: '<a href="index.html#services">이동</a><a href="./about.html#team">팀</a>',
        css: "",
      },
    ]);

    assert.match(document, /href="#services"/);
    assert.match(document, /href="#team"/);
    assert.equal(document.includes(".html#"), false);
  });

  it("미리보기의 /uploads 주소만 백엔드 주소로 바꾼다", () => {
    const document = buildSitePreviewDocument(
      [
        {
          pageOrder: 1,
          html: '<img src="/uploads/photos/a.png" alt=""><img src="https://example.com/a.png" alt=""><img src="http://localhost:3001/uploads/photos/c.png" alt="">',
          css: "main { background: url(/uploads/photos/b.png); }",
        },
      ],
      "http://localhost:3001",
    );

    assert.match(
      document,
      /src="http:\/\/localhost:3001\/uploads\/photos\/a.png"/,
    );
    assert.match(
      document,
      /url\(http:\/\/localhost:3001\/uploads\/photos\/b.png\)/,
    );
    assert.match(document, /src="https:\/\/example.com\/a.png"/);
    assert.match(
      document,
      /src="http:\/\/localhost:3001\/uploads\/photos\/c.png"/,
    );
    assert.equal(
      document.includes("http://localhost:3001http://localhost:3001"),
      false,
    );
  });
});

describe("buildEditablePreviewDocument", () => {
  it("편집 미리보기는 head를 빼고 body 안만 넣어서 헤더 번호가 밀리지 않게 한다", () => {
    const document = buildEditablePreviewDocument([
      {
        pageOrder: 1,
        html: '<<!doctype html><html><head><meta charset="utf-8"><title>인네이처</title><link rel="stylesheet" href="style.css"></head><body><a>건너뛰기</a><header>헤더</header><main>본문</main></body></html>',
        css: "",
      },
    ]);

    const innerStart =
      document.indexOf('style="display:contents">') +
      'style="display:contents">'.length;
    const inner = document.slice(innerStart, document.indexOf("</div>", innerStart));

    assert.equal(inner.includes("<title>"), false);
    assert.equal(inner.includes("<meta"), false);
    assert.equal(inner.includes('href="style.css"'), false);
    assert.equal(inner.includes("<a>건너뛰기</a>"), true);
    assert.equal(inner.includes("<header>헤더</header>"), true);
    assert.equal(inner.includes("<main>본문</main>"), true);
    assert.ok(inner.indexOf("<a>건너뛰기</a>") < inner.indexOf("<header>헤더</header>"));
  });

  it("보기 모드에서는 클릭을 가로채지 않고, 편집 모드에서만 요소를 고른다", () => {
    const document = buildEditablePreviewDocument([
      {
        pageOrder: 1,
        html: '<a href="#services">이동</a><button type="button">예약</button>',
        css: "",
      },
    ]);

    const gate = document.indexOf("if(!editing)return;");
    const prevent = document.indexOf("e.preventDefault();");

    assert.match(document, /crep-set-mode/);
    assert.match(document, /html\.crep-editing/);
    assert.ok(gate >= 0);
    assert.ok(prevent > gate);
    assert.match(document, /addEventListener\('click',function\(e\)\{/);
    assert.match(document, /\},true\)/);
  });

  it("편집 모드에서만 우클릭을 가로채 위치를 부모에게 알린다", () => {
    const document = buildEditablePreviewDocument([
      { pageOrder: 1, html: "<a href='#a'>링크</a>", css: "" },
    ]);

    const start = document.indexOf("addEventListener('contextmenu'");
    const gate = document.indexOf("if(!editing)return;", start);
    const prevent = document.indexOf("e.preventDefault();", start);
    const post = document.indexOf("crep-contextmenu", start);

    assert.ok(start >= 0);
    assert.ok(gate > start);
    assert.ok(prevent > gate);
    assert.ok(post > gate);
    assert.match(document, /path:path/);
    assert.match(document, /getComputedStyle\(target\)/);
    assert.match(document, /fontSize:fontSize/);
    assert.match(document, /fontWeight:fontWeight/);
    assert.match(document, /backgroundColor:backgroundColor/);
    assert.match(document, /backgroundImage:backgroundImage/);
    assert.match(document, /solePicture/);
    assert.match(document, /paintedImage/);
    assert.match(document, /backgroundOwner/);
    assert.match(document, /backgroundPath:backgroundPath/);
    const pick = document.indexOf("function pickTarget");
    assert.match(document, /if\(el\.tagName==='IMG'\)return el;/);
    const divCheck = document.indexOf("tagName==='DIV'", pick);
    const closestLink = document.indexOf("closest('a')", pick);
    assert.ok(divCheck > pick && divCheck < closestLink);
    const ownerFn = document.indexOf("function backgroundOwner");
    const imgOwner = document.indexOf("tagName==='IMG'", ownerFn);
    const closestDiv = document.indexOf("closestDiv", ownerFn);
    assert.ok(imgOwner > ownerFn && imgOwner < closestDiv);
    const paintedCall = document.indexOf("paintedImage", ownerFn);
    assert.ok(closestDiv > ownerFn && closestDiv < paintedCall);
    assert.match(document, /\/url\\\(\/i/);
    assert.match(document, /style:styleAttr/);
    assert.match(document, /getContext\('2d'\)/);
  });

  it("부모가 보낸 수정값을 그 위치의 요소 하나에만 반영한다", () => {
    const document = buildEditablePreviewDocument([
      { pageOrder: 1, html: "<h1>제목</h1>", css: "" },
    ]);

    assert.match(document, /crep-patch/);
    assert.match(document, /removeAttribute\('srcset'\)/);
    assert.match(document, /data\.fontSize/);
    assert.match(document, /data\.color/);
    assert.match(document, /data\.style/);
  });
});
