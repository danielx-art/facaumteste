import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "~/server/supabaseServer";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) return NextResponse.redirect(new URL("/", url.origin));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Optionally log error
    return NextResponse.redirect(new URL("/auth/error", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}