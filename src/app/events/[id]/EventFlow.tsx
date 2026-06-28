"use client";

import { useState } from "react";
import Link from "next/link";
import RenameEventInput from "./RenameEventInput";
import DeleteEventButton from "./DeleteEventButton";
import FileUpload from "./FileUpload";
import ColumnMapper from "./ColumnMapper";
import type { FileRow, FlaggedRow } from "./page";
import type { ColumnMapping } from "@/lib/validation/types";

interface TemplateFieldRow {
  id: string;
  name: string;
  position: number;
  template_field_rules: Array<{ rule_type: string; enabled: boolean; value: string | null }>;
}

interface Template {
  id: string;
  name: string;
  template_fields: TemplateFieldRow[];
}

interface Props {
  eventId: string;
  eventName: string;
  eventCreatedAt: string;
  templates: Template[];
  initialFile: FileRow | null;
  initialFlaggedRows: FlaggedRow[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">
      {children}
    </p>
  );
}

const PREVIEW_KEYS = ["first name", "last name", "firstname", "lastname", "name", "email", "phone"];
function rowPreview(data: Record<string, string>): string {
  const keys = Object.keys(data);
  const key = keys.find((k) => PREVIEW_KEYS.includes(k.toLowerCase())) ?? keys[0];
  return key ? data[key] : "";
}

