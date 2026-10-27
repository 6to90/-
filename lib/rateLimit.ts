// 인메모리 일일 제한. 서버 재시작/서버리스 인스턴스 분리 시 초기화될 수 있음 (Phase 2에서 DB로 이전).
const usage = new Map<string, { date: string; count: number }>();

export function getDailyLimit(): number {
  const n = Number(process.env.FREE_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 5;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getRemaining(ip: string): number {
  const entry = usage.get(ip);
  const used = entry && entry.date === today() ? entry.count : 0;
  return Math.max(0, getDailyLimit() - used);
}

/** AI 호출이 성공했을 때만 호출한다. 증가 후 남은 횟수를 반환. */
export function consume(ip: string): number {
  const date = today();
  const entry = usage.get(ip);
  if (!entry || entry.date !== date) {
    usage.set(ip, { date, count: 1 });
  } else {
    entry.count += 1;
  }
  return getRemaining(ip);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
