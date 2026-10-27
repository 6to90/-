"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PERIOD_LABEL, PLANS, type Plan } from "@/lib/plans";

interface Props {
  loggedIn: boolean;
  userId: string | null;
  email: string | null;
  currentPlan: Plan;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  tossClientKey: string;
}

interface TossPaymentsInstance {
  payment(opts: { customerKey: string }): {
    requestBillingAuth(opts: {
      method: "CARD";
      successUrl: string;
      failUrl: string;
      customerEmail?: string;
    }): Promise<void>;
  };
}
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

const FEATURES: Record<Plan, string[]> = {
  free: ["하루 5회 생성", "상품명·키워드·상세문구"],
  basic: ["월 100회 생성", "생성 기록 저장·재조회"],
  pro: ["월 500회 생성", "생성 기록 저장·재조회", "CSV 일괄 생성"],
};

export default function PlanCards(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const subscribed = p.currentPlan !== "free" && !p.cancelAtPeriodEnd;

  async function subscribe(plan: Plan) {
    setError("");
    if (!p.tossClientKey || !window.TossPayments) {
      return setError("결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      await window.TossPayments(p.tossClientKey).payment({ customerKey: p.userId! }).requestBillingAuth({
        method: "CARD",
        successUrl: `${origin}/api/billing/success?plan=${plan}`,
        failUrl: `${origin}/pricing?result=fail&message=${encodeURIComponent("카드 등록이 취소되었거나 실패했습니다.")}`,
        customerEmail: p.email ?? undefined,
      });
    } catch {
      setError("카드 등록 창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm("구독을 해지할까요? 남은 기간까지는 계속 이용할 수 있어요.")) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setError(data?.error ?? "해지에 실패했습니다.");
    router.refresh();
  }

  return (
    <>
      <Script src="https://js.tosspayments.com/v2/standard" strategy="lazyOnload" />
      {error && <div className="error" role="alert">{error}</div>}
      <div className="plans">
        {(Object.keys(PLANS) as Plan[]).map((plan) => {
          const info = PLANS[plan];
          const current = p.currentPlan === plan;
          return (
            <div key={plan} className={`card plan${current ? " current" : ""}`}>
              <h3>{info.name}</h3>
              <p className="price">
                {info.price === 0 ? "0원" : `월 ${info.price.toLocaleString("ko-KR")}원`}
              </p>
              <p className="muted">{PERIOD_LABEL[info.period]} {info.limit}회</p>
              <ul className="plan-features">
                {FEATURES[plan].map((f) => <li key={f}>{f}</li>)}
              </ul>
              {plan === "free" ? (
                <button className="primary" disabled>{current ? "이용 중" : "기본 제공"}</button>
              ) : current ? (
                <>
                  <button className="primary" disabled>이용 중</button>
                  {p.expiresAt && (
                    <p className="muted small">
                      {p.cancelAtPeriodEnd ? "해지됨 · " : "다음 결제 · "}
                      {new Date(p.expiresAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                      {p.cancelAtPeriodEnd ? "까지 이용" : ""}
                    </p>
                  )}
                  {!p.cancelAtPeriodEnd && (
                    <button type="button" className="linkbtn" onClick={cancel} disabled={busy}>구독 해지</button>
                  )}
                </>
              ) : (
                <button
                  className="primary"
                  disabled={!p.loggedIn || busy || subscribed}
                  onClick={() => subscribe(plan)}
                >
                  {subscribed ? "해지 후 변경 가능" : busy ? "처리 중…" : "구독하기"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
