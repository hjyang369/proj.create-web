import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginDto } from "./login.dto.js";

const validBody = {
  email: "user@example.com",
  password: "password123",
};

async function messagesFor(body: object, property: string) {
  const dto = plainToInstance(LoginDto, body);
  const errors = await validate(dto);
  const match = errors.find((error) => error.property === property);
  return Object.values(match?.constraints ?? {});
}

describe("LoginDto", () => {
  it("이메일 형식이 아니면 거절한다", async () => {
    const messages = await messagesFor(
      { ...validBody, email: "not-an-email" },
      "email",
    );
    expect(messages).toContain("올바른 이메일 형식이 아닙니다.");
  });

  it("비밀번호가 비어 있으면 거절한다", async () => {
    const messages = await messagesFor({ ...validBody, password: "" }, "password");
    expect(messages).toContain("비밀번호를 입력해 주세요.");
  });
});
