/**
 * 카카오 장소 검색 API로 placeId + 정확한 좌표 매핑
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db/index";
import { restaurants } from "../src/db/schema";
import { isNull, or, eq } from "drizzle-orm";

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
if (!KAKAO_KEY) {
  console.error("❌ KAKAO_REST_API_KEY not set");
  process.exit(1);
}

async function searchPlace(name: string, address?: string | null) {
  // 1차: 이름 + 주소로 검색
  const queries = [
    address ? `${name} ${address}` : name,
    name, // 2차: 이름만
  ];

  for (const query of queries) {
    const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url.searchParams.set("query", query);
    url.searchParams.set("category_group_code", "FD6"); // 음식점만
    url.searchParams.set("size", "5");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });

    if (!res.ok) continue;
    const data = await res.json();

    if (data.documents?.length > 0) {
      // 이름이 가장 비슷한 것 선택
      const doc = data.documents.find((d: any) =>
        d.place_name.includes(name.replace(/\s/g, "").slice(0, 3))
      ) || data.documents[0];

      return {
        placeId: doc.id,
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        placeName: doc.place_name,
        address: doc.road_address_name || doc.address_name,
      };
    }
  }

  return null;
}

async function main() {
  console.log("🗺️ 카카오 장소 ID 매핑 시작...\n");

  // placeId가 없는 식당만
  const rows = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      address: restaurants.address,
    })
    .from(restaurants)
    .where(isNull(restaurants.placeId));

  console.log(`📍 매핑 대상: ${rows.length}개 식당\n`);

  let mapped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const result = await searchPlace(row.name, row.address);

      if (result) {
        await db
          .update(restaurants)
          .set({
            placeId: result.placeId,
            lat: result.lat,
            lng: result.lng,
            address: result.address || row.address,
          })
          .where(eq(restaurants.id, row.id));

        mapped++;
        console.log(`  ✅ ${row.name} → ${result.placeName} (${result.placeId})`);
      } else {
        failed++;
        console.log(`  ❌ ${row.name} — 검색 결과 없음`);
      }

      await new Promise((r) => setTimeout(r, 200)); // 속도 제한
    } catch (err) {
      failed++;
      console.error(`  ❌ ${row.name} — 에러`);
    }
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`🎉 매핑 완료: ${mapped}개 성공, ${failed}개 실패`);
  console.log(`═══════════════════════════════`);

  process.exit(0);
}

main();
