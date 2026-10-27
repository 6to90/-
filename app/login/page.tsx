import LoginForm from "./LoginForm";
import { supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "로그인 - 셀러AI" };

export default function LoginPage() {
  return (
    <main className="container narrow">
      <h1 className="page-title">로그인 / 회원가입</h1>
      {supabaseConfigured() ? (
        <LoginForm />
      ) : (
        <div className="error">로그인 기능이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.</div>
      )}
    </main>
  );
}
