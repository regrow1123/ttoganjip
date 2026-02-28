import { createClient } from "@supabase/supabase-js";

// 서버사이드 Supabase 클라이언트 (service_role key로 RLS 우회)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
