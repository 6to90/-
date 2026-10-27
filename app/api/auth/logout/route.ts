import { NextResponse, type NextRequest } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  if (supabaseConfigured()) {
    const sb = await createClient();
    await sb.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", req.nextUrl.origin), { status: 303 });
}
