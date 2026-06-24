import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runValidation } from "@/lib/validation/run";
import type { FieldAssignment, TemplateField, TemplateFieldRules, FieldType } from "@/lib/validation/types";

interface Context {
  params: Promise<{ id: string }>;
}

function parseRules(dbRules: Array<{ rule_type: string; enabled: boolean; value: string | null }>): TemplateFieldRules {
  const m = new Map(dbRules.map((r) => [r.rule_type, r]));
  return {
    type:           (m.get("type")?.value ?? "text") as FieldType,
    required:       m.get("required")?.enabled ?? false,
    validFormat:    m.get("valid_format")?.enabled ?? false,
    flagDuplicates: m.get("flag_duplicates")?.enabled ?? false,
    minDigits:      m.get("min_digits")?.enabled ?? false,
  };
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id: fileId } = await params;
  const supabase = await createClient();

  const body = await request.json();

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

  // Delete any previous validation results
  await supabase.from("file_validations").delete().eq("file_id", fileId);

  try {
    if (body.templateId && body.columnMapping) {
      // Template-based validation
      const mapping: FieldAssignment[] = body.columnMapping;

      const { data: templateData } = await supabase
        .from("template_fields")
        .select("id, name, position, template_field_rules(rule_type, enabled, value)")
        .eq("template_id", body.templateId)
        .order("position");

      const fields: TemplateField[] = (templateData ?? []).map((f: any) => ({
        id: f.id,
        name: f.name,
        position: f.position,
        rules: parseRules(f.template_field_rules ?? []),
      }));

      await supabase
        .from("event_files")
        .update({ template_id: body.templateId, column_mapping: body.columnMapping, selected_columns: null })
        .eq("id", fileId);

      await runValidation(supabase, fileId, buffer, fileRec.name as string, {
        type: "template",
        fields,
        mapping,
      });
    } else {
      // Legacy: selectedColumns only
      const selectedColumns: string[] = body.selectedColumns ?? [];
      if (!selectedColumns.length) {
        return NextResponse.json({ error: "selectedColumns must be a non-empty array" }, { status: 400 });
      }

      await supabase
        .from("event_files")
        .update({ selected_columns: selectedColumns, template_id: null, column_mapping: null })
        .eq("id", fileId);

      await runValidation(supabase, fileId, buffer, fileRec.name as string, {
        type: "legacy",
        selectedColumns,
      });
    }
  } catch (err) {
    console.error("Validation error:", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
