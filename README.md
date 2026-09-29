# Crep AI

여러 AI 모델을 하나의 웹서비스에서 사용할 수 있는 AI 업무지원 SaaS입니다.

지금은 앱 코드보다 **프로젝트 문서와 Cursor 지침**을 먼저 깔아 둔 상태입니다.
코딩을 시작하기 전에 아래 문서를 읽고 서비스를 이해하세요.

## 스택

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, Zustand, Axios, FSD
- Backend: NestJS, TypeScript, MySQL, Drizzle

## 문서

| 파일                               | 역할                           |
| ---------------------------------- | ------------------------------ |
| [AGENTS.md](AGENTS.md)             | Cursor가 따라야 하는 작업 규칙 |
| [PROJECT.md](PROJECT.md)           | 무엇을 만드는지                |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 어떤 기술로 어떻게 만드는지    |
| [DATABASE.md](DATABASE.md)         | DB 구조와 변경 규칙            |
| [DESIGN.md](DESIGN.md)             | 디자인 기준                    |
| [TODO.md](TODO.md)                 | 개발 순서                      |

## Cursor에게 처음 시킬 말

```text
먼저 모든 md 문서를 읽고 프로젝트를 이해해. 아직 코딩하지 마.
```

다음 기능을 만들 때는:

```text
TODO.md 보고 다음 기능 개발해줘
```

로그인 같은 화면을 만들 때는:

```text
PROJECT.md와 DESIGN.md를 보고 로그인 페이지 만들어줘
```

## Cursor 설정

- 규칙: `.cursor/rules/`
- 스킬: `.cursor/skills/`
- 제외 파일: `.cursorignore`

## 로컬 실행 방법

### 1. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 2. 백엔드

```bash
cd backend
npm install
npm run start:dev
```

API 서버가 [http://localhost:3001](http://localhost:3001) 에서 실행됩니다.

> **환경변수 설정 필요**
> - 프론트: `frontend/.env.local` (`.env.example` 참고)
> - 백엔드: `backend/.env` (`.env.example` 참고)
