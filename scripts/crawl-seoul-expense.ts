/**
 * 서울시 업무추진비 크롤러
 * 
 * 출처: https://opengov.seoul.go.kr/expense
 * 서울시 4급 이상 공무원 업무추진비 집행내역 공개 데이터
 * 
 * 데이터 구조 (각 게시물 페이지):
 * - 부서명, 날짜, 장소(식당명+주소), 사용목적, 금액, 참석자, 결제방식, 구분
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db/index";
import { restaurants, restaurantStats } from "../src/db/schema";
import { eq, and, sql } from "drizzle-orm";

const BASE_URL = "https://opengov.seoul.go.kr";
const LIST_URL = `${BASE_URL}/expense/list?items_per_page=100`;

// 식당이 아닌 곳 필터링 키워드
const NON_RESTAURANT_KEYWORDS = [
  "약국", "마트", "편의점", "GS25", "CU", "세븐일레븐",
  "쿠팡", "배달의민족", "요기요", "롯데쇼핑", "이마트",
  "주유소", "주차장", "택시", "KTX", "SRT",
  "호텔", "모텔", "숙박", "인쇄", "복사",
  "꽃", "화원", "선물", "기프트",
];

interface ExpenseRecord {
  department: string;
  date: string;
  place: string;       // 식당명
  address: string;     // 주소
  purpose: string;
  amount: number;
  attendees: string;
  payMethod: string;
  category: string;    // 시책/부서 등
}

/**
 * HTML에서 텍스트 추출 (간단한 파서)
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * 게시물 목록에서 개별 페이지 URL 추출
 */
async function getPostUrls(page: number = 0): Promise<string[]> {
  const url = `${LIST_URL}&page=${page}`;
  const res = await fetch(url);
  const html = await res.text();
  
  const urls: string[] = [];
  const regex = /\/expense\/(\d+)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const postUrl = `${BASE_URL}/expense/${match[1]}`;
    if (!urls.includes(postUrl)) {
      urls.push(postUrl);
    }
  }
  
  return urls;
}

/**
 * 개별 게시물 페이지에서 업무추진비 데이터 파싱
 */
async function parseExpensePage(url: string): Promise<ExpenseRecord[]> {
  const res = await fetch(url);
  const html = await res.text();
  const records: ExpenseRecord[] = [];

  // 테이블 행 파싱 - 각 행은 번호, 부서, 날짜, 장소, 목적, 금액, 참석, 결제, 구분
  // readability에서 파싱된 텍스트 패턴 기반
  const rows = html.split(/<tr[^>]*>/i).slice(1); // 첫 번째는 header 이전
  
  for (const row of rows) {
    const cells = row.split(/<td[^>]*>/i)
      .map(c => stripHtml(c.split("</td>")[0] || ""))
      .filter(c => c.length > 0);
    
    if (cells.length < 7) continue;
    
    // 장소에서 식당명과 주소 분리
    // 패턴: "식당명(주소)" 또는 "식당명 주소"
    const placeRaw = cells[3] || "";
    let place = placeRaw;
    let address = "";
    
    const parenMatch = placeRaw.match(/^(.+?)\((.+)\)$/);
    if (parenMatch) {
      place = parenMatch[1].trim();
      address = parenMatch[2].trim();
    }
    
    // 금액 파싱
    const amountStr = (cells[5] || "").replace(/[^0-9]/g, "");
    const amount = parseInt(amountStr) || 0;
    
    if (place && amount > 0) {
      records.push({
        department: cells[1] || "",
        date: cells[2] || "",
        place,
        address,
        purpose: cells[4] || "",
        amount,
        attendees: cells[6] || "",
        payMethod: cells[7] || "",
        category: cells[8] || "",
      });
    }
  }
  
  return records;
}

/**
 * 식당인지 판별
 */
function isRestaurant(record: ExpenseRecord): boolean {
  const combined = `${record.place} ${record.address}`.toLowerCase();
  return !NON_RESTAURANT_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));
}

/**
 * 식당 카테고리 추정
 */
function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/커피|카페|coffee|cafe|할리스|스타벅스|투썸|빽다방|이디야/.test(n)) return "cafe";
  if (/주|바|bar|호프|맥주|와인|소주|포차/.test(n)) return "bar";
  if (/스시|초밥|일식|사시미|돈까스|라멘|우동|일본/.test(n)) return "japanese";
  if (/중국|중화|짜장|짬뽕|양꼬치|마라|훠궈|대상해/.test(n)) return "chinese";
  if (/파스타|피자|이탈리|스테이크|브런치|양식|레스토랑/.test(n)) return "western";
  return "korean"; // 기본값
}

