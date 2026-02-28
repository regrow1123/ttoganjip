// 카테고리
export const CATEGORIES = [
  "korean",
  "chinese",
  "japanese",
  "western",
  "cafe",
  "bar",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
  cafe: "카페",
  bar: "술집",
  other: "기타",
};

// 데이터 소스
export const SOURCES = ["all", "assembly", "seoul_expense"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  all: "전체",
  assembly: "🏛️ 국회의원",
  seoul_expense: "🏙️ 서울시 공무원",
};

// 지도 뷰포트
export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

// 잠금 상태 맛집 (리스트용)
export type Grade = "none" | "ttoganjip" | "dangol" | "jjin";

export interface LockedRestaurant {
  id: string;
  category: Category | null;
  revisitScore: number;
  publicVisits?: number;
  userVisits?: number;
  areaHint: string;
  source?: string;
  grade?: Grade;
  locked: true;
}

// 해제 상태 맛집
export interface UnlockedRestaurant {
  id: string;
  name: string;
  address: string;
  category: Category | null;
  location: { lat: number; lng: number };
  revisitScore: number;
  publicVisits?: number;
  userVisits?: number;
  source?: string;
  grade?: Grade;
  locked: false;
}

export type Restaurant = LockedRestaurant | UnlockedRestaurant;
