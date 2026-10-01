---
name: optimize-backend
description: >-
  Use when writing, generating, or refactoring backend code, including NestJS
  modules, API handlers, Drizzle or MySQL queries, Redis, external API calls,
  queues, background jobs, streaming, transactions, connection pools, pagination,
  N+1, or AI/GPU inference.
---

# Backend Optimization

백엔드 코드를 작성하거나 리팩터링할 때 아래 원칙을 적용한다.
프론트엔드만 바꾸는 작업에는 적용하지 않는다.

## Backend Optimization Rules

백엔드 코드 작성 및 리팩터링 시 아래 최적화 원칙을 기본적으로 적용한다.

- 불필요한 DB 쿼리를 최소화한다.
- N+1 Query가 발생하지 않도록 관계 조회를 최적화한다.
- 조회 조건에 맞는 적절한 Database Index 사용을 고려한다.
- SELECT * 사용을 지양하고 필요한 컬럼만 조회한다.
- 대량 데이터 조회 시 Pagination 또는 Cursor 기반 조회를 사용한다.
- 반복적으로 조회되는 데이터는 Redis 등 Cache 적용 가능성을 우선 검토한다.
- 동일한 계산이나 외부 API 호출이 반복되지 않도록 결과 재사용을 고려한다.
- 외부 API 호출에는 Timeout, Retry, Exception Handling을 적용한다.
- 독립적인 외부 API 호출은 가능한 경우 병렬 또는 비동기 처리한다.
- 이메일 발송, 이미지 처리, AI 추론, 대용량 파일 처리 등 오래 걸리는 작업은 Request Lifecycle에서 분리하여 Background Job 또는 Queue로 처리한다.
- DB Connection, File, Stream, Socket 등의 Resource Leak이 발생하지 않도록 명시적으로 관리한다.
- Connection Pool을 과도하게 생성하지 않고 재사용한다.
- 불필요한 객체 생성과 대용량 데이터를 메모리에 한 번에 적재하는 방식을 피한다.
- 대용량 파일이나 데이터는 가능한 경우 Streaming 방식으로 처리한다.
- 반복문 내부에서 DB Query 또는 Network Request를 실행하지 않는다.
- 알고리즘의 시간복잡도와 공간복잡도를 고려하고 불필요한 O(n²) 연산을 피한다.
- 동시 요청에서 Race Condition, Deadlock, Duplicate Processing이 발생하지 않도록 한다.
- 필요한 경우 Transaction과 Lock 범위를 최소화하여 사용한다.
- API Response에는 필요한 데이터만 포함하며 불필요하게 큰 Payload를 반환하지 않는다.
- 동일 요청의 중복 처리를 방지하기 위해 Idempotency를 고려한다.
- 서비스 장애 전파를 방지하기 위해 Timeout, Retry, Circuit Breaker 등의 패턴을 고려한다.
- CPU, Memory, DB Connection, Query Latency 등 서버 자원 사용량을 고려하여 구현한다.
- 성능 최적화를 위해 가독성과 유지보수성을 과도하게 희생하지 않는다.
- 최적화가 필요한 경우 추측으로 수정하지 말고 병목 지점을 먼저 식별한다.

### AI / GPU Backend

AI 또는 GPU 추론 서버를 개발하는 경우 추가로 아래 원칙을 적용한다.

- 모델을 요청마다 Load하지 않고 가능한 경우 Memory 또는 GPU Memory에 상주시킨다.
- GPU Inference Request를 Queue 기반으로 관리한다.
- 가능한 경우 Request Batching을 적용하여 GPU Utilization을 높인다.
- 동일 입력 또는 동일 결과에 대해 Cache 적용 가능성을 검토한다.
- GPU Worker별 작업량을 분산한다.
- 불필요한 CPU ↔ GPU Memory Copy를 최소화한다.
- 추론 작업의 Timeout과 실패 복구 정책을 구현한다.
- 무거운 AI 추론은 일반 API Worker와 분리한다.

## Optimization Notes

코드를 작성한 뒤 성능상 문제가 될 수 있는 부분이 있으면 구현 완료 후 별도로 `Optimization Notes` 항목에서 지적한다.

해당 부분이 없으면 이 항목을 만들지 않는다.
추측으로 코드를 더 고치지 않는다. 위험과 이유만 적는다.

```markdown
## Optimization Notes
- [파일 또는 함수]: [위험] / [검토할 방향]
```

예시:

- `findOrders`: 주문마다 상품을 다시 조회하면 N+1 가능성이 있음 / relation을 한 번에 조회
- `getProfile`: 같은 사용자 정보를 요청마다 읽음 / Redis 캐시 가능
- `sendWelcomeMail`: 응답 전에 메일 발송을 기다림 / Queue로 분리
