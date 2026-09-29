# Database Schema

MySQL + Drizzle ORM을 사용한다.
스키마 정의는 `backend/src/database/schema/`에 둔다.

---

## users

사용자 정보

- id: bigint, PK, auto increment
- email: varchar(255), unique
- name: varchar(100)
- password_hash: varchar(255)
- created_at: datetime
- updated_at: datetime

---

## sites

사용자가 만든 사이트 목록

- id: bigint, PK, auto increment
- user_id: bigint, FK → users.id
- name: varchar(255) — 사이트 이름 (회사명 기본값)
- type: enum('web', 'app') — 웹 또는 앱
- status: enum('generating', 'draft', 'published') — 생성중 / 편집중 / 배포됨
- thumbnail_url: varchar(500), nullable — 사이트 썸네일
- created_at: datetime
- updated_at: datetime

---

## site_inputs

제작 페이지에서 입력한 정보 (AI 생성 시 참고)

- id: bigint, PK, auto increment
- site_id: bigint, FK → sites.id, unique
- business_type: varchar(255), nullable — 업종 / 어떤 회사인지
- company_name: varchar(255) — 회사명
- one_line_intro: varchar(500) — 한줄 소개
- description: text, nullable — 긴 설명 (선택)
- address: varchar(500), nullable — 회사 주소
- phone: varchar(50), nullable — 연락처
- email: varchar(255), nullable — 이메일
- extra_contact: text, nullable — 기타 연락처 정보
- purpose: enum('company_intro', 'investment', 'sales', 'recruitment', 'promotion', 'inquiry') — 제작 목적
- target_customer: varchar(500), nullable — 타겟 고객
- main_color: varchar(100), nullable — 메인 컬러 (컬러코드 또는 텍스트)
- atmosphere: varchar(255), nullable — 분위기 (따뜻한, 전문적인 등)
- page_count: int, default 1 — 페이지 수
- page_components: json, nullable — 선택된 페이지 구성 목록 (배열)
- reference_url: varchar(500), nullable — 참고 사이트 링크 (선택)
- optional_links: json, nullable — 선택 기능 링크 (위치, 블로그, SNS 등)
- created_at: datetime
- updated_at: datetime

optional_links JSON 구조 예시:
```json
{
  "location": "https://maps.google.com/...",
  "naver_blog": "https://blog.naver.com/...",
  "homepage": "https://example.com",
  "instagram": "https://instagram.com/...",
  "youtube": "https://youtube.com/...",
  "phone": "010-1234-5678"
}
```

page_components JSON 구조 예시:
```json
["company_intro", "service_intro", "contact", "faq", "directions"]
```

---

## site_images

사이트에 업로드된 이미지

- id: bigint, PK, auto increment
- site_id: bigint, FK → sites.id
- type: enum('logo', 'site_image') — 로고 또는 사이트용 사진
- url: varchar(500) — 이미지 저장 경로
- original_name: varchar(255), nullable — 원본 파일명
- order: int, default 0 — 사이트 이미지 정렬 순서
- created_at: datetime

---

## site_pages

AI가 생성한 사이트의 페이지별 컴포넌트 데이터

- id: bigint, PK, auto increment
- site_id: bigint, FK → sites.id
- page_type: varchar(100) — 페이지 종류 (company_intro, service_intro, contact 등)
- page_order: int — 페이지 순서
- component_data: json — 해당 페이지의 컴포넌트 구조 및 내용
- created_at: datetime
- updated_at: datetime

component_data JSON 구조 예시:
```json
{
  "components": [
    {
      "id": "hero-1",
      "type": "hero",
      "props": {
        "title": "회사명",
        "subtitle": "한줄 소개",
        "backgroundImage": "https://...",
        "ctaText": "문의하기"
      }
    }
  ]
}
```

---

## site_edit_history

편집 히스토리 (뒤로가기 / 앞으로가기 기능)

- id: bigint, PK, auto increment
- site_id: bigint, FK → sites.id
- snapshot: json — 해당 시점의 전체 site_pages 데이터 스냅샷
- created_at: datetime

---

## 관계

```
users
  1 : N
sites
  1 : 1  site_inputs
  1 : N  site_images
  1 : N  site_pages
  1 : N  site_edit_history
```

---

## Database Rules

- Cursor는 기존 테이블 또는 컬럼을 임의로 삭제하지 않는다.
- 프론트에서 MySQL에 직접 접속하지 않는다.
- DB 접근은 NestJS + Drizzle만 사용한다.

DB Schema 변경이 필요한 경우:

1. 변경 필요 이유 설명
2. 변경 Schema 제안
3. Drizzle schema와 Migration SQL 작성
4. 사용자 확인 후 적용
