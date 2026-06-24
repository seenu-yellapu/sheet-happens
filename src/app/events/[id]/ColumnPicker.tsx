"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  fileId: string;
  headers: string[];
}

export default function ColumnPicker({ fileId, headers }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(headers));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allSelected = selected.size === headers.length;
  const noneSelected = selected.size === 0;

  function toggle(col: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  }

  function handleValidate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/files/${fileId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedColumns: [...selected] }),
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
        <span className="text-xs text-zinc-400">Select columns to validate and export</span>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setSelected(new Set(headers))}
            disabled={allSelected}
            className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors"
          >
            All
          </button>
          <span className="text-zinc-200">·</span>
          <button
            onClick={() => setSelected(new Set())}
            disabled={noneSelected}
            className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors"
          >
            None
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {headers.map((col) => {
          const checked = selected.has(col);
          return (
            <button
              key={col}
              onClick={() => toggle(col)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                checked
                  ? "border-[#2a5bd7] text-[#2a5bd7] bg-blue-50/50"
                  : "border-zinc-200 text-zinc-400 bg-transparent hover:border-zinc-300"
              }`}
            >
              {col}
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <button
        onClick={handleValidate}
        disabled={isPending || noneSelected}
        className="text-xs font-medium text-white bg-[#2a5bd7] hover:bg-blue-700
                   disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors"
      >
        {isPending ? "Validating…" : `Validate ${selected.size} column${selected.size === 1 ? "" : "s"} →`}
      </button>
    </div>
  );
}
