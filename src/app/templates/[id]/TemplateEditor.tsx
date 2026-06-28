"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTemplate, duplicateTemplate, deleteTemplate } from "@/app/actions/templates";
import type { TemplateFieldRules, FieldType } from "@/lib/validation/types";

interface EditorField {
  id: string;
  name: string;
  position: number;
  isNew: boolean;
  rules: TemplateFieldRules;
}

interface Props {
  templateId: string;
  initialName: string;
  initialFields: EditorField[];
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text",   label: "Text"   },
  { value: "email",  label: "Email"  },
  { value: "phone",  label: "Phone"  },
  { value: "date",   label: "Date"   },
  { value: "number", label: "Number" },
];

let newCounter = 0;

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none ${on ? "bg-[#2a5bd7]" : "bg-zinc-200"}`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export default function TemplateEditor({ templateId, initialName, initialFields }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [fields, setFields] = useState<EditorField[]>(initialFields);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleDuplicate() {
    setMenuOpen(false);
    await duplicateTemplate(templateId);
    router.push("/templates");
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm("Delete this template?")) return;
    await deleteTemplate(templateId);
    router.push("/templates");
  }

  // Drag-and-drop refs
  const dragIdx = useRef<number | null>(null);
  const didDrag = useRef(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ── Drag ──────────────────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, idx: number) {
    dragIdx.current = idx;
    didDrag.current = false;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  }
  function onDragEnter(idx: number) {
    if (dragIdx.current !== null && dragIdx.current !== idx) setDragOverIdx(idx);
  }
  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    didDrag.current = true;
    setFields((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      const insertAt = idx > from ? idx - 1 : idx;
      next.splice(insertAt, 0, item);
      return next.map((f, i) => ({ ...f, position: i }));
    });
    dragIdx.current = null;
    setDragOverIdx(null);
  }
  function onDragEnd() {
    dragIdx.current = null;
    setDragOverIdx(null);
    setTimeout(() => { didDrag.current = false; }, 0);
  }

  // ── Field mutations ────────────────────────────────────────────────────────
  function addField() {
    const id = `new-${++newCounter}`;
    const newField: EditorField = {
      id,
      name: "",
      position: fields.length,
      isNew: true,
      rules: { type: "text", required: false, validFormat: false, flagDuplicates: false, minDigits: false },
    };
    setFields((prev) => [...prev, newField]);
    setExpandedId(id);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, position: i })));
    if (expandedId === id) setExpandedId(null);
  }

  function updateName(id: string, value: string) {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, name: value } : f));
  }

  function updateRule<K extends keyof TemplateFieldRules>(id: string, key: K, value: TemplateFieldRules[K]) {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const rules = { ...f.rules, [key]: value };
        // Turn off phone-only rules when type changes away from phone
        if (key === "type") {
          if (value !== "phone") rules.minDigits = false;
          if (value !== "email" && value !== "phone") {
            rules.validFormat = false;
            rules.flagDuplicates = false;
          }
        }
        return { ...f, rules };
      })
    );
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveTemplate(templateId, name, fields);
      if (!result.ok) {
        setError(result.error ?? "Save failed");
      } else {
        router.push("/templates");
      }
    });
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      {/* Header row: name + options menu */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            className="text-xl font-semibold w-full border-0 border-b border-zinc-200 focus:border-[#2a5bd7] focus:outline-none pb-1 bg-transparent"
          />
          <p className="text-xs text-zinc-400 mt-2">
            Define the columns and validation rules your output file will follow
          </p>
        </div>
        <div ref={menuRef} className="relative shrink-0 mt-1">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Template options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 z-20">
              <button
                type="button"
                onClick={handleDuplicate}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Duplicate
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-0.5 mb-4">
        {fields.map((field, idx) => {
          const isExpanded = expandedId === field.id;
          const showFormatRules = field.rules.type === "email" || field.rules.type === "phone";
          const showMinDigits = field.rules.type === "phone";

          return (
            <div
              key={field.id}
              className={`rounded-lg border transition-all ${
                dragOverIdx === idx
                  ? "border-[#2a5bd7] ring-2 ring-[#2a5bd7]/20"
                  : "border-zinc-100 hover:border-zinc-200"
              }`}
            >
              {/* Row header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                {/* Drag handle */}
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, idx)}
                  onDragEnter={() => onDragEnter(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, idx)}
                  onDragEnd={onDragEnd}
                  className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 select-none shrink-0"
                  title="Drag to reorder"
                >
                  ⠿
                </div>

                {/* Field name input */}
                <input
                  value={field.name}
                  onChange={(e) => updateName(field.id, e.target.value)}
                  placeholder="Field name"
                  className="flex-1 text-sm bg-transparent border-0 focus:outline-none text-zinc-800 placeholder:text-zinc-300"
                />

                {/* Type badge */}
                <span className="text-xs text-zinc-400 shrink-0">{field.rules.type}</span>

                {/* Chevron */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : field.id)}
                  className="text-zinc-400 hover:text-zinc-600 shrink-0 transition-colors"
                >
                  <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Trash */}
                <button
                  type="button"
                  onClick={() => removeField(field.id)}
                  className="text-zinc-300 hover:text-red-400 shrink-0 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Expanded rules */}
              {isExpanded && (
                <div className="border-t border-zinc-100 px-4 py-3 space-y-3">
                  {/* Type */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">Type</span>
                    <select
                      value={field.rules.type}
                      onChange={(e) => updateRule(field.id, "type", e.target.value as FieldType)}
                      className="text-xs border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-[#2a5bd7]"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Required */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">Required</span>
                    <Toggle on={field.rules.required} onToggle={() => updateRule(field.id, "required", !field.rules.required)} />
                  </div>

                  {/* Valid format — email/phone only */}
                  {showFormatRules && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">Valid format</span>
                      <Toggle on={field.rules.validFormat} onToggle={() => updateRule(field.id, "validFormat", !field.rules.validFormat)} />
                    </div>
                  )}

                  {/* Flag duplicates — email/phone only */}
                  {showFormatRules && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">Flag duplicates</span>
                      <Toggle on={field.rules.flagDuplicates} onToggle={() => updateRule(field.id, "flagDuplicates", !field.rules.flagDuplicates)} />
                    </div>
                  )}

                  {/* Must be 10 digits — phone only */}
                  {showMinDigits && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">Must be 10 digits</span>
                      <Toggle on={field.rules.minDigits} onToggle={() => updateRule(field.id, "minDigits", !field.rules.minDigits)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add field */}
      <button
        type="button"
        onClick={addField}
        className="text-xs text-zinc-400 hover:text-[#2a5bd7] transition-colors mb-8"
      >
        + Add field
      </button>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/templates")}
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="text-sm font-medium bg-[#2a5bd7] text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? "Saving…" : "Save template"}
        </button>
      </div>
    </main>
  );
}
