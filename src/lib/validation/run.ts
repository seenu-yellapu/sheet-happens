import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFile } from "./parse";
import { validateRows, validateRowsWithTemplate } from "./validate";
import type { TemplateField, FieldAssignment } from "./types";

const BATCH = 500;

interface LegacyOptions {
  type: "legacy";
  selectedColumns: string[];
}

interface TemplateOptions {
  type: "template";
  fields: TemplateField[];
  mapping: FieldAssignment[];
  staticValues?: Record<string, string>;
  fileMetadata?: Record<string, string>;
  metadataIncludes?: Record<string, boolean>;
}

export async function runValidation(
  supabase: SupabaseClient,
  fileId: string,
  buffer: Buffer,
  fileName: string,
  options: LegacyOptions | TemplateOptions
): Promise<void> {
  const { rows: parsed } = await parseFile(buffer, fileName);

  const validated =
    options.type === "template"
      ? validateRowsWithTemplate(
          parsed,
          options.fields,
          options.mapping,
          options.staticValues,
          options.fileMetadata,
          options.metadataIncludes
        )
      : validateRows(
          parsed.map((row) => ({
            ...row,
            raw: Object.fromEntries(
              options.selectedColumns
                .filter((c) => c in row.raw)
                .map((c) => [c, row.raw[c] ?? ""])
            ),
          }))
        );

  const cleanCount = validated.filter((r) => r.isClean).length;
  const flaggedCount = validated.filter((r) => !r.isClean).length;

  const { data: validation, error: vErr } = await supabase
    .from("file_validations")
    .insert({
      file_id: fileId,
      total_rows: validated.length,
      clean_count: cleanCount,
      flagged_count: flaggedCount,
    })
    .select("id")
    .single();

  if (vErr || !validation) throw new Error(vErr?.message ?? "Validation insert failed");

  const rows = validated.map((r) => ({
    validation_id: validation.id,
    row_index: r.index,
    row_data: r.raw,
    is_clean: r.isClean,
    issues: r.issues,
  }));

  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from("validation_rows").insert(rows.slice(i, i + BATCH));
    if (error) throw new Error(error.message);
  }
}
