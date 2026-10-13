import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateChatHistoryDto } from "./create-chat-history.dto.js";

async function messagesFor(body: object, property: string) {
  const dto = plainToInstance(CreateChatHistoryDto, body);
  const errors = await validate(dto);
  const match = errors.find((error) => error.property === property);
  return Object.values(match?.constraints ?? {});
}

describe("CreateChatHistoryDto", () => {
  it("AI 수정과 다시 만들기 외의 종류는 거절한다", async () => {
    const messages = await messagesFor(
      { type: "manual", label: "직접 고침" },
      "type",
    );
    expect(messages.length).toBeGreaterThan(0);
  });

  it("빈 문장은 거절한다", async () => {
    const messages = await messagesFor(
      { type: "ai-edit", label: "   " },
      "label",
    );
    expect(messages.length).toBeGreaterThan(0);
  });

  it("페이지 번호가 없으면 통과한다", async () => {
    const messages = await messagesFor(
      { type: "regenerate", label: "다시 만들기" },
      "pageOrder",
    );
    expect(messages).toEqual([]);
  });
});
