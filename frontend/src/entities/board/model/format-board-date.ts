/** 글 작성 시각을 한국 날짜 `2026.10.15`로 보여 준다. */
export function formatBoardDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return formatted.replaceAll("-", ".");
}
