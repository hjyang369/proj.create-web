import { assignBoardSlugs, type BoardConfig } from "./board-slug.js";

export class BoardNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoardNameError";
  }
}

const MAX_BOARDS = 5;

export function boardConfigsFromNames(names: string[]): BoardConfig[] {
  const trimmed = names.map((name) => name.trim()).filter((name) => name !== "");
  if (trimmed.length > MAX_BOARDS) {
    throw new BoardNameError("게시판은 5개까지 만들 수 있습니다.");
  }

  const seen = new Set<string>();
  for (const name of trimmed) {
    if (seen.has(name)) {
      throw new BoardNameError("게시판 이름이 중복됩니다.");
    }
    seen.add(name);
  }

  return assignBoardSlugs(trimmed);
}
