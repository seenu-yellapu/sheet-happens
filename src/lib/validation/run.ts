import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFile } from "./parse";
import { validateRows } from "./validate";

const BATCH = 500;

export async function runValidation(
  supabase: SupabaseClient,
  fileId: string,
  buffer: Buffer,
  fileName: string,
  selectedColumns: string[]
): Promise<void> {
  const parsed = await parseFile(buffer, fileName);

  // Restrict each row to only the user-selected columns
  const filtered = parsed.map((row) => ({
    ...row,
    raw: Object.fromEntries(
      Object.entries(row.raw).filter(([k]) => selectedColumns.includes(k))
    ),
  }));

  const validated = validateRows(filtered);

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
    const { error } = await supabase
      .from("validation_rows")
      .insert(rows.slice(i, i + BATCH));
    if (error) throw new Error(error.message);
  }
}
