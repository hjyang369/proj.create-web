"use client";

import { useState, useMemo } from "react";
import {
  buildCodeTree,
  filterCodeTree,
  type CodePage,
  type CodeFile,
  type CodeTree,
} from "../model/code-file-tree";

// ─────────────────────────────────────────────────────────────
// 루트 컴포넌트
// ─────────────────────────────────────────────────────────────

export function EditSiteCodeView({ pages }: { pages: CodePage[] }) {
  const tree = useMemo(() => buildCodeTree(pages), [pages]);

  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(["pages", "boards"]),
  );
  const [openTabs, setOpenTabs] = useState<CodeFile[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const filteredTree = useMemo(
    () => filterCodeTree(tree, search),
    [tree, search],
  );

  function openFile(file: CodeFile) {
    setOpenTabs((prev) =>
      prev.find((t) => t.path === file.path) ? prev : [...prev, file],
    );
    setActiveTab(file.path);
  }

  function closeTab(path: string) {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.path !== path);
      if (activeTab === path) {
        setActiveTab(next.length > 0 ? (next[next.length - 1]?.path ?? null) : null);
      }
      return next;
    });
  }

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const activeFile = openTabs.find((t) => t.path === activeTab) ?? null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50">
      {/* 왼쪽: 파일 탐색기 */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <CodeFileTreePanel
          search={search}
          onSearch={setSearch}
          tree={filteredTree}
          expandedFolders={expandedFolders}
          activeFilePath={activeTab}
          onToggleFolder={toggleFolder}
          onOpenFile={openFile}
        />
      </aside>

      {/* 오른쪽: 탭 바 + 에디터 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <CodeEditorPanel
          tabs={openTabs}
          activeTab={activeTab}
          activeFile={activeFile}
          onSelectTab={setActiveTab}
          onCloseTab={closeTab}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 왼쪽: 파일 탐색기 패널
// ─────────────────────────────────────────────────────────────

type CodeFileTreePanelProps = {
  search: string;
  onSearch: (v: string) => void;
  tree: CodeTree;
  expandedFolders: Set<string>;
  activeFilePath: string | null;
  onToggleFolder: (path: string) => void;
  onOpenFile: (file: CodeFile) => void;
};

function CodeFileTreePanel({
  search,
  onSearch,
  tree,
  expandedFolders,
  activeFilePath,
  onToggleFolder,
  onOpenFile,
}: CodeFileTreePanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* 검색창 */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search code"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 hover:text-black"
            aria-label="검색 초기화"
          >
            <CloseSmallIcon />
          </button>
        )}
      </div>

      {/* 파일 트리 */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-400">
            {search ? "검색 결과 없음" : "파일 없음"}
          </p>
        ) : (
          tree.map((folder) => (
            <div key={folder.path}>
              {/* 폴더 행 */}
              <button
                type="button"
                onClick={() => onToggleFolder(folder.path)}
                className="flex w-full items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronIcon expanded={expandedFolders.has(folder.path)} />
                <FolderIcon />
                <span className="truncate">{folder.name}</span>
              </button>

              {/* 파일 목록 */}
              {expandedFolders.has(folder.path) &&
                folder.files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => onOpenFile(file)}
                    className={`flex w-full items-center gap-2 py-0.5 pl-7 pr-3 text-xs ${
                      activeFilePath === file.path
                        ? "bg-gray-100 text-black"
                        : "text-gray-600 hover:bg-gray-50 hover:text-black"
                    }`}
                  >
                    <FileIcon lang={file.lang} />
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 오른쪽: 탭 바 + 코드 에디터 패널
// ─────────────────────────────────────────────────────────────

type CodeEditorPanelProps = {
  tabs: CodeFile[];
  activeTab: string | null;
  activeFile: CodeFile | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
};

function CodeEditorPanel({
  tabs,
  activeTab,
  activeFile,
  onSelectTab,
  onCloseTab,
}: CodeEditorPanelProps) {
  function handleCopy() {
    if (!activeFile) return;
    void navigator.clipboard.writeText(activeFile.content);
  }

  function handleDownload() {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      {/* 탭 바 */}
      <div className="flex items-center border-b border-gray-200 bg-white">
        {/* 탭 목록 (가로 스크롤) */}
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {tabs.length === 0 ? (
            <div className="flex items-center px-4 py-2 text-xs text-gray-400">
              파일을 선택하면 탭이 열립니다
            </div>
          ) : (
            tabs.map((tab) => (
              <div
                key={tab.path}
                className={`flex shrink-0 items-center gap-1.5 border-r border-gray-200 px-4 py-2 text-xs ${
                  activeTab === tab.path
                    ? "bg-white text-black"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.path)}
                  className="max-w-[160px] truncate text-left"
                  title={tab.path}
                >
                  {tab.path}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.path);
                  }}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-black"
                  aria-label={`${tab.name} 탭 닫기`}
                >
                  <CloseSmallIcon />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 복사·다운로드 버튼 */}
        {activeFile && (
          <div className="flex shrink-0 items-center gap-1 border-l border-gray-200 px-2">
            <button
              type="button"
              onClick={handleCopy}
              title="코드 복사"
              className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-black"
            >
              <CopyIcon />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              title="파일 다운로드"
              className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-black"
            >
              <DownloadIcon />
            </button>
          </div>
        )}
      </div>

      {/* 코드 에디터 영역 */}
      <div className="min-h-0 flex-1 overflow-auto bg-white">
        {activeFile ? (
          <CodeLines content={activeFile.content} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">
              왼쪽에서 파일을 선택하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 줄 번호 + 코드 표시
// ─────────────────────────────────────────────────────────────

function CodeLines({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <table className="w-full border-collapse font-mono text-xs leading-5">
      <tbody>
        {lines.map((line, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <tr key={i} className="hover:bg-gray-50">
            {/* 줄 번호 */}
            <td
              className="w-12 select-none border-r border-gray-100 pr-3 text-right text-gray-400"
              style={{ minWidth: "3rem" }}
            >
              {i + 1}
            </td>
            {/* 코드 내용 */}
            <td className="whitespace-pre pl-4 text-gray-800">
              {line || " "}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────
// SVG 아이콘 (외부 라이브러리 없이 인라인)
// ─────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
      />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
      />
    </svg>
  );
}

function FileIcon({ lang }: { lang: "html" | "css" }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 ${lang === "css" ? "text-gray-500" : "text-gray-400"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function CloseSmallIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}