/**
 * 좌표 추정 (주소 기반 대략적 좌표)
 * TODO: Kakao 지오코딩 API로 정확한 좌표 변환
 */
function estimateLocation(address: string): { lat: number; lng: number } | null {
  const addr = address.toLowerCase();
  
  // 서울 구별 대략적 중심 좌표
  const seoulDistricts: Record<string, { lat: number; lng: number }> = {
    "중구": { lat: 37.5640, lng: 126.9975 },
    "종로구": { lat: 37.5735, lng: 126.9790 },
    "용산구": { lat: 37.5326, lng: 126.9906 },
    "성동구": { lat: 37.5634, lng: 127.0369 },
    "광진구": { lat: 37.5385, lng: 127.0823 },
    "동대문구": { lat: 37.5744, lng: 127.0396 },
    "중랑구": { lat: 37.6063, lng: 127.0925 },
    "성북구": { lat: 37.5894, lng: 127.0167 },
    "강북구": { lat: 37.6397, lng: 127.0255 },
    "도봉구": { lat: 37.6688, lng: 127.0471 },
    "노원구": { lat: 37.6543, lng: 127.0568 },
    "은평구": { lat: 37.6027, lng: 126.9291 },
    "서대문구": { lat: 37.5791, lng: 126.9368 },
    "마포구": { lat: 37.5664, lng: 126.9017 },
    "양천구": { lat: 37.5170, lng: 126.8664 },
    "강서구": { lat: 37.5510, lng: 126.8495 },
    "구로구": { lat: 37.4954, lng: 126.8874 },
    "금천구": { lat: 37.4519, lng: 126.8956 },
    "영등포구": { lat: 37.5264, lng: 126.8963 },
    "동작구": { lat: 37.5124, lng: 126.9393 },
    "관악구": { lat: 37.4784, lng: 126.9516 },
    "서초구": { lat: 37.4837, lng: 127.0324 },
    "강남구": { lat: 37.5172, lng: 127.0473 },
    "송파구": { lat: 37.5146, lng: 127.1060 },
    "강동구": { lat: 37.5301, lng: 127.1238 },
  };
  
  for (const [district, coords] of Object.entries(seoulDistricts)) {
    if (addr.includes(district)) {
      // 약간의 랜덤 오프셋 (같은 구 내 식당 구분용)
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.01,
        lng: coords.lng + (Math.random() - 0.5) * 0.01,
      };
    }
  }
  
  // 서울 기본값
  if (addr.includes("서울")) {
    return { lat: 37.5665 + (Math.random() - 0.5) * 0.02, lng: 126.978 + (Math.random() - 0.5) * 0.02 };
  }
  
  return null;
}

/**
 * 메인 크롤링 + DB 저장
 */