export default function EventFlow({
  eventId,
  eventName,
  eventCreatedAt,
  templates,
  initialFile,
  initialFlaggedRows,
}: Props) {
  const existingTemplateId =
    (initialFile?.column_mapping as ColumnMapping | null)?.templateId ??
    templates[0]?.id ??
    "";
  const [selectedTemplateId, setSelectedTemplateId] = useState(existingTemplateId);
  const [showTemplatePicker, setShowTemplatePicker] = useState(!existingTemplateId || !initialFile?.column_mapping);
  const [showFlagged, setShowFlagged] = useState(false);

  const currentFile = initialFile;
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const sortedFields = selectedTemplate
    ? [...selectedTemplate.template_fields].sort((a, b) => a.position - b.position)
    : [];

  const hasTemplate = !!selectedTemplateId && !!selectedTemplate;
  const hasFile = !!(currentFile?.headers?.length);
  const hasValidation = !!(currentFile?.file_validations?.length);
  const validation = currentFile?.file_validations?.[0];

  function handleTemplateConfirm() {
    if (selectedTemplateId) setShowTemplatePicker(false);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Link
          href="/events"
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ← Events
        </Link>
        <DeleteEventButton eventId={eventId} />
      </div>

      <div className="mb-10">
        <RenameEventInput eventId={eventId} initialName={eventName} />
        <p className="text-xs text-zinc-400 mt-1.5">
          {new Date(eventCreatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="space-y-12">
        {/* ── Section 1: Template ─────────────────────────────────────────── */}
        <section>
          <SectionLabel>Choose how your output looks</SectionLabel>

          {showTemplatePicker || !selectedTemplate ? (
            <div className="flex items-center gap-3">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="text-sm border border-zinc-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2a5bd7] text-zinc-700"
              >
                {!selectedTemplateId && (
                  <option value="">Pick a template…</option>
                )}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedTemplateId && (
                <button
                  type="button"
                  onClick={handleTemplateConfirm}
                  className="text-sm font-medium text-white bg-[#2a5bd7] hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors"
                >
                  Confirm
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-800">{selectedTemplate.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {sortedFields.length} column{sortedFields.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Change
              </button>
            </div>
          )}

          {templates.length === 0 && (
            <p className="text-sm text-zinc-400">
              No templates yet.{" "}
              <a href="/templates" className="text-[#2a5bd7] hover:underline">Create one →</a>
            </p>
          )}
        </section>

        {/* ── Section 2: Upload ────────────────────────────────────────────── */}
        <section className={!hasTemplate ? "opacity-40 pointer-events-none select-none" : ""}>
          <SectionLabel>Upload your roster</SectionLabel>
          <FileUpload eventId={eventId} />
          {currentFile && (
            <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
              <span className="font-medium text-zinc-700">{currentFile.name}</span>
              <span>{formatBytes(currentFile.size)}</span>
              <span>
                {new Date(currentFile.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </section>

        {/* ── Section 3: Column mapping ────────────────────────────────────── */}
        <section className={!hasFile ? "opacity-40 pointer-events-none select-none" : ""}>
          <SectionLabel>Match your columns</SectionLabel>
          {hasFile && selectedTemplate && (
            <ColumnMapper
              fileId={currentFile!.id}
              headers={currentFile!.headers!}
              templateId={selectedTemplateId}
              fields={sortedFields}
              existingMapping={currentFile!.column_mapping}
              fileMetadata={currentFile!.file_metadata ?? {}}
            />
          )}
          {hasFile && !selectedTemplate && (
            <p className="text-sm text-zinc-400">Select a template in section 1 first.</p>
          )}
        </section>

        {/* ── Section 4: Export ────────────────────────────────────────────── */}
        <section className={!hasValidation ? "opacity-40 pointer-events-none select-none" : ""}>
          <SectionLabel>Get your file</SectionLabel>

          <div className="flex flex-wrap gap-3 mb-5">
            {hasValidation && validation!.clean_count > 0 ? (
              <a
                href={`/api/files/${currentFile!.id}/export?type=clean`}
                download
                className="text-sm font-medium bg-[#2a5bd7] text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Download clean file
              </a>
            ) : (
              <span className="text-sm font-medium bg-zinc-100 text-zinc-400 px-4 py-2 rounded-md cursor-default">
                Download clean file
              </span>
            )}

            {hasValidation && validation!.flagged_count > 0 ? (
              <a
                href={`/api/files/${currentFile!.id}/export?type=flagged`}
                download
                className="text-sm font-medium bg-amber-50 text-amber-600 border border-amber-200 px-4 py-2 rounded-md hover:bg-amber-100 transition-colors"
              >
                Download flagged rows
              </a>
            ) : (
              <span className="text-sm font-medium bg-zinc-100 text-zinc-400 px-4 py-2 rounded-md cursor-default">
                Download flagged rows
              </span>
            )}

            {currentFile && (
              <a
                href={`/api/files/${currentFile.id}/download`}
                className="text-sm font-medium bg-zinc-100 text-zinc-600 px-4 py-2 rounded-md hover:bg-zinc-200 transition-colors"
              >
                Download original file
              </a>
            )}
          </div>

          {hasValidation && (
            <div>
              <p className="text-sm text-zinc-500">
                <span className="text-emerald-600 font-medium">{validation!.clean_count} ready</span>
                {validation!.flagged_count > 0 && (
                  <> · <span className="text-amber-600 font-medium">{validation!.flagged_count} has issues</span></>
                )}
              </p>

              {validation!.flagged_count > 0 && initialFlaggedRows.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowFlagged((v) => !v)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${showFlagged ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {showFlagged ? "Hide" : "Show"} rows with issues
                  </button>

                  {showFlagged && (
                    <div className="mt-2 space-y-0.5">
                      {initialFlaggedRows.map((row) => {
                        const preview = rowPreview(row.row_data);
                        return (
                          <div
                            key={row.row_index}
                            className="rounded-lg px-3 py-2.5 hover:bg-zinc-50 transition-colors flex gap-4"
                          >
                            <span className="text-xs text-zinc-400 w-10 shrink-0 pt-0.5 tabular-nums">
                              {row.row_index}
                            </span>
                            <div className="min-w-0 flex-1">
                              {preview && (
                                <p className="text-xs text-zinc-500 mb-0.5 truncate">{preview}</p>
                              )}
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                {row.issues.map((issue, i) => (
                                  <span key={i} className="text-xs text-red-400">
                                    {issue.field}: {issue.message}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
