import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendSelectedPhotos } from "./site-photos.ts";

function photo(name: string) {
  return new File(["x"], name, { type: "image/png" });
}

describe("appendSelectedPhotos", () => {
  it("이미 고른 사진 뒤에 새로 고른 사진을 붙인다", () => {
    const first = photo("a.png");
    const second = photo("b.png");
    const added = photo("c.png");

    const result = appendSelectedPhotos([first, second], [added]);

    assert.equal(result.length, 3);
    assert.equal(result[0], first);
    assert.equal(result[1], second);
    assert.equal(result[2], added);
  });

  it("파일 선택을 취소하면 이미 고른 사진을 그대로 둔다", () => {
    const current = [photo("a.png")];

    const result = appendSelectedPhotos(current, []);

    assert.equal(result, current);
  });
});
