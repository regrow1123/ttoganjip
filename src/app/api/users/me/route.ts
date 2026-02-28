import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("demo_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  // 유저 기본 정보
  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, points, created_at")
    .eq("id", userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });
  }

  // 열람한 식당
  const { data: unlockedRestaurants } = await supabase
    .from("unlocks")
    .select("restaurant_id, unlocked_at, restaurants(name, category, region, source, restaurant_stats(total_visits))")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  // 인증한 식당
  const { data: verifiedVisits } = await supabase
    .from("visits")
    .select("id, restaurant_id, points_earned, created_at, restaurants(name, category, region)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // 포인트 내역
  const { data: pointHistory } = await supabase
    .from("point_transactions")
    .select("amount, type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const unlocked = (unlockedRestaurants || []).map((u: any) => ({
    restaurantId: u.restaurant_id,
    unlockedAt: u.unlocked_at,
    name: u.restaurants?.name,
    category: u.restaurants?.category,
    region: u.restaurants?.region,
    source: u.restaurants?.source,
    totalVisits: u.restaurants?.restaurant_stats?.total_visits ?? 0,
  }));

  const visits = (verifiedVisits || []).map((v: any) => ({
    visitId: v.id,
    restaurantId: v.restaurant_id,
    pointsEarned: v.points_earned,
    createdAt: v.created_at,
    name: v.restaurants?.name,
    category: v.restaurants?.category,
    region: v.restaurants?.region,
  }));

  const totalUnlocked = unlocked.length;
  const totalSpent = totalUnlocked * 5;
  const totalVisits = visits.length;

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, points: user.points, createdAt: user.created_at },
    stats: { totalUnlocked, totalSpent, totalVisits },
    unlockedRestaurants: unlocked,
    verifiedVisits: visits,
    pointHistory: pointHistory || [],
  });
}
