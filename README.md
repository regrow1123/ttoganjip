<p align="center">
  <h1 align="center">또간집</h1>
  <p align="center"><strong>재방문이 증명하는 진짜 맛집</strong></p>
  <p align="center">
    <em>"별점은 조작할 수 있지만, 재방문은 거짓말하지 않는다"</em>
  </p>
</p>

<p align="center">
  <a href="#-핵심-아이디어">핵심 아이디어</a> •
  <a href="#-기능">기능</a> •
  <a href="#-데이터">데이터</a> •
  <a href="#-기술-스택">기술 스택</a> •
  <a href="#-시작하기">시작하기</a>
</p>

---

## 🤔 왜 또간집인가?

맛집 블로그? 광고투성이. 별점? 조작 가능. 리뷰? 돈 받고 쓴 글.

**진짜 맛집을 알려면 하나만 보면 됩니다 — 재방문.**

같은 사람이 같은 식당을 여러 번 찾았다면, 그건 진짜입니다. 또간집은 이 단순한 진실에서 출발합니다.

## 💡 핵심 아이디어

### 재방문 = 신뢰

| 기존 맛집 서비스 | 또간집 |
|:---:|:---:|
| ⭐ 별점 4.8 (조작 가능) | 🔄 재방문 7회 (거짓말 불가) |
| 📝 블로그 리뷰 (광고·협찬) | 🧾 영수증 인증 (위조 방지) |
| 👤 익명 평점 | 🏛️ 공공 데이터 기반 |

### 포인트 경제 — 보고 싶으면, 먼저 인증하세요

맛집 이름은 **잠금 상태**입니다. 열고 싶다면?

1. 📸 **영수증 인증**으로 포인트 획득 (+10~20P)
2. 🔓 **5P로 잠금 해제** → 상호명 + 주소 + 카카오맵 링크 확인

> 직접 맛집을 인증한 사람만이 다른 맛집을 발견할 수 있습니다.

### 공공 데이터 시드 — 국회의원은 어디서 밥을 먹을까?

서비스 초기 데이터? 직접 만들지 않았습니다.

- 🏛️ **국회의원 업무추진비** — 의원들이 공금으로 방문한 식당
- 🏙️ **서울시 공무원 업무추진비** — 공무원들의 단골집

공공 데이터에서 추출한 **1,188개 재방문 식당**이 이미 등록되어 있습니다.

> "국회의원 OOO이 7번 재방문한 한정식집이 어디지?"

궁금하시죠? 5P만 쓰면 됩니다 😏

## ✨ 기능

### 🗺️ 재방문 맛집 지도
- 카카오맵 위에 재방문 맛집 핀 표시
- 핀 번호 = 리스트 인덱스 (직관적 매핑)
- 카테고리 필터 (한식 · 중식 · 일식 · 양식 · 카페 · 술집)
- 데이터 소스 필터 (전체 · 🏛️ 국회의원 · 🏙️ 서울시 공무원)

### 🔒 잠금/해제 시스템
- **잠금 상태:** 카테고리 + 지역(구 단위) + 재방문 횟수만 표시
- **해제 상태:** 상호명 + 정확한 주소 + 카카오맵 링크 + 업무추진비 내역

### 🔍 통합 검색
- DB 식당 + 카카오 Local API 동시 검색
- 현재 지도 뷰포트 범위 내에서만 결과 표시
- 검색 결과에서도 잠금/해제 UX 동일

### 📸 영수증 인증
- 카메라 촬영 또는 갤러리 선택
- 브라우저 OCR (Tesseract.js) — 서버 비용 0원
- DB 식당명 자동 매칭 → 포인트 즉시 지급
- 첫 방문 +10P, 재방문 +20P

### 🌗 Catppuccin 테마
- 라이트: Catppuccin Latte (부드러운 크림색)
- 다크: Catppuccin Mocha (파스텔 다크)
- 카카오맵 다크모드 지원 (CSS 필터 + 핀 역보정)

### 👤 마이페이지
- 보유 포인트 · 잠금해제 식당 목록 · 포인트 내역
- 다크모드 토글

## 📊 데이터

| 항목 | 수량 |
|------|------|
| 총 등록 식당 | **1,188개** |
| 국회의원 출처 | 29개 (344건 업무추진비) |
| 서울시 공무원 출처 | 1,159개 |
| 카카오맵 연동 | 1,188개 (100%) |
| 커버 지역 | 서울 전역 + 경기/부산/제주 등 |

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 15 · React 19 · TypeScript · Tailwind v4 |
| **지도** | Kakao Map SDK |
| **상태관리** | Zustand |
| **OCR** | Tesseract.js (브라우저) |
| **Backend** | Next.js API Routes |
| **ORM** | Drizzle ORM |
| **DB** | PostgreSQL 16 (Supabase) |
| **배포** | Vercel |
| **테마** | Catppuccin (Latte + Mocha) |

## 🏗 아키텍처

```
┌──────────────────┐     ┌───────────────┐     ┌──────────────────┐
│   Frontend       │────▶│   Next.js     │────▶│   PostgreSQL     │
│  React 19        │     │   API Routes  │     │   Supabase       │
│  Tesseract.js    │     └───────┬───────┘     └──────────────────┘
│  Kakao Map SDK   │             │
└──────────────────┘             └──▶ Kakao Local API
```

## 🚀 시작하기

### 요구사항
- Node.js 18+
- Supabase 프로젝트
- 카카오 개발자 API 키

### 설치

```bash
git clone https://github.com/regrow1123/ttoganjip.git
cd ttoganjip
npm install
```

### 환경 변수

`.env.local` 파일 생성:

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_KAKAO_MAP_KEY=xxx
KAKAO_REST_API_KEY=xxx
```

### 실행

```bash
npm run dev
```

`http://localhost:3000`에서 확인!

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 메인 (지도 + 리스트)
│   ├── mypage/             # 마이페이지
│   ├── receipt/            # 영수증 인증
│   └── api/                # API Routes
├── components/             # UI 컴포넌트
│   ├── map/KakaoMap.tsx    # 카카오맵
│   ├── RestaurantList.tsx  # 식당 리스트
│   ├── SearchBar.tsx       # 검색
│   └── UnlockModal.tsx     # 잠금해제 모달
├── db/                     # Drizzle ORM 스키마
├── lib/                    # Zustand 스토어 + API 헬퍼
└── scripts/                # 데이터 수집 스크립트
    ├── crawl-seoul-v2.ts   # 서울시 업무추진비 크롤러
    └── map-place-ids.ts    # 카카오 placeId 매핑
```

## 📈 로드맵

- [x] 재방문 맛집 지도 + 잠금/해제
- [x] 국회의원 + 서울시 공무원 시드 데이터
- [x] 영수증 OCR 인증 (Tesseract.js)
- [x] 통합 검색 (DB + 카카오)
- [x] Catppuccin 테마 (라이트 + 다크)
- [ ] OAuth 로그인 (Google · Kakao)
- [ ] 랜딩/온보딩 페이지
- [ ] 커스텀 도메인 (ttoganjip.kr)
- [ ] 다른 지자체 업무추진비 확장
- [ ] 네이티브 앱

## 🤝 기여

또간집에 관심이 있으시다면 이슈나 PR을 남겨주세요!

- 새로운 지자체 업무추진비 데이터 제보
- OCR 정확도 개선 아이디어
- UI/UX 피드백
- 버그 리포트

## 📄 라이센스

MIT License

---

<p align="center">
  <strong>재방문이 증명하는 진짜 맛집, 또간집</strong>
  <br>
  <em>별점 대신 발걸음을 믿으세요.</em>
</p>
