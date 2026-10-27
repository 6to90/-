"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("복사에 실패했습니다. 직접 선택해서 복사해 주세요.");
    }
  }

  return (
    <button type="button" className="copy" onClick={copy}>
      {copied ? "복사됨" : label}
    </button>
  );
}
