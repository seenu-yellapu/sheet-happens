"use client";

interface Props {
  fileId: string;
  hasValidation: boolean;
  cleanCount: number;
  flaggedCount: number;
}

export default function ExportButtons({ fileId, hasValidation, cleanCount, flaggedCount }: Props) {
  const canClean   = hasValidation && cleanCount > 0;
  const canFlagged = hasValidation && flaggedCount > 0;

  return (
    <div className="flex items-center gap-4 mt-2">
      {canClean ? (
        <a
          href={`/api/files/${fileId}/export?type=clean`}
          download
          className="text-xs text-[#2a5bd7] hover:underline"
        >
          ↓ Clean rows ({cleanCount})
        </a>
      ) : (
        <span className="text-xs text-zinc-300">↓ Clean rows</span>
      )}

      {canFlagged ? (
        <a
          href={`/api/files/${fileId}/export?type=flagged`}
          download
          className="text-xs text-amber-600 hover:underline"
        >
          ↓ Flagged rows ({flaggedCount})
        </a>
      ) : (
        <span className="text-xs text-zinc-300">↓ Flagged rows</span>
      )}

      <a
        href={`/api/files/${fileId}/download`}
        className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline transition-colors"
      >
        ↓ Original
      </a>
    </div>
  );
}
