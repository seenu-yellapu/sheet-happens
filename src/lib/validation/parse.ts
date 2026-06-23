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

async function parsePDF(buffer: Buffer): Promise<ParsedRow[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (
      buf: Buffer
    ) => Promise<{ text: string }>;
    const pdf = await pdfParse(buffer);
    const lines = pdf.text
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const header = lines[0] as string;
    const delim = header.includes("\t") ? "\t" : header.includes(",") ? "," : "|";
    const headers = header.split(delim).map((h: string) => h.trim());

    return lines.slice(1).map((line: string, i: number) => {
      const values = line.split(delim).map((v: string) => v.trim());
      const raw: Record<string, string> = {};
      headers.forEach((h: string, j: number) => {
        raw[h] = values[j] ?? "";
      });
      return { index: i + 1, raw };
    });
  } catch {
    return [];
  }
}
