import type { SiteListItem } from "./site";

const typeLabels = {
  web: "웹",
  app: "앱",
} as const;

const statusLabels = {
  generating: "생성중",
  draft: "편집중",
  published: "배포됨",
} as const;

export type SiteListState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready"; sites: SiteListItem[] };

export type SiteListViewItem = {
  id: number;
  name: string;
  typeLabel: string;
  statusLabel: string;
  updatedLabel: string;
  thumbnailUrl: string | null;
};

export type SiteListAction = {
  href: string;
  label: string;
};

export type SiteListView = {
  title: string;
  message: string | null;
  action: SiteListAction | null;
  items: SiteListViewItem[];
};

const title = "내 사이트";

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function resolveSiteListState(
  session: { ready: boolean; user: { id: number } | null },
  fetched: SiteListState,
): SiteListState {
  if (!session.ready) {
    return { kind: "loading" };
  }

  if (!session.user) {
    return { kind: "guest" };
  }

  return fetched;
}

export function describeSiteList(state: SiteListState): SiteListView {
  if (state.kind === "ready") {
    return {
      title,
      message: null,
      action: null,
      items: state.sites.map((site) => ({
        id: site.id,
        name: site.name,
        typeLabel: typeLabels[site.type],
        statusLabel: statusLabels[site.status],
        updatedLabel: formatUpdatedAt(site.updatedAt),
        thumbnailUrl: site.thumbnailUrl,
      })),
    };
  }

  if (state.kind === "empty") {
    return {
      title,
      message: "아직 만든 사이트가 없습니다.",
      action: { href: "/create", label: "사이트 만들기" },
      items: [],
    };
  }

  if (state.kind === "guest") {
    return {
      title,
      message: "로그인하면 내가 만든 사이트를 볼 수 있습니다.",
      action: null,
      items: [],
    };
  }

  if (state.kind === "error") {
    return {
      title,
      message: state.message,
      action: null,
      items: [],
    };
  }

  return {
    title,
    message: "사이트를 불러오는 중입니다.",
    action: null,
    items: [],
  };
}
