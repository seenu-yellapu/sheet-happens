import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FileUpload from "./FileUpload";
import ValidationReport from "./ValidationReport";
import ExportButtons from "./ExportButtons";

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

  const [{ data: event }, { data: rawFiles }] = await Promise.all([
    supabase.from("events").select("id, name, created_at").eq("id", id).single(),
    supabase
      .from("event_files")
      .select("id, name, size, created_at, file_validations(id, total_rows, clean_count, flagged_count)")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!event) notFound();

  const files = (rawFiles ?? []) as FileRow[];

  // Fetch flagged rows for all validations
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
    <main className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/events" className="text-sm text-[#2a5bd7] hover:underline mb-8 inline-block">
        ← All events
      </Link>

      <h1 className="text-3xl font-semibold mt-4">{event.name}</h1>
      <p className="text-sm text-gray-400 mt-2">
        Created{" "}
        {new Date(event.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <FileUpload eventId={id} />

      {/* File list */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Uploaded Files
        </h2>

        {!files.length ? (
          <p className="text-sm text-gray-400">No files uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {files.map((file) => {
              const v = file.file_validations[0];
              return (
                <li key={file.id} className="py-4">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {formatBytes(file.size)} ·{" "}
                      {new Date(file.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {v && (
                      <span className={`text-xs font-medium ${v.flagged_count > 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {v.flagged_count > 0
                          ? `${v.clean_count} clean · ${v.flagged_count} flagged`
                          : `${v.clean_count} clean`}
                      </span>
                    )}
                  </div>
                  <ExportButtons
                    fileId={file.id}
                    hasValidation={!!v}
                    cleanCount={v?.clean_count ?? 0}
                    flaggedCount={v?.flagged_count ?? 0}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Validation reports */}
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
    </main>
  );
}
