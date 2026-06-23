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
        className="text-sm text-red-400 hover:text-red-600 transition-colors"
      >
        Delete event
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">Delete this event and all its files?</span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50
                   px-3 py-1.5 rounded-md transition-colors"
      >
        {isPending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
