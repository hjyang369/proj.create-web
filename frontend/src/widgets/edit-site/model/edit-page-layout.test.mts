import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeEditPageChrome,
  initialSidebarOpen,
} from "./edit-page-layout.ts";

describe("describeEditPageChrome", () => {
  it("미리보기는 왼쪽, 사이드바는 오른쪽에 둔다", () => {
    const chrome = describeEditPageChrome();

    assert.equal(chrome.previewSide, "left");
    assert.equal(chrome.sidebarSide, "right");
  });

  it("뒤로가기와 앞으로가기는 아직 눌리지 않고 저장하기는 보여 준다", () => {
    const chrome = describeEditPageChrome();

    assert.deepEqual(chrome.history, {
      back: { label: "뒤로가기", enabled: false },
      forward: { label: "앞으로가기", enabled: false },
    });
    assert.equal(chrome.save.label, "저장하기");
  });
});

describe("initialSidebarOpen", () => {
  it("넓은 화면에서는 사이드바를 펼치고 좁은 화면에서는 접는다", () => {
    assert.equal(initialSidebarOpen(true), true);
    assert.equal(initialSidebarOpen(false), false);
  });
});
