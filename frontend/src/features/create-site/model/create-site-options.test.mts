import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PURPOSE_OPTIONS, MOOD_OPTIONS, PAGE_OPTIONS, LINK_FIELDS } from "./create-site-options.ts";

describe("create-site-options", () => {
  it("제작 목적은 중복 없이 6가지이다", () => {
    assert.equal(PURPOSE_OPTIONS.length, 6);
    const values = PURPOSE_OPTIONS.map((o) => o.value);
    assert.equal(new Set(values).size, 6);
    assert.ok(PURPOSE_OPTIONS.every((o) => o.value.length > 0 && o.label.length > 0));
  });

  it("제작 목적 레이블에 PROJECT.md에 명시된 항목이 모두 포함된다", () => {
    const labels = PURPOSE_OPTIONS.map((o) => o.label);
    assert.ok(labels.some((l) => l.includes("회사소개")));
    assert.ok(labels.some((l) => l.includes("투자") || l.includes("IR")));
    assert.ok(labels.some((l) => l.includes("영업") || l.includes("고객")));
    assert.ok(labels.some((l) => l.includes("채용")));
    assert.ok(labels.some((l) => l.includes("서비스") || l.includes("홍보")));
    assert.ok(labels.some((l) => l.includes("문의") || l.includes("상담")));
  });

  it("분위기 선택지는 4가지 이상이고 중복이 없다", () => {
    assert.ok(MOOD_OPTIONS.length >= 4);
    const values = MOOD_OPTIONS.map((o) => o.value);
    assert.equal(new Set(values).size, MOOD_OPTIONS.length);
  });

  it("페이지 구성 선택지는 8가지이다", () => {
    assert.equal(PAGE_OPTIONS.length, 8);
    const values = PAGE_OPTIONS.map((o) => o.value);
    assert.equal(new Set(values).size, 8);
    assert.ok(PAGE_OPTIONS.every((o) => o.value.length > 0 && o.label.length > 0));
  });

  it("링크 필드는 6가지이다", () => {
    assert.equal(LINK_FIELDS.length, 6);
    assert.ok(LINK_FIELDS.every((f) => f.name && f.label && f.placeholder));
  });
});
