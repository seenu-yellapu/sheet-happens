"use client";

import { useState, useTransition } from "react";
import { deleteEvent } from "@/app/actions/events";
import { Button } from "@/components/ui/button";

export default function DeleteEventButton({ eventId }: { eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(() => deleteEvent(eventId));
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs">
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Delete this event?</span>
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
        {isPending ? "Deleting…" : "Confirm"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={isPending}>
        Cancel
      </Button>
    </div>
  );
}
