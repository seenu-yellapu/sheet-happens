import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runValidation } from "@/lib/validation/run";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id: fileId } = await params;
  const supabase = await createClient();

  const { selectedColumns }: { selectedColumns: string[] } = await request.json();
  if (!Array.isArray(selectedColumns) || selectedColumns.length === 0) {
    return NextResponse.json({ error: "selectedColumns must be a non-empty array" }, { status: 400 });
  }

  const { data: fileRec } = await supabase
    .from("event_files")
    .select("name, storage_path")
    .eq("id", fileId)
    .single();

  if (!fileRec) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const { data: storageData, error: storageErr } = await supabase.storage
    .from("uploads")
    .download(fileRec.storage_path as string);

  if (storageErr || !storageData) {
    return NextResponse.json({ error: "Could not load file from storage" }, { status: 500 });
  }

  const buffer = Buffer.from(await storageData.arrayBuffer());

  // Save selected columns on the file record
  await supabase
    .from("event_files")
    .update({ selected_columns: selectedColumns })
    .eq("id", fileId);

  // Delete any previous validation results before re-running
  const { data: existing } = await supabase
    .from("file_validations")
    .select("id")
    .eq("file_id", fileId);

  if (existing?.length) {
    await supabase
      .from("file_validations")
      .delete()
      .eq("file_id", fileId);
  }

  try {
    await runValidation(supabase, fileId, buffer, fileRec.name as string, selectedColumns);
  } catch (err) {
    console.error("Validation error:", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
