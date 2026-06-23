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
  flaggedCount,
  flaggedRows,
}: Props) {
  if (flaggedCount === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-zinc-400 mb-2 px-3">{fileName} — {flaggedCount} flagged</p>
      <div className="space-y-0.5">
        {flaggedRows.map((row) => {
          const preview = rowPreview(row.row_data);
          return (
            <div key={row.row_index} className="rounded-lg px-3 py-2.5 hover:bg-zinc-50 transition-colors flex gap-4">
              <span className="text-xs text-zinc-400 w-10 shrink-0 pt-0.5 tabular-nums">
                {row.row_index}
              </span>
              <div className="min-w-0 flex-1">
                {preview && (
                  <p className="text-xs text-zinc-500 mb-0.5 truncate">{preview}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {row.issues.map((issue, i) => (
                    <span key={i} className="text-xs text-red-400">
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
