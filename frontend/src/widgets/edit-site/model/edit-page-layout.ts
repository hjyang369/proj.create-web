export type EditPageChrome = {
  previewSide: "left";
  sidebarSide: "right";
  controls: "sidebar";
  history: {
    back: { label: "뒤로가기"; enabled: false };
    forward: { label: "앞으로가기"; enabled: false };
  };
  save: { label: "저장하기" };
  regenerate: {
    label: "초안으로 재생성";
    pendingLabel: "다시 만드는 중...";
    confirmMessage: string;
  };
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
    controls: "sidebar",
    history: {
      back: { label: "뒤로가기", enabled: false },
      forward: { label: "앞으로가기", enabled: false },
    },
    save: { label: "저장하기" },
    regenerate: {
      label: "초안으로 재생성",
      pendingLabel: "다시 만드는 중...",
      confirmMessage:
        "지금 보이는 초안을 지우고, 처음 입력한 내용으로 사이트를 다시 만들까요?",
    },
    sidebar: {
      title: "편집",
      emptyMessage:
        "요소를 고르면 여기에서 편집합니다. \n 좌측 마우스 클릭으로 요소 선택, 우측 마우스 클릭으로 요소 개별 편집",
      collapseLabel: "사이드바 접기",
      expandLabel: "사이드바 펼치기",
    },
  };
}

export function initialSidebarOpen(isWideScreen: boolean): boolean {
  return isWideScreen;
}
