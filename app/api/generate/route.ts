import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import { consume, getClientIp, getRemaining } from "@/lib/rateLimit";
import { validateInput } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "claude-haiku-5-5";

interface GeneratedResult {
  titles: string[];
  keywords: string[];
  descriptionShort: string;
  descriptionLong: string;
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function parseResult(text: string): GeneratedResult | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const strings = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
    const titles = strings(data.titles);
    const keywords = strings(data.keywords);
    const descriptionShort = typeof data.descriptionShort === "string" ? data.descriptionShort : "";
    const descriptionLong = typeof data.descriptionLong === "string" ? data.descriptionLong : "";
    if (!titles.length || !keywords.length || !descriptionShort || !descriptionLong) return null;
    return {
      titles: titles.slice(0, 5),
      keywords: keywords.slice(0, 10),
      descriptionShort,
      descriptionLong,
    };
  } catch {
    return null;
  }
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

  const ip = getClientIp(req);
  if (getRemaining(ip) <= 0) {
    return fail(
      429,
      "오늘의 무료 생성 횟수를 모두 사용했습니다. 내일 다시 이용하시거나 유료 플랜(준비 중)을 기다려 주세요."
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fail(500, "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. 관리자에게 문의해 주세요.");
  }

  const client = new Anthropic({ apiKey, timeout: 25_000, maxRetries: 0 });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const system = buildSystemPrompt(validated.value.platform, validated.value.tone);
  const user = buildUserPrompt(validated.value);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const msg = await client.messages.create({
        model,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
      const result = parseResult(text);
      if (result) {
        const remaining = consume(ip);
        return NextResponse.json({ ...result, remaining });
      }
    } catch (e) {
      console.error("Anthropic 호출 실패", e);
    }
  }

  return fail(502, "AI 응답을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}
