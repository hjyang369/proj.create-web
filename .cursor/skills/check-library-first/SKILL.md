---
name: check-library-first
description: Before implementing any feature, searches for existing libraries and packages first instead of building from scratch. Use when the user requests a new feature, asks to implement something, or when deciding whether to build or use a package.
---

# Check Library First

기능을 구현하기 전에 이미 잘 만들어진 라이브러리가 있는지 먼저 확인한다.
있으면 직접 구현하지 않고 그 라이브러리를 사용한다.

## 시작 전 체크 순서

1. 요청받은 기능을 한 줄로 정의한다.
2. `package.json`(프론트/백엔드)을 읽어 이미 설치된 패키지가 있는지 확인한다.
3. 없으면 아래 기준으로 적합한 라이브러리를 제안한다.
4. 사용자에게 결정을 물어본다.
5. 승인 후에만 설치하고 코드를 작성한다.

## 라이브러리 판단 기준

아래 조건을 모두 만족해야 추천한다.

- npm 주간 다운로드 수가 많다 (인기 있는 것)
- 최근 1년 이내 유지보수가 되고 있다
- TypeScript 타입이 포함되어 있다
- 이 프로젝트 스택(Next.js App Router, NestJS, Drizzle)과 충돌하지 않는다
- 기능 대비 번들 크기가 적절하다

## 제안 형식

```markdown
## 기능
구현하려는 기능 한 줄 설명

## 라이브러리 후보
| 패키지 | 역할 | 주간 다운로드 | 타입 | 비고 |
| --- | --- | --- | --- | --- |
| react-hook-form | 폼 상태 관리 | 350만+ | ✅ | 경량, Next.js 호환 |
| zod | 스키마 검증 | 1,200만+ | ✅ | 프론트/백엔드 공용 가능 |

## 추천
react-hook-form + zod 조합이 적합합니다. 이유: ...

## 직접 구현 이유 (해당 시)
적절한 라이브러리가 없거나 너무 무겁기 때문에 직접 구현합니다.

## 설치 명령어
pnpm add react-hook-form zod @hookform/resolvers

설치할까요?
```

## 스택별 자주 쓰는 라이브러리 참고

### Frontend (Next.js)
| 기능 | 라이브러리 |
| --- | --- |
| 폼 | react-hook-form + zod |
| 날짜 | date-fns |
| 테이블 | @tanstack/react-table |
| 무한스크롤 / 쿼리 | @tanstack/react-query |
| 모달·다이얼로그 | @radix-ui/react-dialog |
| 토스트 알림 | sonner |
| 아이콘 | lucide-react |
| 드래그앤드롭 | @dnd-kit/core |
| 파일 업로드 | react-dropzone |
| 차트 | recharts |

### Backend (NestJS)
| 기능 | 라이브러리 |
| --- | --- |
| 유효성 검사 | class-validator + class-transformer |
| 스키마 검증 | zod |
| JWT 인증 | @nestjs/jwt + passport-jwt |
| 이메일 | nodemailer / @nestjs-modules/mailer |
| 파일 업로드 | multer (@nestjs/platform-express 내장) |
| 스케줄 | @nestjs/schedule |
| 설정 관리 | @nestjs/config |

## 직접 구현하는 경우

아래 상황에서는 라이브러리 없이 직접 만든다.

- 이 프로젝트에만 맞는 아주 단순한 로직 (10줄 이하)
- 적합한 라이브러리가 없는 경우
- 라이브러리 번들 크기가 기능 대비 너무 큰 경우
- 사용자가 직접 구현을 명시적으로 요청한 경우

## 금지

- 라이브러리 조사 없이 바로 직접 구현하기
- 사용자 승인 없이 패키지 설치하기
- 유지보수가 멈춘 라이브러리 추천하기
