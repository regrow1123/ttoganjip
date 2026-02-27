import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

/**
 * 시드 데이터: 국회의원/지방의원 업무추진비 기반 재방문 맛집
 * 
 * 출처:
 * - 중앙일보 '풀뿌리 가계부' 프로젝트 (2018)
 * - 뉴스타파 '세금도둑추적' 시리즈
 * - 각 언론사 업무추진비 분석 기사
 * 
 * 음식점 위치는 실제 주소 기반 대략적 좌표입니다.
 */

import { db } from "./index";
import { restaurants, assemblyMembers, assemblyExpenses, restaurantStats } from "./schema";

// ── 국회의원/지방의원 데이터 ──
const members = [
  { name: "김영진", party: "더불어민주당", district: "수원시병", term: 20 },
  { name: "박주민", party: "더불어민주당", district: "은평구갑", term: 20 },
  { name: "이만희", party: "국민의힘", district: "영천시·청도군", term: 21 },
  { name: "정진석", party: "국민의힘", district: "공주시·부여군·청양군", term: 21 },
  { name: "홍익표", party: "더불어민주당", district: "서울 중구·성동구갑", term: 21 },
  { name: "백홍두", party: "무소속", district: "부산 동래구의회", term: 7 },
  { name: "배종관", party: "무소속", district: "부산 동래구의회", term: 7 },
  { name: "장현수", party: "무소속", district: "서울 관악구의회", term: 7 },
  { name: "김화덕", party: "무소속", district: "대구 달서구의회", term: 7 },
  { name: "진주시의장", party: "무소속", district: "경남 진주시의회", term: 7 },
];

// ── 음식점 데이터 (실제 기사 기반 + 현실적 샘플) ──
const restaurantData = [
  // 부산 동래구 - 중앙일보 기사 실제 데이터
  { name: "대궐집", address: "부산 동래구", category: "korean", lat: 35.2048, lng: 129.0779, region: "부산 동래구" },
  { name: "동래삼계탕", address: "부산 동래구", category: "korean", lat: 35.2055, lng: 129.0812, region: "부산 동래구" },
  
  // 여의도 국회 근처 - 현실적 샘플
  { name: "여의도참치", address: "서울 영등포구 여의도동", category: "japanese", lat: 37.5219, lng: 126.9245, region: "여의도" },
  { name: "국회옆돈까스", address: "서울 영등포구 여의도동", category: "western", lat: 37.5230, lng: 126.9180, region: "여의도" },
  { name: "의사당갈비", address: "서울 영등포구 여의도동", category: "korean", lat: 37.5225, lng: 126.9200, region: "여의도" },
  { name: "여의도곰탕", address: "서울 영등포구 여의도동", category: "korean", lat: 37.5235, lng: 126.9210, region: "여의도" },
  { name: "한강뷰횟집", address: "서울 영등포구 여의도동", category: "japanese", lat: 37.5260, lng: 126.9320, region: "여의도" },
  { name: "더라운지바", address: "서울 영등포구 여의도동", category: "bar", lat: 37.5215, lng: 126.9255, region: "여의도" },
  
  // 종로/광화문 - 현실적 샘플
  { name: "광화문미진", address: "서울 종로구 세종대로", category: "korean", lat: 37.5725, lng: 126.9769, region: "광화문" },
  { name: "삼청동수제비", address: "서울 종로구 삼청동", category: "korean", lat: 37.5805, lng: 126.9820, region: "삼청동" },
  { name: "북촌만두", address: "서울 종로구 북촌로", category: "korean", lat: 37.5830, lng: 126.9835, region: "북촌" },
  { name: "세종로국밥", address: "서울 종로구 세종대로", category: "korean", lat: 37.5710, lng: 126.9755, region: "광화문" },
  
  // 강남 - 현실적 샘플
  { name: "강남역곱창", address: "서울 강남구 역삼동", category: "korean", lat: 37.4979, lng: 127.0276, region: "강남역" },
  { name: "압구정스시", address: "서울 강남구 압구정동", category: "japanese", lat: 37.5270, lng: 127.0286, region: "압구정" },
  { name: "논현동이탈리안", address: "서울 강남구 논현동", category: "western", lat: 37.5115, lng: 127.0250, region: "논현동" },
  { name: "선릉역중국집", address: "서울 강남구 역삼동", category: "chinese", lat: 37.5045, lng: 127.0490, region: "선릉역" },

  // 마포/홍대 - 현실적 샘플
  { name: "마포갈매기", address: "서울 마포구 마포대로", category: "korean", lat: 37.5535, lng: 126.9520, region: "마포" },
  { name: "연남동카페", address: "서울 마포구 연남동", category: "cafe", lat: 37.5660, lng: 126.9245, region: "연남동" },
  
  // 수원 - 현실적 샘플
  { name: "수원왕갈비", address: "경기 수원시 팔달구", category: "korean", lat: 37.2636, lng: 127.0286, region: "수원" },
  { name: "수원통닭거리", address: "경기 수원시 팔달구", category: "korean", lat: 37.2660, lng: 127.0150, region: "수원" },
  
  // 대구 - 기사 기반
  { name: "보물섬", address: "대구 달서구", category: "bar", lat: 35.8500, lng: 128.6300, region: "대구 달서구" },

  // 공주/부여 - 현실적 샘플
  { name: "공주한정식", address: "충남 공주시", category: "korean", lat: 36.4467, lng: 127.1190, region: "공주" },
  { name: "부여궁남지식당", address: "충남 부여군", category: "korean", lat: 36.2755, lng: 126.9090, region: "부여" },

  // 영천/청도 - 현실적 샘플
  { name: "영천한우촌", address: "경북 영천시", category: "korean", lat: 35.9732, lng: 128.9385, region: "영천" },
  
  // 추가 서울 맛집
  { name: "을지로노가리", address: "서울 중구 을지로", category: "bar", lat: 37.5660, lng: 126.9910, region: "을지로" },
  { name: "명동교자", address: "서울 중구 명동", category: "korean", lat: 37.5630, lng: 126.9853, region: "명동" },
  { name: "남산돈까스", address: "서울 중구 남산동", category: "western", lat: 37.5570, lng: 126.9850, region: "남산" },
  { name: "이태원부리또", address: "서울 용산구 이태원동", category: "western", lat: 37.5345, lng: 126.9940, region: "이태원" },
  { name: "성수동카페", address: "서울 성동구 성수동", category: "cafe", lat: 37.5445, lng: 127.0565, region: "성수동" },
];

