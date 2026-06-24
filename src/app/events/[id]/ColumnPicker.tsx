"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  fileId: string;
  headers: string[];
}

export default function ColumnPicker({ fileId, headers }: Props) {
  const router = useRouter();
  // selected: ordered list of active columns  excluded: deselected (shown greyed)
  const [selected, setSelected] = useState<string[]>(headers);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dragIdx = useRef<number | null>(null);
  const didDrag = useRef(false);

  // ── drag-and-drop ──────────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, idx: number) {
    dragIdx.current = idx;
    didDrag.current = false;
    e.dataTransfer.effectAllowed = "move";
    // Required by Firefox — drag is silently cancelled without this
    e.dataTransfer.setData("text/plain", String(idx));
  }

  function onDragEnter(idx: number) {
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      setDragOverIdx(idx);
    }
  }

  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    didDrag.current = true;
    setSelected((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIdx.current!, 1);
      next.splice(idx, 0, item);
      return next;
    });
    dragIdx.current = null;
    setDragOverIdx(null);
  }

  function onDragEnd() {
    dragIdx.current = null;
    setDragOverIdx(null);
    // Mark drag complete so the subsequent onClick doesn't exclude the chip
    setTimeout(() => { didDrag.current = false; }, 0);
  }

  // ── include / exclude ──────────────────────────────────────────────────────
  function exclude(col: string) {
    if (didDrag.current) return;
    setSelected((prev) => prev.filter((c) => c !== col));
    setExcluded((prev) => [...prev, col]);
  }

  function include(col: string) {
    setExcluded((prev) => prev.filter((c) => c !== col));
    setSelected((prev) => [...prev, col]);
  }

  // ── validate ───────────────────────────────────────────────────────────────
  function handleValidate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/files/${fileId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedColumns: selected }),
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
    <div className="mt-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400">
          Drag to reorder · click to exclude
        </span>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              setSelected([...selected, ...excluded]);
              setExcluded([]);
            }}
            disabled={excluded.length === 0}
            className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors"
          >
            All
          </button>
          <span className="text-zinc-200">·</span>
          <button
            onClick={() => {
              setExcluded([...excluded, ...selected]);
              setSelected([]);
            }}
            disabled={selected.length === 0}
            className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors"
          >
            None
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Active columns — draggable + reorderable */}
        {selected.map((col, idx) => (
          <div
            key={col}
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragEnter={() => onDragEnter(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            onClick={() => exclude(col)}
            title="Click to exclude · drag to reorder"
            className={`text-xs px-2.5 py-1 rounded-md border select-none transition-all cursor-grab active:cursor-grabbing active:opacity-50 ${
              dragOverIdx === idx
                ? "border-[#2a5bd7] ring-2 ring-[#2a5bd7]/30 text-[#2a5bd7] bg-blue-100/60"
                : "border-[#2a5bd7] text-[#2a5bd7] bg-blue-50/50 hover:bg-blue-100/40"
            }`}
          >
            {col}
          </div>
        ))}

        {/* Excluded columns — click to re-add at end */}
        {excluded.map((col) => (
          <button
            key={col}
            onClick={() => include(col)}
            title="Click to re-include"
            className="text-xs px-2.5 py-1 rounded-md border border-zinc-200 text-zinc-300 line-through hover:text-zinc-400 hover:border-zinc-300 transition-colors"
          >
            {col}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <button
        onClick={handleValidate}
        disabled={isPending || selected.length === 0}
        className="text-xs font-medium text-white bg-[#2a5bd7] hover:bg-blue-700
                   disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors"
      >
        {isPending
          ? "Validating…"
          : `Validate ${selected.length} column${selected.length === 1 ? "" : "s"} →`}
      </button>
    </div>
  );
}
