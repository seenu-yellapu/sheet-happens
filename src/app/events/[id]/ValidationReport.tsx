interface Issue {
  field: string;
  message: string;
}

interface FlaggedRow {
  row_index: number;
  row_data: Record<string, string>;
  issues: Issue[];
}

interface Props {
  fileName: string;
  totalRows: number;
  cleanCount: number;
  flaggedCount: number;
  flaggedRows: FlaggedRow[];
}

const PREVIEW_KEYS = ["first name", "last name", "firstname", "lastname", "name", "email", "phone"];

function rowPreview(data: Record<string, string>): string {
  const keys = Object.keys(data);
  const previewKey = keys.find((k) => PREVIEW_KEYS.includes(k.toLowerCase()));
  if (previewKey) return data[previewKey];
  const first = keys[0];
  return first ? data[first] : "";
}

export default function ValidationReport({
  fileName,
  totalRows,
  cleanCount,
  flaggedCount,
  flaggedRows,
}: Props) {
  return (
    <div className="mt-8 border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
            Validation Report
          </p>
          <p className="text-sm font-medium truncate max-w-xs">{fileName}</p>
        </div>
        <div className="flex gap-3 text-sm shrink-0">
          <span className="text-emerald-600 font-medium">{cleanCount} clean</span>
          {flaggedCount > 0 && (
            <span className="text-red-500 font-medium">{flaggedCount} flagged</span>
          )}
        </div>
      </div>

      {/* Clean rows */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Clean Rows
        </p>
        {cleanCount === 0 ? (
          <p className="text-sm text-gray-400">No rows passed all checks.</p>
        ) : (
          <p className="text-sm text-gray-600">
            {cleanCount} of {totalRows} row{totalRows !== 1 ? "s" : ""} passed all validation checks.
          </p>
        )}
      </div>

      {/* Flagged rows */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Flagged Rows {flaggedCount > 0 && `(${flaggedCount})`}
        </p>

        {flaggedCount === 0 ? (
          <p className="text-sm text-gray-400">No issues found.</p>
        ) : (
          <ul className="space-y-3">
            {flaggedRows.map((row) => {
              const preview = rowPreview(row.row_data);
              return (
                <li key={row.row_index} className="text-sm">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium">Row {row.row_index}</span>
                    {preview && (
                      <span className="text-gray-400 truncate max-w-[200px]">{preview}</span>
                    )}
                  </div>
                  <ul className="space-y-0.5 ml-3">
                    {row.issues.map((issue, i) => (
                      <li key={i} className="text-red-500">
                        <span className="font-medium">{issue.field}:</span>{" "}
                        <span>{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
