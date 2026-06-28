"use client";

import { useState, useRef, useTransition, useEffect } from "react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [modalOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    if (modalOpen) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  function openModal() {
    setNewName("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setNewName("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") confirmCreate();
  }

  function confirmCreate() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const id = await createEventClient(name);
      if (id) router.push(`/events/${id}`);
      else closeModal();
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-sm font-semibold">Events</h1>
        <button
          type="button"
          onClick={openModal}
          className="text-sm font-medium bg-[#2a5bd7] text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
        >
          New event
        </button>
      </div>

      {!initialEvents.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-base font-medium text-zinc-700 mb-1.5">No events yet</p>
          <p className="text-sm text-zinc-400 mb-6">Create your first event to get started</p>
          <button
            type="button"
            onClick={openModal}
            className="text-sm font-medium bg-[#2a5bd7] text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
          >
            New event
          </button>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
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

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 px-6 py-7">
            <h2 className="text-sm font-semibold text-zinc-800 mb-4">New event</h2>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Event name"
              disabled={isPending}
              className="w-full text-sm border border-zinc-200 rounded-md px-3 py-2 focus:outline-none focus:border-[#2a5bd7] placeholder:text-zinc-400 text-zinc-800 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={confirmCreate}
              disabled={isPending || !newName.trim()}
              className="mt-3 w-full text-sm font-medium bg-[#2a5bd7] text-white py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {isPending ? "Creating…" : "Create event"}
            </button>
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
