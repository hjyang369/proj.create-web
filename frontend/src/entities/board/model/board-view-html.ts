import { formatBoardDate } from "./format-board-date";

type BoardViewPost = {
  id: number;
  title: string;
  createdAt: string;
};

const frameStyle = [
  "max-width:720px",
  "margin:32px auto",
  "padding:0 16px 32px",
  "color:#171717",
  "font-size:16px",
  "line-height:1.5",
].join(";");

const rowStyle = [
  "display:flex",
  "align-items:center",
  "justify-content:space-between",
  "gap:16px",
  "padding:14px 0",
  "border-bottom:1px solid #e5e5e5",
  "color:inherit",
  "text-decoration:none",
].join(";");

const dateStyle = "flex:none;color:#737373;font-size:14px;";

const buttonStyle = [
  "display:inline-flex",
  "align-items:center",
  "height:40px",
  "padding:0 16px",
  "border:1px solid #d4d4d4",
  "border-radius:8px",
  "background:#fff",
  "color:#171717",
  "font:inherit",
  "cursor:pointer",
].join(";");

const primaryStyle = [
  "display:inline-flex",
  "align-items:center",
  "height:40px",
  "padding:0 16px",
  "border:0",
  "border-radius:8px",
  "background:#171717",
  "color:#fff",
  "font:inherit",
  "cursor:pointer",
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function frame(body: string): string {
  return `<section class="crep-board" style="${frameStyle}">${body}</section>`;
}

/** 만든 사이트 본문에 그대로 넣을 안내 문구. */
export function boardStatusHtml(message: string): string {
  return frame(`<p style="margin:0;color:#525252;">${escapeHtml(message)}</p>`);
}

/** 만든 사이트 본문에 그대로 넣을 글 목록. */
export function boardListHtml(input: {
  name: string;
  slug: string;
  posts: BoardViewPost[];
  page: number;
  canWrite: boolean;
}): string {
  const slug = escapeHtml(input.slug);
  const rows =
    input.posts.length === 0
      ? `<p style="margin:0;color:#525252;">아직 글이 없습니다.</p>`
      : input.posts
          .map((post) => {
            return `<a href="/board/${slug}/${post.id}" style="${rowStyle}"><span>${escapeHtml(post.title)}</span><span style="${dateStyle}">${escapeHtml(formatBoardDate(post.createdAt))}</span></a>`;
          })
          .join("");

  const previous =
    input.page > 1
      ? `<button type="button" data-crep-board="page" data-slug="${slug}" data-page="${input.page - 1}" style="${buttonStyle}">이전</button>`
      : "";
  const next =
    input.posts.length === 20
      ? `<button type="button" data-crep-board="page" data-slug="${slug}" data-page="${input.page + 1}" style="${buttonStyle}">다음</button>`
      : "";
  const write = input.canWrite
    ? `<button type="button" data-crep-board="write" data-slug="${slug}" style="${primaryStyle}">글쓰기</button>`
    : "";

  return frame(`
    <h1 style="margin:0 0 16px;font-size:24px;">${escapeHtml(input.name)}</h1>
    <div>${rows}</div>
    <div style="display:flex;justify-content:space-between;gap:12px;margin-top:24px;">
      <div style="display:flex;gap:8px;">${previous}${next}</div>
      ${write}
    </div>
  `);
}

/** 만든 사이트 본문에 그대로 넣을 글 상세. */
export function boardDetailHtml(input: {
  name: string;
  slug: string;
  canWrite: boolean;
  post: BoardViewPost & { content: string };
}): string {
  const slug = escapeHtml(input.slug);
  const owner = input.canWrite
    ? `<button type="button" data-crep-board="manage" data-slug="${slug}" data-post="${input.post.id}" style="${buttonStyle}">관리</button>`
    : "";

  return frame(`
    <p style="margin:0 0 12px;"><a href="/board/${slug}" style="color:inherit;">목록으로</a></p>
    <h1 style="margin:0;font-size:24px;">${escapeHtml(input.post.title)}</h1>
    <p style="${dateStyle}margin-top:8px;">${escapeHtml(formatBoardDate(input.post.createdAt))}</p>
    <div style="margin-top:24px;white-space:pre-wrap;">${escapeHtml(input.post.content)}</div>
    <div style="display:flex;gap:8px;margin-top:24px;">${owner}</div>
  `);
}

/** 만든 사이트 본문에 그대로 넣을 글쓰기 폼. */
export function boardWriteHtml(input: {
  name: string;
  slug: string;
  postId: number;
  title: string;
  content: string;
  error?: string;
}): string {
  const slug = escapeHtml(input.slug);
  const error = input.error
    ? `<p style="margin:0;color:#171717;">${escapeHtml(input.error)}</p>`
    : "";

  return frame(`
    <p style="margin:0 0 12px;"><a href="/board/${slug}" style="color:inherit;">목록으로</a></p>
    <h1 style="margin:0 0 16px;font-size:24px;">${escapeHtml(input.name)}</h1>
    <form data-crep-board-form="save" data-slug="${slug}" data-post="${input.postId}" style="display:flex;flex-direction:column;gap:16px;">
      <label>제목
        <input name="title" maxlength="255" value="${escapeHtml(input.title)}" style="${fieldStyle}">
      </label>
      <label>내용
        <textarea name="content" maxlength="20000" style="${fieldStyle}min-height:192px;">${escapeHtml(input.content)}</textarea>
      </label>
      ${error}
      <button type="submit" style="${primaryStyle}align-self:flex-start;">저장</button>
    </form>
  `);
}
