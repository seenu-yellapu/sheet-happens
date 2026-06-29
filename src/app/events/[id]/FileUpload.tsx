"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

const ACCEPT = ".csv,.xlsx,.xls,.pdf";

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
    <div>
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
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
        } ${uploading ? "pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dragging ? "bg-primary/10" : "bg-muted"}`}>
            <Upload className={`w-5 h-5 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          {uploading ? (
            <p className="text-sm text-muted-foreground">Uploading…</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                Drop a file or{" "}
                <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">CSV · Excel · PDF</p>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
