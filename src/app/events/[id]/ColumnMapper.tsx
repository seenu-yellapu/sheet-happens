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
  fileMetadata?: Record<string, string>;
}

function getFieldType(field: TemplateFieldRow): FieldType {
  const typeRule = field.template_field_rules.find((r) => r.rule_type === "type");
  return (typeRule?.value ?? "text") as FieldType;
}

const normStr = (s: string) => s.toLowerCase().replace(/[\s_\-().]/g, "");

function autoMatchColumns(headers: string[], fieldName: string, type: FieldType): string[] {
  const nf = normStr(fieldName);
  const exact = headers.filter((h) => normStr(h) === nf);
  if (exact.length) return exact;
  if (type === "email") {
    const m = headers.find((h) => { const n = normStr(h); return n.includes("email") || n.includes("mail"); });
    if (m) return [m];
  }
  if (type === "phone") {
    const m = headers.find((h) => { const n = normStr(h); return n.includes("phone") || n.includes("mobile") || n.includes("cell") || n.includes("tel"); });
    if (m) return [m];
  }
  return [];
}

const COMBINE_LABELS: Record<CombineMode, string> = {
  separate:  "separate columns",
  semicolon: "combined with semicolon",
  comma:     "combined with comma",
  first:     "first value only",
};

export default function ColumnMapper({ fileId, headers, templates, existingMapping, fileMetadata = {} }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultTemplateId = existingMapping?.templateId ?? templates[0]?.id ?? "";
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [staticValues, setStaticValues] = useState<Record<string, string>>(
    existingMapping?.staticValues ?? {}
  );
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const template = templates.find((t) => t.id === selectedTemplateId);
  const sortedFields = template
    ? [...template.template_fields].sort((a, b) => a.position - b.position)
    : [];

  const metadataEntries = Object.entries(fileMetadata);

  useEffect(() => {
    if (!template) return;
    const mapped = sortedFields.map((field) => {
      const type = getFieldType(field);
      const saved =
        existingMapping?.templateId === selectedTemplateId
          ? existingMapping.fields.find((f) => f.fieldName === field.name)
          : undefined;
      return (
        saved ?? {
          fieldId: field.id,
          fieldName: field.name,
          type,
          columns: autoMatchColumns(headers, field.name, type),
          combineMode: "first" as CombineMode,
        }
      );
    });
    setAssignments(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  function addColumn(fieldId: string, col: string) {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.fieldId !== fieldId || a.columns.includes(col)) return a;
        return { ...a, columns: [...a.columns, col] };
      })
    );
    setInputValues((prev) => ({ ...prev, [fieldId]: "" }));
    setTimeout(() => inputRefs.current[fieldId]?.focus(), 0);
  }

  function removeColumn(fieldId: string, col: string) {
    setAssignments((prev) =>
      prev.map((a) =>
        a.fieldId === fieldId ? { ...a, columns: a.columns.filter((c) => c !== col) } : a
      )
    );
  }

  function removeStaticValue(fieldId: string) {
    setStaticValues((prev) => {
      const n = { ...prev };
      delete n[fieldId];
      return n;
    });
  }

  function setCombineMode(fieldId: string, mode: CombineMode) {
    setAssignments((prev) =>
      prev.map((a) => (a.fieldId === fieldId ? { ...a, combineMode: mode } : a))
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, fieldId: string) {
    const text = (inputValues[fieldId] ?? "").trim();

    if (e.key === "Enter") {
      e.preventDefault();
      if (!text) return;
      const matchingCol = headers.find((h) => h.toLowerCase() === text.toLowerCase());
      if (matchingCol) {
        addColumn(fieldId, matchingCol);
      } else {
        setStaticValues((prev) => ({ ...prev, [fieldId]: text }));
        setInputValues((prev) => ({ ...prev, [fieldId]: "" }));
      }
    } else if (e.key === "Backspace" && !text) {
      const assignment = assignments.find((a) => a.fieldId === fieldId);
      if (assignment && assignment.columns.length > 0) {
        removeColumn(fieldId, assignment.columns[assignment.columns.length - 1]);
      } else if (staticValues[fieldId]) {
        removeStaticValue(fieldId);
      }
    } else if (e.key === "Escape") {
      setActiveFieldId(null);
      inputRefs.current[fieldId]?.blur();
    }
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/files/${fileId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          columnMapping: assignments,
          staticValues,
        }),
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

  return (
    <div className="mt-3 border border-zinc-100 rounded-lg px-4 py-3 space-y-5">
      {/* Template picker */}
      <div className="flex items-center gap-2">
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

      {/* Field mapping */}
      <div className="space-y-2.5">
        {sortedFields.map((field) => {
          const type = getFieldType(field);
          const assignment = assignments.find((a) => a.fieldId === field.id);
          if (!assignment) return null;

          const selectedCols = assignment.columns;
          const staticVal = staticValues[field.id];
          const query = (inputValues[field.id] ?? "").toLowerCase();
          const isActive = activeFieldId === field.id;

          // Columns not yet selected, filtered by query
          const availableCols = headers.filter((h) => !selectedCols.includes(h));
          const filteredCols = query
            ? availableCols.filter((h) => h.toLowerCase().includes(query))
            : availableCols;

          // Metadata entries not yet selected as columns, filtered by query
          const availableMeta = metadataEntries.filter(([key]) => !selectedCols.includes(key));
          const filteredMeta = query
            ? availableMeta.filter(
                ([key, val]) =>
                  key.toLowerCase().includes(query) || val.toLowerCase().includes(query)
              )
            : availableMeta;

          const isEmpty = selectedCols.length === 0 && !staticVal;

          return (
            <div key={field.id}>
              <div className="flex items-start gap-3">
                <span className="text-xs text-zinc-500 pt-2 w-28 shrink-0">{field.name}</span>

                <div className="flex-1 min-w-0 relative">
                  {/* Unified tag input */}
                  <div
                    className={`flex flex-wrap items-center gap-1 border rounded-md px-2 py-1.5 cursor-text min-h-[34px] transition-colors ${
                      isActive ? "border-[#2a5bd7]" : "border-zinc-200"
                    }`}
                    onClick={() => inputRefs.current[field.id]?.focus()}
                  >
                    {/* Blue column / metadata tags */}
                    {selectedCols.map((col) => (
                      <span
                        key={col}
                        className="flex items-center gap-0.5 text-xs bg-blue-50 text-[#2a5bd7] border border-[#2a5bd7]/30 rounded px-1.5 py-0.5 shrink-0"
                      >
                        {col}
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); removeColumn(field.id, col); }}
                          className="ml-0.5 hover:text-red-500 leading-none"
                        >×</button>
                      </span>
                    ))}

                    {/* Gray static value tag (typed by user) */}
                    {staticVal && (
                      <span className="flex items-center gap-0.5 text-xs bg-zinc-100 text-zinc-600 border border-zinc-200 rounded px-1.5 py-0.5 shrink-0">
                        {staticVal}
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); removeStaticValue(field.id); }}
                          className="ml-0.5 hover:text-red-500 leading-none"
                        >×</button>
                      </span>
                    )}

                    <input
                      ref={(el) => { inputRefs.current[field.id] = el; }}
                      type="text"
                      value={inputValues[field.id] ?? ""}
                      onChange={(e) =>
                        setInputValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      onFocus={() => setActiveFieldId(field.id)}
                      onBlur={() =>
                        setTimeout(
                          () => setActiveFieldId((id) => (id === field.id ? null : id)),
                          150
                        )
                      }
                      onKeyDown={(e) => handleKeyDown(e, field.id)}
                      placeholder={isEmpty ? "Select column or type a fixed value…" : ""}
                      className="flex-1 min-w-[120px] text-xs outline-none bg-transparent placeholder:text-zinc-300 text-zinc-700"
                    />
                  </div>

                  {/* Dropdown */}
                  {isActive && (filteredCols.length > 0 || filteredMeta.length > 0 || query) && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg w-full max-h-52 overflow-y-auto">
                      {/* Column options */}
                      {filteredCols.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); addColumn(field.id, col); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
                        >
                          {col}
                        </button>
                      ))}

                      {/* Divider + metadata section */}
                      {filteredMeta.length > 0 && (
                        <>
                          {filteredCols.length > 0 && (
                            <div className="border-t border-zinc-100 my-1" />
                          )}
                          <div className="px-3 pt-1 pb-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                            From file metadata
                          </div>
                          {filteredMeta.map(([key, val]) => (
                            <button
                              key={key}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); addColumn(field.id, key); }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors flex items-center justify-between gap-3"
                            >
                              <span className="text-zinc-700">{key}</span>
                              <span className="text-zinc-400 truncate">{val}</span>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Hint when typing something not in any list */}
                      {query && filteredCols.length === 0 && filteredMeta.length === 0 && (
                        <p className="px-3 py-2 text-xs text-zinc-400">
                          Press Enter to add &ldquo;{inputValues[field.id]}&rdquo; as a fixed value
                        </p>
                      )}
                    </div>
                  )}

                  {/* Combine mode */}
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

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="text-xs font-medium text-white bg-[#2a5bd7] hover:bg-blue-700 disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors"
      >
        {isPending ? "Validating…" : "Confirm mapping →"}
      </button>
    </div>
  );
}
