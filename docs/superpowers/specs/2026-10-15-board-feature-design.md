# 게시판 기능 설계

**작성일:** 2026-10-15  
**범위:** 사이트 만들기 → 게시판 이름 입력 → 생성된 사이트의 목록/상세/작성 화면

---

## 1. 요약

사이트 만들기 제작 폼에서 **게시판** 칩을 켜면, 게시판 이름을 적는 입력 칸이 나타난다.  
이름은 `뉴스`, `소식`, `블로그` 같은 게시판 구분 이름이다.  
사이트가 생성되면 메뉴에 그 이름이 표시되고, 클릭하면 실제로 글 목록/상세/작성이 동작하는 게시판 페이지로 이동한다.

글쓰기 권한은 **사이트 주인만** 갖는다. 방문자는 목록·상세만 볼 수 있다.

---

## 2. 변경 대상

| 분류 | 위치 | 변경 내용 |
| --- | --- | --- |
| 프론트 — 제작 폼 | `features/create-site` | 게시판 칩 선택 시 이름 입력 칸 추가 |
| 프론트 — 게시판 화면 | `app/s/[siteId]/board/...` | 목록, 상세, 작성 페이지 3개 신규 |
| 백엔드 — DTO | `create-site.dto.ts` | `boardNames: string[]` 필드 추가 |
| 백엔드 — 서비스 | `sites.service.ts` | 사이트 생성 시 `site_boards` 행 생성 |
| 백엔드 — 모듈 | `modules/boards` (신규) | 게시판/글 CRUD API |
| DB | `site_boards`, `site_posts` (신규) | 게시판·글 테이블 |
| AI 프롬프트 | `site-generation-prompt.ts` | 게시판 이름과 링크 경로를 AI에게 전달 |

---

## 3. DB 스키마

### 3-1. `site_inputs` 변경

기존 `page_components`는 그대로 둔다.  
게시판 이름은 새 컬럼 `board_configs`에 별도 저장한다.

```sql
ALTER TABLE site_inputs
  ADD COLUMN board_configs JSON NULL
  COMMENT '게시판 설정 목록. 예: [{"name":"뉴스"},{"name":"소식"}]';
```

```ts
// Drizzle schema 추가
boardConfigs: json("board_configs"),
```

JSON 구조:
```json
[
  { "name": "뉴스" },
  { "name": "소식" }
]
```

---

### 3-2. `site_boards` (신규)

사이트가 갖는 게시판 목록.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | bigint PK autoincrement | |
| site_id | bigint FK → sites.id | 어느 사이트 |
| name | varchar(100) | 화면에 보이는 이름 (뉴스, 소식) |
| slug | varchar(100) | URL용 영문 슬러그 (news, notice). 없으면 board-{id} |
| board_order | int default 0 | 메뉴 순서 |
| created_at | datetime | |

**인덱스:** `(site_id, board_order)`

같은 사이트 안에서 같은 `slug`는 하나만 허용한다. `UNIQUE (site_id, slug)`.

```ts
// Drizzle schema
export const siteBoards = mysqlTable("site_boards", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  siteId: bigint("site_id", { mode: "number" }).notNull().references(() => sites.id),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  boardOrder: int("board_order").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (t) => ({
  siteSlugUniq: unique().on(t.siteId, t.slug),
}));
```

---

### 3-3. `site_posts` (신규)

게시판에 속하는 글.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | bigint PK autoincrement | |
| board_id | bigint FK → site_boards.id | 어느 게시판 |
| title | varchar(255) | 글 제목 |
| content | text | 글 본문 |
| created_at | datetime | |
| updated_at | datetime | |

**인덱스:** `(board_id, id DESC)` — 최신순 목록 조회

```ts
export const sitePosts = mysqlTable("site_posts", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  boardId: bigint("board_id", { mode: "number" }).notNull().references(() => siteBoards.id),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: datetime("created_at").notNull().default(new Date()),
  updatedAt: datetime("updated_at").notNull().default(new Date()),
});
```

---

## 4. 슬러그 생성 규칙

`name`에서 슬러그를 자동으로 만든다.

| 입력 이름 | 슬러그 |
| --- | --- |
| 뉴스 | news |
| 소식 | notice |
| 블로그 | blog |
| 공지사항 | notice |
| 자유게시판 | free |
| 기타 / 매핑 없는 한글 | board-{순서번호} |

알려진 한글 이름은 딕셔너리로 매핑한다.  
매핑 없으면 `board-1`, `board-2` 처럼 순서로 만든다.  
중복되면 뒤에 `-2`, `-3`을 붙인다.

