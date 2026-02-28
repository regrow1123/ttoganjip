import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { restaurants, restaurantStats, assemblyExpenses, assemblyMembers, unlocks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.cookies.get("demo_user_id")?.value || null;

  // 식당 기본 정보 + 통계
  const [restaurant] = await db
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
      uniqueVisitors: restaurantStats.uniqueVisitors,
      maxRevisits: restaurantStats.maxRevisits,
    })
    .from(restaurants)
    .innerJoin(restaurantStats, eq(restaurants.id, restaurantStats.restaurantId))
    .where(eq(restaurants.id, id))
    .limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "식당을 찾을 수 없습니다" }, { status: 404 });
  }

  // 잠금 확인
  let isUnlocked = false;
  if (userId) {
    const [unlock] = await db
      .select()
      .from(unlocks)
      .where(and(eq(unlocks.userId, userId), eq(unlocks.restaurantId, id)))
      .limit(1);
    isUnlocked = !!unlock;
  }

  // 국회의원 업무추진비 내역 (해당되면)
  let expenses: any[] = [];
  if (restaurant.source === "assembly") {
    expenses = await db
      .select({
        date: assemblyExpenses.expenseDate,
        amount: assemblyExpenses.amount,
        purpose: assemblyExpenses.purpose,
        memberName: assemblyMembers.name,
        party: assemblyMembers.party,
      })
      .from(assemblyExpenses)
      .innerJoin(assemblyMembers, eq(assemblyExpenses.memberId, assemblyMembers.id))
      .where(eq(assemblyExpenses.restaurantId, id))
      .orderBy(sql`${assemblyExpenses.expenseDate} DESC`);
  }

  if (!isUnlocked) {
    return NextResponse.json({
      id: restaurant.id,
      category: restaurant.category,
      region: restaurant.region,
      source: restaurant.source,
      totalVisits: restaurant.totalVisits,
      locked: true,
    });
  }

  // placeId 가져오기
  const [full] = await db
    .select({ placeId: restaurants.placeId })
    .from(restaurants)
    .where(eq(restaurants.id, id));

  return NextResponse.json({
    ...restaurant,
    placeId: full?.placeId || null,
    kakaoMapUrl: full?.placeId
      ? `https://place.map.kakao.com/${full.placeId}`
      : `https://map.kakao.com/?q=${encodeURIComponent(restaurant.name)}`,
    expenses,
    locked: false,
  });
}
