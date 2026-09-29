---
name: understand-project
description: Reads project markdown docs first and explains Crep AI without writing code. Use when starting a session, when the user says understand the project, read the docs, 아직 코딩하지 마, or asks what this service is.
---

# Understand Project

코딩하지 않는다. 파일을 생성하거나 수정하지 않는다.

## 읽을 문서

아래 순서로 읽는다.

1. `AGENTS.md`
2. `PROJECT.md`
3. `ARCHITECTURE.md`
4. `DATABASE.md`
5. `DESIGN.md`
6. `TODO.md`

## 답변 형식

한국어로, 초보자가 이해하게 짧게 정리한다.

```markdown
# 프로젝트 이해

## 무엇을 만드는가

- 서비스명
- 한 줄 설명
- 주요 사용자

## 어떻게 만드는가

- 기술 스택
- 폴더 구조
- DB 핵심 테이블

## 지금 어디인가

- TODO.md에서 끝난 일
- 다음에 할 일

## 앞으로 작업할 때 지킬 것

- 승인 없이 하면 안 되는 일 3가지
```

문서를 읽은 뒤에만 질문하거나 다음 작업 제안을 한다.
