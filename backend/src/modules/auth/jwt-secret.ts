export function requireJwtSecret(value: string | undefined): string {
  const secret = value?.trim();
  if (!secret) {
    throw new Error(
      "JWT_SECRET이 비어 있습니다. backend/.env에 비밀 값을 넣어 주세요.",
    );
  }
  return secret;
}
