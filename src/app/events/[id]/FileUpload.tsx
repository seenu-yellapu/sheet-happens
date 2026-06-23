"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACCEPT = ".csv,.xlsx,.xls,.pdf";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({ eventId }: { eventId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/events/${eventId}/upload`, {
      method: "POST",
      body: formData,
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Upload failed");
    } else {
      router.refresh();
    }

    setUploading(false);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    upload(files[0]);
  }

  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
        Upload Files
      </h2>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-[#2a5bd7] bg-[#2a5bd7]/5"
            : "border-gray-200 hover:border-[#2a5bd7]/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploading ? (
          <p className="text-sm text-gray-400">Uploading…</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">
              Drag & drop or{" "}
              <span className="text-[#2a5bd7]">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">CSV, Excel, PDF</p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