async function main() {
  console.log("🏛️ 서울시 업무추진비 크롤링 시작...\n");
  
  // 1. 게시물 목록 수집 (전체 페이지)
  const allPostUrls: string[] = [];
  const totalPages = 5; // 100개씩 5페이지 = 최대 500개
  for (let page = 0; page < totalPages; page++) {
    console.log(`📋 목록 페이지 ${page + 1}/${totalPages} 수집 중...`);
    try {
      const urls = await getPostUrls(page);
      if (urls.length === 0) break; // 더 이상 없으면 중단
      allPostUrls.push(...urls);
    } catch (err) {
      console.error(`  ⚠️ 페이지 ${page + 1} 실패, 재시도...`);
      await sleep(5000);
      try {
        const urls = await getPostUrls(page);
        allPostUrls.push(...urls);
      } catch { console.error(`  ❌ 페이지 ${page + 1} 재시도도 실패, 건너뜀`); }
    }
    await sleep(2000);
  }
  console.log(`  → ${allPostUrls.length}개 게시물 발견\n`);
  
  // 2. 각 게시물 파싱 (전체)
  const allRecords: ExpenseRecord[] = [];
  let parsed = 0;
  const total = allPostUrls.length;
  let consecutiveErrors = 0;
  
  for (const url of allPostUrls) {
    try {
      parsed++;
      if (parsed % 10 === 0 || parsed <= 3) {
        console.log(`📄 파싱 중 [${parsed}/${total}]...`);
      }
      const records = await parseExpensePage(url);
      const restaurantRecords = records.filter(isRestaurant);
      allRecords.push(...restaurantRecords);
      if (restaurantRecords.length > 0 && parsed <= 30) {
        console.log(`  → ${records.length}건 중 식당 ${restaurantRecords.length}건`);
      }
      consecutiveErrors = 0;
      await sleep(1000);
    } catch (err) {
      consecutiveErrors++;
      console.error(`  ❌ 파싱 실패 [${parsed}/${total}]: ${url}`);
      if (consecutiveErrors >= 5) {
        console.log("  ⚠️ 연속 5회 실패, 30초 대기...");
        await sleep(30000);
        consecutiveErrors = 0;
      } else {
        await sleep(3000);
      }
    }
  }
  
  console.log(`\n📊 총 ${allRecords.length}건의 식당 이용 기록 수집\n`);
  
  // 3. 식당별 재방문 집계
  const restaurantMap = new Map<string, {
    name: string;
    address: string;
    category: string;
    location: { lat: number; lng: number } | null;
    region: string;
    visits: { date: string; amount: number; department: string; purpose: string }[];
  }>();
  
  for (const record of allRecords) {
    // 식당 키: 이름 정규화
    const key = record.place.replace(/\s+/g, "").toLowerCase();
    
    if (!restaurantMap.has(key)) {
      const location = estimateLocation(record.address);
      // 지역 힌트 추출
      const regionMatch = record.address.match(/(서울|중구|종로구|용산구|성동구|강남구|마포구|영등포구|송파구|강동구|서초구|광진구|동대문구|강서구|구로구|양천구|은평구|서대문구|관악구|동작구|금천구|노원구|도봉구|강북구|성북구|중랑구)/);
      
      restaurantMap.set(key, {
        name: record.place,
        address: record.address,
        category: guessCategory(record.place),
        location,
        region: regionMatch ? regionMatch[1] : "서울",
        visits: [],
      });
    }
    
    restaurantMap.get(key)!.visits.push({
      date: record.date,
      amount: record.amount,
      department: record.department,
      purpose: record.purpose,
    });
  }
  
  // 재방문 2회 이상만 필터링
  const revisitRestaurants = [...restaurantMap.entries()]
    .filter(([_, data]) => data.visits.length >= 2)
    .sort((a, b) => b[1].visits.length - a[1].visits.length);
  
  console.log(`🔥 재방문 2회 이상 식당: ${revisitRestaurants.length}개\n`);
  
  for (const [key, data] of revisitRestaurants.slice(0, 20)) {
    console.log(`  ${data.name} — ${data.visits.length}회 (${data.region})`);
  }
  
  // 4. DB 저장
  if (revisitRestaurants.length > 0) {
    console.log("\n💾 DB 저장 중...");
    
    for (const [key, data] of revisitRestaurants) {
      if (!data.location) continue;
      
      try {
        // 같은 이름의 서울시 데이터가 이미 있는지 확인
        const existing = await db
          .select({ id: restaurants.id })
          .from(restaurants)
          .where(and(eq(restaurants.name, data.name), eq(restaurants.source, "seoul_expense")))
          .limit(1);
        
        if (existing.length > 0) {
          // 이미 있으면 통계만 업데이트
          await db.update(restaurantStats).set({
            totalVisits: data.visits.length,
            maxRevisits: data.visits.length,
          }).where(eq(restaurantStats.restaurantId, existing[0].id));
          continue;
        }
        
        const [inserted] = await db
          .insert(restaurants)
          .values({
            name: data.name,
            address: data.address,
            category: data.category,
            lat: data.location.lat,
            lng: data.location.lng,
            region: data.region,
            source: "seoul_expense",
          })
          .returning({ id: restaurants.id });
        
        await db.insert(restaurantStats).values({
          restaurantId: inserted.id,
          totalVisits: data.visits.length,
          uniqueVisitors: 1,
          revisitCount: 1,
          maxRevisits: data.visits.length,
        });
      } catch (err) {
        // 중복 등 에러 무시
      }
    }
    
    console.log("  ✅ 저장 완료!");
  }
  
  // 전체 통계 (재방문 아닌 것 포함)
  console.log("\n═══════════════════════════════════");
  console.log("🎉 서울시 업무추진비 크롤링 완료!");
  console.log(`   게시물 파싱: ${parsed}개`);
  console.log(`   식당 이용 기록: ${allRecords.length}건`);
  console.log(`   고유 식당: ${restaurantMap.size}개`);
  console.log(`   재방문 식당 (2회+): ${revisitRestaurants.length}개`);
  console.log("═══════════════════════════════════");
  
  process.exit(0);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("❌ 크롤링 실패:", err);
  process.exit(1);
});
