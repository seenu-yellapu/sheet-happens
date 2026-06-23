"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { renameEvent } from "@/app/actions/events";

export default function RenameEventInput({
  eventId,
  initialName,
}: {
  eventId: string;
  initialName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) {
      setName(initialName);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await renameEvent(eventId, trimmed);
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setName(initialName); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="text-xl font-semibold bg-transparent border-b border-[#2a5bd7]
                     focus:outline-none w-full disabled:opacity-50 text-zinc-900"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="text-xs font-medium text-white bg-[#2a5bd7] hover:bg-blue-700
                     px-2.5 py-1 rounded-md transition-colors disabled:opacity-40 shrink-0"
        >
          {isPending ? "…" : "Save"}
        </button>
        <button
          onClick={() => { setName(initialName); setEditing(false); }}
          disabled={isPending}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <h1 className="text-xl font-semibold text-zinc-900">{name}</h1>
      <button
        onClick={() => setEditing(true)}
        className="text-zinc-300 hover:text-zinc-500 transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
        aria-label="Rename event"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L4.667 14H2v-2.667L11.333 2Z"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
