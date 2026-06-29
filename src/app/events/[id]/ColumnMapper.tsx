"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FieldAssignment, CombineMode, FieldType, ColumnMapping } from "@/lib/validation/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TemplateFieldRow {
  id: string;
  name: string;
  position: number;
  template_field_rules: Array<{ rule_type: string; enabled: boolean; value: string | null }>;
}

interface Props {
  fileId: string;
  headers: string[];
  templateId: string;
  fields: TemplateFieldRow[];
  existingMapping?: ColumnMapping | null;
  fileMetadata?: Record<string, string>;
  validated?: boolean;
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

  const nameHasEmail = nf.includes("email") || nf.includes("mail");
  const nameHasPhone = nf.includes("phone") || nf.includes("mobile") || nf.includes("cell") || nf.includes("tel");

  if (type === "email" || nameHasEmail) {
    const matches = headers.filter((h) => { const n = normStr(h); return n.includes("email") || n.includes("mail"); });
    if (matches.length) return matches;
  }
  if (type === "phone" || nameHasPhone) {
    const matches = headers.filter((h) => { const n = normStr(h); return n.includes("phone") || n.includes("mobile") || n.includes("cell") || n.includes("tel"); });
    if (matches.length) return matches;
  }
  return [];
}

const COMBINE_LABELS: Record<CombineMode, string> = {
  separate:  "separate columns",
  semicolon: "combined with semicolon",
  comma:     "combined with comma",
  first:     "first value only",
};

export default function ColumnMapper({
  fileId,
  headers,
  templateId,
  fields,
  existingMapping,
  fileMetadata = {},
  validated = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [staticValues, setStaticValues] = useState<Record<string, string>>(
    existingMapping?.staticValues ?? {}
  );
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const metadataEntries = Object.entries(fileMetadata);

  useEffect(() => {
    const mapped = fields.map((field) => {
      const type = getFieldType(field);
      const saved = existingMapping?.templateId === templateId
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
  }, [templateId]);

  // Set of all columns mapped to ANY field
  const allMappedCols = new Set(assignments.flatMap((a) => a.columns));

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
          templateId,
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

  return (
    <div className="space-y-4">
      {/* Field rows */}
      <div className="space-y-2.5">
        {fields.map((field) => {
          const assignment = assignments.find((a) => a.fieldId === field.id);
          if (!assignment) return null;

          const selectedCols = assignment.columns;
          const staticVal = staticValues[field.id];
          const query = (inputValues[field.id] ?? "").toLowerCase();
          const isActive = activeFieldId === field.id;

          // Columns already selected for other fields (not this one)
          const mappedElsewhere = headers.filter(
            (h) => allMappedCols.has(h) && !selectedCols.includes(h)
          );
          // Columns not mapped to any field and not selected here
          const unmapped = headers.filter(
            (h) => !allMappedCols.has(h) && !selectedCols.includes(h)
          );

          const filteredMappedElsewhere = query
            ? mappedElsewhere.filter((h) => h.toLowerCase().includes(query))
            : mappedElsewhere;
          const filteredUnmapped = query
            ? unmapped.filter((h) => h.toLowerCase().includes(query))
            : unmapped;

          // Metadata not yet used as a column
          const availableMeta = metadataEntries.filter(([key]) => !selectedCols.includes(key));
          const filteredMeta = query
            ? availableMeta.filter(([key, val]) =>
                key.toLowerCase().includes(query) || val.toLowerCase().includes(query)
              )
            : availableMeta;

          const isEmpty = selectedCols.length === 0 && !staticVal;
          const hasDropdownContent =
            filteredMappedElsewhere.length > 0 ||
            filteredUnmapped.length > 0 ||
            filteredMeta.length > 0 ||
            !!query;

          return (
            <div key={field.id}>
              <div className="flex items-start gap-3">
                <span className="text-xs text-zinc-500 pt-2 w-28 shrink-0">{field.name}</span>

                <div className="flex-1 min-w-0 relative">
                  {/* Tag input */}
                  <div
                    className={`flex flex-wrap items-center gap-1 border rounded-md px-2 py-1.5 cursor-text min-h-[34px] transition-colors ${
                      isActive ? "border-[#2a5bd7]" : "border-zinc-200"
                    }`}
                    onClick={() => inputRefs.current[field.id]?.focus()}
                  >
                    {/* Blue column / metadata tags */}
                    {selectedCols.map((col) => (
                      <Badge
                        key={col}
                        variant="blue"
                        className="flex items-center gap-0.5 shrink-0"
                      >
                        {col}
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); removeColumn(field.id, col); }}
                          className="ml-0.5 hover:text-red-500 leading-none"
                        >×</button>
                      </Badge>
                    ))}

                    {/* Gray static value tag */}
                    {staticVal && (
                      <Badge variant="secondary" className="flex items-center gap-0.5 shrink-0">
                        {staticVal}
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); removeStaticValue(field.id); }}
                          className="ml-0.5 hover:text-red-500 leading-none"
                        >×</button>
                      </Badge>
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
                  {isActive && hasDropdownContent && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg w-full max-h-52 overflow-y-auto">
                      {/* Already mapped to other fields */}
                      {filteredMappedElsewhere.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); addColumn(field.id, col); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
                        >
                          {col}
                        </button>
                      ))}

                      {/* Unmapped columns — amber */}
                      {filteredUnmapped.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); addColumn(field.id, col); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          {col}
                        </button>
                      ))}

                      {/* Metadata section */}
                      {filteredMeta.length > 0 && (
                        <>
                          {(filteredMappedElsewhere.length > 0 || filteredUnmapped.length > 0) && (
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

                      {/* No matches hint */}
                      {query &&
                        filteredMappedElsewhere.length === 0 &&
                        filteredUnmapped.length === 0 &&
                        filteredMeta.length === 0 && (
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

      <Button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        variant={validated ? "outline" : "default"}
        size="sm"
      >
        {isPending ? "Validating…" : validated ? "Re-validate" : "Confirm and validate"}
      </Button>
    </div>
  );
}
