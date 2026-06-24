"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TemplateFieldRules } from "@/lib/validation/types";

export interface FieldPayload {
  id: string;
  name: string;
  position: number;
  isNew: boolean;
  rules: TemplateFieldRules;
}

export async function createNewTemplate() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: template } = await supabase
    .from("templates")
    .insert({ user_id: user.id, name: "Untitled" })
    .select("id")
    .single();

  if (!template) redirect("/templates");
  redirect(`/templates/${template.id}/edit`);
}

export async function saveTemplate(
  templateId: string,
  name: string,
  fields: FieldPayload[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  await supabase.from("templates").update({ name }).eq("id", templateId);

  // Find fields to delete (exist in DB but not in the current save)
  const { data: existing } = await supabase
    .from("template_fields")
    .select("id")
    .eq("template_id", templateId);

  const keepIds = new Set(fields.filter((f) => !f.isNew).map((f) => f.id));
  const deleteIds = (existing ?? []).map((f) => f.id).filter((id) => !keepIds.has(id));
  if (deleteIds.length) {
    await supabase.from("template_fields").delete().in("id", deleteIds);
  }

  for (const field of fields) {
    let fieldId = field.id;

    if (field.isNew) {
      const { data: inserted } = await supabase
        .from("template_fields")
        .insert({ template_id: templateId, name: field.name, position: field.position })
        .select("id")
        .single();
      if (!inserted) continue;
      fieldId = inserted.id;
    } else {
      await supabase
        .from("template_fields")
        .update({ name: field.name, position: field.position })
        .eq("id", fieldId);
    }

    await supabase.from("template_field_rules").upsert(
      [
        { field_id: fieldId, rule_type: "type",            enabled: true,                  value: field.rules.type },
        { field_id: fieldId, rule_type: "required",        enabled: field.rules.required,  value: null },
        { field_id: fieldId, rule_type: "valid_format",    enabled: field.rules.validFormat, value: null },
        { field_id: fieldId, rule_type: "flag_duplicates", enabled: field.rules.flagDuplicates, value: null },
        { field_id: fieldId, rule_type: "min_digits",      enabled: field.rules.minDigits, value: null },
      ],
      { onConflict: "field_id,rule_type" }
    );
  }

  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}/edit`);
  return { ok: true };
}

export async function duplicateTemplate(templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: original } = await supabase
    .from("templates")
    .select("name, template_fields(id, name, position, template_field_rules(rule_type, enabled, value))")
    .eq("id", templateId)
    .single();

  if (!original) return;

  const { data: copy } = await supabase
    .from("templates")
    .insert({ user_id: user.id, name: `${original.name} (copy)` })
    .select("id")
    .single();

  if (!copy) return;

  for (const f of (original.template_fields as any[])) {
    const { data: field } = await supabase
      .from("template_fields")
      .insert({ template_id: copy.id, name: f.name, position: f.position })
      .select("id")
      .single();

    if (!field) continue;
    const rules = (f.template_field_rules as any[]).map((r: any) => ({
      field_id: field.id,
      rule_type: r.rule_type,
      enabled: r.enabled,
      value: r.value ?? null,
    }));
    if (rules.length) await supabase.from("template_field_rules").insert(rules);
  }

  revalidatePath("/templates");
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient();
  await supabase.from("templates").delete().eq("id", templateId);
  revalidatePath("/templates");
}
