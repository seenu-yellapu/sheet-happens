import type { ParsedRow } from "./parse";

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

// Returns ALL columns that look like email fields (email, email1, Parent1 Email, etc.)
function findEmailColumns(headers: string[]): string[] {
  return headers.filter((h) => {
    const n = norm(h);
    return EMAIL_KEYS.includes(n) || EMAIL_PREFIX_RE.test(n) || n.includes("email");
  });
}

// Returns ALL columns that look like phone fields (phone, phone1, Parent1 Mobile Phone, etc.)
function findPhoneColumns(headers: string[]): string[] {
  return headers.filter((h) => {
    const n = norm(h);
    return (
      PHONE_KEYS.includes(n) ||
      PHONE_PREFIX_RE.test(n) ||
      n.includes("phone") ||
      n.includes("mobile") ||
      n.includes("cell")
    );
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
    const firstName = colFirst ? (row.raw[colFirst] ?? "") : "";
    const lastName = colLast ? (row.raw[colLast] ?? "") : "";

    const issues: RowIssue[] = [];

    if (colFirst !== undefined && !firstName.trim()) {
      issues.push({ field: "First Name", message: "Missing first name" });
    }

    if (colLast !== undefined && !lastName.trim()) {
      issues.push({ field: "Last Name", message: "Missing last name" });
    }

    for (const col of colEmails) {
      const email = (row.raw[col] ?? "").trim();
      if (!email) continue;

      const fieldLabel = multiEmail ? col : "Email";

      if (!EMAIL_RE.test(email)) {
        issues.push({ field: fieldLabel, message: "Invalid email format" });
      }

      const key = email.toLowerCase();
      const prev = seenEmails.get(key);
      if (prev !== undefined) {
        issues.push({ field: fieldLabel, message: `Duplicate of row ${prev}` });
      } else {
        seenEmails.set(key, row.index);
      }
    }

    for (const col of colPhones) {
      const phone = (row.raw[col] ?? "").trim();
      if (!phone) continue;

      const digits = phone.replace(/\D/g, "");
      const fieldLabel = multiPhone ? col : "Phone";

      if (digits.length !== 10) {
        issues.push({
          field: fieldLabel,
          message: `Invalid phone — got ${digits.length} digit${digits.length === 1 ? "" : "s"}, expected 10`,
        });
      }

      if (digits.length > 0) {
        const prev = seenPhones.get(digits);
        if (prev !== undefined) {
          issues.push({ field: fieldLabel, message: `Duplicate of row ${prev}` });
        } else {
          seenPhones.set(digits, row.index);
        }
      }
    }

    return { index: row.index, raw: row.raw, issues, isClean: issues.length === 0 };
  });
}
