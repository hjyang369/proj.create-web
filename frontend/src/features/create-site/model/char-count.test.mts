import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeCharCount } from "./char-count.ts";

describe("describeCharCount", () => {
  it("현재 글자 수와 최대 글자 수를 보여 준다", () => {
    assert.deepEqual(describeCharCount("카페", 100), {
      count: 2,
      max: 100,
      label: "2 / 100",
      exceeded: false,
    });
  });

  it("최대 글자 수를 넘기면 초과로 표시한다", () => {
    const value = "a".repeat(101);

    assert.deepEqual(describeCharCount(value, 100), {
      count: 101,
      max: 100,
      label: "101 / 100",
      exceeded: true,
    });
  });

  it("최대 글자 수와 같으면 초과가 아니다", () => {
    assert.equal(describeCharCount("a".repeat(500), 500).exceeded, false);
  });
});
