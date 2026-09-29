# Project Instructions

## 기본 원칙

- 모든 답변은 한국어로 설명한다.
- 개발 초보자가 이해할 수 있게 설명한다.
- 코드를 수정하기 전에 무엇을 수정하는지 먼저 설명한다.
- 기존 기능을 임의로 삭제하지 않는다.
- 기존 디자인을 최대한 유지한다.
- 한 번에 너무 많은 구조 변경을 하지 않는다.

## 기술 스택

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zustand
- Axios
- Feature-Sliced Design (FSD)

### Backend

- NestJS
- TypeScript
- MySQL
- Drizzle ORM

## 개발 규칙

- JavaScript보다 TypeScript를 사용한다.
- React Functional Component를 사용한다.
- 프론트는 FSD 레이어를 지킨다. 하위 레이어만 import 한다.
- 클라이언트 상태는 Zustand로 관리한다.
- 프론트 HTTP 요청은 Axios를 사용한다.
- DB 접근은 NestJS에서 Drizzle로만 한다. 프론트에서 DB에 직접 접근하지 않는다.
- API Key는 코드에 직접 작성하지 않는다.
- 프론트 환경변수는 `.env.local`, 백엔드는 `.env`를 사용한다.

## 작업 방식

새 기능 개발 시 다음 순서로 진행한다.

1. 기존 프로젝트 구조 확인
2. 관련 코드 확인
3. 구현 방법 설명
4. 최소 범위 수정
5. TypeScript 오류 확인
6. 빌드 확인
7. 수정된 파일 목록 설명

## 금지사항

- 사용자의 승인 없이 DB 테이블 삭제 금지
- 사용자의 승인 없이 대규모 리팩토링 금지
- 사용자의 승인 없이 라이브러리 교체 금지
- API Key 및 Secret을 소스코드에 저장하지 않는다.
- FSD 레이어를 무시하고 `components/`, `hooks/` 같은 임의 폴더를 새로 만들지 않는다.

## 프로젝트 문서

코딩을 시작하기 전에 아래 문서를 먼저 읽는다.

- `PROJECT.md` — 무엇을 만드는지
- `ARCHITECTURE.md` — 어떤 기술로 어떻게 만드는지
- `DATABASE.md` — DB 구조와 변경 규칙
- `DESIGN.md` — 디자인 기준
- `TODO.md` — 개발 순서

새 기능을 만들 때는 `TODO.md`의 다음 미완료 항목을 기준으로 한다.
DB를 바꿀 때는 `DATABASE.md`의 Database Rules를 따른다.
UI를 만들 때는 `DESIGN.md`를 따른다.
