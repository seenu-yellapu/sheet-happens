import type { ParsedRow } from "./parse";
import type { TemplateField, FieldAssignment } from "./types";

export interface RowIssue {
  field: string;
  message: string;
}

export interface ValidatedRow {
  index: number;
  raw: Record<string, string>;
  issues: RowIssue[];
  isClean: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Legacy (no-template) validation ─────────────────────────────────────────

const FIRST_NAME_KEYS = ["firstname", "fname", "givenname", "first"];
const LAST_NAME_KEYS = ["lastname", "lname", "surname", "familyname", "last"];
const EMAIL_KEYS = ["email", "emailaddress", "email_address", "e-mail"];
const EMAIL_PREFIX_RE = /^(email|emailaddress)\d*$/;
const PHONE_KEYS = ["phone", "phonenumber", "mobile", "cell", "telephone", "tel"];
const PHONE_PREFIX_RE = /^(phone|mobile|cell|telephone|tel)\d*$/;

function norm(h: string) {
  return h.toLowerCase().replace(/[\s_-]/g, "");
}

function findColumn(headers: string[], aliases: string[]): string | undefined {
  return headers.find((h) => aliases.includes(norm(h)));
}

function findEmailColumns(headers: string[]): string[] {
  return headers.filter((h) => {
    const n = norm(h);
    return EMAIL_KEYS.includes(n) || EMAIL_PREFIX_RE.test(n) || n.includes("email");
  });
}

function findPhoneColumns(headers: string[]): string[] {
  return headers.filter((h) => {
    const n = norm(h);
    return PHONE_KEYS.includes(n) || PHONE_PREFIX_RE.test(n) || n.includes("phone") || n.includes("mobile") || n.includes("cell");
  });
}

export function validateRows(rows: ParsedRow[]): ValidatedRow[] {
  if (!rows.length) return [];

  const headers = Object.keys(rows[0].raw);
  const colFirst = findColumn(headers, FIRST_NAME_KEYS);
  const colLast = findColumn(headers, LAST_NAME_KEYS);
  const colEmails = findEmailColumns(headers);
  const colPhones = findPhoneColumns(headers);
  const multiEmail = colEmails.length > 1;
  const multiPhone = colPhones.length > 1;
  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();

  return rows.map((row) => {
    const issues: RowIssue[] = [];

    if (colFirst !== undefined && !(row.raw[colFirst] ?? "").trim()) {
      issues.push({ field: "First Name", message: "Missing first name" });
    }
    if (colLast !== undefined && !(row.raw[colLast] ?? "").trim()) {
      issues.push({ field: "Last Name", message: "Missing last name" });
    }

    for (const col of colEmails) {
      const email = (row.raw[col] ?? "").trim();
      if (!email) continue;
      const label = multiEmail ? col : "Email";
      if (!EMAIL_RE.test(email)) issues.push({ field: label, message: "Invalid email format" });
      const key = email.toLowerCase();
      const prev = seenEmails.get(key);
      if (prev !== undefined) {
        issues.push({ field: label, message: `Duplicate of row ${prev}` });
      } else {
        seenEmails.set(key, row.index);
      }
    }

    for (const col of colPhones) {
      const phone = (row.raw[col] ?? "").trim();
      if (!phone) continue;
      const digits = phone.replace(/\D/g, "");
      const label = multiPhone ? col : "Phone";
      if (digits.length !== 10) {
        issues.push({ field: label, message: `Invalid phone — got ${digits.length} digit${digits.length === 1 ? "" : "s"}, expected 10` });
      }
      if (digits.length > 0) {
        const prev = seenPhones.get(digits);
        if (prev !== undefined) {
          issues.push({ field: label, message: `Duplicate of row ${prev}` });
        } else {
          seenPhones.set(digits, row.index);
        }
      }
    }

    return { index: row.index, raw: row.raw, issues, isClean: issues.length === 0 };
  });
}

// ── Template-based validation ────────────────────────────────────────────────

export function validateRowsWithTemplate(
  rows: ParsedRow[],
  fields: TemplateField[],
  mapping: FieldAssignment[],
  staticValues: Record<string, string> = {},
  fileMetadata: Record<string, string> = {},
): ValidatedRow[] {
  if (!rows.length) return [];

  const seenMaps = new Map<string, Map<string, number>>();
  for (const field of fields) {
    if (field.rules.flagDuplicates) seenMaps.set(field.id, new Map());
  }

  return rows.map((row) => {
    const issues: RowIssue[] = [];
    const outputRow: Record<string, string> = {};

    for (const assignment of mapping) {
      const field = fields.find((f) => f.name === assignment.fieldName);
      if (!field) continue;

      const { rules } = field;

      // Static value — no source column mapped
      if (assignment.columns.length === 0) {
        const staticVal = staticValues[assignment.fieldId] ?? "";
        outputRow[assignment.fieldName] = staticVal;
        if (rules.required && !staticVal) {
          issues.push({ field: assignment.fieldName, message: `Missing ${field.name}` });
        }
        continue;
      }

      const sourceValues = assignment.columns.map((col) => (row.raw[col] ?? fileMetadata[col] ?? "").trim());
      const isSeparate = assignment.combineMode === "separate" && assignment.columns.length > 1;

      if (isSeparate) {
        assignment.columns.forEach((col, i) => {
          outputRow[`${assignment.fieldName} (${col})`] = sourceValues[i];
        });
      } else if (assignment.combineMode === "semicolon") {
        outputRow[assignment.fieldName] = sourceValues.filter(Boolean).join("; ");
      } else if (assignment.combineMode === "comma") {
        outputRow[assignment.fieldName] = sourceValues.filter(Boolean).join(", ");
      } else {
        outputRow[assignment.fieldName] = sourceValues.find((v) => v) ?? sourceValues[0] ?? "";
      }

      if (rules.required && sourceValues.every((v) => !v)) {
        issues.push({ field: assignment.fieldName, message: `Missing ${field.name}` });
        continue;
      }

      const seenMap = seenMaps.get(field.id);

      for (let i = 0; i < sourceValues.length; i++) {
        const value = sourceValues[i];
        if (!value) continue;

        const label = isSeparate
          ? `${assignment.fieldName} (${assignment.columns[i]})`
          : assignment.fieldName;

        if (rules.validFormat) {
          if (rules.type === "email" && !EMAIL_RE.test(value)) {
            issues.push({ field: label, message: "Invalid email format" });
          } else if (rules.type === "phone" && !/\d/.test(value)) {
            issues.push({ field: label, message: "Invalid phone format" });
          }
        }

        if (rules.minDigits && rules.type === "phone") {
          const digits = value.replace(/\D/g, "");
          if (digits.length !== 10) {
            issues.push({
              field: label,
              message: `Invalid phone — got ${digits.length} digit${digits.length === 1 ? "" : "s"}, expected 10`,
            });
          }
        }

        if (seenMap && rules.flagDuplicates) {
          const key =
            rules.type === "phone" ? value.replace(/\D/g, "") : value.toLowerCase();
          if (key) {
            const prev = seenMap.get(key);
            if (prev !== undefined) {
              issues.push({ field: label, message: `Duplicate of row ${prev}` });
            } else {
              seenMap.set(key, row.index);
            }
          }
        }
      }
    }

    return { index: row.index, raw: outputRow, issues, isClean: issues.length === 0 };
  });
}
