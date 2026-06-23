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
      <div className="flex items-center gap-2 mt-4">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="text-3xl font-semibold bg-transparent border-b-2 border-[#2a5bd7]
                     focus:outline-none w-full disabled:opacity-50"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="text-sm font-medium text-white bg-[#2a5bd7] hover:bg-blue-700
                     px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 shrink-0"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => { setName(initialName); setEditing(false); }}
          disabled={isPending}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-4 group">
      <h1 className="text-3xl font-semibold">{name}</h1>
      <button
        onClick={() => setEditing(true)}
        className="text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Rename event"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L4.667 14H2v-2.667L11.333 2Z"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
