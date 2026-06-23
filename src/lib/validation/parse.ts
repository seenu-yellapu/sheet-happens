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

function parseCSV(buffer: Buffer): ParsedRow[] {
  const result = Papa.parse<Record<string, string>>(
    buffer.toString("utf-8"),
    { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() }
  );
  return result.data.map((row, i) => ({
    index: i + 1,
    raw: normalizeRow(row),
  }));
}

function parseExcel(buffer: Buffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  return data.map((row, i) => ({ index: i + 1, raw: normalizeRow(row) }));
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
