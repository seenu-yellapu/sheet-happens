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
  const key = keys.find((k) => PREVIEW_KEYS.includes(k.toLowerCase())) ?? keys[0];
  return key ? data[key] : "";
}

export default function ValidationReport({
  fileName,
  totalRows,
  cleanCount,
  flaggedCount,
  flaggedRows,
}: Props) {
  if (flaggedCount === 0) return null;

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600 truncate">{fileName}</span>
        <div className="flex items-center gap-3 shrink-0 text-xs ml-4">
          <span className="text-green-600 font-medium">{cleanCount} clean</span>
          <span className="text-amber-600 font-medium">{flaggedCount} flagged</span>
          <span className="text-zinc-400">{totalRows} rows</span>
        </div>
      </div>

      <div className="divide-y divide-zinc-100">
        {flaggedRows.map((row) => {
          const preview = rowPreview(row.row_data);
          return (
            <div key={row.row_index} className="px-4 py-2.5 flex gap-4">
              <span className="text-xs text-zinc-400 w-12 shrink-0 pt-0.5 font-medium">
                Row {row.row_index}
              </span>
              <div className="min-w-0 flex-1">
                {preview && (
                  <p className="text-xs text-zinc-500 mb-1 truncate">{preview}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {row.issues.map((issue, i) => (
                    <span key={i} className="text-xs text-red-500">
                      {issue.field}: {issue.message}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
