import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { restaurants, restaurantStats, unlocks } from "@/db/schema";
import { and, gte, lte, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const swLat = parseFloat(params.get("swLat") || "0");
  const swLng = parseFloat(params.get("swLng") || "0");
  const neLat = parseFloat(params.get("neLat") || "0");
  const neLng = parseFloat(params.get("neLng") || "0");
  const category = params.get("category") || null;
  const userId = params.get("userId") || null; // TODO: 세션에서 가져오기

  if (!swLat || !neLat) {
    return NextResponse.json({ error: "bounds required" }, { status: 400 });
  }

  // 뷰포트 내 재방문 2회+ 식당 조회
  const conditions = [
    gte(restaurants.lat, swLat),
    lte(restaurants.lat, neLat),
    gte(restaurants.lng, swLng),
    lte(restaurants.lng, neLng),
    gte(restaurantStats.totalVisits, 2),
  ];

  if (category) {
    conditions.push(eq(restaurants.category, category));
  }

  const rows = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      address: restaurants.address,
      category: restaurants.category,
      lat: restaurants.lat,
      lng: restaurants.lng,
      region: restaurants.region,
      totalVisits: restaurantStats.totalVisits,
      maxRevisits: restaurantStats.maxRevisits,
    })
    .from(restaurants)
    .innerJoin(restaurantStats, eq(restaurants.id, restaurantStats.restaurantId))
    .where(and(...conditions))
    .orderBy(sql`${restaurantStats.totalVisits} desc`)
    .limit(100);

  // 유저가 로그인한 경우 unlock 여부 확인
  let unlockedIds = new Set<string>();
  if (userId) {
    const userUnlocks = await db
      .select({ restaurantId: unlocks.restaurantId })
      .from(unlocks)
      .where(eq(unlocks.userId, userId));
    unlockedIds = new Set(userUnlocks.map((u) => u.restaurantId));
  }

  // 잠금/해제 상태에 따라 응답 분기
  const result = rows.map((r) => {
    const isUnlocked = unlockedIds.has(r.id);

    if (isUnlocked) {
      return {
        id: r.id,
        name: r.name,
        address: r.address,
        category: r.category,
        location: { lat: r.lat, lng: r.lng },
        revisitScore: r.totalVisits,
        locked: false,
      };
    }

    return {
      id: r.id,
      category: r.category,
      revisitScore: r.totalVisits,
      areaHint: r.region || "서울",
      locked: true,
    };
  });

  return NextResponse.json({ restaurants: result, total: result.length });
}
