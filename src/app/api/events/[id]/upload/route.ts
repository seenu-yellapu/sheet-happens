import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runValidation } from "@/lib/validation/run";

const ALLOWED_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
];

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only CSV, Excel, and PDF files are allowed" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${eventId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: fileRecord, error: dbError } = await supabase
    .from("event_files")
    .insert({ event_id: eventId, name: file.name, storage_path: storagePath, size: file.size })
    .select("id")
    .single();

  if (dbError || !fileRecord) {
    await supabase.storage.from("uploads").remove([storagePath]);
    return NextResponse.json({ error: dbError?.message ?? "DB error" }, { status: 500 });
  }

  // Run validation — don't fail the upload if this errors
  try {
    await runValidation(supabase, fileRecord.id, buffer, file.name);
  } catch (err) {
    console.error("Validation error:", err);
  }

  return NextResponse.json({ ok: true });
}
