import { NextResponse } from "next/server";
import { generateCopy, type GeneratedResult } from "@/lib/generate";
import { PLANS } from "@/lib/plans";
import { getRemainingForUser, getSubscription } from "@/lib/quota";
import { getAuth } from "@/lib/supabase/server";
import { validateInput, type GenerateInput } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ROWS_PER_REQUEST = 5; // app/batch/BatchClient.tsx의 CHUNK와 맞춰야 함

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

interface RowOutcome {
  ok: boolean;
  result?: GeneratedResult;
  error?: string;
}

/** CSV 일괄 생성 (프로 플랜 전용). 클라이언트가 5행씩 나눠 순차 호출한다. */
export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth) return fail(401, "로그인이 필요합니다.");

  const sub = await getSubscription(auth.sb, auth.user.id);
  if (!PLANS[sub.plan].csv) return fail(403, "CSV 일괄 생성은 프로 플랜에서 이용할 수 있습니다.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "요청 형식이 올바르지 않습니다.");
  }
  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) return fail(400, "처리할 상품이 없습니다.");
  if (rows.length > MAX_ROWS_PER_REQUEST) {
    return fail(400, `한 번에 ${MAX_ROWS_PER_REQUEST}개까지만 처리할 수 있습니다.`);
  }

  const remaining = await getRemainingForUser(auth.sb, auth.user.id, sub.plan);
  if (remaining < rows.length) {
    return fail(429, `이번 달 남은 생성 횟수(${remaining}회)가 부족합니다.`);
  }

  const outcomes: RowOutcome[] = await Promise.all(
    rows.map(async (row): Promise<RowOutcome> => {
      const v = validateInput({ ...(row as object), platform: body.platform, tone: body.tone });
      if (!v.ok) return { ok: false, error: v.error };
      const out = await generateCopy(v.value);
      return out.ok ? { ok: true, result: out.result } : { ok: false, error: out.error };
    })
  );

  // 성공한 행만 기록·차감
  const records = outcomes.flatMap((o, i) => {
    if (!o.ok) return [];
    const v = validateInput({ ...(rows[i] as object), platform: body.platform, tone: body.tone });
    const input = (v as { ok: true; value: GenerateInput }).value;
    return [{ user_id: auth.user.id, platform: input.platform, tone: input.tone, input, result: o.result }];
  });
  if (records.length) {
    const { error } = await auth.sb.from("generations").insert(records);
    if (error) console.error("기록 저장 실패", error);
  }

  return NextResponse.json({ outcomes, remaining: remaining - records.length });
}
