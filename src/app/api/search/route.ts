import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { restaurants, restaurantStats, unlocks } from "@/db/schema";
import { ilike, eq, and, gte, lte } from "drizzle-orm";

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY!;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ db: [], kakao: [] });
  }

  const swLat = req.nextUrl.searchParams.get("swLat");
  const swLng = req.nextUrl.searchParams.get("swLng");
  const neLat = req.nextUrl.searchParams.get("neLat");
  const neLng = req.nextUrl.searchParams.get("neLng");
  const hasBounds = swLat && swLng && neLat && neLng;

  // 1) DB에서 매칭 (뷰포트 내)
  const conditions = [ilike(restaurants.name, `%${query}%`)];
  if (hasBounds) {
    conditions.push(gte(restaurants.lat, parseFloat(swLat)));
    conditions.push(lte(restaurants.lat, parseFloat(neLat)));
    conditions.push(gte(restaurants.lng, parseFloat(swLng)));
    conditions.push(lte(restaurants.lng, parseFloat(neLng)));
  }

  const dbResults = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      address: restaurants.address,
      category: restaurants.category,
      source: restaurants.source,
      placeId: restaurants.placeId,
      lat: restaurants.lat,
      lng: restaurants.lng,
      totalVisits: restaurantStats.totalVisits,
    })
    .from(restaurants)
    .leftJoin(restaurantStats, eq(restaurants.id, restaurantStats.restaurantId))
    .where(and(...conditions))
    .limit(5);

  // 열람 여부 확인
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  let unlockedIds = new Set<string>();
  if (userId) {
    const userUnlocks = await db
      .select({ restaurantId: unlocks.restaurantId })
      .from(unlocks)
      .where(eq(unlocks.userId, userId));
    unlockedIds = new Set(userUnlocks.map((u) => u.restaurantId));
  }

  const dbPlaceIds = new Set(dbResults.map((r) => r.placeId).filter(Boolean));

  // 2) 카카오 키워드 검색 (뷰포트 rect 제한)
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "10");
  if (hasBounds) {
    // rect: x1,y1,x2,y2 (서쪽경도,남쪽위도,동쪽경도,북쪽위도)
    url.searchParams.set("rect", `${swLng},${swLat},${neLng},${neLat}`);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });

  if (!res.ok) {
    console.error("Kakao API error:", res.status, await res.text());
    return NextResponse.json({
      db: dbResults.map((r) => ({ ...r, lat: r.lat ? parseFloat(String(r.lat)) : null, lng: r.lng ? parseFloat(String(r.lng)) : null, totalVisits: r.totalVisits || 0, placeUrl: r.placeId ? `https://place.map.kakao.com/${r.placeId}` : null, inDb: true })),
      kakao: [],
    });
  }

  const data = await res.json();

  const dbMapped = dbResults.map((r) => {
    const isUnlocked = unlockedIds.has(r.id);
    return {
      id: r.id,
      name: isUnlocked ? r.name : "🔒 잠긴 맛집",
      address: isUnlocked ? r.address : (r.address?.split(" ").slice(0, 2).join(" ") || ""),
      category: r.category,
      source: r.source,
      lat: r.lat ? parseFloat(String(r.lat)) : null,
      lng: r.lng ? parseFloat(String(r.lng)) : null,
      totalVisits: r.totalVisits || 0,
      placeUrl: isUnlocked && r.placeId ? `https://place.map.kakao.com/${r.placeId}` : null,
      locked: !isUnlocked,
      inDb: true,
    };
  });

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
