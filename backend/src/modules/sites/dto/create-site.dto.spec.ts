import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateSiteDto } from "./create-site.dto.js";

const validBody = {
  name: "카페",
  tagline: "좋은 커피",
  purpose: "company_intro",
};

async function messagesFor(body: object, property: string) {
  const dto = plainToInstance(CreateSiteDto, body);
  const errors = await validate(dto);
  const match = errors.find((error) => error.property === property);
  return Object.values(match?.constraints ?? {});
}

describe("CreateSiteDto mood", () => {
  it("화면의 6개 분위기가 아니면 거절한다", async () => {
    const messages = await messagesFor(
      { ...validBody, mood: "cozy" },
      "mood",
    );
    expect(messages).toContain("올바른 분위기를 선택해 주세요.");
  });

  it("분위기를 비워 두면 통과한다", async () => {
    const messages = await messagesFor({ ...validBody, mood: "" }, "mood");
    expect(messages).toEqual([]);
  });
});
