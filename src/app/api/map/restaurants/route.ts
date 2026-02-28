import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { getGrade } from "@/lib/grade";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const swLat = parseFloat(params.get("swLat") || "0");
  const swLng = parseFloat(params.get("swLng") || "0");
  const neLat = parseFloat(params.get("neLat") || "0");
  const neLng = parseFloat(params.get("neLng") || "0");
  const category = params.get("category") || null;
  const source = params.get("source") || null;
  const userId = params.get("userId") || req.cookies.get("demo_user_id")?.value || null;

  if (!swLat || !neLat) {
    return NextResponse.json({ error: "bounds required" }, { status: 400 });
  }

  // restaurants + restaurant_stats 조인 쿼리
  let query = supabase
    .from("restaurants")
    .select("id, name, address, category, lat, lng, region, source, restaurant_stats(total_visits, max_revisits, public_visits, user_visits)")
    .gte("lat", swLat)
    .lte("lat", neLat)
    .gte("lng", swLng)
    .lte("lng", neLng)
    .gte("restaurant_stats.total_visits", 2)
    .order("restaurant_stats(total_visits)", { ascending: false })
    .limit(100);

  if (category) {
    query = query.eq("category", category);
  }

  if (source && source !== "all") {
    if (source === "public") {
      query = query.in("source", ["assembly", "seoul_expense"]);
    } else {
      query = query.eq("source", source);
    }
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // total_visits >= 2 필터 (Supabase foreign table filter는 클라이언트 필터일 수 있음)
  const filtered = (rows || []).filter((r: any) => {
    const stats = r.restaurant_stats;
    return stats && stats.total_visits >= 2;
  });

  // 잠금 해제 ID 조회
  let unlockedIds = new Set<string>();
  if (userId) {
    const { data: userUnlocks } = await supabase
      .from("unlocks")
      .select("restaurant_id")
      .eq("user_id", userId);
    const { data: userVisits } = await supabase
      .from("visits")
      .select("restaurant_id")
      .eq("user_id", userId);
    unlockedIds = new Set([
      ...(userUnlocks || []).map((u: any) => u.restaurant_id),
      ...(userVisits || []).map((v: any) => v.restaurant_id),
    ]);
  }

  const result = filtered.map((r: any) => {
    const stats = r.restaurant_stats || {};
    const isUnlocked = unlockedIds.has(r.id);
    const grade = getGrade(stats.user_visits ?? 0);

    if (isUnlocked) {
      return {
        id: r.id,
        name: r.name,
        address: r.address,
        category: r.category,
        location: { lat: r.lat, lng: r.lng },
        revisitScore: stats.total_visits,
        publicVisits: stats.public_visits ?? 0,
        userVisits: stats.user_visits ?? 0,
        source: r.source,
        grade,
        locked: false,
      };
    }

    return {
      id: r.id,
      category: r.category,
      revisitScore: stats.total_visits,
      publicVisits: stats.public_visits ?? 0,
      userVisits: stats.user_visits ?? 0,
      areaHint: r.region || "서울",
      source: r.source,
      grade,
      locked: true,
    };
  });

  return NextResponse.json({ restaurants: result, total: result.length });
}
