"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEventClient } from "@/app/actions/events";

interface EventRow {
  id: string;
  name: string;
  created_at: string;
}

export default function EventsList({ initialEvents }: { initialEvents: EventRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function startCreating() {
    setCreating(true);
    setNewName("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelCreating() {
    setCreating(false);
    setNewName("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") confirmCreate();
    if (e.key === "Escape") cancelCreating();
  }

  function confirmCreate() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const id = await createEventClient(name);
      if (id) router.push(`/events/${id}`);
      else cancelCreating();
    });
  }

  const isEmpty = !initialEvents.length && !creating;

  return (
    <>
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-sm font-semibold">Events</h1>
        <button
          type="button"
          onClick={startCreating}
          disabled={creating || isPending}
          className="text-sm font-medium bg-[#2a5bd7] text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          New event
        </button>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-base font-medium text-zinc-700 mb-1.5">No events yet</p>
          <p className="text-sm text-zinc-400 mb-6">Create your first event to get started</p>
          <button
            type="button"
            onClick={startCreating}
            className="text-sm font-medium bg-[#2a5bd7] text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
          >
            New event
          </button>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
          {creating && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/40">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Event name"
                disabled={isPending}
                className="flex-1 text-sm bg-transparent border-0 focus:outline-none text-zinc-800 placeholder:text-zinc-400"
              />
              <span className="text-xs text-zinc-400 shrink-0">Enter to save · Esc to cancel</span>
            </div>
          )}
          {initialEvents.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors group"
            >
              <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">
                {event.name}
              </span>
              <span className="text-xs text-zinc-400">
                {new Date(event.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
