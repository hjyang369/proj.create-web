---
name: change-database
description: Proposes MySQL and Drizzle schema changes from DATABASE.md and waits for user approval. Use when adding tables or columns, writing migrations, or when the user mentions database, schema, MySQL, Drizzle, or SQL.
---

# Change Database

기존 테이블이나 컬럼을 삭제하지 않는다.
사용자의 확인 없이 Migration을 적용하지 않는다.
프론트에서 MySQL에 직접 접속하지 않는다.

## 시작 전

1. `DATABASE.md`를 읽는다.
2. `backend/src/database/schema/`와 관련 Migration을 찾는다.
3. 왜 바꿔야 하는지 한국어로 설명한다.

## 변경 순서

1. 변경 필요 이유 설명
2. 변경 Schema 제안
3. Drizzle schema와 Migration SQL 작성
4. 사용자 확인 후 적용

4번은 사용자가 분명하게 승인한 뒤에만 한다.

## 제안 형식

```markdown
## 왜 필요한가
한두 문장

## 바꿀 Schema
테이블 / 컬럼 / 관계

## Drizzle schema와 Migration SQL
적용 전 초안만 보여 준다

## 확인 질문
이대로 적용할까요?
```

적용이 끝나면 `DATABASE.md`도 같이 갱신한다.
