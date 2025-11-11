"use client";

import { createSupabaseBrowserClient } from "~/lib/supabaseBrowser";
import { env } from "~/env";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createSupabaseBrowserClient();
    const base = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirectTo = `${base}/auth/callback?next=/dashboard`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Login</h1>
      <button onClick={handleGoogleLogin}>Continue with Google</button>
    </div>
  );
}