import { instance } from "@/shared/api";
import type { SiteListItem } from "../model/site";

export async function listMySites(): Promise<SiteListItem[]> {
  const { data } = await instance.get<SiteListItem[]>("/api/sites");
  return data;
}
