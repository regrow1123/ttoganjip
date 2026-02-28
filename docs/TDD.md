# 또간집 - Technical Design Document (TDD)

## 1. 아키텍처 개요

```
┌──────────────────┐     ┌───────────────┐     ┌──────────────────┐
│   Frontend       │────▶│   Backend     │────▶│   Database       │
│  Next.js 15      │     │  Next.js API  │     │  PostgreSQL 16   │
│  React 19        │     │  Routes       │     │  Supabase        │
│  Tesseract.js    │     └───────┬───────┘     └──────────────────┘
│  (브라우저 OCR)   │             │
└──────────────────┘             ├──▶ Kakao Local API (검색/placeId)
       │                         │
       ▼                         └──▶ 크롤링 스크립트 (시드 데이터)
┌──────────────┐
│  Kakao Map   │
│  SDK (JS)    │
└──────────────┘
```

## 2. 기술 스택

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **스타일링:** Tailwind CSS v4 + Catppuccin 커스텀 테마
- **상태관리:** Zustand (useMapStore, useRestaurantStore, useUserStore)
- **지도:** Kakao Map SDK (JS)
- **영수증 OCR:** Tesseract.js (브라우저 사이드)
- **카메라/업로드:** native input[type=file] + capture="environment"

### Backend
- **API:** Next.js Route Handlers
- **ORM:** Drizzle ORM (postgres 드라이버)
- **인증:** 데모 쿠키 (→ NextAuth.js v5 예정)
- **검색:** Kakao Local API (키워드 + 주소 검색)

### Database
- **메인 DB:** PostgreSQL 16 (Supabase, transaction pooler)
- **호스팅:** Supabase (ap-northeast-2)
- **스키마 관리:** Raw SQL (drizzle-kit push 버그로 인해)

### 인프라
- **배포:** Vercel (git push 자동 배포)
- **CI/CD:** GitHub → Vercel 통합
- **도메인:** Vercel 기본 (→ ttoganjip.kr 예정)

## 3. 데이터 모델 (8 테이블)

### users
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100),
  image         TEXT,
  provider      VARCHAR(20) NOT NULL DEFAULT 'demo',
  provider_id   VARCHAR(255),
  points        INTEGER DEFAULT 1000,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### restaurants
```sql
CREATE TABLE restaurants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  address       TEXT,
  category      VARCHAR(50),    -- korean|chinese|japanese|western|cafe|bar|other
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  place_id      VARCHAR(100),   -- 카카오맵 placeId
  region        VARCHAR(100),   -- 구/시 단위 (잠금 상태에서 표시)
  source        VARCHAR(20) DEFAULT 'user',  -- 'user'|'assembly'|'seoul_expense'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### visits
```sql
CREATE TABLE visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  receipt_image TEXT NOT NULL,
  receipt_date  DATE,
  receipt_amount INTEGER,
  ocr_raw       JSONB,
  ocr_status    VARCHAR(20) DEFAULT 'pending',
  image_hash    VARCHAR(64),    -- perceptual hash (중복 방지)
  points_earned INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### restaurant_stats
```sql
CREATE TABLE restaurant_stats (
  restaurant_id UUID PRIMARY KEY REFERENCES restaurants(id),
  total_visits  INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  revisit_count INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### point_transactions
```sql
CREATE TABLE point_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL,
  type          VARCHAR(30) NOT NULL,  -- visit_first|visit_revisit|unlock|signup_bonus
  reference_id  UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### unlocks
```sql
CREATE TABLE unlocks (
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  unlocked_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);
```

### assembly_members
```sql
CREATE TABLE assembly_members (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     VARCHAR(100) NOT NULL,
  party    VARCHAR(50),
  district VARCHAR(100),
  term     INTEGER,
  image    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### assembly_expenses
```sql
CREATE TABLE assembly_expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID REFERENCES assembly_members(id),
  restaurant_id UUID REFERENCES restaurants(id),
  expense_date  DATE NOT NULL,
  amount        INTEGER,
  purpose       TEXT,
  source        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. API 설계 (구현 완료)

