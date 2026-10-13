import type { StoredSitePageContent } from "./sites.store.js";

export type HistorySnapshot = {
  pages: StoredSitePageContent[];
};

export function snapshotFromPages(
  pages: StoredSitePageContent[],
): HistorySnapshot {
  return {
    pages: pages.map((page) => ({
      pageType: page.pageType,
      pageOrder: page.pageOrder,
      html: page.html,
      css: page.css,
    })),
  };
}

export function readHistorySnapshot(
  value: unknown,
): StoredSitePageContent[] | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const pages = (value as { pages?: unknown }).pages;
  if (!Array.isArray(pages)) {
    return null;
  }

  const snapshotPages: StoredSitePageContent[] = [];
  for (const page of pages) {
    if (!page || typeof page !== "object") {
      return null;
    }

    const row = page as Record<string, unknown>;
    if (
      typeof row.pageType !== "string" ||
      typeof row.pageOrder !== "number" ||
      typeof row.html !== "string" ||
      typeof row.css !== "string"
    ) {
      return null;
    }

    snapshotPages.push({
      pageType: row.pageType,
      pageOrder: row.pageOrder,
      html: row.html,
      css: row.css,
    });
  }

  return snapshotPages;
}

/** 편집 포인터가 있으면 그 스냅샷을, 없거나 깨졌으면 지금 site_pages를 보여 준다. */
export function editorPages(
  livePages: StoredSitePageContent[],
  editingSnapshot: unknown | null,
): StoredSitePageContent[] {
  if (editingSnapshot == null) {
    return livePages;
  }

  return readHistorySnapshot(editingSnapshot) ?? livePages;
}

export function markHistoryItems(
  items: Array<{ id: number; createdAt: Date }>,
  editingHistoryId: number | null,
  publishedHistoryId: number | null,
): Array<{
  id: number;
  createdAt: string;
  isEditing: boolean;
  isPublished: boolean;
}> {
  return items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    isEditing: item.id === editingHistoryId,
    isPublished: item.id === publishedHistoryId,
  }));
}
