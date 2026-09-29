---
name: develop-feature
description: Implements the next Crep AI feature from TODO.md with FSD and a small, explained change. Use when the user asks to build the next feature, implement a page, follow TODO.md, or continue development.
---

# Develop Feature

## 시작 전

1. `TODO.md`에서 아직 끝나지 않은 가장 위 항목을 고른다.
2. `PROJECT.md`, `ARCHITECTURE.md`, `DESIGN.md`를 확인한다.
3. 관련 기존 파일만 읽는다. 없으면 없다고 말한다.
4. **직접 구현 전에 `check-library-first` 스킬 기준으로 기존 라이브러리가 있는지 먼저 확인한다.**
5. 코딩 전에 무엇을 만들지 한국어로 설명한다.

사용자가 다른 기능을 지정하면 그 기능을 한다.
지정하지 않으면 `TODO.md`의 다음 미완료 항목을 한다.

프론트는 `frontend/`의 FSD 레이어에 맞춘다.
백엔드는 `backend/src/modules/`에 NestJS 모듈로 추가한다.
상태는 Zustand, HTTP는 Axios, DB는 Drizzle만 사용한다.

## 작업 순서

1. 기존 프로젝트 구조 확인
2. 관련 코드 확인
3. 구현 방법 설명
4. 최소 범위 수정
5. TypeScript 오류 확인
6. 빌드 확인
7. 수정된 파일 목록 설명

## 지키면 안 되는 것

- 기존 기능 삭제
- 기존 디자인 무시
- 한 번에 여러 Phase를 진행
- 승인 없는 라이브러리 교체
- 승인 없는 DB 테이블/컬럼 삭제
- Secret을 코드에 넣기
- FSD 밖 폴더(`components/`, `hooks/`, `lib/`)를 새로 만들기

## 끝난 뒤

- 만든 화면이나 동작이 초보자 기준으로 어떻게 쓰이는지 설명한다.
- 해당 항목을 `TODO.md`에서 `[x]`로 바꾼다.
- 다음에 할 항목 하나만 알려준다.
