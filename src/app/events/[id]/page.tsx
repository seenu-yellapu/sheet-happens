import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventFlow from "./EventFlow";
import type { ColumnMapping } from "@/lib/validation/types";

interface Props {
  params: Promise<{ id: string }>;
}

interface ValidationSummary {
  id: string;
  total_rows: number;
  clean_count: number;
  flagged_count: number;
}

export interface FileRow {
  id: string;
  name: string;
  size: number;
  created_at: string;
  headers: string[] | null;
  selected_columns: string[] | null;
  column_mapping: ColumnMapping | null;
  file_metadata: Record<string, string> | null;
  file_validations: ValidationSummary[];
}

export interface FlaggedRow {
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
      .select("id, name, size, created_at, headers, selected_columns, column_mapping, file_metadata, file_validations(id, total_rows, clean_count, flagged_count)")
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
  const latestFile = files[0] ?? null;

  let flaggedRows: FlaggedRow[] = [];
  if (latestFile?.file_validations[0]) {
    const { data } = await supabase
      .from("validation_rows")
      .select("validation_id, row_index, row_data, issues")
      .eq("validation_id", latestFile.file_validations[0].id)
      .eq("is_clean", false)
      .order("row_index");
    flaggedRows = (data ?? []) as FlaggedRow[];
  }

  return (
    <EventFlow
      eventId={id}
      eventName={event.name}
      eventCreatedAt={event.created_at}
      templates={templateList}
      initialFile={latestFile}
      initialFlaggedRows={flaggedRows}
    />
  );
}
