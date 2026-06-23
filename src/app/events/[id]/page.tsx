import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, created_at")
    .eq("id", id)
    .single();

  if (!event) notFound();

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <Link
        href="/events"
        className="text-sm text-[#2a5bd7] hover:underline mb-8 inline-block"
      >
        ← All events
      </Link>

      <h1 className="text-3xl font-semibold mt-4">{event.name}</h1>
      <p className="text-sm text-gray-400 mt-2">
        Created {new Date(event.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </main>
  );
}
