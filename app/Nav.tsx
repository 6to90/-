import Link from "next/link";
import { getAuth } from "@/lib/supabase/server";

export default async function Nav() {
  const auth = await getAuth();
  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">셀러AI</Link>
      <div className="nav-links">
        <Link href="/pricing">요금제</Link>
        {auth ? (
          <>
            <Link href="/history">기록</Link>
            <Link href="/batch">CSV</Link>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="linkbtn">로그아웃</button>
            </form>
          </>
        ) : (
          <Link href="/login">로그인</Link>
        )}
      </div>
    </nav>
  );
}
