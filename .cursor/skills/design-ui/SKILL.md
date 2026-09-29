---
name: design-ui
description: Builds or updates Duru AI screens using DESIGN.md and FSD. Use when creating pages, components, layouts, login UI, chat UI, or when the user mentions design, style, Tailwind, or 화면.
---

# Design UI

`DESIGN.md`를 먼저 읽는다. 새 디자인 시스템을 만들지 않는다.

## 적용할 값

- Font: Pretendard
- Button/Input radius: `rounded-lg` (8px)
- Card radius: `rounded-xl` (12px)
- Desktop max-width: `max-w-screen-2xl` (1440px)
- Main content: `max-w-[1200px]`

### 컬러 (Tailwind neutral만 허용)

| 역할 | 클래스 |
| --- | --- |
| Page 배경 | `bg-white` |
| 표면 | `bg-gray-50` / `bg-gray-100` |
| 테두리 | `border-gray-200` / `border-gray-300` |
| 보조 텍스트 | `text-gray-400` / `text-gray-500` |
| 기본 텍스트 | `text-gray-800` / `text-gray-900` |
| 진한 텍스트 | `text-black` |
| Primary 버튼 | `bg-black text-white hover:bg-gray-900` |

임의 색상값(`bg-[#xxx]`)과 유채색(`blue-*`, `violet-*` 등)을 사용하지 않는다.

## 하지 말 것

- 유채색 클래스
- 임의 색상값
- 불필요한 그림자
- 지나친 그라데이션
- 카드 남발
- 기존 화면과 다른 스타일을 한 페이지만 적용

## 작업 방식

1. `frontend/src`의 widgets, features, shared에서 재사용 가능한 UI를 먼저 찾는다.
2. 없으면 해당 FSD 레이어에 작은 slice를 만든다.
3. Next.js `app/`에는 라우팅만 두고, 화면 조립은 `pages/` 또는 `widgets/`에 둔다.
4. 모바일 폭에서도 깨지지 않게 만든다.
5. 화면을 바꿨으면 브라우저에서 동작을 확인한다.

참고 느낌은 Linear, Notion, ChatGPT, Vercel의 흑백 버전이다.
