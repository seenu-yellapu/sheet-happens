import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedRow {
  index: number;
  raw: Record<string, string>;
}

export interface ParseResult {
  rows: ParsedRow[];
  metadata: Record<string, string>;
}

export async function parseFile(
  buffer: Buffer,
  fileName: string
): Promise<ParseResult> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(buffer);
  if (ext === "xlsx" || ext === "xls") return parseExcel(buffer);
  if (ext === "pdf") return parsePDF(buffer);
  throw new Error(`Unsupported file type: ${ext}`);
}

function normalizeRow(raw: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k.trim(), String(v ?? "").trim()])
  );
}

const HEADER_KEYWORD_RE =
  /\b(name|email|phone|mobile|first|last|address|room|id|grade|class|contact)\b/i;

const KNOWN_LABEL_RE =
  /^(campus|principal|fy|fiscal ?year|calendar|year|school|grade|room|date|district|report)\s*:?$/i;

function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const meaningful = rows[i].filter((v) => v && !v.startsWith("__EMPTY"));
    if (meaningful.length >= 2 && meaningful.some((v) => HEADER_KEYWORD_RE.test(v))) {
      return i;
    }
  }
  return 0;
}

function extractMetadata(rows: string[][], headerIdx: number): Record<string, string> {
  const meta: Record<string, string> = {};
  for (let i = 0; i < headerIdx; i++) {
    const row = rows[i].map((v) => String(v ?? "").trim());

    // Pattern 1: "Key: Value" in the same cell
    for (const cell of row) {
      const colonAt = cell.indexOf(": ");
      if (colonAt > 0) {
        const label = cell.slice(0, colonAt).trim();
        const value = cell.slice(colonAt + 2).trim();
        if (label && value && !meta[label]) meta[label] = value;
      }
    }

    // Pattern 2: "Key:" in one cell, value in the adjacent cell
    for (let j = 0; j < row.length - 1; j++) {
      const cell = row[j];
      const next = row[j + 1];
      if (!cell || !next) continue;
      const isLabel = cell.endsWith(":") || KNOWN_LABEL_RE.test(cell);
      if (isLabel) {
        const label = cell.replace(/:$/, "").trim();
        if (label && !meta[label]) meta[label] = next;
      }
    }
  }
  return meta;
}

// ── CSV ────────────────────────────────────────────────────────────────────────

function parseCSV(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8");
  const { data: rawRows } = Papa.parse<string[]>(text, { skipEmptyLines: true });
  if (rawRows.length < 2) return { rows: [], metadata: {} };

  const headerIdx = findHeaderRowIndex(rawRows);
  const metadata = extractMetadata(rawRows, headerIdx);
  const headers = rawRows[headerIdx].map((h) => h.trim());

  const rows = rawRows
    .slice(headerIdx + 1)
    .filter((row) => row.some((v) => v.trim()))
    .map((values, i) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, j) => {
        if (h) raw[h] = (values[j] ?? "").trim();
      });
      return { index: i + 1, raw };
    });

  return { rows, metadata };
}

// ── Excel ──────────────────────────────────────────────────────────────────────

function parseExcel(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw2d = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  }) as string[][];

  if (isClassRoster(raw2d)) return parseClassRoster(raw2d);

  const headerIdx = findHeaderRowIndex(raw2d);
  const metadata = extractMetadata(raw2d, headerIdx);
  const headers = raw2d[headerIdx].map((v) => String(v ?? "").trim());

  const rows = raw2d
    .slice(headerIdx + 1)
    .filter((row) => row.some((v) => String(v).trim()))
    .map((row, i) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, j) => {
        if (h) raw[h] = String(row[j] ?? "").trim();
      });
      return { index: i + 1, raw };
    });

  return { rows, metadata };
}

// ── Class-roster Excel ─────────────────────────────────────────────────────────

function isClassRoster(rows: string[][]): boolean {
  return rows
    .slice(0, 15)
    .some((r) => r[0] === "Course" && r[3] === "Section" && r[4] === "Teacher Name");
}

