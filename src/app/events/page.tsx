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
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-8">Events</h1>

      {/* Create form */}
      <form action={createEvent} className="flex gap-3 mb-10">
        <input
          type="text"
          name="name"
          placeholder="Event name"
          required
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a5bd7]/30 focus:border-[#2a5bd7]"
        />
        <button
          type="submit"
          className="bg-[#2a5bd7] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#2250c4] transition-colors"
        >
          New Event
        </button>
      </form>

      {/* Events list */}
      {!events?.length ? (
        <p className="text-sm text-gray-400">No events yet. Create one above.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex items-center justify-between py-4 group"
              >
                <span className="text-sm font-medium group-hover:text-[#2a5bd7] transition-colors">
                  {event.name}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(event.created_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
