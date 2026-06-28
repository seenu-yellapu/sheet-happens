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

function getRowName(data: Record<string, string>): string {
  const keys = Object.keys(data);
  const first = keys.find((k) => /^first\s*name$/i.test(k));
  const last = keys.find((k) => /^last\s*name$/i.test(k));
  if (first || last) return [first && data[first], last && data[last]].filter(Boolean).join(" ");
  const fallback = keys.find((k) => /name|email|phone/i.test(k)) ?? keys[0];
  return fallback ? data[fallback] : "";
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
          <SectionLabel>Choose the output file format</SectionLabel>

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
              validated={hasValidation}
            />
          )}
          {hasFile && !selectedTemplate && (
            <p className="text-sm text-zinc-400">Select a template in section 1 first.</p>
          )}
        </section>

        {/* ── Section 4: Export ────────────────────────────────────────────── */}
        <section className={!hasValidation ? "opacity-40 pointer-events-none select-none" : ""}>
          <SectionLabel>Get your file</SectionLabel>

          {hasValidation && (
            <div className="space-y-3">
              {/* Clean tile */}
              {validation!.clean_count > 0 ? (
                <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-emerald-700">
                      {validation!.clean_count} clean record{validation!.clean_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <a
                    href={`/api/files/${currentFile!.id}/export?type=clean`}
                    download
                    className="text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-4 py-1.5 rounded-md transition-colors"
                  >
                    Download
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-zinc-50 rounded-xl px-5 py-4 opacity-50">
                  <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-zinc-400">0 clean records</span>
                </div>
              )}

              {/* Flagged tile + table */}
              {validation!.flagged_count > 0 && (
                <>
                  <div className="flex items-center justify-between bg-amber-50 rounded-xl px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <span className="text-sm font-medium text-amber-700">
                        {validation!.flagged_count} record{validation!.flagged_count !== 1 ? "s" : ""} {validation!.flagged_count === 1 ? "has" : "have"} issues
                      </span>
                    </div>
                    <a
                      href={`/api/files/${currentFile!.id}/export?type=flagged`}
                      download
                      className="text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-1.5 rounded-md transition-colors"
                    >
                      Download
                    </a>
                  </div>

                  {initialFlaggedRows.length > 0 && (
                    <div className="mt-1 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[3rem_1fr_2fr] px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                        <span>Row</span>
                        <span>Name</span>
                        <span>Issues</span>
                      </div>
                      {initialFlaggedRows.map((row, i) => (
                        <div
                          key={row.row_index}
                          className={`grid grid-cols-[3rem_1fr_2fr] px-3 py-2.5 text-xs ${i % 2 === 0 ? "bg-zinc-50" : ""}`}
                        >
                          <span className="text-zinc-400 tabular-nums">{row.row_index}</span>
                          <span className="text-zinc-600 truncate pr-4">{getRowName(row.row_data)}</span>
                          <span className="text-zinc-500">
                            {row.issues.map((issue) => `${issue.field}: ${issue.message}`).join(" · ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