### 인증
| Method | Path | 설명 | 상태 |
|--------|------|------|------|
| POST | `/api/auth/demo-login` | 데모 사용자 로그인 (쿠키 설정) | ✅ |
| GET | `/api/auth/me` | 현재 로그인 사용자 정보 | ✅ |
| POST | `/api/auth/logout` | 로그아웃 | ✅ |

### 지도 / 탐색
| Method | Path | 설명 | 상태 |
|--------|------|------|------|
| GET | `/api/map/restaurants` | 뷰포트 내 재방문 맛집 (잠금/해제) | ✅ |
| GET | `/api/restaurants/:id` | 맛집 상세 + 업무추진비 내역 | ✅ |
| POST | `/api/restaurants/:id/unlock` | 잠금 해제 (-5P) | ✅ |

### 검색
| Method | Path | 설명 | 상태 |
|--------|------|------|------|
| GET | `/api/search` | DB + 카카오 통합 검색 (뷰포트 제한) | ✅ |

### 영수증 인증
| Method | Path | 설명 | 상태 |
|--------|------|------|------|
| POST | `/api/receipts/verify` | OCR 텍스트 → DB 매칭 → 포인트 지급 | ✅ |

### 사용자
| Method | Path | 설명 | 상태 |
|--------|------|------|------|
| GET | `/api/users/me` | 프로필 + 열람목록 + 포인트 내역 | ✅ |

## 5. 주요 컴포넌트

```
src/
├── app/
│   ├── page.tsx              ← 메인 (지도 + 리스트)
│   ├── mypage/page.tsx       ← 마이페이지
│   ├── receipt/page.tsx      ← 영수증 인증
│   ├── globals.css           ← Catppuccin 테마 변수
│   └── api/
│       ├── auth/             ← 로그인/로그아웃
│       ├── map/restaurants/  ← 지도 식당 목록
│       ├── restaurants/[id]/ ← 상세 + 잠금해제
│       ├── search/           ← 통합 검색
│       ├── receipts/verify/  ← 영수증 인증
│       └── users/me/         ← 사용자 프로필
├── components/
│   ├── Header.tsx            ← 헤더 (로그인/포인트/📸/MY)
│   ├── SearchBar.tsx         ← 검색바 (디바운스)
│   ├── SourceTabs.tsx        ← 소스 탭 (전체/국회의원/서울시)
│   ├── CategoryFilter.tsx    ← 카테고리 필터
│   ├── RestaurantList.tsx    ← 리스트 + 검색결과 + 잠금/해제
│   ├── RestaurantDetail.tsx  ← 상세 모달
│   ├── UnlockModal.tsx       ← 잠금해제 모달 (3단계)
│   └── map/
│       └── KakaoMap.tsx      ← 카카오맵 + 드롭핀
├── db/
│   ├── index.ts              ← Drizzle DB 인스턴스
│   └── schema.ts             ← 8 테이블 스키마
├── lib/
│   ├── api.ts                ← 클라이언트 fetch 헬퍼
│   └── store.ts              ← Zustand 스토어 3개
├── types/
│   └── index.ts              ← 타입 + 카테고리 라벨
└── scripts/
    ├── seed.ts               ← 시드 데이터 (국회의원)
    ├── crawl-seoul-v2.ts     ← 서울시 업무추진비 크롤러
    ├── map-place-ids.ts      ← 카카오 placeId 매핑
    └── remap-place-ids.ts    ← placeId 재매핑 (417개 보정)
```

## 6. 핵심 구현 포인트

### 영수증 OCR 파이프라인
```
1. 사용자: 📸 버튼 → 영수증 촬영/갤러리 선택
2. 브라우저: Tesseract.js로 OCR (kor+eng) → 프로그레스바
3. 클라이언트: 추출된 텍스트를 서버로 POST
4. 서버: 정방향 매칭 (OCR 줄 → DB ilike 검색)
5. 서버: 역방향 매칭 (DB 식당명 → OCR 텍스트 포함 확인)
6. 서버: 매칭 성공 → 중복 확인 → 방문 기록 → 포인트 지급
```

