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
const PHONE_KEYS = ["phone", "phonenumber", "phone_number", "mobile", "cell", "telephone", "tel"];

function findColumn(
  headers: string[],
  aliases: string[]
): string | undefined {
  return headers.find((h) =>
    aliases.includes(h.toLowerCase().replace(/[\s_-]/g, ""))
  );
}

export function validateRows(rows: ParsedRow[]): ValidatedRow[] {
  if (!rows.length) return [];

  const headers = Object.keys(rows[0].raw);
  const colFirst = findColumn(headers, FIRST_NAME_KEYS);
  const colLast = findColumn(headers, LAST_NAME_KEYS);
  const colEmail = findColumn(headers, EMAIL_KEYS);
  const colPhone = findColumn(headers, PHONE_KEYS);

  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();

  return rows.map((row) => {
    const firstName = colFirst ? (row.raw[colFirst] ?? "") : "";
    const lastName = colLast ? (row.raw[colLast] ?? "") : "";
    const email = colEmail ? (row.raw[colEmail] ?? "") : "";
    const phone = colPhone ? (row.raw[colPhone] ?? "") : "";

    const issues: RowIssue[] = [];

    if (colFirst !== undefined && !firstName.trim()) {
      issues.push({ field: "First Name", message: "Missing first name" });
    }

    if (colLast !== undefined && !lastName.trim()) {
      issues.push({ field: "Last Name", message: "Missing last name" });
    }

    if (email) {
      if (!EMAIL_RE.test(email)) {
        issues.push({ field: "Email", message: "Invalid email format" });
      } else {
        const key = email.toLowerCase();
        const prev = seenEmails.get(key);
        if (prev !== undefined) {
          issues.push({ field: "Email", message: `Duplicate of row ${prev}` });
        } else {
          seenEmails.set(key, row.index);
        }
      }
    }

    if (phone) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length !== 10) {
        issues.push({
          field: "Phone",
          message: `Invalid phone — got ${digits.length} digits, expected 10`,
        });
      } else {
        const prev = seenPhones.get(digits);
        if (prev !== undefined) {
          issues.push({ field: "Phone", message: `Duplicate of row ${prev}` });
        } else {
          seenPhones.set(digits, row.index);
        }
      }
    }

    return { index: row.index, raw: row.raw, issues, isClean: issues.length === 0 };
  });
}
