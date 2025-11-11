import Link from "next/link";
import { redirect } from "next/navigation";
import LoginButton from "~/components/LoginButton";
import { Button } from "~/components/ui/button";
import { createSupabaseServerClient } from "~/server/supabaseServer";
import { Info } from "lucide-react";

// import { LatestPost } from "~/app/_components/post";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  // const hello = await api.post.hello({ text: "from tRPC" });

  // void api.post.getLatest.prefetch();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  //if (error || !data?.user) redirect("/");

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <nav className="min-w-full flex items-center justify-center gap-2 p-2">
          <span className="hidden sm:flex flex-1 justify-center">
            {data?.user?.email ? (
              <span>Logged in as {data?.user?.email}</span>
            ) : (
              <span>
                <LoginButton />
              </span>
            )}
          </span>
          <span className="flex sm:hidden ml-auto">
            <Info />
          </span>
        </nav>
        <menu className="flex flex-1 flex-col flex-nowrap justify-center gap-2">
          <span className="flex w-full">
            <Button className="flex-1 font-bold sm:min-w-[185] py-3 text-[1rem]" size={null}>Crie</Button>
          </span>
          <span className="block sm:hidden">
            <LoginButton />
          </span>
        </menu>
        <footer className="hidden w-full sm:flex">
          <span className="flex flex-1 px-4 py-2">
            <Info className="ml-auto" />
          </span>
        </footer>
      </main>
    </HydrateClient>
  );
}
