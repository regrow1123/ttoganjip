import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase-server";

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

  // 이미 등록?
  const { data: existing } = await supabase
    .from("restaurants")
    .select("id")
    .eq("place_id", placeId)
    .limit(1);

  let restaurantId: string;

  if (existing && existing.length > 0) {
    restaurantId = existing[0].id;
  } else {
    let region = "서울";
    const m = (address || "").match(/서울\S*\s+(\S+[구])/);
    if (m) region = m[1];
    else {
      const m2 = (address || "").match(/^(\S+)\s+(\S+[시군구])/);
      if (m2) region = m2[2];
    }

    const { data: newR } = await supabase
      .from("restaurants")
      .insert({ name, address: address || "", category: category || "other", lat, lng, place_id: placeId, region, source: "user" })
      .select("id")
      .single();

    if (!newR) return NextResponse.json({ error: "식당 등록 실패" }, { status: 500 });
    restaurantId = newR.id;

    await supabase.from("restaurant_stats").insert({
      restaurant_id: restaurantId,
      total_visits: 0,
      unique_visitors: 0,
      revisit_count: 0,
    });
  }

  // 방문 기록
  await supabase.from("visits").insert({
    user_id: userId,
    restaurant_id: restaurantId,
    receipt_image: "uploaded",
    ocr_raw: { text: ocrText || "" },
    ocr_status: "verified",
    points_earned: FIRST_VISIT_POINTS,
  });

  await supabase.from("point_transactions").insert({
    user_id: userId,
    amount: FIRST_VISIT_POINTS,
    type: "visit_first",
  });

  // 포인트 증가
  const { data: currentUser } = await supabase.from("users").select("points").eq("id", userId).single();
  await supabase.from("users").update({ points: (currentUser?.points || 0) + FIRST_VISIT_POINTS }).eq("id", userId);

  // stats 증가
  const { data: currentStats } = await supabase.from("restaurant_stats").select("total_visits, user_visits").eq("restaurant_id", restaurantId).single();
  await supabase.from("restaurant_stats").update({
    total_visits: (currentStats?.total_visits || 0) + 1,
    user_visits: (currentStats?.user_visits || 0) + 1,
  }).eq("restaurant_id", restaurantId);

  const { data: updatedUser } = await supabase.from("users").select("points").eq("id", userId).single();

  return NextResponse.json({
    success: true,
    restaurant: name,
    isFirstVisit: true,
    pointsEarned: FIRST_VISIT_POINTS,
    totalPoints: updatedUser?.points,
  });
}
