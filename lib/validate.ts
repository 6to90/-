export type Platform = "smartstore" | "coupang";
export type Tone = "plain" | "emotional" | "sales";

export interface GenerateInput {
  product: string;
  features: string;
  target: string;
  platform: Platform;
  tone: Tone;
}

export const MAX_PRODUCT = 100;
export const MAX_FEATURES = 1000;
export const MAX_TARGET = 200;

const PLATFORMS: Platform[] = ["smartstore", "coupang"];
const TONES: Tone[] = ["plain", "emotional", "sales"];

export type ValidationResult =
  | { ok: true; value: GenerateInput }
  | { ok: false; error: string };

export function validateInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }
  const b = body as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const product = str(b.product);
  const features = str(b.features);
  const target = str(b.target);

  if (!product) return { ok: false, error: "상품 종류를 입력해 주세요." };
  if (product.length > MAX_PRODUCT) {
    return { ok: false, error: `상품 종류는 ${MAX_PRODUCT}자 이하로 입력해 주세요.` };
  }
  if (!features) return { ok: false, error: "핵심 특징을 입력해 주세요." };
  if (features.length > MAX_FEATURES) {
    return { ok: false, error: `핵심 특징은 ${MAX_FEATURES}자 이하로 입력해 주세요.` };
  }
  if (target.length > MAX_TARGET) {
    return { ok: false, error: `타겟 고객은 ${MAX_TARGET}자 이하로 입력해 주세요.` };
  }
  if (!PLATFORMS.includes(b.platform as Platform)) {
    return { ok: false, error: "플랫폼을 선택해 주세요." };
  }
  if (!TONES.includes(b.tone as Tone)) {
    return { ok: false, error: "톤을 선택해 주세요." };
  }

  return {
    ok: true,
    value: {
      product,
      features,
      target,
      platform: b.platform as Platform,
      tone: b.tone as Tone,
    },
  };
}
