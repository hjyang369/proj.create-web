import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldReplaceSiteImages } from "./should-replace-site-images.ts";

const current = {
  logoUrl: "/uploads/logos/logo.png",
  photoUrls: ["/uploads/photos/a.png"],
};

describe("shouldReplaceSiteImages", () => {
  it("기존 이미지를 그대로 두면 다시 저장하지 않는다", () => {
    assert.equal(
      shouldReplaceSiteImages(current, {
        hasNewLogo: false,
        keepExistingLogo: true,
        newPhotoCount: 0,
        keptPhotoUrls: ["/uploads/photos/a.png"],
      }),
      false,
    );
  });

  it("사진을 빼거나 새 파일을 올리면 다시 저장한다", () => {
    assert.equal(
      shouldReplaceSiteImages(current, {
        hasNewLogo: false,
        keepExistingLogo: true,
        newPhotoCount: 0,
        keptPhotoUrls: [],
      }),
      true,
    );
    assert.equal(
      shouldReplaceSiteImages(current, {
        hasNewLogo: true,
        keepExistingLogo: false,
        newPhotoCount: 0,
        keptPhotoUrls: current.photoUrls,
      }),
      true,
    );
  });
});