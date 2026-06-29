"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Check, TriangleAlert, Download } from "lucide-react";
import RenameEventInput from "./RenameEventInput";
import DeleteEventButton from "./DeleteEventButton";
import FileUpload from "./FileUpload";
import ColumnMapper from "./ColumnMapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
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

function SectionLabel({ step, children, dimmed }: { step: number; children: React.ReactNode; dimmed?: boolean }) {
  return (
    <div className={`flex items-center gap-3 mb-5 ${dimmed ? "opacity-40" : ""}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${dimmed ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
        {step}
      </div>
      <p className="text-sm font-semibold text-foreground">{children}</p>
      {!dimmed && <Separator className="flex-1" />}
    </div>
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

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Link href="/events" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronRight className="w-3 h-3 rotate-180" />
          Events
        </Link>
        <DeleteEventButton eventId={eventId} />
      </div>

      <div className="mb-10">
        <RenameEventInput eventId={eventId} initialName={eventName} />
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(eventCreatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="space-y-10">
        {/* ── Section 1: Template ── */}
        <section>
          <SectionLabel step={1}>Choose the output file format</SectionLabel>

          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No templates yet.{" "}
              <Link href="/templates" className="text-primary hover:underline">Create one →</Link>
            </p>
          ) : showTemplatePicker || !selectedTemplate ? (
            <div className="flex items-center gap-3">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Pick a template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateId && (
                <Button size="sm" onClick={() => setShowTemplatePicker(false)}>
                  Confirm
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium">{selectedTemplate.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sortedFields.length} column{sortedFields.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplatePicker(true)} className="text-muted-foreground">
                Change
              </Button>
            </div>
          )}
        </section>

        {/* ── Section 2: Upload ── */}
        <section className={!hasTemplate ? "opacity-40 pointer-events-none select-none" : ""}>
          <SectionLabel step={2} dimmed={!hasTemplate}>Upload your roster</SectionLabel>
          <FileUpload eventId={eventId} />
          {currentFile && (
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{currentFile.name}</span>
              <span>{formatBytes(currentFile.size)}</span>
              <span>
                {new Date(currentFile.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            </div>
          )}
        </section>

        {/* ── Section 3: Column mapping ── */}
        <section className={!hasFile ? "opacity-40 pointer-events-none select-none" : ""}>
          <SectionLabel step={3} dimmed={!hasFile}>Match your columns</SectionLabel>
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
            <p className="text-sm text-muted-foreground">Select a template in step 1 first.</p>
          )}
        </section>

        {/* ── Section 4: Export ── */}
        <section className={!hasValidation ? "opacity-40 pointer-events-none select-none" : ""}>
          <SectionLabel step={4} dimmed={!hasValidation}>Get your file</SectionLabel>

          {hasValidation && (
            <div className="space-y-3">
              {/* Clean tile */}
              {validation!.clean_count > 0 ? (
                <Card className="flex items-center justify-between px-5 py-4 bg-emerald-50 border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">
                        {validation!.clean_count} clean record{validation!.clean_count !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-emerald-600/70">Ready to download</p>
                    </div>
                  </div>
                  <a href={`/api/files/${currentFile!.id}/export?type=clean`} download>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </Button>
                  </a>
                </Card>
              ) : (
                <Card className="flex items-center gap-3 px-5 py-4 bg-muted/40 opacity-60">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">0 clean records</p>
                </Card>
              )}

              {/* Flagged tile */}
              {validation!.flagged_count > 0 && (
                <>
                  <Card className="flex items-center justify-between px-5 py-4 bg-amber-50 border-amber-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <TriangleAlert className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-700">
                          {validation!.flagged_count} record{validation!.flagged_count !== 1 ? "s" : ""} {validation!.flagged_count === 1 ? "has" : "have"} issues
                        </p>
                        <p className="text-xs text-amber-600/70">Review before using</p>
                      </div>
                    </div>
                    <a href={`/api/files/${currentFile!.id}/export?type=flagged`} download>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </Button>
                    </a>
                  </Card>

                  {initialFlaggedRows.length > 0 && (
                    <div className="rounded-xl border border-border overflow-hidden mt-1">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Issues</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {initialFlaggedRows.map((row) => (
                            <TableRow key={row.row_index}>
                              <TableCell className="text-muted-foreground tabular-nums">{row.row_index}</TableCell>
                              <TableCell className="font-medium">{getRowName(row.row_data)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {row.issues.map((i) => `${i.field}: ${i.message}`).join(" · ")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
