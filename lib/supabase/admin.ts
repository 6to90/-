import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** 서비스 롤 클라이언트. 결제/구독 상태 변경처럼 사용자가 직접 바꾸면 안 되는 쓰기 전용. 서버에서만 사용. */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  return createClient(url, key, { auth: { persistSession: false } });
}
