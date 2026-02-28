import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

const DEMO_EMAIL = "demo@ttoganjip.kr";

export async function POST() {
  // 데모 유저 찾기
  let { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", DEMO_EMAIL)
    .single();

  if (!user) {
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        email: DEMO_EMAIL,
        name: "체험 유저",
        provider: "demo",
        provider_id: "demo-001",
        points: 30,
      })
      .select()
      .single();
    user = newUser;
  }

  if (!user) {
    return NextResponse.json({ error: "유저 생성 실패" }, { status: 500 });
  }

  const response = NextResponse.json({
    id: user.id,
    name: user.name,
    points: user.points,
  });

  response.cookies.set("demo_user_id", user.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