### 잠금/해제 응답
```typescript
// 잠금 상태
{ id, category, revisitScore, areaHint: "중구", locked: true }

// 해제 상태
{ id, name, address, category, location: {lat, lng},
  revisitScore, source, placeId, kakaoMapUrl, expenses?, locked: false }
```

### 카카오맵 다크모드
```css
.dark .kakao-map-container {
  filter: invert(0.92) hue-rotate(180deg) saturate(0.8) brightness(0.9);
}
.dark .kakao-map-container .kakao-pin-overlay {
  filter: invert(1) hue-rotate(180deg) saturate(1.25) brightness(1.1);
}
```

### 검색 (뷰포트 제한)
- DB: `WHERE lat BETWEEN sw_lat AND ne_lat AND lng BETWEEN sw_lng AND ne_lng`
- 카카오: `rect=sw_lng,sw_lat,ne_lng,ne_lat` 파라미터
- 검색 결과에서도 잠금 상태 체크 (unlocks 테이블 조인)

### 데이터 수집 스크립트
1. `crawl-seoul-v2.ts` — 서울시 업무추진비 500 포스트 → 1,385개 재방문 식당
2. `map-place-ids.ts` — 카카오 키워드 검색으로 placeId + 좌표 매핑 (955/1,372)
3. `remap-place-ids.ts` — 실패 417개 재매핑 (이름+주소 조합, 주소 지오코딩)

## 7. 테마: Catppuccin

### 다크 모드 (Mocha)
| 용도 | 변수 | 색상 |
|------|------|------|
| 배경 | `tn-bg` | `#1e1e2e` |
| 카드 | `tn-bg-card` | `#24243e` |
| 하이라이트 | `tn-bg-highlight` | `#313244` |
| 텍스트 | `tn-fg` | `#bac2de` |
| 밝은 텍스트 | `tn-fg-bright` | `#cdd6f4` |
| 어두운 텍스트 | `tn-fg-dark` | `#6c7086` |
| 블루 (primary) | `tn-blue` | `#89b4fa` |
| 보더 | `tn-border` | `#45475a` |

### 라이트 모드 (Latte)
| 용도 | 변수 | 색상 |
|------|------|------|
| 배경 | `ctp-base` | `#eff1f5` |
| 서브 배경 | `ctp-mantle` | `#e6e9ef` |
| 서피스 | `ctp-surface0` | `#ccd0da` |
| 텍스트 | `ctp-text` | `#4c4f69` |
| 블루 (primary) | `ctp-blue` | `#1e66f5` |

## 8. 보안

- API 인증: 데모 쿠키 (`demo_user_id`) → OAuth 세션 예정
- 포인트 조작 방지: 서버사이드에서만 증감 (트랜잭션)
- 같은 날 중복 인증 방지 (`createdAt` 날짜 비교)
- 이미지 해시 컬럼 준비됨 (`visits.image_hash`)
- 검색 SQL injection 방지: Drizzle ORM 파라미터 바인딩

## 9. 데이터 현황

| 항목 | 수량 |
|------|------|
| 총 식당 | 1,188개 |
| 국회의원 출처 | 29개 |
| 서울시 출처 | 1,159개 |
| placeId 보유 | 1,188개 (100%) |
| 업무추진비 내역 | 344건 (국회의원) |
| 서울 지역 | ~954개 |
| 서울 외 | ~234개 |

## 10. 남은 작업

### 필수
- [ ] OAuth 로그인 (Google/Kakao) — NextAuth.js
- [ ] 랜딩/온보딩 페이지
- [ ] 커스텀 도메인 (ttoganjip.kr)

### 개선
- [ ] 영수증 OCR 정확도 향상 (CLOVA OCR 고려)
- [ ] 이미지 해시 중복 감지
- [ ] 반응형 데스크탑 사이드바 세부 조정
- [ ] 성능 최적화 (DB 인덱스, 캐싱)

---

_이 문서는 살아있는 문서입니다. 개발 진행에 따라 업데이트됩니다._