```ts
// backend/src/modules/boards/board-slug.ts
const SLUG_MAP: Record<string, string> = {
  뉴스: "news",
  소식: "notice",
  공지: "notice",
  공지사항: "notice",
  블로그: "blog",
  자유게시판: "free",
  자유: "free",
  갤러리: "gallery",
  후기: "review",
  리뷰: "review",
  이벤트: "events",
};

export function nameToSlug(name: string, fallbackIndex: number): string {
  const trimmed = name.trim();
  return SLUG_MAP[trimmed] ?? `board-${fallbackIndex + 1}`;
}
```

---

## 5. 제작 폼 변경

### 5-1. 동작

- 페이지 구성 ChipGroup에서 **게시판** 칩을 켜면, 그 아래에 `게시판1` 이름 입력 칸이 나온다.
- **+게시판 추가** 버튼을 누르면 `게시판2` 칸이 생긴다. 최대 5개.
- 칩을 끄면 이름 칸이 모두 사라지고 저장된 이름도 초기화한다.
- 이름 칸에 placeholder는 `예: 뉴스, 소식, 블로그`.
- 이름이 비어 있으면 생성 버튼 클릭 시 "게시판 이름을 입력해 주세요." 유효성 오류.
- 같은 사이트 입력에서 이름 중복이면 "게시판 이름이 중복됩니다." 오류.

### 5-2. 폼 상태 타입 변경

```ts
// create-site-form.tsx 기존
selectedPages: string[];

// 추가
boardNames: string[]; // ["뉴스", "소식"]
```

`boardNames`는 `selectedPages`에 `"board"`가 포함된 경우만 의미 있다.

### 5-3. UI 배치

```
[페이지 구성]
ChipGroup (다중 선택)
  ○ 회사소개  ○ 서비스소개  ● 게시판  ○ 문의  ...

▼ 게시판이 선택되면 아래 나타남

  게시판1  [ 뉴스             ] ← input
  게시판2  [ 소식             ] ← input
           [+ 게시판 추가]      ← 버튼 (최대 5개)
```

---

## 6. API 변경

### 6-1. 사이트 생성 API (`POST /sites`) DTO 변경

```ts
// create-site.dto.ts 에 추가
@IsOptional()
@IsArray()
@IsString({ each: true })
@MaxLength(100, { each: true })
boardNames: string[] = [];
```

### 6-2. 게시판 API (신규 모듈: `modules/boards`)

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/boards/site/:siteId` | 그 사이트의 게시판 목록 | 불필요 |
| GET | `/boards/:boardId/posts` | 글 목록 (최신순, 20개씩) | 불필요 |
| GET | `/boards/:boardId/posts/:postId` | 글 상세 | 불필요 |
| POST | `/boards/:boardId/posts` | 글 작성 | **본인 사이트만** |
| PUT | `/boards/:boardId/posts/:postId` | 글 수정 | **본인 사이트만** |
| DELETE | `/boards/:boardId/posts/:postId` | 글 삭제 | **본인 사이트만** |

**본인 사이트 확인 로직 (모든 쓰기 API 공통):**
```
JWT에서 userId 추출
→ site_boards.site_id로 sites 조회
→ sites.user_id === userId 아니면 403 Forbidden
```

---

## 7. AI 프롬프트 변경

게시판이 있으면 게시판 이름과 이동할 URL을 프롬프트에 전달한다.  
AI는 메뉴에 해당 링크를 넣되, 글 목록을 가짜로 만들지 않는다.

```ts
// site-generation-prompt.ts 추가 부분
if (input.boardConfigs && input.boardConfigs.length > 0) {
  const boardItems = input.boardConfigs
    .map((b, i) => `  - ${b.name}: /board/${nameToSlug(b.name, i)}`)
    .join("\n");
  lines.push(`게시판 메뉴 (nav에 링크 추가, 내용은 만들지 않음):\n${boardItems}`);
}
```

프롬프트 규칙 추가:
```
- 게시판 항목이 있으면 nav에 해당 이름과 경로로 링크를 추가합니다.
- 게시판 글 목록, 글 내용은 HTML로 만들지 않습니다. 링크만 넣으세요.
- 게시판 링크 예시: <a href="/board/news">뉴스</a>
```

---

## 8. 사이트 생성 후처리

AI가 nav 링크를 빠뜨릴 수 있다.  
생성된 모든 페이지의 `<nav>` 영역에 게시판 링크가 있는지 확인하고, 없으면 우리 코드가 삽입한다.

```
// sites.service.ts 사이트 생성 완료 후
for each page in generatedPages:
  if boardConfigs 존재:
    for each boardConfig:
      if page.html에 /board/{slug} 링크 없음:
        nav 영역 마지막에 링크 추가
