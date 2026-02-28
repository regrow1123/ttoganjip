import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.cookies.get("demo_user_id")?.value || null;

  // 식당 기본 정보 + 통계
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, address, category, lat, lng, region, source, place_id, restaurant_stats(total_visits, unique_visitors, max_revisits)")
    .eq("id", id)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: "식당을 찾을 수 없습니다" }, { status: 404 });
  }

  const stats = (restaurant as any).restaurant_stats || {};

  // 잠금 확인
  let isUnlocked = false;
  if (userId) {
    const { data: unlock } = await supabase
      .from("unlocks")
      .select("user_id")
      .eq("user_id", userId)
      .eq("restaurant_id", id)
      .maybeSingle();
    if (!unlock) {
      const { data: visit } = await supabase
        .from("visits")
        .select("user_id")
        .eq("user_id", userId)
        .eq("restaurant_id", id)
        .limit(1)
        .maybeSingle();
      isUnlocked = !!visit;
    } else {
      isUnlocked = true;
    }
  }

  // 국회의원 업무추진비
  let expenses: any[] = [];
  if (restaurant.source === "assembly") {
    const { data } = await supabase
      .from("assembly_expenses")
      .select("expense_date, amount, purpose, assembly_members(name, party)")
      .eq("restaurant_id", id)
      .order("expense_date", { ascending: false });
    expenses = (data || []).map((e: any) => ({
      date: e.expense_date,
      amount: e.amount,
      purpose: e.purpose,
      memberName: e.assembly_members?.name,
      party: e.assembly_members?.party,
    }));
  }

  if (!isUnlocked) {
    return NextResponse.json({
      id: restaurant.id,
      category: restaurant.category,
      region: restaurant.region,
      source: restaurant.source,
      totalVisits: stats.total_visits,
      locked: true,
    });
  }

  const placeId = restaurant.place_id;

  return NextResponse.json({
    id: restaurant.id,
    name: restaurant.name,
    address: restaurant.address,
    category: restaurant.category,
    lat: restaurant.lat,
    lng: restaurant.lng,
    region: restaurant.region,
    source: restaurant.source,
    totalVisits: stats.total_visits,
    uniqueVisitors: stats.unique_visitors,
    maxRevisits: stats.max_revisits,
    placeId,
    kakaoMapUrl: placeId
      ? `https://place.map.kakao.com/${placeId}`
      : `https://map.kakao.com/?q=${encodeURIComponent(restaurant.name)}`,
    expenses,
    locked: false,
  });
}
