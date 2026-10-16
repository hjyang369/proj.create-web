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

describe("CreateSiteDto links", () => {
  it("링크는 하나여도 목록으로 받고, 빈 칸은 빼며, 6개는 거절한다", async () => {
    const dto = plainToInstance(CreateSiteDto, {
      ...validBody,
      blogLink: "https://blog.naver.com/one",
      websiteLink: ["  ", "https://a.example", "https://b.example"],
    });
    const errors = await validate(dto);

    expect(errors.find((error) => error.property === "blogLink")).toBeUndefined();
    expect(errors.find((error) => error.property === "websiteLink")).toBeUndefined();
    expect(dto.blogLink).toEqual(["https://blog.naver.com/one"]);
    expect(dto.websiteLink).toEqual(["https://a.example", "https://b.example"]);

    const tooMany = await messagesFor(
      {
        ...validBody,
        blogLink: Array.from(
          { length: 6 },
          (_, index) => `https://blog.example/${index}`,
        ),
      },
      "blogLink",
    );
    expect(tooMany).toContain("블로그는 5개까지 넣을 수 있습니다.");
  });
});

describe("CreateSiteDto reviewVisibility", () => {
  it("리뷰 공개 범위가 일부 공개나 전체 공개가 아니면 거절한다", async () => {
    const messages = await messagesFor(
      { ...validBody, reviewVisibility: "all" },
      "reviewVisibility",
    );
    expect(messages).toContain("리뷰 공개 범위를 선택해 주세요.");
  });
});
