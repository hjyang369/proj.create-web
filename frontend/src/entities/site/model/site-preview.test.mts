import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSitePreviewDocument } from "./site-preview.ts";

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

  it("script 태그와 css 안의 style 종료는 미리보기 문서 밖으로 새지 않는다", () => {
    const document = buildSitePreviewDocument([
      {
        pageOrder: 1,
        html: '<main>안녕<script>alert(1)</script></main>',
        css: "a {}</style><script>alert(1)</script>",
      },
    ]);

    assert.equal(document.toLowerCase().includes("<script"), false);
    assert.match(document, /안녕/);
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
