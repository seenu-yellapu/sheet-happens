"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { renameEvent } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

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
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="text-xl font-semibold h-auto py-0.5 px-1 border-0 border-b border-primary rounded-none focus-visible:ring-0 focus-visible:border-primary bg-transparent"
        />
        <Button size="sm" onClick={handleSave} disabled={isPending || !name.trim()}>
          {isPending ? "…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setName(initialName); setEditing(false); }} disabled={isPending}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <h1 className="text-xl font-semibold text-foreground">{name}</h1>
      <button
        onClick={() => setEditing(true)}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Rename event"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
