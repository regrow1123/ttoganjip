import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { restaurants, restaurantStats, visits, pointTransactions, users } from "@/db/schema";
import { eq, ilike, sql } from "drizzle-orm";

const FIRST_VISIT_POINTS = 10;
const REVISIT_POINTS = 20;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { ocrText } = await req.json();
  if (!ocrText || ocrText.trim().length < 5) {
    return NextResponse.json({ error: "영수증 텍스트를 읽을 수 없습니다" }, { status: 400 });
  }

  // 텍스트에서 식당명 매칭
  const lines = ocrText.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length >= 2);

  let matchedRestaurant: { id: string; name: string } | null = null;

  for (const line of lines) {
    if (line.length > 30) continue;
    const results = await db
      .select({ id: restaurants.id, name: restaurants.name })
      .from(restaurants)
      .where(ilike(restaurants.name, `%${line.replace(/[%_]/g, "")}%`))
      .limit(1);
    if (results.length > 0) {
      matchedRestaurant = results[0];
      break;
    }
  }

  // 역방향: DB 식당명이 OCR 텍스트에 포함되는지
  if (!matchedRestaurant) {
    const allRestaurants = await db
      .select({ id: restaurants.id, name: restaurants.name })
      .from(restaurants)
      .limit(2000);

    const normalizedText = ocrText.replace(/\s/g, "").toLowerCase();
    for (const r of allRestaurants) {
      const normalizedName = r.name.replace(/\s/g, "").toLowerCase();
      if (normalizedName.length >= 2 && normalizedText.includes(normalizedName)) {
        matchedRestaurant = r;
        break;
      }
    }
  }

  if (!matchedRestaurant) {
    return NextResponse.json({
      error: "매칭되는 식당을 찾을 수 없습니다",
      lines: lines.slice(0, 10),
    }, { status: 404 });
  }

  // 같은 날 중복 방지
  const today = new Date().toISOString().split("T")[0];
  const existingVisit = await db
    .select()
    .from(visits)
    .where(
      sql`${visits.userId} = ${userId} AND ${visits.restaurantId} = ${matchedRestaurant.id} AND DATE(${visits.createdAt}) = ${today}`
    )
    .limit(1);

  if (existingVisit.length > 0) {
    return NextResponse.json({
      error: "오늘 이미 이 식당의 방문을 인증했습니다",
      restaurant: matchedRestaurant.name,
    }, { status: 409 });
  }

  const prevVisits = await db
    .select()
    .from(visits)
    .where(sql`${visits.userId} = ${userId} AND ${visits.restaurantId} = ${matchedRestaurant.id}`);

  const isFirstVisit = prevVisits.length === 0;
  const pointsEarned = isFirstVisit ? FIRST_VISIT_POINTS : REVISIT_POINTS;

  await db.insert(visits).values({
    userId,
    restaurantId: matchedRestaurant.id,
    receiptImage: "uploaded",
    ocrRaw: { text: ocrText },
    ocrStatus: "verified",
    pointsEarned,
  });

  await db.insert(pointTransactions).values({
    userId,
    amount: pointsEarned,
    type: isFirstVisit ? "visit_first" : "visit_revisit",
  });

  await db
    .update(users)
    .set({ points: sql`${users.points} + ${pointsEarned}` })
    .where(eq(users.id, userId));

  await db
    .update(restaurantStats)
    .set({ totalVisits: sql`${restaurantStats.totalVisits} + 1` })
    .where(eq(restaurantStats.restaurantId, matchedRestaurant.id));

  const [user] = await db
    .select({ points: users.points })
    .from(users)
    .where(eq(users.id, userId));

  return NextResponse.json({
    success: true,
    restaurant: matchedRestaurant.name,
    isFirstVisit,
    pointsEarned,
    totalPoints: user.points,
  });
}
