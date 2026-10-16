const frameStyle = [
  "max-width:420px",
  "margin:32px auto",
  "padding:0 16px 32px",
  "color:#171717",
  "font-size:16px",
  "line-height:1.5",
].join(";");

const fieldStyle = [
  "width:100%",
  "box-sizing:border-box",
  "margin-top:8px",
  "padding:10px 12px",
  "border:1px solid #d4d4d4",
  "border-radius:8px",
  "background:#fff",
  "color:#171717",
  "font:inherit",
].join(";");

const primaryStyle = [
  "display:inline-flex",
  "align-items:center",
  "justify-content:center",
  "width:100%",
  "height:44px",
  "border:0",
  "border-radius:8px",
  "background:#171717",
  "color:#fff",
  "font:inherit",
  "cursor:pointer",
].join(";");

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function frame(body: string): string {
  return `<section class="crep-auth" style="${frameStyle}">${body}</section>`;
}

/** 만든 사이트 본문에 그대로 넣을 로그인·회원가입 폼. */
export function siteAuthFormHtml(input: {
  view: "login" | "signup";
  email: string;
  name?: string;
  error?: string;
}): string {
  const email = escapeHtml(input.email);
  const error = input.error
    ? `<p style="margin:0;color:#171717;">${escapeHtml(input.error)}</p>`
    : "";
  const name =
    input.view === "signup"
      ? `<label>이름
        <input name="name" maxlength="100" value="${escapeHtml(input.name ?? "")}" style="${fieldStyle}">
      </label>`
      : "";
  const title = input.view === "login" ? "로그인" : "회원가입";
  const submit = input.view === "login" ? "로그인" : "회원가입";
  const switchLink =
    input.view === "login"
      ? `<p style="margin:0;">계정이 없나요? <a href="/signup" style="color:inherit;">회원가입</a></p>`
      : `<p style="margin:0;">이미 계정이 있나요? <a href="/login" style="color:inherit;">로그인</a></p>`;

  return frame(`
    <h1 style="margin:0 0 16px;font-size:24px;">${title}</h1>
    <form data-crep-auth-form="${input.view}" style="display:flex;flex-direction:column;gap:16px;">
      ${name}
      <label>이메일
        <input name="email" type="email" maxlength="255" value="${email}" style="${fieldStyle}">
      </label>
      <label>비밀번호
        <input name="password" type="password" maxlength="72" style="${fieldStyle}">
      </label>
      ${error}
      <button type="submit" style="${primaryStyle}">${submit}</button>
      ${switchLink}
    </form>
  `);
}

/** 만든 사이트 본문에 그대로 넣을 로그인 완료 안내. */
export function siteAuthStatusHtml(input: { name: string }): string {
  return frame(`
    <h1 style="margin:0 0 16px;font-size:24px;">로그인됨</h1>
    <p style="margin:0 0 16px;">${escapeHtml(input.name)}님으로 이 사이트에 들어와 있습니다.</p>
    <button type="button" data-crep-auth="logout" style="${primaryStyle}">로그아웃</button>
  `);
}
