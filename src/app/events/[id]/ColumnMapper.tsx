"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FieldAssignment, CombineMode, FieldType, ColumnMapping } from "@/lib/validation/types";

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
  fileId: string;
  headers: string[];
  templates: Template[];
  existingMapping?: ColumnMapping | null;
}

function getFieldType(field: TemplateFieldRow): FieldType {
  const typeRule = field.template_field_rules.find((r) => r.rule_type === "type");
  return (typeRule?.value ?? "text") as FieldType;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-().]/g, "");

function suggestColumns(headers: string[], type: FieldType): { col: string; isSuggested: boolean }[] {
  return headers.map((col) => {
    const n = norm(col);
    let isSuggested = false;
    if (type === "email") isSuggested = n.includes("email") || n.includes("mail");
    else if (type === "phone") isSuggested = n.includes("phone") || n.includes("mobile") || n.includes("cell") || n.includes("tel");
    return { col, isSuggested };
  });
}

function autoMatchColumns(headers: string[], fieldName: string, type: FieldType): string[] {
  const nf = norm(fieldName);
  // Exact name match
  const exact = headers.filter((h) => norm(h) === nf);
  if (exact.length) return exact;
  // Type-keyword fallback for email / phone
  if (type === "email") {
    const match = headers.find((h) => { const n = norm(h); return n.includes("email") || n.includes("mail"); });
    if (match) return [match];
  }
  if (type === "phone") {
    const match = headers.find((h) => { const n = norm(h); return n.includes("phone") || n.includes("mobile") || n.includes("cell") || n.includes("tel"); });
    if (match) return [match];
  }
  return [];
}

const COMBINE_LABELS: Record<CombineMode, string> = {
  separate:  "separate columns",
  semicolon: "combined with semicolon",
  comma:     "combined with comma",
  first:     "first value only",
};

export default function ColumnMapper({ fileId, headers, templates, existingMapping }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultTemplateId = existingMapping?.templateId ?? templates[0]?.id ?? "";
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const template = templates.find((t) => t.id === selectedTemplateId);
  const sortedFields = template
    ? [...template.template_fields].sort((a, b) => a.position - b.position)
    : [];

  // Initialise assignments when template changes
  useEffect(() => {
    if (!template) return;
    const mapped = sortedFields.map((field) => {
      const type = getFieldType(field);
      // Reuse saved mapping for this field if it exists
      const saved = existingMapping?.templateId === selectedTemplateId
        ? existingMapping.fields.find((f) => f.fieldName === field.name)
        : undefined;
      return saved ?? {
        fieldId: field.id,
        fieldName: field.name,
        type,
        columns: autoMatchColumns(headers, field.name, type),
        combineMode: "first" as CombineMode,
      };
    });
    setAssignments(mapped);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleColumn(fieldId: string, col: string) {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.fieldId !== fieldId) return a;
        const has = a.columns.includes(col);
        const columns = has ? a.columns.filter((c) => c !== col) : [...a.columns, col];
        return { ...a, columns };
      })
    );
  }

  function setCombineMode(fieldId: string, mode: CombineMode) {
    setAssignments((prev) =>
      prev.map((a) => (a.fieldId === fieldId ? { ...a, combineMode: mode } : a))
    );
  }

  function handleConfirm() {
    setError(null);
    const mapping: ColumnMapping = { templateId: selectedTemplateId, fields: assignments };
    startTransition(async () => {
      const res = await fetch(`/api/files/${fileId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId, columnMapping: assignments }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Validation failed");
        return;
      }
      router.refresh();
    });
  }

  if (!templates.length) {
    return (
      <p className="mt-2 text-xs text-zinc-400">
        No templates yet.{" "}
        <a href="/templates" className="text-[#2a5bd7] hover:underline">Create one →</a>
      </p>
    );
  }

  // All columns currently assigned to any field
  const allMappedCols = new Set(assignments.flatMap((a) => a.columns));

  return (
    <div className="mt-3 border border-zinc-100 rounded-lg px-4 py-3">
      {/* Template picker */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500 shrink-0">Template</span>
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          className="text-xs border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-[#2a5bd7]"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Field rows */}
      <div className="space-y-3" ref={dropdownRef}>
        {sortedFields.map((field) => {
          const type = getFieldType(field);
          const assignment = assignments.find((a) => a.fieldId === field.id);
          if (!assignment) return null;

          const selectedCols = assignment.columns;
          const suggestions = suggestColumns(headers, type);

          // Sort: selected first (in order), then unselected
          const dropdownCols = [
            ...headers.filter((h) => selectedCols.includes(h)),
            ...headers.filter((h) => !selectedCols.includes(h)),
          ];

          return (
            <div key={field.id}>
              <div className="flex items-start gap-3">
                <span className="text-xs text-zinc-600 pt-1 w-28 shrink-0">{field.name}</span>

                <div className="flex-1 min-w-0">
                  {/* Tags + add button */}
                  <div className="flex flex-wrap items-center gap-1">
                    {selectedCols.map((col) => (
                      <span
                        key={col}
                        className="flex items-center gap-0.5 text-xs bg-blue-50 text-[#2a5bd7] border border-[#2a5bd7]/30 rounded px-2 py-0.5"
                      >
                        {col}
                        <button
                          type="button"
                          onClick={() => toggleColumn(field.id, col)}
                          className="ml-0.5 hover:text-red-500 leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    {/* Dropdown trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDropdownId(openDropdownId === field.id ? null : field.id)
                        }
                        className="text-xs text-zinc-400 hover:text-[#2a5bd7] px-1 py-0.5 rounded transition-colors"
                      >
                        + Add
                      </button>

                      {openDropdownId === field.id && (
                        <div className="absolute top-6 left-0 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg w-52 max-h-52 overflow-y-auto">
                          {dropdownCols.map((col) => {
                            const isSelected = selectedCols.includes(col);
                            const isSuggested = suggestions.find((s) => s.col === col)?.isSuggested ?? false;
                            return (
                              <button
                                key={col}
                                type="button"
                                onClick={() => toggleColumn(field.id, col)}
                                className={`flex items-center w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors ${
                                  isSelected
                                    ? "text-[#2a5bd7]"
                                    : isSuggested
                                    ? "text-zinc-700"
                                    : "text-amber-600"
                                }`}
                              >
                                {isSelected && <span className="mr-2 shrink-0">✓</span>}
                                {col}
                              </button>
                            );
                          })}
                          {dropdownCols.length === 0 && (
                            <p className="px-3 py-2 text-xs text-zinc-400">No columns available</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Output as — only when 2+ columns */}
                  {selectedCols.length > 1 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-zinc-400">Output as</span>
                      <select
                        value={assignment.combineMode}
                        onChange={(e) => setCombineMode(field.id, e.target.value as CombineMode)}
                        className="text-xs border border-zinc-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#2a5bd7]"
                      >
                        {(Object.entries(COMBINE_LABELS) as [CombineMode, string][]).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="mt-4 text-xs font-medium text-white bg-[#2a5bd7] hover:bg-blue-700 disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors"
      >
        {isPending ? "Validating…" : "Confirm mapping →"}
      </button>
    </div>
  );
}
