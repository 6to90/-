import { NextResponse, type NextRequest } from "next/server";
import { isPlan, PLANS } from "@/lib/plans";
import { getSubscription } from "@/lib/quota";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuth } from "@/lib/supabase/server";
import { chargeBilling, issueBillingKey, PERIOD_DAYS } from "@/lib/toss";

export const runtime = "nodejs";

// 토스 카드 등록 성공 후 리다이렉트되는 곳: 빌링키 발급 → 첫 결제 → 플랜 활성화
export async function GET(req: NextRequest) {
  const back = (result: string, message?: string) => {
    const url = new URL("/pricing", req.nextUrl.origin);
    url.searchParams.set("result", result);
    if (message) url.searchParams.set("message", message);
    return NextResponse.redirect(url);
  };

  const auth = await getAuth();
  if (!auth) return NextResponse.redirect(new URL("/login", req.nextUrl.origin));

  const plan = req.nextUrl.searchParams.get("plan");
  const authKey = req.nextUrl.searchParams.get("authKey");
  const customerKey = req.nextUrl.searchParams.get("customerKey");
  if (!isPlan(plan) || plan === "free" || !authKey || customerKey !== auth.user.id) {
    return back("fail", "잘못된 결제 요청입니다.");
  }

  const current = await getSubscription(auth.sb, auth.user.id);
  if (current.plan !== "free" && !current.cancelAtPeriodEnd) {
    return back("fail", "이미 구독 중입니다. 해지 후 다시 신청해 주세요.");
  }

  try {
    const billingKey = await issueBillingKey(authKey, customerKey);
    await chargeBilling({
      billingKey,
      customerKey,
      amount: PLANS[plan].price,
      orderId: `sub_${auth.user.id}_${Date.now()}`,
      orderName: `셀러AI ${PLANS[plan].name} 월 구독`,
    });

    const admin = createAdminClient();
    const expires = new Date(Date.now() + PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("billing").upsert({ user_id: auth.user.id, billing_key: billingKey });
    await admin.from("profiles").upsert({
      id: auth.user.id,
      plan,
      plan_expires_at: expires,
      cancel_at_period_end: false,
    });
    return back("success");
  } catch (e) {
    console.error("구독 결제 실패", e);
    return back("fail", e instanceof Error ? e.message : "결제에 실패했습니다.");
  }
}
