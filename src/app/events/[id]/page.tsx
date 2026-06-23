import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FileUpload from "./FileUpload";

interface Props {
  params: Promise<{ id: string }>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: files }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, created_at")
      .eq("id", id)
      .single(),
    supabase
      .from("event_files")
      .select("id, name, size, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
  ]);

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
        Created{" "}
        {new Date(event.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <FileUpload eventId={id} />

      {/* File list */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Uploaded Files
        </h2>

        {!files?.length ? (
          <p className="text-sm text-gray-400">No files uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatBytes(file.size)} ·{" "}
                    {new Date(file.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <a
                  href={`/api/files/${file.id}/download`}
                  className="ml-4 text-sm text-[#2a5bd7] hover:underline shrink-0"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