function parseNameLastFirst(raw: string): { first: string; last: string } {
  const comma = raw.indexOf(", ");
  if (comma === -1) return { first: "", last: raw.trim() };
  return { last: raw.slice(0, comma).trim(), first: raw.slice(comma + 2).trim() };
}

function parseClassRoster(rows: string[][]): ParseResult {
  // Extract metadata from rows before the first "Course" header
  const firstCourseIdx = rows.findIndex(
    (r) => r[0] === "Course" && r[4] === "Teacher Name"
  );
  const metadata = extractMetadata(rows, firstCourseIdx >= 0 ? firstCourseIdx : 0);

  const out: ParsedRow[] = [];
  let idx = 1;
  let teacher = "";
  let homeroom = "";
  let inStudents = false;
  let skipNext = false;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].map((v) => String(v ?? "").trim());

    if (skipNext) {
      skipNext = false;
      continue;
    }

    if (r[0] === "Course" && r[4] === "Teacher Name") {
      inStudents = false;
      skipNext = true;
      if (i + 1 < rows.length) {
        const s = rows[i + 1].map((v) => String(v ?? "").trim());
        homeroom = s[0];
        const t = parseNameLastFirst(s[4]);
        const firstName = t.first.replace(/\s+[A-Z]\s*$/, "").trim();
        teacher = firstName ? `${firstName} ${t.last}` : t.last;
      }
      continue;
    }

    if (r[0] === "Student Name") {
      inStudents = true;
      continue;
    }
    if (!r[0]) {
      inStudents = false;
      continue;
    }
    if (!inStudents) continue;

    const { first, last } = parseNameLastFirst(r[0]);
    out.push({
      index: idx++,
      raw: {
        "First Name": first,
        "Last Name": last,
        "Student ID": r[2],
        Grade: r[5],
        Teacher: teacher,
        Homeroom: homeroom,
      },
    });
  }

  return { rows: out, metadata };
}

// ── PDF ────────────────────────────────────────────────────────────────────────

type PdfjsTextItem = {
  str: string;
  transform: number[];
};

async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;

    type PositionedItem = { text: string; x: number; y: number };
    const allItems: PositionedItem[] = [];

    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      for (const item of content.items as PdfjsTextItem[]) {
        const text = item.str.trim();
        if (!text) continue;
        const x = item.transform[4];
        const y = viewport.height - item.transform[5];
        allItems.push({ text, x, y });
      }
    }

    if (!allItems.length) return { rows: [], metadata: {} };

    const ROW_TOLERANCE = 4;
    const rowMap = new Map<number, PositionedItem[]>();
    for (const item of allItems) {
      let key: number | undefined;
      for (const k of rowMap.keys()) {
        if (Math.abs(item.y - k) <= ROW_TOLERANCE) {
          key = k;
          break;
        }
      }
      if (key === undefined) {
        key = item.y;
        rowMap.set(key, []);
      }
      rowMap.get(key)!.push(item);
    }

    const sortedRows = Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, items]) => items.sort((a, b) => a.x - b.x));

    if (sortedRows.length < 2) return { rows: [], metadata: {} };

    const headerItems = sortedRows[0];
    const headers = headerItems.map((it) => it.text);
    const headerXs = headerItems.map((it) => it.x);

    const rows = sortedRows.slice(1).map((rowItems, i) => {
      const raw: Record<string, string> = Object.fromEntries(
        headers.map((h) => [h, ""])
      );
      for (const item of rowItems) {
        let nearest = 0;
        let minDist = Math.abs(item.x - headerXs[0]);
        for (let j = 1; j < headerXs.length; j++) {
          const d = Math.abs(item.x - headerXs[j]);
          if (d < minDist) {
            minDist = d;
            nearest = j;
          }
        }
        const col = headers[nearest];
        raw[col] = raw[col] ? raw[col] + " " + item.text : item.text;
      }
      return { index: i + 1, raw };
    });

    return { rows, metadata: {} };
  } catch (err) {
    console.error("PDF parse error:", err);
    return { rows: [], metadata: {} };
  }
}
