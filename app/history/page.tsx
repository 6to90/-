import Link from "next/link";
import CopyButton from "../CopyButton";
import { getAuth } from "@/lib/supabase/server";
import type { GeneratedResult } from "@/lib/generate";

export const metadata = { title: "생성 기록 - 셀러AI" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  platform: string;
  tone: string;
  input: { product: string };
  result: GeneratedResult;
  created_at: string;
}

const PLATFORM = { smartstore: "스마트스토어", coupang: "쿠팡" } as Record<string, string>;

export default async function HistoryPage() {
  const auth = await getAuth();
  if (!auth) {
    return (
      <main className="container narrow">
        <h1 className="page-title">생성 기록</h1>
        <div className="info">기록을 보려면 <Link href="/login">로그인</Link>해 주세요.</div>
      </main>
    );
  }

  const { data } = await auth.sb
    .from("generations")
    .select("id, platform, tone, input, result, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as Row[];

  return (
    <main className="container narrow">
      <h1 className="page-title">생성 기록</h1>
      {rows.length === 0 && <div className="info">아직 생성한 기록이 없습니다. <Link href="/">첫 상품명을 만들어 보세요.</Link></div>}
      {rows.map((r) => (
        <details key={r.id} className="card">
          <summary>
            <strong>{r.input.product}</strong>
            <small className="muted">
              {" "}· {PLATFORM[r.platform] ?? r.platform} · {new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
            </small>
          </summary>
          <h3>상품명 후보</h3>
          <ul className="list">
            {r.result.titles.map((t, i) => (
              <li key={i}><span>{t}</span><CopyButton text={t} /></li>
            ))}
          </ul>
          <div className="results-head"><h3>검색 키워드</h3><CopyButton text={r.result.keywords.join(", ")} /></div>
          <div className="chips">{r.result.keywords.map((k, i) => <span key={i} className="chip">{k}</span>)}</div>
          <div className="results-head"><h3>짧은 상세 문구</h3><CopyButton text={r.result.descriptionShort} /></div>
          <p className="prose">{r.result.descriptionShort}</p>
          <div className="results-head"><h3>긴 상세 문구</h3><CopyButton text={r.result.descriptionLong} /></div>
          <p className="prose">{r.result.descriptionLong}</p>
        </details>
      ))}
      {rows.length > 0 && <p className="notice">AI가 만든 문구입니다. 등록 전에 사실 여부를 꼭 확인하세요.</p>}
    </main>
  );
}
