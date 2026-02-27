import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("demo_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, points: users.points })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return NextResponse.json({ user: user || null });
}