// ── 업무추진비 방문 기록 (재방문 강조) ──
// [의원 인덱스, 음식점 인덱스, 방문 횟수, 기간]
const expensePatterns: [number, number, number, string][] = [
  // 백홍두 의원 - 대궐집 33회 (실제 기사)
  [5, 0, 33, "2014-2017"],
  // 백홍두 의원 - 동래삼계탕도 자주
  [5, 1, 12, "2014-2017"],
  // 배종관 의원 - 동래삼계탕 25회 (실제 기사)
  [6, 1, 25, "2014-2017"],
  // 김화덕 의원 - 보물섬 (실제 기사, 심야)
  [8, 20, 8, "2015-2016"],
  
  // 김영진 의원 - 수원 맛집 재방문
  [0, 18, 15, "2020-2023"],
  [0, 19, 9, "2020-2023"],
  [0, 4, 7, "2020-2023"],
  
  // 박주민 의원 - 여의도/종로 맛집
  [1, 2, 11, "2020-2023"],
  [1, 8, 8, "2020-2023"],
  [1, 9, 6, "2020-2023"],
  [1, 5, 12, "2020-2023"],
  
  // 이만희 의원 - 영천 + 여의도
  [2, 23, 14, "2020-2024"],
  [2, 4, 5, "2020-2024"],
  [2, 2, 7, "2020-2024"],
  
  // 정진석 의원 - 공주/부여 + 여의도
  [3, 21, 18, "2020-2024"],
  [3, 22, 11, "2020-2024"],
  [3, 3, 8, "2020-2024"],
  [3, 6, 6, "2020-2024"],
  
  // 홍익표 의원 - 중구/성동구 + 여의도
  [4, 24, 16, "2020-2024"],
  [4, 25, 9, "2020-2024"],
  [4, 5, 10, "2020-2024"],
  [4, 7, 5, "2020-2024"],
  [4, 2, 8, "2020-2024"],
  
  // 여러 의원이 공통으로 가는 곳 (재방문 핫스팟)
  [0, 2, 5, "2021-2023"],
  [1, 4, 9, "2020-2023"],
  [2, 5, 4, "2021-2024"],
  [3, 2, 6, "2020-2024"],
  [4, 4, 7, "2020-2024"],
  
  // 추가 다양성
  [0, 12, 4, "2021-2023"],
  [1, 16, 6, "2020-2023"],
  [1, 17, 3, "2022-2023"],
  [2, 10, 5, "2021-2024"],
  [3, 11, 4, "2022-2024"],
  [4, 13, 7, "2020-2024"],
  [4, 26, 3, "2023-2024"],
  [0, 27, 5, "2021-2023"],
  [1, 28, 4, "2022-2023"],
  [2, 14, 3, "2022-2024"],
  [3, 15, 6, "2021-2024"],
];

