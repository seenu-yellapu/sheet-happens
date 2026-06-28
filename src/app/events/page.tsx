import { createClient } from "@/lib/supabase/server";
import EventsList from "./EventsList";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <EventsList initialEvents={events ?? []} />
    </main>
  );
}
