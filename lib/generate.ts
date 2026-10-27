import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { GenerateInput } from "./validate";

const DEFAULT_MODEL = "claude-haiku-5-5";

export interface GeneratedResult {
  titles: string[];
  keywords: string[];
  descriptionShort: string;
  descriptionLong: string;
}

export type GenerateOutcome =
  | { ok: true; result: GeneratedResult }
  | { ok: false; status: number; error: string };

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

/** AI 호출 + JSON 파싱 (실패 시 1회 재시도). 한도 처리는 호출하는 쪽 책임. */
export async function generateCopy(input: GenerateInput): Promise<GenerateOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. 관리자에게 문의해 주세요.",
    };
  }

  const client = new Anthropic({ apiKey, timeout: 25_000, maxRetries: 0 });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const system = buildSystemPrompt(input.platform, input.tone);
  const user = buildUserPrompt(input);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const msg = await client.messages.create({
        model,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const result = parseResult(text);
      if (result) return { ok: true, result };
    } catch (e) {
      console.error("Anthropic 호출 실패", e);
    }
  }
  return { ok: false, status: 502, error: "AI 응답을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
}
