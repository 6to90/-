import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlan, planLimit, type Plan } from "./plans";

export interface Subscription {
  plan: Plan; // 만료를 반영한 현재 유효 플랜
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getSubscription(sb: SupabaseClient, userId: string): Promise<Subscription> {
  const { data } = await sb
    .from("profiles")
    .select("plan, plan_expires_at, cancel_at_period_end")
    .eq("id", userId)
    .maybeSingle();

  const expiresAt: string | null = data?.plan_expires_at ?? null;
  const paid = isPlan(data?.plan) && data.plan !== "free";
  const active = paid && !!expiresAt && new Date(expiresAt).getTime() > Date.now();
  return {
    plan: active ? (data!.plan as Plan) : "free",
    expiresAt,
    cancelAtPeriodEnd: !!data?.cancel_at_period_end,
  };
}

/** 기간 시작 시각(UTC): 무료는 오늘 0시, 유료는 이번 달 1일 0시. */
function periodStart(plan: Plan): string {
  const d = new Date();
  if (plan === "free") d.setUTCHours(0, 0, 0, 0);
  else {
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export async function getRemainingForUser(
  sb: SupabaseClient,
  userId: string,
  plan: Plan
): Promise<number> {
  const { count } = await sb
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", periodStart(plan));
  return Math.max(0, planLimit(plan) - (count ?? 0));
}
