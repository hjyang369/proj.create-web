export type StoredPageContent = {
  html: string;
  css: string;
};

export function readStoredPageContent(
  componentData: unknown,
): StoredPageContent | null {
  if (
    typeof componentData !== "object" ||
    componentData === null ||
    Array.isArray(componentData)
  ) {
    return null;
  }

  const record = componentData as Record<string, unknown>;
  if (typeof record.html !== "string" || typeof record.css !== "string") {
    return null;
  }

  return {
    html: record.html,
    css: record.css,
  };
}
