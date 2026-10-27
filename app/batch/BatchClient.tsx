"use client";

import { useState } from "react";
import { csvToBatchRows, toCsv, type BatchRow } from "@/lib/csv";
import type { GeneratedResult } from "@/lib/generate";

const CHUNK = 5; // app/api/batch/route.ts의 MAX_ROWS_PER_REQUEST와 맞춰야 함
const MAX_ROWS = 100;

interface Outcome {
  ok: boolean;
  result?: GeneratedResult;
  error?: string;
}

const SAMPLE = "상품종류,핵심특징,타겟고객\n여름용 쿨토시,냉감 원단|자외선 차단|손등 커버,골프 즐기는 40~60대\n";

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchClient({ initialRemaining }: { initialRemaining: number }) {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [platform, setPlatform] = useState("smartstore");
  const [tone, setTone] = useState("plain");
  const [results, setResults] = useState<Outcome[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(initialRemaining);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError("");
    setResults([]);
    setRows([]);
    if (!file) return;
    const parsed = csvToBatchRows(await file.text());
    if ("error" in parsed) return setError(parsed.error);
    if (parsed.rows.length > MAX_ROWS) return setError(`한 번에 최대 ${MAX_ROWS}개 상품까지 처리할 수 있습니다.`);
    setRows(parsed.rows);
  }

  async function run() {
    setRunning(true);
    setError("");
    const all: Outcome[] = [];
    setResults([]);
    for (let i = 0; i < rows.length; i += CHUNK) {
      try {
        const res = await fetch("/api/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: rows.slice(i, i + CHUNK), platform, tone }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "문제가 발생했습니다.");
          break;
        }
        all.push(...(data.outcomes as Outcome[]));
        setRemaining(data.remaining);
        setResults([...all]);
      } catch {
        setError("네트워크 오류로 중단되었습니다. 완료된 결과는 내려받을 수 있어요.");
        break;
      }
    }
    setRunning(false);
  }

  function downloadResults() {
    const header = ["상품종류", "핵심특징", "타겟고객", "상품명1", "상품명2", "상품명3", "상품명4", "상품명5", "검색키워드", "짧은상세문구", "긴상세문구", "오류"];
    const body = results.map((o, i) => {
      const r = rows[i];
      const g = o.result;
      return [
        r.product, r.features, r.target,
        ...[0, 1, 2, 3, 4].map((n) => g?.titles[n] ?? ""),
        g?.keywords.join(", ") ?? "", g?.descriptionShort ?? "", g?.descriptionLong ?? "", o.error ?? "",
      ];
    });
    download("sellerai-results.csv", toCsv([header, ...body]));
  }

  const done = results.length;
  const failed = results.filter((o) => !o.ok).length;

  return (
    <>
      <div className="card">
        <p className="muted small">
          첫 행은 헤더입니다: <code>상품종류, 핵심특징, 타겟고객</code>. 핵심특징은 <code>|</code>로 항목을 구분하세요. 최대 {MAX_ROWS}개.
        </p>
        <button type="button" className="copy" onClick={() => download("sellerai-sample.csv", toCsv(SAMPLE.trim().split("\n").map((l) => l.split(","))))}>
          샘플 CSV 내려받기
        </button>

        <label className="field top">
          <span>CSV 파일</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={running} />
        </label>

        <div className="row">
          <label className="field">
            <span>플랫폼</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} disabled={running}>
              <option value="smartstore">스마트스토어</option>
              <option value="coupang">쿠팡</option>
            </select>
          </label>
          <label className="field">
            <span>톤</span>
            <select value={tone} onChange={(e) => setTone(e.target.value)} disabled={running}>
              <option value="plain">담백</option>
              <option value="emotional">감성</option>
              <option value="sales">강한 세일즈</option>
            </select>
          </label>
        </div>

        <button type="button" className="primary" disabled={!rows.length || running} onClick={run}>
          {running ? `생성 중… (${done}/${rows.length})` : rows.length ? `${rows.length}개 상품 생성하기` : "CSV 파일을 선택하세요"}
        </button>
        <p className="remaining">이번 달 남은 횟수: {remaining}회 (성공한 상품만 차감)</p>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      {done > 0 && (
        <div className="card">
          <p>
            {done}/{rows.length}개 처리 완료{failed > 0 && ` · 실패 ${failed}개`}
          </p>
          <button type="button" className="primary" onClick={downloadResults}>결과 CSV 내려받기</button>
          <p className="notice">AI가 만든 문구입니다. 등록 전에 사실 여부를 꼭 확인하세요.</p>
        </div>
      )}
    </>
  );
}
