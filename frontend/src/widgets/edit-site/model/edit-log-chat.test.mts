import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { editLogInChatOrder, storedChatsToEditLog } from "./edit-log-chat.ts";

describe("editLogInChatOrder", () => {
  it("최신이 앞에 쌓인 로그를 대화 순서(오래된 것부터)로 뒤집는다", () => {
    const ordered = editLogInChatOrder([
      { historyIndex: 2, label: "세 번째" },
      { historyIndex: 1, label: "두 번째" },
    ]);

    assert.deepEqual(
      ordered.map((entry) => entry.label),
      ["두 번째", "세 번째"],
    );
  });

  it("원본 배열은 바꾸지 않는다", () => {
    const source = [{ historyIndex: 1 }, { historyIndex: 0 }];
    editLogInChatOrder(source);
    assert.deepEqual(
      source.map((entry) => entry.historyIndex),
      [1, 0],
    );
  });
});

describe("storedChatsToEditLog", () => {
  it("서버의 오래된 순서를 최신이 앞인 로그로 바꾸고 되돌리기 번호는 비운다", () => {
    const source = [
      {
        id: 1,
        type: "ai-edit" as const,
        label: "첫 요청",
        pageOrder: 2,
        createdAt: "2026-03-01T01:00:00.000Z",
      },
      {
        id: 2,
        type: "regenerate" as const,
        label: "초안으로 재생성",
        pageOrder: null,
        createdAt: "2026-03-01T02:00:00.000Z",
      },
    ];

    const log = storedChatsToEditLog(source);

    assert.deepEqual(
      log.map((entry) => entry.label),
      ["초안으로 재생성", "첫 요청"],
    );
    assert.deepEqual(
      log.map((entry) => entry.historyIndex),
      [-1, -1],
    );
    assert.equal(log[0]?.pageOrder, undefined);
    assert.equal(log[1]?.pageOrder, 2);
    assert.equal(log[0]?.id, 2);
    assert.equal(log[0]?.createdAt.toISOString(), "2026-03-01T02:00:00.000Z");
    assert.deepEqual(
      source.map((entry) => entry.id),
      [1, 2],
    );
  });
});
