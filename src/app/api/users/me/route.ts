import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { users, unlocks, restaurants, restaurantStats, pointTransactions, visits } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("demo_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  // 유저 기본 정보
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, points: users.points, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  // 열람한 식당 목록
  const unlockedRestaurants = await db
    .select({
      restaurantId: unlocks.restaurantId,
      unlockedAt: unlocks.unlockedAt,
      name: restaurants.name,
      category: restaurants.category,
      region: restaurants.region,
      source: restaurants.source,
      totalVisits: restaurantStats.totalVisits,
    })
    .from(unlocks)
    .innerJoin(restaurants, eq(unlocks.restaurantId, restaurants.id))
    .leftJoin(restaurantStats, eq(restaurants.id, restaurantStats.restaurantId))
    .where(eq(unlocks.userId, userId))
    .orderBy(desc(unlocks.unlockedAt));

  // 포인트 내역
  const pointHistory = await db
    .select({
      amount: pointTransactions.amount,
      type: pointTransactions.type,
      createdAt: pointTransactions.createdAt,
    })
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, userId))
    .orderBy(desc(pointTransactions.createdAt))
    .limit(20);

  // 인증한 식당 목록
  const verifiedVisits = await db
    .select({
      visitId: visits.id,
      restaurantId: visits.restaurantId,
      pointsEarned: visits.pointsEarned,
      createdAt: visits.createdAt,
      name: restaurants.name,
      category: restaurants.category,
      region: restaurants.region,
    })
    .from(visits)
    .innerJoin(restaurants, eq(visits.restaurantId, restaurants.id))
    .where(eq(visits.userId, userId))
    .orderBy(desc(visits.createdAt))
    .limit(50);

  // 통계
  const totalUnlocked = unlockedRestaurants.length;
  const totalSpent = unlockedRestaurants.length * 5;
  const totalVisits = verifiedVisits.length;

  return NextResponse.json({
    user,
    stats: { totalUnlocked, totalSpent, totalVisits },
    unlockedRestaurants,
    verifiedVisits,
    pointHistory,
  });
}
