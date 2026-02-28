import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { restaurants, restaurantStats, unlocks, visits } from "@/db/schema";
import { getGrade } from "@/lib/grade";
import { and, gte, lte, eq, sql, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const swLat = parseFloat(params.get("swLat") || "0");
  const swLng = parseFloat(params.get("swLng") || "0");
  const neLat = parseFloat(params.get("neLat") || "0");
  const neLng = parseFloat(params.get("neLng") || "0");
  const category = params.get("category") || null;
  const source = params.get("source") || null; // 'all' | 'assembly' | 'seoul_expense' | 'user'
  const userId = params.get("userId") || req.cookies.get("demo_user_id")?.value || null;

  if (!swLat || !neLat) {
    return NextResponse.json({ error: "bounds required" }, { status: 400 });
  }

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

  // source 필터
  if (source && source !== "all") {
    if (source === "public") {
      // 공공 데이터 전체 (국회의원 + 서울시)
      conditions.push(inArray(restaurants.source, ["assembly", "seoul_expense"]));
    } else {
      conditions.push(eq(restaurants.source, source));
    }
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
      source: restaurants.source,
      totalVisits: restaurantStats.totalVisits,
      maxRevisits: restaurantStats.maxRevisits,
      publicVisits: restaurantStats.publicVisits,
      userVisits: restaurantStats.userVisits,
    })
    .from(restaurants)
    .innerJoin(restaurantStats, eq(restaurants.id, restaurantStats.restaurantId))
    .where(and(...conditions))
    .orderBy(sql`${restaurantStats.totalVisits} desc`)
    .limit(100);

  let unlockedIds = new Set<string>();
  if (userId) {
    const userUnlocks = await db
      .select({ restaurantId: unlocks.restaurantId })
      .from(unlocks)
      .where(eq(unlocks.userId, userId));
    const userVisits = await db
      .select({ restaurantId: visits.restaurantId })
      .from(visits)
      .where(eq(visits.userId, userId));
    unlockedIds = new Set([
      ...userUnlocks.map((u) => u.restaurantId),
      ...userVisits.map((v) => v.restaurantId),
    ]);
  }

  const result = rows.map((r) => {
    const isUnlocked = unlockedIds.has(r.id);

    const grade = getGrade(r.userVisits ?? 0);

    if (isUnlocked) {
      return {
        id: r.id,
        name: r.name,
        address: r.address,
        category: r.category,
        location: { lat: r.lat, lng: r.lng },
        revisitScore: r.totalVisits,
        publicVisits: r.publicVisits ?? 0,
        userVisits: r.userVisits ?? 0,
        source: r.source,
        grade,
        locked: false,
      };
    }

    return {
      id: r.id,
      category: r.category,
      revisitScore: r.totalVisits,
      publicVisits: r.publicVisits ?? 0,
      userVisits: r.userVisits ?? 0,
      areaHint: r.region || "서울",
      source: r.source,
      grade,
      locked: true,
    };
  });

  return NextResponse.json({ restaurants: result, total: result.length });
}
