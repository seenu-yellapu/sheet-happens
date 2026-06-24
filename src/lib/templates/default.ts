import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_FIELDS = [
  { name: "First name", position: 0, type: "text",  required: true,  validFormat: false, flagDuplicates: false, minDigits: false },
  { name: "Last name",  position: 1, type: "text",  required: true,  validFormat: false, flagDuplicates: false, minDigits: false },
  { name: "Email",      position: 2, type: "email", required: true,  validFormat: true,  flagDuplicates: true,  minDigits: false },
  { name: "Phone",      position: 3, type: "phone", required: false, validFormat: true,  flagDuplicates: true,  minDigits: true  },
  { name: "Homeroom",   position: 4, type: "text",  required: false, validFormat: false, flagDuplicates: false, minDigits: false },
] as const;

export async function ensureDefaultTemplate(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase
    .from("templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  const { data: template } = await supabase
    .from("templates")
    .insert({ user_id: userId, name: "Default" })
    .select("id")
    .single();

  if (!template) return;

  for (const f of DEFAULT_FIELDS) {
    const { data: field } = await supabase
      .from("template_fields")
      .insert({ template_id: template.id, name: f.name, position: f.position })
      .select("id")
      .single();

    if (!field) continue;

    await supabase.from("template_field_rules").insert([
      { field_id: field.id, rule_type: "type",             enabled: true,          value: f.type },
      { field_id: field.id, rule_type: "required",         enabled: f.required,    value: null   },
      { field_id: field.id, rule_type: "valid_format",     enabled: f.validFormat, value: null   },
      { field_id: field.id, rule_type: "flag_duplicates",  enabled: f.flagDuplicates, value: null },
      { field_id: field.id, rule_type: "min_digits",       enabled: f.minDigits,   value: null   },
    ]);
  }
}
