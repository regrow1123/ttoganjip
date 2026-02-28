import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase-server";

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

  const lines = ocrText.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length >= 2);

  let matchedRestaurant: { id: string; name: string } | null = null;

  // 정방향: OCR 라인으로 DB 검색
  for (const line of lines) {
    if (line.length > 30) continue;
    const { data } = await supabase
      .from("restaurants")
      .select("id, name")
      .ilike("name", `%${line.replace(/[%_]/g, "")}%`)
      .limit(1);
    if (data && data.length > 0) {
      matchedRestaurant = data[0];
      break;
    }
  }

  // 역방향: DB 식당명이 OCR에 포함?
  if (!matchedRestaurant) {
    const { data: allR } = await supabase
      .from("restaurants")
      .select("id, name")
      .limit(2000);

    const normalizedText = ocrText.replace(/\s/g, "").toLowerCase();
    for (const r of allR || []) {
      const n = r.name.replace(/\s/g, "").toLowerCase();
      if (n.length >= 2 && normalizedText.includes(n)) {
        matchedRestaurant = r;
        break;
      }
    }
  }

  if (!matchedRestaurant) {
    // 카카오 후보 검색
    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    let kakaoCandidates: any[] = [];
    if (kakaoKey) {
      const searchNames: string[] = [];
      for (const line of lines.slice(0, 5)) {
        const parenMatches = line.matchAll(/[（(]([^)）]{2,})[)）]/g);
        for (const m of parenMatches) {
          const inner = m[1].trim();
          if (inner.length >= 2 && !/^주$|^\d|사업|번호/.test(inner)) searchNames.push(inner);
        }
        let cleaned = line.replace(/㈜|㈱|\(주\)|주식회사/g, "").replace(/[（(][^)）]*[)）]/g, "").replace(/[—\-–:：]/g, " ").replace(/사업자?.?번호.*/i, "").trim();
        if (cleaned.length >= 2 && cleaned.length <= 20) searchNames.push(cleaned);
      }

      for (const name of [...new Set(searchNames)]) {
        if (kakaoCandidates.length >= 3) break;
        try {
          const res = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(name)}&size=5`,
            { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const newC = (data.documents || [])
              .filter((d: any) => !kakaoCandidates.some((c: any) => c.placeId === d.id))
              .map((d: any) => ({
                placeId: d.id, name: d.place_name,
                address: d.road_address_name || d.address_name,
                category: d.category_group_code === "CE7" ? "cafe" : d.category_group_code === "FD6" ? "korean" : "other",
                lat: parseFloat(d.y), lng: parseFloat(d.x),
              }));
            kakaoCandidates.push(...newC);
          }
        } catch {}
      }
      kakaoCandidates = kakaoCandidates.slice(0, 5);
    }

    const debugNames: string[] = [];
    for (const line of lines.slice(0, 5)) {
      const pm = line.matchAll(/[（(]([^)）]{2,})[)）]/g);
      for (const m of pm) { if (!/^주$|^\d|사업|번호/.test(m[1].trim())) debugNames.push(m[1].trim()); }
      let c = line.replace(/㈜|㈱|\(주\)|주식회사/g,"").replace(/[（(][^)）]*[)）]/g,"").replace(/[—\-–:：]/g," ").replace(/사업자?.?번호.*/i,"").trim();
      if (c.length >= 2 && c.length <= 20) debugNames.push(c);
    }

    return NextResponse.json({
      error: "매칭되는 식당을 찾을 수 없습니다",
      lines: lines.slice(0, 10),
      searchedNames: [...new Set(debugNames)],
      kakaoKeyExists: !!kakaoKey,
      kakaoCandidates,
      needsRegistration: kakaoCandidates.length > 0,
    }, { status: 404 });
  }

  // 같은 날 중복 방지
  const today = new Date().toISOString().split("T")[0];
  const { data: existingVisit } = await supabase
    .from("visits")
    .select("id")
    .eq("user_id", userId)
    .eq("restaurant_id", matchedRestaurant.id)
    .gte("created_at", `${today}T00:00:00`)
    .lt("created_at", `${today}T23:59:59`)
    .limit(1);

  if (existingVisit && existingVisit.length > 0) {
    return NextResponse.json({ error: "오늘 이미 이 식당의 방문을 인증했습니다", restaurant: matchedRestaurant.name }, { status: 409 });
  }

  // 첫 방문 여부
  const { data: prevVisits } = await supabase
    .from("visits")
    .select("id")
    .eq("user_id", userId)
    .eq("restaurant_id", matchedRestaurant.id)
    .limit(1);

  const isFirstVisit = !prevVisits || prevVisits.length === 0;
  const pointsEarned = isFirstVisit ? FIRST_VISIT_POINTS : REVISIT_POINTS;

  // visit 기록
  await supabase.from("visits").insert({
    user_id: userId,
    restaurant_id: matchedRestaurant.id,
    receipt_image: "uploaded",
    ocr_raw: { text: ocrText },
    ocr_status: "verified",
    points_earned: pointsEarned,
  });

  // 포인트 트랜잭션
  await supabase.from("point_transactions").insert({
    user_id: userId,
    amount: pointsEarned,
    type: isFirstVisit ? "visit_first" : "visit_revisit",
  });

  // 포인트 증가
  const { data: currentUser } = await supabase.from("users").select("points").eq("id", userId).single();
  await supabase.from("users").update({ points: (currentUser?.points || 0) + pointsEarned }).eq("id", userId);

  // stats 증가
  const { data: currentStats } = await supabase.from("restaurant_stats").select("total_visits, user_visits").eq("restaurant_id", matchedRestaurant.id).single();
  await supabase.from("restaurant_stats").update({
    total_visits: (currentStats?.total_visits || 0) + 1,
    user_visits: (currentStats?.user_visits || 0) + 1,
  }).eq("restaurant_id", matchedRestaurant.id);

  const { data: updatedUser } = await supabase.from("users").select("points").eq("id", userId).single();

  return NextResponse.json({
    success: true,
    restaurant: matchedRestaurant.name,
    isFirstVisit,
    pointsEarned,
    totalPoints: updatedUser?.points,
  });
}
