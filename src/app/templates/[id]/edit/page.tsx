import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "../TemplateEditor";
import type { TemplateFieldRules, FieldType } from "@/lib/validation/types";

interface Props {
  params: Promise<{ id: string }>;
}

function parseRules(
  dbRules: Array<{ rule_type: string; enabled: boolean; value: string | null }>
): TemplateFieldRules {
  const m = new Map(dbRules.map((r) => [r.rule_type, r]));
  return {
    type:           (m.get("type")?.value ?? "text") as FieldType,
    required:       m.get("required")?.enabled ?? false,
    validFormat:    m.get("valid_format")?.enabled ?? false,
    flagDuplicates: m.get("flag_duplicates")?.enabled ?? false,
    minDigits:      m.get("min_digits")?.enabled ?? false,
  };
}

export default async function EditTemplatePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("templates")
    .select("id, name, template_fields(id, name, position, template_field_rules(rule_type, enabled, value))")
    .eq("id", id)
    .single();

  if (!template) notFound();

  const fields = ((template.template_fields as any[]) ?? [])
    .sort((a: any, b: any) => a.position - b.position)
    .map((f: any) => ({
      id: f.id as string,
      name: f.name as string,
      position: f.position as number,
      isNew: false,
      rules: parseRules(f.template_field_rules ?? []),
    }));

  return (
    <TemplateEditor
      templateId={template.id}
      initialName={template.name}
      initialFields={fields}
    />
  );
}
