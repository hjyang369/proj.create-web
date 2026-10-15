import type { BoardConfig } from "./board-slug.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 생성된 페이지의 첫 nav에 없는 게시판 링크만 넣는다. */
export function insertBoardNav(html: string, boards: BoardConfig[]): string {
  const missing = boards.filter(
    (board) => !html.includes(`/board/${board.slug}`),
  );
  if (missing.length === 0) {
    return html;
  }

  const navClose = html.search(/<\/nav>/i);
  if (navClose < 0) {
    return html;
  }

  const links = missing
    .map(
      (board) =>
        `<a href="/board/${escapeHtml(board.slug)}">${escapeHtml(board.name)}</a>`,
    )
    .join("");

  return html.slice(0, navClose) + links + html.slice(navClose);
}
