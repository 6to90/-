"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const sb = createBrowserSupabase();

    if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setError(translate(error.message));
      if (!data.session) return setInfo("가입 확인 메일을 보냈습니다. 메일의 링크를 눌러 인증을 완료해 주세요.");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return setError(translate(error.message));
      }
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form className="card" onSubmit={submit}>
      <label className="field">
        <span>이메일</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>

      {error && <div className="error" role="alert">{error}</div>}
      {info && <div className="info" role="status">{info}</div>}

      <button type="submit" className="primary" disabled={loading}>
        {loading ? "처리 중…" : mode === "signup" ? "가입하기" : "로그인"}
      </button>
      <p className="remaining">
        <button type="button" className="linkbtn" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </p>
      <p className="remaining">
        가입 시 <a href="/terms">이용약관</a>과 <a href="/privacy">개인정보처리방침</a>에 동의하는 것으로 봅니다.
      </p>
    </form>
  );
}

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/already registered/i.test(msg)) return "이미 가입된 이메일입니다.";
  if (/email not confirmed/i.test(msg)) return "이메일 인증이 필요합니다. 받은 메일을 확인해 주세요.";
  if (/password/i.test(msg)) return "비밀번호는 6자 이상이어야 합니다.";
  return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
