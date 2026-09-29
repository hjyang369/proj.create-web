# Architecture

## Frontend

Next.js App Router
TypeScript
Tailwind CSS
Zustand
Axios
Feature-Sliced Design (FSD)

## Backend

NestJS
TypeScript

## Database

MySQL
Drizzle ORM

## Authentication

NestJS Auth (JWT 등)
프론트는 Axios로 인증 API를 호출한다.

## 구조

Browser
↓
Next.js (frontend)
↓
Axios
↓
NestJS (backend)
↓
Drizzle
↓
MySQL

## 기본 폴더

frontend/
  src/
    app/
    pages/
    widgets/
    features/
    entities/
    shared/

backend/
  src/
    modules/
    database/
      schema/

## Frontend FSD 역할

app/
Next.js App Router. 라우팅과 레이아웃만 담당한다.
페이지 내용을 길게 작성하지 않고 `pages/` 또는 `widgets/`를 조합한다.

pages/
FSD pages 레이어. 화면 하나를 조립한다.

widgets/
여러 feature를 합친 큰 UI 덩어리. 예: 헤더, 채팅 패널.

features/
사용자 동작 단위. 예: 로그인, 메시지 전송.

entities/
비즈니스 데이터. 예: user, conversation, message.

shared/
공통 UI, Axios 인스턴스, 설정, 유틸.

## Frontend import 규칙

위 레이어만 아래 레이어를 사용할 수 있다.

app → pages → widgets → features → entities → shared

- 같은 레이어의 다른 slice를 직접 import 하지 않는다.
- 각 slice는 `index.ts`만 외부에 공개한다.
- Zustand store는 해당 feature 또는 entity의 `model/`에 둔다.
- Axios 인스턴스와 API 헬퍼는 `shared/api/`에 둔다.

## Backend 역할

modules/
기능별 NestJS 모듈. 예: auth, users, conversations, messages.

database/schema/
Drizzle 테이블 정의.

## 구조 규칙

- 프론트 코드는 `frontend/`, 백엔드 코드는 `backend/`에만 둔다.
- 사용자의 승인 없이 새로운 최상위 폴더를 만들지 않는다.
- 프론트에서 `src/components`, `src/hooks`, `src/lib` 구조를 만들지 않는다.
- 새 화면은 FSD 레이어에 맞게 나눈다.
- 백엔드 새 기능은 NestJS module로 추가한다.
- DB 스키마는 Drizzle schema로만 정의한다.
