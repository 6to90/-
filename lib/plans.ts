export type Plan = "free" | "basic" | "pro";

export interface PlanInfo {
  name: string;
  price: number;
  limit: number;
  period: "day" | "month";
  csv: boolean;
}

export const PLANS: Record<Plan, PlanInfo> = {
  free: { name: "무료", price: 0, limit: 5, period: "day", csv: false },
  basic: { name: "베이직", price: 9900, limit: 100, period: "month", csv: false },
  pro: { name: "프로", price: 29000, limit: 500, period: "month", csv: true },
};

export const PERIOD_LABEL = { day: "하루", month: "월" } as const;

export function isPlan(v: unknown): v is Plan {
  return v === "free" || v === "basic" || v === "pro";
}

/** 무료 플랜 한도는 FREE_DAILY_LIMIT 환경변수를 따른다. */
export function planLimit(plan: Plan): number {
  if (plan !== "free") return PLANS[plan].limit;
  const n = Number(process.env.FREE_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : PLANS.free.limit;
}