```

후처리는 간단한 정규식으로 `<nav` 태그를 찾아 그 안에 `<a>` 태그를 넣는다.

---

## 9. 프론트 게시판 화면 (신규)

### 9-1. 라우팅

```
frontend/src/app/s/[siteId]/board/[slug]/page.tsx        → 목록
frontend/src/app/s/[siteId]/board/[slug]/[postId]/page.tsx → 상세
frontend/src/app/s/[siteId]/board/[slug]/new/page.tsx     → 작성
```

`/s/[siteId]/` 경로는 사이트별 공개 게시판 화면이다.  
편집 화면(`/edit/[siteId]`)과 분리한다.

### 9-2. 각 화면 역할

**목록 (`board/[slug]`)**

- API: `GET /boards/site/:siteId` → slug로 boardId 찾기 → `GET /boards/:boardId/posts`
- 표시: 게시판 이름, 글 제목 목록, 작성일
- 글 없으면: "아직 글이 없습니다."
- 하단 버튼: `글쓰기` (로그인 + 본인 사이트일 때만 노출)
- 각 글 클릭 → 상세 이동

**상세 (`board/[slug]/[postId]`)**

- API: `GET /boards/:boardId/posts/:postId`
- 표시: 제목, 본문, 작성일
- 하단 버튼: `목록으로`, `수정` / `삭제` (로그인 + 본인 사이트일 때만)

**작성 (`board/[slug]/new`)**

- 로그인 + 본인 사이트 확인. 아니면 목록으로 리다이렉트.
- 제목 input, 본문 textarea
- `저장` 버튼 → `POST /boards/:boardId/posts` → 성공 시 목록으로 이동

### 9-3. 레이아웃 원칙

게시판 화면은 **생성된 사이트의 nav/footer를 포함하지 않는다.**  
사이트 디자인이 페이지마다 달라서 공통으로 가져오기 어렵기 때문이다.

대신 **단순하고 일관된 게시판 전용 레이아웃**을 사용한다.

```
┌──────────────────────────────────────────────────────────┐
│  ← 사이트 홈으로 돌아가기          [게시판 이름]        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  제목                                         2026.10.15 │
│  ──────────────────────────────────────────────────────  │
│  제목                                         2026.10.14 │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│                                          [글쓰기] ←주인만│
└──────────────────────────────────────────────────────────┘
```

- `← 사이트 홈으로 돌아가기` 링크는 `/s/[siteId]` 또는 생성된 사이트 첫 페이지로 이동.
- 색상은 흑백 계열만 (DESIGN.md 기준).

### 9-4. FSD 위치

```
frontend/src/
  app/
    s/[siteId]/board/[slug]/
      page.tsx                 ← 목록
      [postId]/page.tsx        ← 상세
      new/page.tsx             ← 작성
  widgets/
    site-board/
      ui/
        site-board-list.tsx    ← 목록 위젯
        site-board-detail.tsx  ← 상세 위젯
        site-board-write.tsx   ← 작성 위젯
  features/
    write-board-post/          ← 글 작성/수정 기능
      ui/post-form.tsx
      api/create-post.ts
      api/update-post.ts
  entities/
    board/
      api/get-board.ts
      api/get-posts.ts
      api/get-post.ts
      model/board.ts
```

---

## 10. 보안

- 글 작성/수정/삭제는 NestJS에서 JWT 검증 후 `sites.user_id === jwt.sub` 확인.
- 프론트에서 버튼을 숨기는 것은 UX용이고, 실제 차단은 서버에서만 한다.
- boardId를 요청 시 항상 사이트 소유자인지 서버에서 검증.

---

## 11. 에지 케이스

| 상황 | 처리 |
| --- | --- |
| 게시판 칩 끄고 재시작 | `boardNames` 초기화, 기존 `site_boards` 삭제 안 함 (이미 생성된 사이트는 유지) |
| 동일 이름 중복 입력 | 폼 유효성: "게시판 이름이 중복됩니다." |
| slug 충돌 | `-2` 접미사 추가 |
| 글 없는 게시판 | "아직 글이 없습니다." 표시 |
| 존재하지 않는 slug 접근 | 404 처리 |
| 로그인 없이 글쓰기 접근 | 목록 페이지로 리다이렉트 |

---

## 12. 구현 순서

1. **DB** — `site_inputs.board_configs` 컬럼 추가, `site_boards` / `site_posts` 테이블 생성, Migration SQL 작성
2. **백엔드 슬러그 유틸** — `board-slug.ts` 작성
3. **DTO / 서비스** — `boardNames` 필드 추가, 사이트 생성 시 `site_boards` 행 생성
4. **boards 모듈** — 컨트롤러 · 서비스 · CRUD API
5. **AI 프롬프트** — 게시판 이름 주입 + 후처리 nav 삽입
6. **제작 폼** — 게시판 칩 선택 시 이름 입력 칸 UI
7. **게시판 화면** — 목록 · 상세 · 작성 페이지 3개
