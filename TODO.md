# Development Roadmap

---

## Phase 1 — 기반 세팅

- [x] Next.js App Router 프로젝트 생성
- [x] NestJS 프로젝트 생성
- [x] MySQL + Drizzle 연결
- [x] DB 스키마 작성 (users, sites, site_inputs, site_images, site_pages, site_edit_history)
- [x] 회원가입
- [x] 로그인
- [x] 로그아웃

---

## Phase 2 — 홈페이지 (대시보드)

- [x] 홈 레이아웃 및 네브바
- [x] 내가 만든 사이트 목록 표시
- [ ] 사이트 카드 클릭 → 편집 페이지 이동
- [ ] 사이트 만들기 버튼 → 제작 페이지 이동

---

## Phase 3 — 제작 페이지 (웹 버전)

- [x] 제작 페이지 레이아웃 (한 페이지 형식)
- [x] 입력 폼 구성
  - [x] 업종 / 어떤 회사인지
  - [x] 회사명
  - [x] 한줄 소개 (필수)
  - [x] 긴 설명 (선택)
  - [x] 회사 주소 / 연락처 / 이메일 등 회사 정보
  - [x] 제작 목적 선택 (6가지)
  - [x] 타겟 고객 자유 입력
  - [x] 메인 컬러 (컬러코드 또는 텍스트 입력)
  - [x] 분위기 선택 (따뜻한, 전문적인 등)
  - [x] 페이지 수 입력
  - [x] 페이지 구성 선택 (다중 선택)
  - [x] 선택 기능 링크 입력 (위치, 블로그, SNS 등)
  - [x] 참고 사이트 링크 (선택)
- [x] 이미지 업로드
  - [x] 로고 업로드
  - [x] 사이트용 사진 다중 업로드
  - [x] 업로드된 이미지 미리보기
- [x] 필수값 유효성 검사
- [ ] 생성 버튼 클릭 → 로딩 UI → 편집 페이지 이동

---

## Phase 4 — 제작 페이지 (앱 버전 / 퍼널)

- [ ] 퍼널 레이아웃 (단계별 진행)
- [ ] 단계 1: 업종 / 회사명 / 한줄 소개
- [ ] 단계 2: 상세 설명 / 회사 정보
- [ ] 단계 3: 제작 목적 / 타겟 고객
- [ ] 단계 4: 컬러 / 분위기 선택
- [ ] 단계 5: 이미지 업로드
- [ ] 단계 6: 페이지 구성 / 선택 기능
- [ ] 이전 / 다음 버튼 및 단계 표시 인디케이터
- [ ] 생성 버튼 → 로딩 → 편집 페이지 이동

---

## Phase 5 — AI 사이트 생성

- [ ] 백엔드: 입력 데이터 수신 및 저장 (site_inputs)
- [ ] AI API 연결 (OpenAI 등)
- [ ] 입력 정보를 바탕으로 AI 프롬프트 구성
- [ ] AI 응답으로 site_pages 데이터 생성 및 저장
- [ ] 이미지 업로드 처리 (S3 또는 로컬 스토리지)
- [ ] 생성 완료 후 편집 페이지 리다이렉트
- [ ] 선택 기능 링크 Safe Browsing 검사 (나중에)
  - 이미 된 것: http/https만 허용, javascript/data/file 등 위험 스킴 차단, HTML 이스케이프(`escapeHtml`), 외부 링크는 새 탭 + `noopener noreferrer` (`describeSafeExternalLink`)
  - 남은 것: Google Safe Browsing으로 피싱·악성 URL 여부 검사
  - 방법: 백엔드 `.env`에 API 키를 두고 NestJS에서 검사. 프론트 `field-format.ts`의 주소 검사 뒤에 이어서 붙인다. 키는 코드에 넣지 않는다.
- [ ] 참고 사이트 링크 SSRF 안전 fetch + LLM 분석 (나중에)
  - 이미 된 것(프론트): http/https만 허용, 위험 스킴 차단, localhost / loopback / 사설 IP / link-local / 클라우드 메타데이터 호스트 차단 (`referenceUrl`, `describeSafeReferenceLink`)
  - 서버에서 반드시 다시 할 일 (프론트 검사는 우회 가능):
    - hostname DNS resolve 후, 나온 실제 IP가 localhost / loopback / 사설 / link-local / 메타데이터인지 다시 검사
    - redirect가 나면 redirect 대상 URL·IP도 같은 규칙으로 재검증
    - 악성/피싱 URL 평판 검사 (Safe Browsing 등)
    - timeout, 최대 redirect 횟수, 최대 응답 크기 제한
    - 허용 Content-Type만 받기 (HTML, PDF 등 필요한 것만)
    - JavaScript 실행 없이 콘텐츠만 fetch
    - HTML의 script, iframe 등 실행성 요소를 제거한 뒤 본문 텍스트만 추출
  - LLM 사용 규칙:
    - 웹페이지 내용은 untrusted external content로 취급
    - 페이지 안의 명령문·prompt injection은 실행하지 않고 참고자료로만 사용
    - 분석용 LLM에는 쓰기/삭제/결제 등 위험 Tool 권한을 주지 않음
  - 방법: NestJS에서만 fetch. 프론트는 URL을 보내기만 한다. API 키는 `.env`에만 둔다.

---

## Phase 6 — 편집 페이지

- [ ] 편집 페이지 레이아웃
  - [ ] 왼쪽: 사이트 미리보기 렌더링
  - [ ] 오른쪽: 접고 펼 수 있는 사이드바
  - [ ] 상단 네브: 뒤로가기 / 앞으로가기 버튼 (기본 비활성)
  - [ ] 상단 네브: 저장하기 버튼
- [ ] 컴포넌트 좌클릭 편집
  - [ ] 클릭된 컴포넌트 정보 사이드바에 표시
  - [ ] 입력창으로 AI 요청 전송
  - [ ] AI 응답으로 컴포넌트 실시간 업데이트
- [ ] 텍스트 우클릭 편집
  - [ ] 내용 / 글자 크기 / 색깔 입력창이 사이드바에 표시
  - [ ] 변경 즉시 미리보기에 반영
- [ ] 이미지 우클릭 편집
  - [ ] 이미지 변경용 파일 업로드 input 표시
  - [ ] 변경 즉시 미리보기에 반영
- [ ] 편집 히스토리 저장 (site_edit_history)
- [ ] 뒤로가기 / 앞으로가기 기능 구현
- [ ] 저장하기 기능 (site_pages 업데이트)

---

## Phase 7 — 마무리 및 배포

- [ ] 사이트 배포 기능 (퍼블리싱)
- [ ] 배포된 사이트 URL 제공
- [ ] 결제 / 플랜 관리
- [ ] 사용량 관리
- [ ] 관리자 페이지
