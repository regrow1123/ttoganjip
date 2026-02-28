import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("demo_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, name, points")
    .eq("id", userId)
    .single();

  return NextResponse.json({ user: user || null });
}
