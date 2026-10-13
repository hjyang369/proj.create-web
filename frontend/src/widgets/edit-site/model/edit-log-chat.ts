/** 수정 로그는 최신이 앞에 쌓인다. 채팅은 오래된 말풍선이 위에 온다. */
export function editLogInChatOrder<T>(entries: readonly T[]): T[] {
  return [...entries].reverse();
}

export type StoredChatTurn = {
  id: number;
  type: "ai-edit" | "regenerate";
  label: string;
  pageOrder: number | null;
  createdAt: string;
};

export type StoredChatLogEntry = {
  id: number;
  /** -1이면 이번 화면의 되돌리기 스택에 없는, 저장된 대화다. */
  historyIndex: number;
  type: "ai-edit" | "regenerate";
  label: string;
  pageOrder?: number;
  createdAt: Date;
};

/** 서버는 오래된 대화부터 준다. 화면 로그는 최신이 앞이고, 되돌리기 번호는 비운다. */
export function storedChatsToEditLog(
  entries: readonly StoredChatTurn[],
): StoredChatLogEntry[] {
  return [...entries].reverse().map((entry) => ({
    id: entry.id,
    historyIndex: -1,
    type: entry.type,
    label: entry.label,
    pageOrder: entry.pageOrder ?? undefined,
    createdAt: new Date(entry.createdAt),
  }));
}
