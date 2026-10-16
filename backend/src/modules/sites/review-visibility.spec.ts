import { describe, expect, it } from "vitest";
import {
  ReviewVisibilityError,
  applyReviewMarkup,
  resolveReviewVisibility,
} from "./review-visibility.js";

describe("resolveReviewVisibility", () => {
  it("리뷰를 고르지 않으면 공개 범위를 저장하지 않는다", () => {
    expect(
      resolveReviewVisibility({
        selectedPages: ["about"],
        reviewVisibility: "full",
      }),
    ).toBeNull();
  });

  it("리뷰를 골랐는데 공개 범위가 없으면 거절한다", () => {
    expect(() =>
      resolveReviewVisibility({
        selectedPages: ["review"],
        reviewVisibility: "",
      }),
    ).toThrow(new ReviewVisibilityError("리뷰 공개 범위를 선택해 주세요."));
  });

  it("일부 공개는 로그인 없이도 저장한다", () => {
    expect(
      resolveReviewVisibility({
        selectedPages: ["review"],
        reviewVisibility: "partial",
      }),
    ).toBe("partial");
  });

  it("전체 공개는 로그인·회원가입이 없으면 거절한다", () => {
    expect(() =>
      resolveReviewVisibility({
        selectedPages: ["review"],
        reviewVisibility: "full",
      }),
    ).toThrow(
      new ReviewVisibilityError(
        "리뷰를 전체 공개하려면 로그인·회원가입을 함께 선택해 주세요.",
      ),
    );
  });

  it("전체 공개는 로그인·회원가입이 있으면 저장한다", () => {
    expect(
      resolveReviewVisibility({
        selectedPages: ["review", "auth"],
        reviewVisibility: "full",
      }),
    ).toBe("full");
  });
});

describe("applyReviewMarkup", () => {
  const html =
    '<nav><a href="#home">홈</a></nav><main><h1>카페</h1></main>';

  it("일부 공개 메인에는 리뷰 구역과 메뉴만 넣고 로그인 링크는 넣지 않는다", () => {
    const next = applyReviewMarkup(html, 1, "partial");

    expect(next).toContain('href="#reviews"');
    expect(next).toContain("리뷰");
    expect(next).toContain('id="reviews"');
    expect(next).toContain("data-review-content");
    expect(next).not.toContain("data-review-login");
  });

  it("전체 공개는 리뷰마다 로그인 링크를 넣는다", () => {
    const next = applyReviewMarkup(html, 1, "full");

    expect(next).toContain('href="/login"');
    expect(next).toContain("data-review-login");
    expect(next).toContain("data-review-content");
  });

  it("서브페이지 메뉴는 메인 리뷰 구역으로 이동한다", () => {
    const next = applyReviewMarkup(html, 2, "partial");

    expect(next).toContain('href="index.html#reviews"');
    expect(next).not.toContain('id="reviews"');
  });

  it("이미 있는 리뷰 본문은 유지하고 없는 로그인 링크만 보탠다", () => {
    const existing =
      '<nav><a href="#reviews">리뷰</a></nav><main><section id="reviews"><article data-review><p data-review-content>커피가 좋아요</p></article></section></main>';

    const next = applyReviewMarkup(existing, 1, "full");

    expect(next).toContain("커피가 좋아요");
    expect(next).toContain("data-review-login");
    expect(next.match(/id="reviews"/g)).toHaveLength(1);
  });

  it("일부 공개면 모델이 넣은 로그인 링크를 뺀다", () => {
    const existing =
      '<nav><a href="#reviews">리뷰</a></nav><main><section id="reviews"><article data-review><p data-review-content>커피가 좋아요</p><a href="/login" data-review-login>로그인</a></article></section></main>';

    const next = applyReviewMarkup(existing, 1, "partial");

    expect(next).toContain("커피가 좋아요");
    expect(next).not.toContain("data-review-login");
  });
});
