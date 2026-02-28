import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { restaurants, restaurantStats, visits, pointTransactions, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const FIRST_VISIT_POINTS = 10;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { placeId, name, address, category, lat, lng, ocrText } = await req.json();
  if (!name || !placeId) {
    return NextResponse.json({ error: "식당 정보가 부족합니다" }, { status: 400 });
  }

  // 이미 등록된 식당인지 확인 (placeId)
  const existing = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.placeId, placeId))
    .limit(1);

  let restaurantId: string;

  if (existing.length > 0) {
    restaurantId = existing[0].id;
  } else {
    // 주소에서 region 추출
    let region = "서울";
    const m = (address || "").match(/서울\S*\s+(\S+[구])/);
    if (m) region = m[1];
    else {
      const m2 = (address || "").match(/^(\S+)\s+(\S+[시군구])/);
      if (m2) region = m2[2];
    }

    // 새 식당 등록
    const [newRestaurant] = await db.insert(restaurants).values({
      name,
      address: address || "",
      category: category || "other",
      lat,
      lng,
      placeId,
      region,
      source: "user",
    }).returning({ id: restaurants.id });

    restaurantId = newRestaurant.id;

    // stats 생성
    await db.insert(restaurantStats).values({
      restaurantId,
      totalVisits: 0,
      uniqueVisitors: 0,
      revisitCount: 0,
    });
  }

  // 방문 기록
  await db.insert(visits).values({
    userId,
    restaurantId,
    receiptImage: "uploaded",
    ocrRaw: { text: ocrText || "" },
    ocrStatus: "verified",
    pointsEarned: FIRST_VISIT_POINTS,
  });

  await db.insert(pointTransactions).values({
    userId,
    amount: FIRST_VISIT_POINTS,
    type: "visit_first",
  });

  await db
    .update(users)
    .set({ points: sql`${users.points} + ${FIRST_VISIT_POINTS}` })
    .where(eq(users.id, userId));

  await db
    .update(restaurantStats)
    .set({ totalVisits: sql`${restaurantStats.totalVisits} + 1` })
    .where(eq(restaurantStats.restaurantId, restaurantId));

  const [user] = await db
    .select({ points: users.points })
    .from(users)
    .where(eq(users.id, userId));

  return NextResponse.json({
    success: true,
    restaurant: name,
    isFirstVisit: true,
    pointsEarned: FIRST_VISIT_POINTS,
    totalPoints: user.points,
  });
}
