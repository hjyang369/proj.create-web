import { instance } from "@/shared/api";
import type { SitePreviewPage } from "../model/site-preview";

export type SiteEditorPage = SitePreviewPage & {
  pageType: string;
};

export type SiteInputImage = {
  url: string;
  originalName: string;
};

export type SiteInputValues = {
  industry: string;
  name: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  purpose: string;
  targetCustomer: string;
  mainColor: string;
  mood: string;
  pageCount: string;
  selectedPages: string[];
  blogLink: string;
  websiteLink: string;
  instagramLink: string;
  youtubeLink: string;
  referenceLink: string;
  extraRequest: string;
  logo: SiteInputImage | null;
  photos: SiteInputImage[];
};

export type SiteEditorDetail = {
  id: number;
  name: string;
  pages: SiteEditorPage[];
  inputs: SiteInputValues | null;
  editingHistoryId: number | null;
  publishedHistoryId: number | null;
};

export async function getMySite(siteId: number): Promise<SiteEditorDetail> {
  const { data } = await instance.get<SiteEditorDetail>(`/api/sites/${siteId}`);
  return data;
}
