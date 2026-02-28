import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { restaurants, restaurantStats } from "@/db/schema";
import { ilike, eq } from "drizzle-orm";

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY!;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // 1) DB에서 매칭되는 식당 검색
  const dbResults = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      address: restaurants.address,
      category: restaurants.category,
      source: restaurants.source,
      placeId: restaurants.placeId,
      totalVisits: restaurantStats.totalVisits,
    })
    .from(restaurants)
    .leftJoin(restaurantStats, eq(restaurants.id, restaurantStats.restaurantId))
    .where(ilike(restaurants.name, `%${query}%`))
    .limit(5);

  const dbPlaceIds = new Set(dbResults.map((r) => r.placeId).filter(Boolean));

  // 2) 카카오 키워드 검색 (음식점 카테고리)
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("category_group_code", "FD6"); // 음식점
  url.searchParams.set("size", "10");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });

  if (!res.ok) {
    return NextResponse.json({ results: [] });
  }

  const data = await res.json();

  // DB 결과 (재방문 데이터 있음)
  const dbMapped = dbResults.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    category: r.category,
    source: r.source,
    totalVisits: r.totalVisits || 0,
    placeUrl: r.placeId ? `https://place.map.kakao.com/${r.placeId}` : null,
    inDb: true,
  }));

  // 카카오 결과 (DB에 없는 것만)
  const kakaoMapped = data.documents
    .filter((d: any) => !dbPlaceIds.has(d.id))
    .map((d: any) => ({
      placeId: d.id,
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      category: d.category_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      placeUrl: d.place_url,
      inDb: false,
    }));

  return NextResponse.json({ db: dbMapped, kakao: kakaoMapped });
}
