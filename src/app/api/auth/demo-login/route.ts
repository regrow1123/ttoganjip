import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEMO_EMAIL = "demo@ttoganjip.kr";

export async function POST() {
  // 데모 유저 찾기 or 생성
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email: DEMO_EMAIL,
        name: "체험 유저",
        provider: "demo",
        providerId: "demo-001",
        points: 30,
      })
      .returning();
  }

  const response = NextResponse.json({
    id: user.id,
    name: user.name,
    points: user.points,
  });

  // 쿠키에 유저 ID 저장 (간단한 더미 세션)
  response.cookies.set("demo_user_id", user.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: "/",
  });

  return response;
}
