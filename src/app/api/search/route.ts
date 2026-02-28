import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase-server";

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY!;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ db: [], kakao: [] });
  }

  const swLat = req.nextUrl.searchParams.get("swLat");
  const swLng = req.nextUrl.searchParams.get("swLng");
  const neLat = req.nextUrl.searchParams.get("neLat");
  const neLng = req.nextUrl.searchParams.get("neLng");
  const hasBounds = swLat && swLng && neLat && neLng;

  // 1) DB 검색
  let dbQuery = supabase
    .from("restaurants")
    .select("id, name, address, category, source, place_id, lat, lng, restaurant_stats(total_visits)")
    .ilike("name", `%${query}%`)
    .limit(5);

  if (hasBounds) {
    dbQuery = dbQuery
      .gte("lat", parseFloat(swLat))
      .lte("lat", parseFloat(neLat))
      .gte("lng", parseFloat(swLng))
      .lte("lng", parseFloat(neLng));
  }

  const { data: dbResults } = await dbQuery;

  // 열람 여부
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
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

  const rows = dbResults || [];
  const dbPlaceIds = new Set(rows.map((r: any) => r.place_id).filter(Boolean));

  // 2) 카카오 검색
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "10");
  if (hasBounds) {
    url.searchParams.set("rect", `${swLng},${swLat},${neLng},${neLat}`);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });

  let kakaoMapped: any[] = [];
  if (res.ok) {
    const data = await res.json();
    kakaoMapped = data.documents
      .filter((d: any) => !dbPlaceIds.has(d.id))
      .map((d: any) => ({
        placeId: d.id,
        name: d.place_name,
        address: d.road_address_name || d.address_name,
        category: d.category_name,
        lat: parseFloat(d.y),
        lng: parseFloat(d.x),
        placeUrl: d.place_url,
        inDb: false,
      }));
  }

  const dbMapped = rows.map((r: any) => {
    const isUnlocked = unlockedIds.has(r.id);
    const stats = r.restaurant_stats || {};
    return {
      id: r.id,
      name: isUnlocked ? r.name : "🔒 잠긴 맛집",
      address: isUnlocked ? r.address : (r.address?.split(" ").slice(0, 2).join(" ") || ""),
      category: r.category,
      source: r.source,
      lat: r.lat,
      lng: r.lng,
      totalVisits: stats.total_visits || 0,
      placeUrl: isUnlocked && r.place_id ? `https://place.map.kakao.com/${r.place_id}` : null,
      locked: !isUnlocked,
      inDb: true,
    };
  });

  return NextResponse.json({ db: dbMapped, kakao: kakaoMapped });
}
