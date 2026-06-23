"use client";

import { useState, useTransition } from "react";
import { deleteEvent } from "@/app/actions/events";

export default function DeleteEventButton({ eventId }: { eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(() => deleteEvent(eventId));
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Delete this event?</span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs font-medium text-white bg-red-500 hover:bg-red-600
                   disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors"
      >
        {isPending ? "Deleting…" : "Confirm"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
