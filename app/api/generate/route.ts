import { NextResponse } from "next/server";
import { generateCopy } from "@/lib/generate";
import { PLANS } from "@/lib/plans";
import { getRemainingForUser, getSubscription } from "@/lib/quota";
import { consume, getClientIp, getRemaining } from "@/lib/rateLimit";
import { getAuth } from "@/lib/supabase/server";
import { validateInput } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 30;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "요청 형식이 올바르지 않습니다.");
  }

  const validated = validateInput(body);
  if (!validated.ok) return fail(400, validated.error);
  const input = validated.value;

  // 로그인 사용자는 플랜별 한도(DB), 비로그인은 IP별 일일 한도
  const auth = await getAuth();
  let plan: keyof typeof PLANS = "free";
  let remaining: number;
  if (auth) {
    plan = (await getSubscription(auth.sb, auth.user.id)).plan;
    remaining = await getRemainingForUser(auth.sb, auth.user.id, plan);
  } else {
    remaining = getRemaining(getClientIp(req));
  }

  if (remaining <= 0) {
    return fail(
      429,
      plan === "free"
        ? "오늘의 무료 생성 횟수를 모두 사용했습니다. 내일 다시 이용하시거나 요금제를 업그레이드해 주세요."
        : "이번 달 생성 횟수를 모두 사용했습니다. 상위 플랜으로 업그레이드하거나 다음 달에 이용해 주세요."
    );
  }

  const outcome = await generateCopy(input);
  if (!outcome.ok) return fail(outcome.status, outcome.error);

  // 한도 카운트는 성공했을 때만 올린다
  if (auth) {
    const { error } = await auth.sb.from("generations").insert({
      user_id: auth.user.id,
      platform: input.platform,
      tone: input.tone,
      input,
      result: outcome.result,
    });
    if (error) console.error("기록 저장 실패", error);
    remaining = Math.max(0, remaining - 1);
  } else {
    remaining = consume(getClientIp(req));
  }

  return NextResponse.json({ ...outcome.result, remaining });
}
