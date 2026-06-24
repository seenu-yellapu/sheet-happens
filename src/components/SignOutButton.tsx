"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ email }: { email: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 hidden sm:block">{email}</span>
      <button
        onClick={handleSignOut}
        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
