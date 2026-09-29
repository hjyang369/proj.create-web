# Design System

## 디자인 컨셉

- Modern
- Minimal
- SaaS
- Clean
- Professional
- Black and White

## 기본 원칙

- 색상은 흑백 계열(neutral)만 사용한다. 파랑, 빨강, 초록 등 유채색 계열을 추가하지 않는다.
- Tailwind의 neutral 스케일(white ~ gray-50 ~ gray-950 ~ black)과 투명도만 허용한다.
- 불필요한 그림자 사용 금지
- 지나친 그라데이션 사용 금지
- 카드 디자인 남발 금지
- 충분한 여백 사용
- 모바일 반응형 필수

## Layout

Desktop max-width: 1440px

Main content:
1200px

## Border Radius

Button: 8px
Input: 8px
Card: 12px

## Font

Pretendard

## 컬러

흑백 계열(neutral)만 허용한다.

| 역할 | Tailwind 클래스 | 비고 |
| --- | --- | --- |
| Page 배경 | `bg-white` | |
| 표면(카드·패널) | `bg-gray-50` ~ `bg-gray-100` | |
| 구분선·테두리 | `border-gray-200` ~ `border-gray-300` | |
| 보조 텍스트 | `text-gray-400` ~ `text-gray-500` | |
| 기본 텍스트 | `text-gray-700` ~ `text-gray-900` | |
| 진한 텍스트 | `text-black` | |
| Primary 버튼 배경 | `bg-black` | |
| Primary 버튼 글자 | `text-white` | |
| Hover 강조 | `hover:bg-gray-100` / `hover:bg-gray-900` | 밝은 면 / 어두운 면 |

임의 색상(`bg-[#xxx]`)을 사용하지 않는다.
파란색(`blue-*`), 보라색(`violet-*`) 등 유채색 클래스를 사용하지 않는다.

## 디자인 참고

Linear
Notion
ChatGPT
Vercel