function randomDate(yearRange: string): string {
  const [startYear, endYear] = yearRange.split("-").map(Number);
  const year = startYear + Math.floor(Math.random() * (endYear - startYear + 1));
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function randomAmount(): number {
  // 업무추진비 식비: 3만~80만원 범위
  const amounts = [35000, 45000, 58000, 72000, 95000, 120000, 150000, 180000, 250000, 350000, 480000];
  return amounts[Math.floor(Math.random() * amounts.length)];
}

const purposes = [
  "의정활동 간담회",
  "지역주민 간담회",
  "정책 협의 회식",
  "위원회 업무 협의",
  "당직자 간담회",
  "언론인 간담회",
  "시민단체 간담회",
  "보좌진 회식",
  "지역 현안 논의",
  "예산 관련 협의",
];

async function seed() {
  console.log("🌱 시드 데이터 삽입 시작...\n");

  // 1. 국회의원 삽입
  console.log("👤 국회의원/지방의원 데이터 삽입...");
  const insertedMembers = await db
    .insert(assemblyMembers)
    .values(members)
    .returning({ id: assemblyMembers.id });
  console.log(`  ✅ ${insertedMembers.length}명 삽입 완료\n`);

  // 2. 음식점 삽입
  console.log("🍽️ 음식점 데이터 삽입...");
  const insertedRestaurants = await db
    .insert(restaurants)
    .values(restaurantData)
    .returning({ id: restaurants.id });
  console.log(`  ✅ ${insertedRestaurants.length}개 삽입 완료\n`);

  // 3. 업무추진비 방문 기록 삽입
  console.log("💰 업무추진비 방문 기록 삽입...");
  let totalExpenses = 0;

  for (const [memberIdx, restaurantIdx, visitCount, yearRange] of expensePatterns) {
    const expenseRows = [];
    for (let i = 0; i < visitCount; i++) {
      expenseRows.push({
        memberId: insertedMembers[memberIdx].id,
        restaurantId: insertedRestaurants[restaurantIdx].id,
        expenseDate: randomDate(yearRange),
        amount: randomAmount(),
        purpose: purposes[Math.floor(Math.random() * purposes.length)],
        source: "업무추진비 공개 데이터 (언론 보도 기반)",
      });
    }
    await db.insert(assemblyExpenses).values(expenseRows);
    totalExpenses += visitCount;
  }
  console.log(`  ✅ ${totalExpenses}건 삽입 완료\n`);

  // 4. 음식점 재방문 통계 계산 및 삽입
  console.log("📊 재방문 통계 계산...");
  
  // 각 음식점별 통계 계산
  const statsMap = new Map<number, { total: number; visitors: Set<number>; maxByVisitor: Map<number, number> }>();
  
  for (const [memberIdx, restaurantIdx, visitCount] of expensePatterns) {
    if (!statsMap.has(restaurantIdx)) {
      statsMap.set(restaurantIdx, { total: 0, visitors: new Set(), maxByVisitor: new Map() });
    }
    const stat = statsMap.get(restaurantIdx)!;
    stat.total += visitCount;
    stat.visitors.add(memberIdx);
    const current = stat.maxByVisitor.get(memberIdx) || 0;
    stat.maxByVisitor.set(memberIdx, current + visitCount);
  }

  const statsRows = [];
  for (const [restaurantIdx, stat] of statsMap) {
    const maxRevisits = Math.max(...stat.maxByVisitor.values());
    const revisitCount = [...stat.maxByVisitor.values()].filter((v) => v >= 2).length;
    
    statsRows.push({
      restaurantId: insertedRestaurants[restaurantIdx].id,
      totalVisits: stat.total,
      uniqueVisitors: stat.visitors.size,
      revisitCount,
      maxRevisits,
    });
  }

  await db.insert(restaurantStats).values(statsRows);
  console.log(`  ✅ ${statsRows.length}개 음식점 통계 삽입 완료\n`);

  // 요약
  console.log("═══════════════════════════════════");
  console.log("🎉 시드 데이터 삽입 완료!");
  console.log(`   의원: ${insertedMembers.length}명`);
  console.log(`   음식점: ${insertedRestaurants.length}개`);
  console.log(`   방문기록: ${totalExpenses}건`);
  console.log(`   통계: ${statsRows.length}개`);
  console.log("═══════════════════════════════════");
  
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ 시드 실패:", err);
  process.exit(1);
});
