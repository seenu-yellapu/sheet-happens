import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NewTemplatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: template } = await supabase
    .from("templates")
    .insert({ user_id: user.id, name: "Untitled" })
    .select("id")
    .single();

  redirect(template ? `/templates/${template.id}/edit` : "/templates");
}
