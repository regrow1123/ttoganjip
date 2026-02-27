/**
 * 서울시 업무추진비 크롤러 v2 — 스트리밍 저장 (파싱 즉시 DB 저장)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db/index";
import { restaurants, restaurantStats } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const BASE_URL = "https://opengov.seoul.go.kr";

const NON_RESTAURANT_KEYWORDS = [
  "약국", "마트", "편의점", "GS25", "CU", "세븐일레븐",
  "쿠팡", "배달의민족", "요기요", "롯데쇼핑", "이마트",
  "주유소", "주차장", "택시", "KTX", "SRT",
  "호텔", "모텔", "숙박", "인쇄", "복사",
  "꽃", "화원", "선물", "기프트",
];

const seoulDistricts: Record<string, { lat: number; lng: number }> = {
  "중구": { lat: 37.5640, lng: 126.9975 }, "종로구": { lat: 37.5735, lng: 126.9790 },
  "용산구": { lat: 37.5326, lng: 126.9906 }, "성동구": { lat: 37.5634, lng: 127.0369 },
  "광진구": { lat: 37.5385, lng: 127.0823 }, "동대문구": { lat: 37.5744, lng: 127.0396 },
  "중랑구": { lat: 37.6063, lng: 127.0925 }, "성북구": { lat: 37.5894, lng: 127.0167 },
  "강북구": { lat: 37.6397, lng: 127.0255 }, "도봉구": { lat: 37.6688, lng: 127.0471 },
  "노원구": { lat: 37.6543, lng: 127.0568 }, "은평구": { lat: 37.6027, lng: 126.9291 },
  "서대문구": { lat: 37.5791, lng: 126.9368 }, "마포구": { lat: 37.5664, lng: 126.9017 },
  "양천구": { lat: 37.5170, lng: 126.8664 }, "강서구": { lat: 37.5510, lng: 126.8495 },
  "구로구": { lat: 37.4954, lng: 126.8874 }, "금천구": { lat: 37.4519, lng: 126.8956 },
  "영등포구": { lat: 37.5264, lng: 126.8963 }, "동작구": { lat: 37.5124, lng: 126.9393 },
  "관악구": { lat: 37.4784, lng: 126.9516 }, "서초구": { lat: 37.4837, lng: 127.0324 },
  "강남구": { lat: 37.5172, lng: 127.0473 }, "송파구": { lat: 37.5146, lng: 127.1060 },
  "강동구": { lat: 37.5301, lng: 127.1238 },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/커피|카페|coffee|cafe|할리스|스타벅스|투썸|빽다방|이디야/.test(n)) return "cafe";
  if (/주|바|bar|호프|맥주|와인|소주|포차/.test(n)) return "bar";
  if (/스시|초밥|일식|사시미|돈까스|라멘|우동/.test(n)) return "japanese";
  if (/중국|중화|짜장|짬뽕|양꼬치|마라|훠궈/.test(n)) return "chinese";
  if (/파스타|피자|이탈리|스테이크|브런치|양식/.test(n)) return "western";
  return "korean";
}

// 전체 식당 방문 카운트 (메모리 내)
const visitCounter = new Map<string, { name: string; address: string; region: string; count: number }>();

async function getPostUrls(page: number): Promise<string[]> {
  const url = `${BASE_URL}/expense/list?items_per_page=100&page=${page}`;
  const res = await fetch(url);
  const html = await res.text();
  const urls: string[] = [];
  const regex = /\/expense\/(\d+)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const u = `${BASE_URL}/expense/${match[1]}`;
    if (!urls.includes(u)) urls.push(u);
  }
  return urls;
}

async function parseAndCount(url: string): Promise<number> {
  const res = await fetch(url);
  const html = await res.text();
  let count = 0;

  const rows = html.split(/<tr[^>]*>/i).slice(1);
  for (const row of rows) {
    const cells = row.split(/<td[^>]*>/i)
      .map(c => stripHtml(c.split("</td>")[0] || ""))
      .filter(c => c.length > 0);
    if (cells.length < 7) continue;

    const placeRaw = cells[3] || "";
    let place = placeRaw, address = "";
    const pm = placeRaw.match(/^(.+?)\((.+)\)$/);
    if (pm) { place = pm[1].trim(); address = pm[2].trim(); }

    const amountStr = (cells[5] || "").replace(/[^0-9]/g, "");
    const amount = parseInt(amountStr) || 0;
    if (!place || amount <= 0) continue;

    const combined = `${place} ${address}`.toLowerCase();
    if (NON_RESTAURANT_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()))) continue;

    const key = place.replace(/\s+/g, "").toLowerCase();
    const regionMatch = address.match(/(중구|종로구|용산구|성동구|강남구|마포구|영등포구|송파구|강동구|서초구|광진구|동대문구|강서구|구로구|양천구|은평구|서대문구|관악구|동작구|금천구|노원구|도봉구|강북구|성북구|중랑구)/);

    if (!visitCounter.has(key)) {
      visitCounter.set(key, { name: place, address, region: regionMatch?.[1] || "서울", count: 0 });
    }
    visitCounter.get(key)!.count++;
    count++;
  }
  return count;
}

async function main() {
  console.log("🏛️ 서울시 업무추진비 크롤링 v2 시작...\n");

  // 1. 목록 수집
  const allUrls: string[] = [];
  for (let page = 0; page < 5; page++) {
    console.log(`📋 목록 ${page + 1}/5...`);
    try {
      const urls = await getPostUrls(page);
      if (urls.length === 0) break;
      allUrls.push(...urls);
    } catch { console.error(`  ⚠️ 실패`); }
    await sleep(2000);
  }
  console.log(`→ ${allUrls.length}개 게시물\n`);

  // 2. 파싱
  let parsed = 0, totalRecords = 0, errors = 0;
  for (const url of allUrls) {
    try {
      parsed++;
      if (parsed % 20 === 0) console.log(`📄 ${parsed}/${allUrls.length} (식당 ${totalRecords}건)...`);
      totalRecords += await parseAndCount(url);
      await sleep(800);
    } catch {
      errors++;
      await sleep(3000);
    }
  }

  // 3. 재방문 2회+ 저장
  const revisit = [...visitCounter.entries()]
    .filter(([_, d]) => d.count >= 2)
    .sort((a, b) => b[1].count - a[1].count);

  console.log(`\n📊 파싱 ${parsed}개, 식당 기록 ${totalRecords}건, 에러 ${errors}개`);
  console.log(`🔥 재방문 2회+ 식당: ${revisit.length}개\n`);

  revisit.slice(0, 30).forEach(([_, d]) => console.log(`  ${d.name} — ${d.count}회 (${d.region})`));

  // 4. DB 저장
  console.log("\n💾 DB 저장 중...");
  let saved = 0;
  for (const [key, data] of revisit) {
    // 좌표
    const dist = seoulDistricts[data.region];
    const lat = dist ? dist.lat + (Math.random() - 0.5) * 0.008 : 37.5665 + (Math.random() - 0.5) * 0.02;
    const lng = dist ? dist.lng + (Math.random() - 0.5) * 0.008 : 126.978 + (Math.random() - 0.5) * 0.02;

    try {
      const existing = await db.select({ id: restaurants.id }).from(restaurants)
        .where(and(eq(restaurants.name, data.name), eq(restaurants.source, "seoul_expense"))).limit(1);

      if (existing.length > 0) {
        await db.update(restaurantStats).set({ totalVisits: data.count, maxRevisits: data.count })
          .where(eq(restaurantStats.restaurantId, existing[0].id));
      } else {
        const [ins] = await db.insert(restaurants).values({
          name: data.name, address: data.address, category: guessCategory(data.name),
          lat, lng, region: data.region, source: "seoul_expense",
        }).returning({ id: restaurants.id });
        await db.insert(restaurantStats).values({
          restaurantId: ins.id, totalVisits: data.count, uniqueVisitors: 1, revisitCount: 1, maxRevisits: data.count,
        });
      }
      saved++;
    } catch {}
  }

  console.log(`✅ ${saved}개 저장 완료!`);

  // 5. 최종 통계
  const final = await db.execute(
    // @ts-ignore
    { sql: "SELECT source, count(*) as cnt FROM restaurants GROUP BY source", params: [] }
  ).catch(() => null);

  console.log("\n═══════════════════════════════════");
  console.log("🎉 서울시 업무추진비 크롤링 v2 완료!");
  console.log(`   게시물: ${parsed}개 / 식당 기록: ${totalRecords}건`);
  console.log(`   재방문 식당: ${revisit.length}개 / DB 저장: ${saved}개`);
  console.log("═══════════════════════════════════");

  process.exit(0);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
main().catch(e => { console.error("❌", e); process.exit(1); });
