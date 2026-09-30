import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeSiteList, resolveSiteListState } from "./site-list-view.ts";

const cafe = {
  id: 1,
  name: "카페",
  type: "web" as const,
  status: "draft" as const,
  thumbnailUrl: null,
  updatedAt: "2026-03-02T00:00:00.000Z",
};

describe("describeSiteList", () => {
  it("웹 초안 사이트를 편집중 목록으로 보여 준다", () => {
    assert.deepEqual(describeSiteList({ kind: "ready", sites: [cafe] }), {
      title: "내 사이트",
      message: null,
      action: null,
      items: [
        {
          id: 1,
          name: "카페",
          typeLabel: "웹",
          statusLabel: "편집중",
          updatedLabel: "2026년 3월 2일",
          thumbnailUrl: null,
        },
      ],
    });
  });

  it("만든 사이트가 없으면 빈 안내를 보여 준다", () => {
    assert.deepEqual(describeSiteList({ kind: "empty" }), {
      title: "내 사이트",
      message: "아직 만든 사이트가 없습니다.",
      action: { href: "/create", label: "사이트 만들기" },
      items: [],
    });
  });

  it("로그인하지 않으면 목록 대신 로그인 안내를 보여 준다", () => {
    const view = describeSiteList({ kind: "guest" });

    assert.equal(view.message, "로그인하면 내가 만든 사이트를 볼 수 있습니다.");
    assert.equal(view.action, null);
  });

  it("앱 배포 사이트는 앱과 배포됨으로 보여 준다", () => {
    const view = describeSiteList({
      kind: "ready",
      sites: [
        {
          id: 2,
          name: "가게",
          type: "app",
          status: "published",
          thumbnailUrl: "https://example.com/a.png",
          updatedAt: "2026-01-15T15:00:00.000Z",
        },
      ],
    });

    assert.deepEqual(view.items[0], {
      id: 2,
      name: "가게",
      typeLabel: "앱",
      statusLabel: "배포됨",
      updatedLabel: "2026년 1월 16일",
      thumbnailUrl: "https://example.com/a.png",
    });
  });

  it("생성 중인 사이트는 생성중으로 보여 준다", () => {
    const view = describeSiteList({
      kind: "ready",
      sites: [
        {
          ...cafe,
          status: "generating",
        },
      ],
    });

    assert.equal(view.items[0]?.statusLabel, "생성중");
  });

  it("불러오는 중이면 대기 안내를 보여 준다", () => {
    assert.equal(
      describeSiteList({ kind: "loading" }).message,
      "사이트를 불러오는 중입니다.",
    );
  });

  it("로그아웃하면 이전에 불러온 빈 목록을 보여 주지 않는다", () => {
    assert.equal(
      resolveSiteListState({ ready: true, user: null }, { kind: "empty" }).kind,
      "guest",
    );
  });

  it("불러오기 실패 문구를 그대로 보여 준다", () => {
    assert.equal(
      describeSiteList({ kind: "error", message: "로그인이 필요합니다." }).message,
      "로그인이 필요합니다.",
    );
  });
});
