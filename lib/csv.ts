/** 따옴표, 셀 내 줄바꿈, BOM, CRLF를 처리하는 간단한 CSV 파서. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function toCsv(rows: string[][]): string {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // BOM을 붙여야 엑셀에서 한글이 깨지지 않음
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export interface BatchRow {
  product: string;
  features: string;
  target: string;
}

const HEADERS: Record<keyof BatchRow, string[]> = {
  product: ["product", "상품종류", "상품 종류", "상품명"],
  features: ["features", "핵심특징", "핵심 특징", "특징"],
  target: ["target", "타겟고객", "타겟 고객", "타겟"],
};

/** 첫 행은 헤더. 핵심 특징 셀 안에서는 줄바꿈 또는 '|'로 항목을 구분한다. */
export function csvToBatchRows(text: string): { rows: BatchRow[] } | { error: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { error: "헤더와 상품이 1개 이상 있는 CSV 파일이 필요합니다." };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (key: keyof BatchRow) => header.findIndex((h) => HEADERS[key].includes(h));
  const idx = { product: col("product"), features: col("features"), target: col("target") };
  if (idx.product < 0 || idx.features < 0) {
    return { error: "헤더에 '상품종류'와 '핵심특징' 열이 필요합니다." };
  }

  const rows = table.slice(1).map((r) => ({
    product: (r[idx.product] ?? "").trim(),
    features: (r[idx.features] ?? "").split("|").join("\n").trim(),
    target: idx.target >= 0 ? (r[idx.target] ?? "").trim() : "",
  }));
  return { rows };
}
