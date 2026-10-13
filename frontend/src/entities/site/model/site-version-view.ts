export type VersionPage = {
  pageType: string;
  pageOrder: number;
  html: string;
  css: string;
};

export type OpenedVersionPages = {
  historyId: number;
  publishedHistoryId: number | null;
  pages: VersionPage[];
};

export function describeVersionBadges(item: {
  isEditing: boolean;
  isPublished: boolean;
}): string[] {
  const badges: string[] = [];
  if (item.isEditing) {
    badges.push("편집 중");
  }
  if (item.isPublished) {
    badges.push("배포 중");
  }
  return badges;
}

export function formatVersionCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** 저장 버전을 열면 그 페이지로 미리보기를 바꾸고, 입력값과 배포 포인터는 그대로 둔다. */
export function applyOpenedVersion<T extends { pages: VersionPage[] }>(
  current: T,
  opened: OpenedVersionPages,
): T {
  return {
    ...current,
    pages: opened.pages.map((page) => ({
      pageType: page.pageType,
      pageOrder: page.pageOrder,
      html: page.html,
      css: page.css,
    })),
    editingHistoryId: opened.historyId,
    publishedHistoryId: opened.publishedHistoryId,
  };
}
