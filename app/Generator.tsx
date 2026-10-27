"use client";

import Link from "next/link";
import { useState } from "react";
import CopyButton from "./CopyButton";

type Platform = "smartstore" | "coupang";
type Tone = "plain" | "emotional" | "sales";

interface Result {
  titles: string[];
  keywords: string[];
  descriptionShort: string;
  descriptionLong: string;
  remaining: number;
}

const MAX_FEATURES = 1000;

export default function Generator() {
  const [product, setProduct] = useState("");
  const [features, setFeatures] = useState("");
  const [target, setTarget] = useState("");
  const [platform, setPlatform] = useState<Platform>("smartstore");
  const [tone, setTone] = useState<Tone>("plain");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const canSubmit = product.trim() !== "" && features.trim() !== "" && !loading;

  async function generate() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, features, target, platform, tone }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        if (res.status === 429) setRemaining(0);
        return;
      }
      setResult(data as Result);
      setRemaining((data as Result).remaining);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
          : "네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요."
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  function allText(r: Result) {
    return [
      "[상품명 후보]",
      ...r.titles.map((t, i) => `${i + 1}. ${t}`),
      "",
      "[검색 키워드]",
      r.keywords.join(", "),
      "",
      "[짧은 상세 문구]",
      r.descriptionShort,
      "",
      "[긴 상세 문구]",
      r.descriptionLong,
    ].join("\n");
  }

  return (
    <>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
      >
        <label className="field">
          <span>상품 종류 <em>필수</em></span>
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            maxLength={100}
            placeholder="예: 여름용 쿨토시"
          />
        </label>

        <label className="field">
          <span>핵심 특징 <em>필수</em></span>
          <textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            maxLength={MAX_FEATURES}
            rows={5}
            placeholder={"줄바꿈으로 구분해 입력하세요\n예:\n냉감 원단\n자외선 차단\n손등 커버"}
          />
          <small className="count">{features.length} / {MAX_FEATURES}</small>
        </label>

        <label className="field">
          <span>타겟 고객 <i>선택</i></span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            maxLength={200}
            placeholder="예: 골프, 낚시 즐기는 40~60대"
          />
        </label>

        <div className="row">
          <label className="field">
            <span>플랫폼</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
              <option value="smartstore">스마트스토어</option>
              <option value="coupang">쿠팡</option>
            </select>
          </label>
          <label className="field">
            <span>톤</span>
            <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
              <option value="plain">담백</option>
              <option value="emotional">감성</option>
              <option value="sales">강한 세일즈</option>
            </select>
          </label>
        </div>

        {!canSubmit && !loading && (
          <p className="hint">상품 종류와 핵심 특징을 입력하면 생성할 수 있어요.</p>
        )}

        <button type="submit" className="primary" disabled={!canSubmit}>
          {loading ? "생성 중… (5~15초 걸려요)" : result ? "다시 생성" : "생성하기"}
        </button>

        <p className="remaining">
          {remaining === null
            ? "생성 횟수는 요금제에 따라 제한돼요."
            : `남은 생성 횟수: ${remaining}회`}
          {remaining === 0 && <> · <Link href="/pricing">요금제 보기</Link></>}
        </p>
      </form>

      {loading && (
        <div className="loading" role="status">
          <span className="spinner" /> AI가 문구를 만들고 있어요…
        </div>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {result && !loading && (
        <section className="results">
          <div className="results-head">
            <h2>생성 결과</h2>
            <CopyButton text={allText(result)} label="전체 복사" />
          </div>

          <div className="card">
            <h3>상품명 후보</h3>
            <ul className="list">
              {result.titles.map((t, i) => (
                <li key={i}>
                  <span>{t}</span>
                  <CopyButton text={t} />
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="results-head">
              <h3>검색 키워드</h3>
              <CopyButton text={result.keywords.join(", ")} />
            </div>
            <div className="chips">
              {result.keywords.map((k, i) => (
                <span key={i} className="chip">{k}</span>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="results-head">
              <h3>짧은 상세 문구</h3>
              <CopyButton text={result.descriptionShort} />
            </div>
            <p className="prose">{result.descriptionShort}</p>
          </div>

          <div className="card">
            <div className="results-head">
              <h3>긴 상세 문구</h3>
              <CopyButton text={result.descriptionLong} />
            </div>
            <p className="prose">{result.descriptionLong}</p>
          </div>

          <p className="notice">AI가 만든 문구입니다. 등록 전에 사실 여부를 꼭 확인하세요.</p>
        </section>
      )}
    </>
  );
}
