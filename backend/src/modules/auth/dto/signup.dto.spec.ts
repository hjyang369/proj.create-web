import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SignupDto } from "./signup.dto.js";

const validBody = {
  email: "user@example.com",
  name: "홍길동",
  password: "password123",
};

async function messagesFor(body: object, property: string) {
  const dto = plainToInstance(SignupDto, body);
  const errors = await validate(dto);
  const match = errors.find((error) => error.property === property);
  return Object.values(match?.constraints ?? {});
}

describe("SignupDto", () => {
  it("8자보다 짧은 비밀번호를 거절한다", async () => {
    const messages = await messagesFor(
      { ...validBody, password: "short" },
      "password",
    );
    expect(messages).toContain("비밀번호는 8자 이상이어야 합니다.");
  });

  it("이메일 형식이 아니면 거절한다", async () => {
    const messages = await messagesFor(
      { ...validBody, email: "not-an-email" },
      "email",
    );
    expect(messages).toContain("올바른 이메일 형식이 아닙니다.");
  });

  it("이름이 2자보다 짧으면 거절한다", async () => {
    const messages = await messagesFor({ ...validBody, name: "홍" }, "name");
    expect(messages).toContain("이름은 2자 이상이어야 합니다.");
  });
});
