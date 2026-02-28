import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { POINTS } from "@/lib/points";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: restaurantId } = await params;
  const body = await req.json().catch(() => ({}));
  const userId = body.userId || req.cookies.get("demo_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  // 이미 열람?
  const { data: existing } = await supabase
    .from("unlocks")
    .select("user_id")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (existing) {
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .single();
    return NextResponse.json({ restaurant, alreadyUnlocked: true });
  }

  // 포인트 확인
  const { data: user } = await supabase
    .from("users")
    .select("points")
    .eq("id", userId)
    .single();

  if (!user || user.points < POINTS.UNLOCK_COST) {
    return NextResponse.json(
      { error: "포인트가 부족합니다", required: POINTS.UNLOCK_COST, current: user?.points || 0 },
      { status: 402 }
    );
  }

  // 포인트 차감
  await supabase
    .from("users")
    .update({ points: user.points - POINTS.UNLOCK_COST })
    .eq("id", userId);

  // unlock 기록
  await supabase
    .from("unlocks")
    .insert({ user_id: userId, restaurant_id: restaurantId });

  // 트랜잭션 기록
  await supabase
    .from("point_transactions")
    .insert({
      user_id: userId,
      amount: -POINTS.UNLOCK_COST,
      type: "unlock",
      reference_id: restaurantId,
    });

  // 식당 정보 반환
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .single();

  const { data: updatedUser } = await supabase
    .from("users")
    .select("points")
    .eq("id", userId)
    .single();

  return NextResponse.json({
    restaurant,
    pointsUsed: POINTS.UNLOCK_COST,
    remainingPoints: updatedUser?.points,
  });
}
