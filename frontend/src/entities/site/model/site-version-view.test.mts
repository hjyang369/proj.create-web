import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyOpenedVersion,
  describeVersionBadges,
  formatVersionCreatedAt,
} from "./site-version-view.ts";

const current = {
  id: 4,
  name: "카페",
  pages: [
    {
      pageType: "company_intro",
      pageOrder: 1,
      html: "<main>지금</main>",
      css: "main{}",
    },
  ],
  inputs: null,
  editingHistoryId: 3,
  publishedHistoryId: 2,
};

describe("describeVersionBadges", () => {
  it("배포 중과 편집 중은 그 줄의 표시가 있을 때만 붙인다", () => {
    assert.deepEqual(
      describeVersionBadges({ isEditing: true, isPublished: false }),
      ["편집 중"],
    );
    assert.deepEqual(
      describeVersionBadges({ isEditing: false, isPublished: true }),
      ["배포 중"],
    );
    assert.deepEqual(
      describeVersionBadges({ isEditing: false, isPublished: false }),
      [],
    );
  });
});

describe("formatVersionCreatedAt", () => {
  it("저장 시각을 서울 시간으로 보여 준다", () => {
    assert.equal(
      formatVersionCreatedAt("2026-03-02T00:00:00.000Z"),
      "2026년 3월 2일 09:00",
    );
  });
});

describe("applyOpenedVersion", () => {
  it("연 버전의 페이지만 바꾸고 입력값과 배포 중 버전은 유지한다", () => {
    const openedPages = [
      {
        pageType: "company_intro",
        pageOrder: 1,
        html: "<main>버전 1</main>",
        css: "h1{}",
      },
    ];

    const next = applyOpenedVersion(current, {
      historyId: 1,
      editingHistoryId: 1,
      publishedHistoryId: 2,
      pages: openedPages,
    });
    openedPages[0].html = "<main>나중에 고침</main>";

    assert.equal(next.editingHistoryId, 1);
    assert.equal(next.publishedHistoryId, 2);
    assert.equal(next.name, "카페");
    assert.equal(next.inputs, null);
    assert.equal(next.pages[0]?.html, "<main>버전 1</main>");
  });
});
