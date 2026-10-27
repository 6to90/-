import { NextResponse } from "next/server";
import { isPlan, PLANS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargeBilling, PERIOD_DAYS } from "@/lib/toss";

export const runtime = "nodejs";
export const maxDuration = 60;

// 매일 실행(Vercel Cron): 만료된 유료 구독을 빌링키로 갱신 결제한다.
// 결제 실패 시 갱신하지 않으며, 만료 시각이 지나면 자동으로 무료 플랜으로 취급된다.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: due } = await admin
    .from("profiles")
    .select("id, plan")
    .neq("plan", "free")
    .eq("cancel_at_period_end", false)
    .lte("plan_expires_at", new Date().toISOString())
    .limit(200);

  let renewed = 0;
  let failed = 0;
  for (const p of due ?? []) {
    if (!isPlan(p.plan) || p.plan === "free") continue;
    const { data: b } = await admin.from("billing").select("billing_key").eq("user_id", p.id).maybeSingle();
    if (!b) {
      failed++;
      continue;
    }
    try {
      await chargeBilling({
        billingKey: b.billing_key,
        customerKey: p.id,
        amount: PLANS[p.plan].price,
        orderId: `renew_${p.id}_${Date.now()}`,
        orderName: `셀러AI ${PLANS[p.plan].name} 월 구독`,
      });
      await admin
        .from("profiles")
        .update({ plan_expires_at: new Date(Date.now() + PERIOD_DAYS * 86_400_000).toISOString() })
        .eq("id", p.id);
      renewed++;
    } catch (e) {
      console.error("갱신 결제 실패", p.id, e);
      failed++;
    }
  }

  // 해지 후 기간이 끝난 구독 정리
  await admin
    .from("profiles")
    .update({ plan: "free", cancel_at_period_end: false })
    .neq("plan", "free")
    .eq("cancel_at_period_end", true)
    .lte("plan_expires_at", new Date().toISOString());

  return NextResponse.json({ renewed, failed });
}
