import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "@/app/actions/events";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-sm font-semibold">Events</h1>
        <form action={createEvent} className="flex gap-2">
          <input
            type="text"
            name="name"
            placeholder="Event name"
            required
            className="text-sm border border-zinc-200 rounded-md px-3 py-1.5 w-52
                       focus:outline-none focus:ring-1 focus:ring-[#2a5bd7] focus:border-[#2a5bd7]
                       placeholder:text-zinc-400"
          />
          <button
            type="submit"
            className="text-sm font-medium bg-[#2a5bd7] text-white px-4 py-1.5 rounded-md
                       hover:bg-blue-700 transition-colors shrink-0"
          >
            New event
          </button>
        </form>
      </div>

      {!events?.length ? (
        <p className="text-sm text-zinc-400">No events yet.</p>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
          {events.map((event) => (
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
    </main>
  );
}
