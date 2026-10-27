import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // 서버 컴포넌트에서는 쿠키를 쓸 수 없음 (middleware가 세션을 갱신함)
          }
        },
      },
    }
  );
}

/** 로그인한 사용자와 그 사용자 권한의 클라이언트. 미로그인 또는 Supabase 미설정이면 null. */
export async function getAuth(): Promise<{ user: User; sb: SupabaseClient } | null> {
  if (!supabaseConfigured()) return null;
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  return data.user ? { user: data.user, sb } : null;
}
