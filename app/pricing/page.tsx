import Link from "next/link";
import PlanCards from "./PlanCards";
import { getSubscription } from "@/lib/quota";
import { getAuth } from "@/lib/supabase/server";

export const metadata = { title: "요금제 - 셀러AI" };
export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; message?: string }>;
}) {
  const { result, message } = await searchParams;
  const auth = await getAuth();
  const sub = auth ? await getSubscription(auth.sb, auth.user.id) : null;

  return (
    <main className="container">
      <h1 className="page-title">요금제</h1>
      {result === "success" && <div className="info">구독이 시작되었습니다. 지금부터 바로 이용할 수 있어요.</div>}
      {result === "fail" && <div className="error" role="alert">{message || "결제에 실패했습니다. 다시 시도해 주세요."}</div>}
      {!auth && (
        <div className="info">유료 플랜을 이용하려면 먼저 <Link href="/login">로그인</Link>해 주세요.</div>
      )}
      <PlanCards
        loggedIn={!!auth}
        userId={auth?.user.id ?? null}
        email={auth?.user.email ?? null}
        currentPlan={sub?.plan ?? "free"}
        expiresAt={sub?.expiresAt ?? null}
        cancelAtPeriodEnd={sub?.cancelAtPeriodEnd ?? false}
        tossClientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? ""}
      />
      <p className="notice">
        구독은 30일 단위로 자동 갱신되며 언제든 해지할 수 있습니다. 해지해도 남은 기간까지 이용 가능합니다.
        <br />
        <Link href="/terms">이용약관</Link> · <Link href="/privacy">개인정보처리방침</Link>
      </p>
    </main>
  );
}
