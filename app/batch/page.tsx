import Link from "next/link";
import BatchClient from "./BatchClient";
import { PLANS } from "@/lib/plans";
import { getRemainingForUser, getSubscription } from "@/lib/quota";
import { getAuth } from "@/lib/supabase/server";

export const metadata = { title: "CSV 일괄 생성 - 셀러AI" };
export const dynamic = "force-dynamic";

export default async function BatchPage() {
  const auth = await getAuth();
  if (!auth) {
    return (
      <main className="container narrow">
        <h1 className="page-title">CSV 일괄 생성</h1>
        <div className="info">이 기능은 <Link href="/login">로그인</Link> 후 프로 플랜에서 이용할 수 있어요.</div>
      </main>
    );
  }
  const sub = await getSubscription(auth.sb, auth.user.id);
  if (!PLANS[sub.plan].csv) {
    return (
      <main className="container narrow">
        <h1 className="page-title">CSV 일괄 생성</h1>
        <div className="info">CSV 일괄 생성은 프로 플랜 전용입니다. <Link href="/pricing">요금제 보기</Link></div>
      </main>
    );
  }
  const remaining = await getRemainingForUser(auth.sb, auth.user.id, sub.plan);

  return (
    <main className="container narrow">
      <h1 className="page-title">CSV 일괄 생성</h1>
      <BatchClient initialRemaining={remaining} />
    </main>
  );
}
