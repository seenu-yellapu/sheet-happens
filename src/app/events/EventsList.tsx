"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEventClient } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    if (modalOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [modalOpen]);

  function openModal() {
    setNewName("");
    setModalOpen(true);
  }

  function closeModal() {
    if (isPending) return;
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Events</h1>
        <Button onClick={openModal} size="sm">New event</Button>
      </div>

      {!initialEvents.length ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <p className="text-base font-medium text-foreground mb-1.5">No events yet</p>
          <p className="text-sm text-muted-foreground mb-6">Create your first event to get started</p>
          <Button onClick={openModal} size="sm">New event</Button>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {initialEvents.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors group"
            >
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {event.name}
              </span>
              <span className="text-xs text-muted-foreground">
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

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Event name"
              disabled={isPending}
            />
            <Button
              onClick={confirmCreate}
              disabled={isPending || !newName.trim()}
              className="w-full"
            >
              {isPending ? "Creating…" : "Create event"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
