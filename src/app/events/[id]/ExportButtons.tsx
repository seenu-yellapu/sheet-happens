"use client";

import { useState } from "react";

const PLATFORMS = [
  { value: "captura",  label: "Captura"  },
  { value: "gotphoto", label: "GotPhoto" },
  { value: "photoday", label: "PhotoDay" },
];

interface Props {
  fileId: string;
  hasValidation: boolean;
  cleanCount: number;
  flaggedCount: number;
}

export default function ExportButtons({ fileId, hasValidation, cleanCount, flaggedCount }: Props) {
  const [platform, setPlatform] = useState("captura");

  const canClean   = hasValidation && cleanCount > 0;
  const canFlagged = hasValidation && flaggedCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2.5">
      {/* Clean rows — always rendered, disabled when no data */}
      <div className="flex items-center gap-1">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          disabled={!canClean}
          className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-600
                     focus:outline-none focus:ring-1 focus:ring-[#2a5bd7]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {canClean ? (
          <a
            href={`/api/files/${fileId}/export?type=clean&platform=${platform}`}
            download
            className="text-xs px-3 py-1.5 rounded-md border border-[#2a5bd7] text-[#2a5bd7]
                       hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            Clean Rows ({cleanCount})
          </a>
        ) : (
          <span className="text-xs px-3 py-1.5 rounded-md border border-gray-100 text-gray-300
                           whitespace-nowrap cursor-not-allowed select-none">
            Clean Rows
          </span>
        )}
      </div>

      {/* Flagged rows */}
      {canFlagged ? (
        <a
          href={`/api/files/${fileId}/export?type=flagged`}
          download
          className="text-xs px-3 py-1.5 rounded-md border border-orange-300 text-orange-600
                     hover:bg-orange-50 transition-colors whitespace-nowrap"
        >
          Flagged Rows ({flaggedCount})
        </a>
      ) : (
        <span className="text-xs px-3 py-1.5 rounded-md border border-gray-100 text-gray-300
                         whitespace-nowrap cursor-not-allowed select-none">
          Flagged Rows
        </span>
      )}

      {/* Original file — always active */}
      <a
        href={`/api/files/${fileId}/download`}
        className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600
                   hover:bg-gray-50 transition-colors whitespace-nowrap"
      >
        Original File
      </a>
    </div>
  );
}
