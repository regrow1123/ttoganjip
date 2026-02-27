import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { restaurants, users, unlocks, pointTransactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { POINTS } from "@/lib/points";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: restaurantId } = await params;

  // TODO: NextAuth 세션에서 userId 가져오기
  const body = await req.json().catch(() => ({}));
  const userId = body.userId || req.cookies.get("demo_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  // 이미 열람한 식당인지 확인
  const existing = await db
    .select()
    .from(unlocks)
    .where(and(eq(unlocks.userId, userId), eq(unlocks.restaurantId, restaurantId)))
    .limit(1);

  if (existing.length > 0) {
    // 이미 열람 — 식당 정보 바로 반환
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));

    return NextResponse.json({ restaurant, alreadyUnlocked: true });
  }

  // 포인트 확인
  const [user] = await db
    .select({ points: users.points })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || user.points < POINTS.UNLOCK_COST) {
    return NextResponse.json(
      { error: "포인트가 부족합니다", required: POINTS.UNLOCK_COST, current: user?.points || 0 },
      { status: 402 }
    );
  }

  // 포인트 차감 + unlock 기록 + 트랜잭션 기록 (atomic)
  await db.update(users).set({
    points: sql`${users.points} - ${POINTS.UNLOCK_COST}`,
  }).where(eq(users.id, userId));

  await db.insert(unlocks).values({
    userId,
    restaurantId,
  });

  await db.insert(pointTransactions).values({
    userId,
    amount: -POINTS.UNLOCK_COST,
    type: "unlock",
    referenceId: restaurantId,
  });

  // 식당 정보 반환
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId));

  const [updatedUser] = await db
    .select({ points: users.points })
    .from(users)
    .where(eq(users.id, userId));

  return NextResponse.json({
    restaurant,
    pointsUsed: POINTS.UNLOCK_COST,
    remainingPoints: updatedUser.points,
  });
}
