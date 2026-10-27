const BASE = "https://api.tosspayments.com/v1";

function authHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
  return "Basic " + Buffer.from(`${secret}:`).toString("base64");
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? "결제 요청에 실패했습니다.");
  return data as T;
}

/** 카드 등록 후 받은 authKey를 빌링키로 교환 */
export async function issueBillingKey(authKey: string, customerKey: string): Promise<string> {
  const data = await call<{ billingKey: string }>("/billing/authorizations/issue", {
    authKey,
    customerKey,
  });
  return data.billingKey;
}

/** 빌링키로 정기결제 승인 */
export async function chargeBilling(args: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<void> {
  const { billingKey, ...rest } = args;
  await call(`/billing/${encodeURIComponent(billingKey)}`, rest);
}

export const PERIOD_DAYS = 30;
