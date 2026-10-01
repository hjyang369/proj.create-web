export type EditPageChrome = {
  previewSide: "left";
  sidebarSide: "right";
  history: {
    back: { label: "뒤로가기"; enabled: false };
    forward: { label: "앞으로가기"; enabled: false };
  };
  save: { label: "저장하기" };
  sidebar: {
    title: string;
    emptyMessage: string;
    collapseLabel: string;
    expandLabel: string;
  };
};

export function describeEditPageChrome(): EditPageChrome {
  return {
    previewSide: "left",
    sidebarSide: "right",
    history: {
      back: { label: "뒤로가기", enabled: false },
      forward: { label: "앞으로가기", enabled: false },
    },
    save: { label: "저장하기" },
    sidebar: {
      title: "편집",
      emptyMessage: "요소를 고르면 여기에서 편집합니다.",
      collapseLabel: "사이드바 접기",
      expandLabel: "사이드바 펼치기",
    },
  };
}

export function initialSidebarOpen(isWideScreen: boolean): boolean {
  return isWideScreen;
}
