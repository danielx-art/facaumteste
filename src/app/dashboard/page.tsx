import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "~/server/supabaseServer";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  console.log("DashboardPage - user data:", data, "error:", error); //test

  if (error || !data?.user) redirect("/");

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Logged in as: {data?.user?.email ?? "Unknown User"}</p>
    </div>
  );
}