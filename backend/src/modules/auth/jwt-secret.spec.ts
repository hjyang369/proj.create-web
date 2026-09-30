import { requireJwtSecret } from "./jwt-secret.js";

describe("requireJwtSecret", () => {
  it("비어 있으면 서버를 시작하지 않는다", () => {
    expect(() => requireJwtSecret("")).toThrow(/JWT_SECRET/);
    expect(() => requireJwtSecret("   ")).toThrow(/JWT_SECRET/);
    expect(() => requireJwtSecret(undefined)).toThrow(/JWT_SECRET/);
  });

  it("값이 있으면 앞뒤 공백을 없애서 돌려준다", () => {
    expect(requireJwtSecret("  local-secret  ")).toBe("local-secret");
  });
});
