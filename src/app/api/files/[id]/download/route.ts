import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: file } = await supabase
    .from("event_files")
    .select("storage_path, name")
    .eq("id", id)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrl(file.storage_path, 60);

  if (error || !data) {
    return NextResponse.json({ error: "Could not generate download URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
