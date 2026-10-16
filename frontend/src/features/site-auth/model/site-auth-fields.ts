const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 사이트 로그인·회원가입 칸이 비었거나 형식에 맞지 않으면 안내 문구를 돌려준다. */
export function siteAuthFieldError(input: {
  view: "login" | "signup";
  email: string;
  name: string;
  password: string;
}): string | null {
  const email = input.email.trim();
  if (!email) return "이메일을 입력해 주세요.";
  if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    return "올바른 이메일 형식이 아닙니다.";
  }

  if (input.view === "signup") {
    const name = input.name.trim();
    if (name.length < 2) return "이름은 2자 이상이어야 합니다.";
    if (name.length > 100) return "이름은 100자 이하여야 합니다.";
  }

  if (!input.password) return "비밀번호를 입력해 주세요.";
  if (input.password.length > 72) return "비밀번호는 72자 이하여야 합니다.";
  if (input.view === "signup" && input.password.length < 8) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }

  return null;
}
