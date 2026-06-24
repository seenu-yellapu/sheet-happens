import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultTemplate } from "@/lib/templates/default";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await ensureDefaultTemplate(supabase, user.id);
  }

  return NextResponse.redirect(`${origin}/events`);
}
