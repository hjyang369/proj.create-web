export type EditPageChrome = {
  previewSide: "left";
  sidebarSide: "right";
  controls: "sidebar";
  history: {
    back: { label: "뒤로가기"; enabled: boolean };
    forward: { label: "앞으로가기"; enabled: boolean };
  };
  save: { label: "저장하기" };
  regenerate: {
    label: "초안으로 재생성";
    pendingLabel: "다시 만드는 중...";
    pendingMessage: string;
    modalTitle: string;
    closeLabel: string;
    submitLabel: string;
  };
  sidebar: {
    title: string;
    emptyMessage: string;
    collapseLabel: string;
    expandLabel: string;
  };
  mode: {
    groupLabel: string;
    editLabel: string;
    editHint: string;
    previewHint: string;
    previewMessage: string;
  };
  editLog: {
    title: string;
    regenerateLabel: string;
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
      pendingMessage: "사이트를 다시 만들고 있습니다…",
      modalTitle: "입력 내용을 고치고 다시 만들기",
      closeLabel: "닫기",
      submitLabel: "저장하고 다시 만들기",
    },
    sidebar: {
      title: "편집",
      emptyMessage:
        "좌클릭: 요소를 골라 AI로 수정합니다.\n우클릭: 글자, 링크, 이미지를 직접 편집합니다.",
      collapseLabel: "사이드바 접기",
      expandLabel: "사이드바 펼치기",
    },
    mode: {
      groupLabel: "편집 모드",
      editLabel: "편집",
      editHint: "좌클릭은 AI 수정, 우클릭은 직접 편집입니다.",
      previewHint: "버튼과 링크가 그대로 동작합니다.",
      previewMessage:
        "편집이 꺼져 있습니다. 버튼과 링크를 누르면 그대로 동작합니다.",
    },
    editLog: {
      title: "수정 내역",
      regenerateLabel: "초안으로 재생성",
    },
  };
}

export function initialSidebarOpen(isWideScreen: boolean): boolean {
  return isWideScreen;
}
