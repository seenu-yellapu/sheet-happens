import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedRow {
  index: number;
  raw: Record<string, string>;
}

export async function parseFile(
  buffer: Buffer,
  fileName: string
): Promise<ParsedRow[]> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(buffer);
  if (ext === "xlsx" || ext === "xls") return parseExcel(buffer);
  if (ext === "pdf") return parsePDF(buffer);
  throw new Error(`Unsupported file type: ${ext}`);
}

function normalizeRow(
  raw: Record<string, unknown>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k.trim(), String(v ?? "").trim()])
  );
}

// Matches common column-name keywords; used to find the real header row
// when files have metadata rows at the top (e.g. exported school reports).
const HEADER_KEYWORD_RE =
  /\b(name|email|phone|mobile|first|last|address|room|id|grade|class|contact)\b/i;

function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const meaningful = rows[i].filter((v) => v && !v.startsWith("__EMPTY"));
    if (meaningful.length >= 2 && meaningful.some((v) => HEADER_KEYWORD_RE.test(v))) {
      return i;
    }
  }
  return 0;
}

function parseCSV(buffer: Buffer): ParsedRow[] {
  const text = buffer.toString("utf-8");

  // Parse without headers first to detect metadata rows
  const { data: rawRows } = Papa.parse<string[]>(text, { skipEmptyLines: true });
  if (rawRows.length < 2) return [];

  const headerIdx = findHeaderRowIndex(rawRows);
  const headers = rawRows[headerIdx].map((h) => h.trim());

  return rawRows
    .slice(headerIdx + 1)
    .filter((row) => row.some((v) => v.trim()))
    .map((values, i) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, j) => {
        if (h) raw[h] = (values[j] ?? "").trim();
      });
      return { index: i + 1, raw };
    });
}

function parseExcel(buffer: Buffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw2d = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];

  if (isClassRoster(raw2d)) return parseClassRoster(raw2d);

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return data.map((row, i) => ({ index: i + 1, raw: normalizeRow(row) }));
}

function isClassRoster(rows: string[][]): boolean {
  return rows.slice(0, 15).some(
    (r) => r[0] === "Course" && r[3] === "Section" && r[4] === "Teacher Name"
  );
}

function parseNameLastFirst(raw: string): { first: string; last: string } {
  const comma = raw.indexOf(", ");
  if (comma === -1) return { first: "", last: raw.trim() };
  return { last: raw.slice(0, comma).trim(), first: raw.slice(comma + 2).trim() };
}

function parseClassRoster(rows: string[][]): ParsedRow[] {
  const out: ParsedRow[] = [];
  let idx = 1;
  let teacher = "";
  let homeroom = "";
  let inStudents = false;
  let skipNext = false;

  for (const row of rows) {
    const r = row.map((v) => String(v ?? "").trim());

    if (skipNext) { skipNext = false; continue; }

    // Section header labels row — next row is the section data
    if (r[0] === "Course" && r[4] === "Teacher Name") {
      inStudents = false;
      skipNext = true; // will process it on peek below
      // Peek at next row for section info
      const nextIdx = rows.indexOf(row) + 1;
      if (nextIdx < rows.length) {
        const s = rows[nextIdx].map((v) => String(v ?? "").trim());
        homeroom = s[0];
        const t = parseNameLastFirst(s[4]);
        // Drop middle initial (single letter followed by space or end)
        const firstName = t.first.replace(/\s+[A-Z]\s*$/, "").trim();
        teacher = firstName ? `${firstName} ${t.last}` : t.last;
      }
      continue;
    }

    if (r[0] === "Student Name") { inStudents = true; continue; }
    if (!r[0]) { inStudents = false; continue; }
    if (!inStudents) continue;

    const { first, last } = parseNameLastFirst(r[0]);
    out.push({
      index: idx++,
      raw: {
        "First Name": first,
        "Last Name":  last,
        "Student ID": r[2],
        "Grade":      r[5],
        "Teacher":    teacher,
        "Homeroom":   homeroom,
      },
    });
  }

  return out;
}

type PdfjsTextItem = {
  str: string;
  transform: number[];
};

async function parsePDF(buffer: Buffer): Promise<ParsedRow[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;

    // Collect all text items with their x/y positions across all pages
    type PositionedItem = { text: string; x: number; y: number };
    const allItems: PositionedItem[] = [];

    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      for (const item of content.items as PdfjsTextItem[]) {
        const text = item.str.trim();
        if (!text) continue;
        // PDF y is from the bottom; flip to get top-down order
        const x = item.transform[4];
        const y = viewport.height - item.transform[5];
        allItems.push({ text, x, y });
      }
    }

    if (!allItems.length) return [];

    // Group items into rows by approximate y-coordinate (±4 pt tolerance)
    const ROW_TOLERANCE = 4;
    const rowMap = new Map<number, PositionedItem[]>();
    for (const item of allItems) {
      let key: number | undefined;
      for (const k of rowMap.keys()) {
        if (Math.abs(item.y - k) <= ROW_TOLERANCE) { key = k; break; }
      }
      if (key === undefined) { key = item.y; rowMap.set(key, []); }
      rowMap.get(key)!.push(item);
    }

    // Sort rows top-to-bottom; sort items within each row left-to-right
    const sortedRows = Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, items]) => items.sort((a, b) => a.x - b.x));

    if (sortedRows.length < 2) return [];

    // First row = headers
    const headerItems = sortedRows[0];
    const headers = headerItems.map((it) => it.text);
    const headerXs = headerItems.map((it) => it.x);

    // Map each data-row item to its nearest header column by x-position
    return sortedRows.slice(1).map((rowItems, i) => {
      const raw: Record<string, string> = Object.fromEntries(headers.map((h) => [h, ""]));
      for (const item of rowItems) {
        let nearest = 0;
        let minDist = Math.abs(item.x - headerXs[0]);
        for (let j = 1; j < headerXs.length; j++) {
          const d = Math.abs(item.x - headerXs[j]);
          if (d < minDist) { minDist = d; nearest = j; }
        }
        const col = headers[nearest];
        raw[col] = raw[col] ? raw[col] + " " + item.text : item.text;
      }
      return { index: i + 1, raw };
    });
  } catch (err) {
    console.error("PDF parse error:", err);
    return [];
  }
}
