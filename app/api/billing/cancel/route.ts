import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";

// 구독 해지: 다음 갱신부터 결제하지 않고, 남은 기간까지는 플랜을 유지한다.
export async function POST() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const admin = createAdminClient();
    await admin.from("profiles").update({ cancel_at_period_end: true }).eq("id", auth.user.id);
    await admin.from("billing").delete().eq("user_id", auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("해지 실패", e);
    return NextResponse.json({ error: "해지 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
