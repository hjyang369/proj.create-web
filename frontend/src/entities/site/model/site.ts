export type SiteListItem = {
  id: number;
  name: string;
  type: "web" | "app";
  status: "generating" | "draft" | "published";
  thumbnailUrl: string | null;
  updatedAt: string;
};
