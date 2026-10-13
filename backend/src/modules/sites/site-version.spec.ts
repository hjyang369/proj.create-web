import {
  editorPages,
  markHistoryItems,
  snapshotFromPages,
} from "./site-version.js";

describe("snapshotFromPages", () => {
  it("저장 뒤에 화면 페이지를 고쳐도 스냅샷 글자는 그대로다", () => {
    const page = {
      pageType: "company_intro",
      pageOrder: 1,
      html: "<main>저장 전</main>",
      css: "main{}",
    };

    const snapshot = snapshotFromPages([page]);
    page.html = "<main>저장 후</main>";

    expect(snapshot.pages[0]?.html).toBe("<main>저장 전</main>");
  });
});

describe("editorPages", () => {
  const livePages = [
    {
      pageType: "company_intro",
      pageOrder: 1,
      html: "<main>지금 페이지</main>",
      css: "",
    },
  ];

  it("편집 중인 버전이 없으면 지금 site_pages 내용을 보여 준다", () => {
    expect(editorPages(livePages, null)).toEqual(livePages);
  });

  it("편집 중인 버전이 있으면 그 스냅샷 페이지만 보여 준다", () => {
    const snapshot = {
      pages: [
        {
          pageType: "company_intro",
          pageOrder: 1,
          html: "<main>버전 1</main>",
          css: "h1{}",
        },
      ],
    };

    expect(editorPages(livePages, snapshot)).toEqual(snapshot.pages);
  });

  it("스냅샷 형식이 깨져 있으면 지금 site_pages 내용을 보여 준다", () => {
    expect(editorPages(livePages, { pages: "깨진 값" })).toEqual(livePages);
  });
});

describe("markHistoryItems", () => {
  it("행 id가 편집 중·배포 중 번호와 같을 때만 표시한다", () => {
    const items = markHistoryItems(
      [
        { id: 3, createdAt: new Date("2026-03-03T00:00:00.000Z") },
        { id: 2, createdAt: new Date("2026-03-02T00:00:00.000Z") },
        { id: 1, createdAt: new Date("2026-03-01T00:00:00.000Z") },
      ],
      1,
      2,
    );

    expect(items).toEqual([
      {
        id: 3,
        createdAt: "2026-03-03T00:00:00.000Z",
        isEditing: false,
        isPublished: false,
      },
      {
        id: 2,
        createdAt: "2026-03-02T00:00:00.000Z",
        isEditing: false,
        isPublished: true,
      },
      {
        id: 1,
        createdAt: "2026-03-01T00:00:00.000Z",
        isEditing: true,
        isPublished: false,
      },
    ]);
  });
});
