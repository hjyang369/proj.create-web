import { readStoredPageContent } from "./site-page-content.js";

describe("readStoredPageContent", () => {
  it("저장된 component_data에서 html과 css만 꺼낸다", () => {
    expect(
      readStoredPageContent({
        html: "<main>카페</main>",
        css: "main { color: black; }",
        extra: "버림",
      }),
    ).toEqual({
      html: "<main>카페</main>",
      css: "main { color: black; }",
    });
  });

  it("html이나 css가 없으면 페이지로 쓰지 않는다", () => {
    expect(readStoredPageContent({ html: "<main></main>" })).toBeNull();
    expect(readStoredPageContent(null)).toBeNull();
  });
});
