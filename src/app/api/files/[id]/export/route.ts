import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Papa from "papaparse";

// Same normalization and detection as validate.ts
const FIRST_NAME_KEYS = ["firstname", "fname", "givenname", "first"];
const LAST_NAME_KEYS = ["lastname", "lname", "surname", "familyname", "last"];
const EMAIL_KEYS = ["email", "emailaddress", "e-mail"];
const PHONE_KEYS = ["phone", "phonenumber", "mobile", "cell", "telephone", "tel"];
const PHONE_PREFIX_RE = /^(phone|mobile|cell|telephone|tel)\d*$/;

type PlatformMap = { first: string; last: string; email: string; phone: string };

const PLATFORMS: Record<string, PlatformMap> = {
  captura:  { first: "First Name",  last: "Last Name",  email: "Email Address", phone: "Phone Number" },
  gotphoto: { first: "firstname",   last: "lastname",   email: "email",         phone: "phone"        },
  photoday: { first: "First Name",  last: "Last Name",  email: "Email",         phone: "Phone"        },
};

function norm(h: string) {
  return h.toLowerCase().replace(/[\s_-]/g, "");
}

function findCol(headers: string[], aliases: string[], prefixRe?: RegExp): string | undefined {
  return (
    headers.find((h) => aliases.includes(norm(h))) ??
    (prefixRe ? headers.find((h) => prefixRe.test(norm(h))) : undefined)
  );
}

function remapForPlatform(
  row: Record<string, string>,
  map: PlatformMap
): Record<string, string> {
  const headers = Object.keys(row);
  const src = {
    first: findCol(headers, FIRST_NAME_KEYS),
    last:  findCol(headers, LAST_NAME_KEYS),
    email: findCol(headers, EMAIL_KEYS),
    phone: findCol(headers, PHONE_KEYS, PHONE_PREFIX_RE),
  };
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === src.first)  result[map.first] = v;
    else if (k === src.last)  result[map.last] = v;
    else if (k === src.email) result[map.email] = v;
    else if (k === src.phone) result[map.phone] = v;
    else result[k] = v;
  }
  return result;
}

function csvResponse(content: string, fileName: string) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const platform = searchParams.get("platform") ?? "";

  if (type !== "clean" && type !== "flagged") {
    return new Response("type must be clean or flagged", { status: 400 });
  }

  const supabase = await createClient();

  const { data: fileRec } = await supabase
    .from("event_files")
    .select("name, selected_columns, column_mapping, file_validations(id)")
    .eq("id", id)
    .single();

  if (!fileRec) return new Response("Not found", { status: 404 });

  const validations = fileRec.file_validations as { id: string }[];
  const baseName = (fileRec.name as string).replace(/\.[^.]+$/, "");

  if (!validations[0]?.id) {
    return csvResponse("", `${baseName}-${type}.csv`);
  }

  const isClean = type === "clean";
  const { data: rows } = await supabase
    .from("validation_rows")
    .select("row_index, row_data, issues")
    .eq("validation_id", validations[0].id)
    .eq("is_clean", isClean)
    .order("row_index");

  if (!rows?.length) {
    return csvResponse("", `${baseName}-${type}.csv`);
  }

  const platformMap = PLATFORMS[platform];

  // Derive column order from template mapping if present, otherwise fall back to selected_columns
  let colOrder: string[] | undefined;
  const colMapping = fileRec.column_mapping as Array<{ fieldName: string; columns: string[]; combineMode: string }> | null;
  if (colMapping) {
    colOrder = colMapping.flatMap((f) =>
      f.combineMode === "separate" && f.columns.length > 1
        ? f.columns.map((c) => `${f.fieldName} (${c})`)
        : [f.fieldName]
    );
  } else {
    colOrder = (fileRec.selected_columns as string[] | null) ?? undefined;
  }

  let csvData: Record<string, string>[];
  if (isClean) {
    const raw = rows.map((r) => r.row_data as Record<string, string>);
    csvData = platformMap ? raw.map((r) => remapForPlatform(r, platformMap)) : raw;
  } else {
    csvData = rows.map((r) => {
      const issueStr = (r.issues as Array<{ field: string; message: string }>)
        .map((i) => `${i.field}: ${i.message}`)
        .join("; ");
      return { ...(r.row_data as Record<string, string>), Issues: issueStr };
    });
  }

  const suffix = isClean
    ? platform ? `-${platform}-clean` : "-clean"
    : "-flagged";

  // Enforce the user's chosen column order (skipped when platform-remapping changes column names)
  const unparseOpts = colOrder && !platformMap
    ? isClean
      ? { columns: colOrder }
      : { columns: [...colOrder, "Issues"] }
    : {};

  return csvResponse(Papa.unparse(csvData, unparseOpts), `${baseName}${suffix}.csv`);
}
