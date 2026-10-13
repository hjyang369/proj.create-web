import { instance } from "@/shared/api";

export type ChatHistoryEntry = {
  id: number;
  type: "ai-edit" | "regenerate";
  label: string;
  pageOrder: number | null;
  createdAt: string;
};

export type NewChatHistoryEntry = {
  type: ChatHistoryEntry["type"];
  label: string;
  pageOrder: number | null;
};

export async function getSiteChatHistory(
  siteId: number,
): Promise<ChatHistoryEntry[]> {
  const { data } = await instance.get<ChatHistoryEntry[]>(
    `/api/sites/${siteId}/chat-history`,
  );
  return data;
}

export async function addSiteChatEntry(
  siteId: number,
  entry: NewChatHistoryEntry,
): Promise<ChatHistoryEntry> {
  const { data } = await instance.post<ChatHistoryEntry>(
    `/api/sites/${siteId}/chat-history`,
    entry,
  );
  return data;
}
