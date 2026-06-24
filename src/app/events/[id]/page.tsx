import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FileUpload from "./FileUpload";
import ValidationReport from "./ValidationReport";
import ExportButtons from "./ExportButtons";
import DeleteEventButton from "./DeleteEventButton";
import RenameEventInput from "./RenameEventInput";
import ColumnMapper from "./ColumnMapper";
import type { ColumnMapping } from "@/lib/validation/types";

interface Props {
  params: Promise<{ id: string }>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ValidationSummary {
  id: string;
  total_rows: number;
  clean_count: number;
  flagged_count: number;
}

interface FileRow {
  id: string;
  name: string;
  size: number;
  created_at: string;
  headers: string[] | null;
  selected_columns: string[] | null;
  column_mapping: ColumnMapping | null;
  file_validations: ValidationSummary[];
}

interface FlaggedRow {
  validation_id: string;
  row_index: number;
  row_data: Record<string, string>;
  issues: Array<{ field: string; message: string }>;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: rawFiles }, { data: templates }] = await Promise.all([
    supabase.from("events").select("id, name, created_at").eq("id", id).single(),
    supabase
      .from("event_files")
      .select("id, name, size, created_at, headers, selected_columns, column_mapping, file_validations(id, total_rows, clean_count, flagged_count)")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("templates")
      .select("id, name, template_fields(id, name, position, template_field_rules(rule_type, enabled, value))")
      .order("name"),
  ]);

  if (!event) notFound();

  const files = (rawFiles ?? []) as FileRow[];
  const templateList = (templates ?? []) as any[];

  const validationIds = files.flatMap((f) => f.file_validations.map((v) => v.id));
  let flaggedRows: FlaggedRow[] = [];
  if (validationIds.length > 0) {
    const { data } = await supabase
      .from("validation_rows")
      .select("validation_id, row_index, row_data, issues")
      .in("validation_id", validationIds)
      .eq("is_clean", false)
      .order("row_index");
    flaggedRows = (data ?? []) as FlaggedRow[];
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      {/* Breadcrumb + delete */}
      <div className="flex items-center justify-between">
        <Link href="/events" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
          ← Events
        </Link>
        <DeleteEventButton eventId={id} />
      </div>

      {/* Event title + date */}
      <div className="mt-3 mb-8">
        <RenameEventInput eventId={id} initialName={event.name} />
        <p className="text-xs text-zinc-400 mt-1.5">
          {new Date(event.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="h-px bg-zinc-100 mb-8" />

      {/* Upload + file list */}
      <div className="mb-10">
        <FileUpload eventId={id} />

        {!!files.length && (
          <div className="mt-3 space-y-0.5">
            {files.map((file) => {
              const v = file.file_validations[0];
              const isValidated = !!v;
              return (
                <div key={file.id} className="group rounded-lg px-3 py-2.5 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-zinc-800 truncate min-w-0">
                      {file.name}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-400">
                      {isValidated && v.flagged_count > 0 && (
                        <span className="text-amber-500">{v.flagged_count} flagged</span>
                      )}
                      <span>{formatBytes(file.size)}</span>
                      <span>
                        {new Date(file.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {isValidated ? (
                    <ExportButtons
                      fileId={file.id}
                      hasValidation
                      cleanCount={v.clean_count}
                      flaggedCount={v.flagged_count}
                    />
                  ) : file.headers?.length ? (
                    <ColumnMapper
                      fileId={file.id}
                      headers={file.headers}
                      templates={templateList}
                      existingMapping={file.column_mapping}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation reports */}
      <div className="space-y-6">
        {files
          .filter((f) => f.file_validations.length > 0)
          .map((file) => {
            const v = file.file_validations[0];
            const rows = flaggedRows.filter((r) => r.validation_id === v.id);
            return (
              <ValidationReport
                key={v.id}
                fileName={file.name}
                totalRows={v.total_rows}
                cleanCount={v.clean_count}
                flaggedCount={v.flagged_count}
                flaggedRows={rows}
              />
            );
          })}
      </div>
    </main>
  );
}
