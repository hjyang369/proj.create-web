import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REVIEW_PREVIEW_LENGTH,
  reviewLoginVisible,
  reviewPreviewScript,
  visibleReviewText,
} from "./review-preview.ts";

const full = "커피 향이 좋고 자리가 편안해서 다시 오고 싶습니다. 원두 맛이 분명합니다.";

describe("visibleReviewText", () => {
  it("일부 공개는 앞부분만 보여 준다", () => {
    const shown = visibleReviewText(full, "partial", false);
    assert.equal(shown.endsWith("…"), true);
    assert.equal(shown.length, REVIEW_PREVIEW_LENGTH + 1);
    assert.equal(shown.startsWith(full.slice(0, REVIEW_PREVIEW_LENGTH)), true);
  });

  it("전체 공개라도 로그인 전에는 앞부분만 보여 준다", () => {
    assert.equal(
      visibleReviewText(full, "full", false),
      visibleReviewText(full, "partial", false),
    );
  });

  it("전체 공개는 로그인하면 전문을 보여 준다", () => {
    assert.equal(visibleReviewText(full, "full", true), full);
  });

  it("짧은 리뷰는 자르지 않는다", () => {
    assert.equal(visibleReviewText("좋아요", "partial", false), "좋아요");
  });
});

describe("reviewLoginVisible", () => {
  it("전체 공개이고 로그인 전일 때만 로그인 버튼을 보여 준다", () => {
    assert.equal(reviewLoginVisible("full", false), true);
    assert.equal(reviewLoginVisible("full", true), false);
    assert.equal(reviewLoginVisible("partial", false), false);
  });
});

describe("reviewPreviewScript", () => {
  it("리뷰가 없으면 스크립트를 넣지 않는다", () => {
    assert.equal(reviewPreviewScript(null), "");
  });

  it("미리보기 스크립트는 부모의 로그인 알림을 받는다", () => {
    const script = reviewPreviewScript("full");
    assert.equal(script.includes("crep-review-session"), true);
    assert.equal(script.includes("data-review-content"), true);
    assert.equal(script.includes("data-review-login"), true);
  });
});
