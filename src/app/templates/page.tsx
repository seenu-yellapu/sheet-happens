import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createNewTemplate } from "@/app/actions/templates";
import { Button } from "@/components/ui/button";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, created_at, template_fields(id)")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Templates</h1>
        <form action={createNewTemplate}>
          <Button type="submit" size="sm">New template</Button>
        </form>
      </div>

      {!templates?.length ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <p className="text-base font-medium mb-1.5">No templates yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Create one to define what your output looks like
          </p>
          <form action={createNewTemplate}>
            <Button type="submit" size="sm">New template</Button>
          </form>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {templates.map((t) => {
            const fieldCount = (t.template_fields as { id: string }[]).length;
            return (
              <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors">
                <Link
                  href={`/templates/${t.id}/edit`}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {t.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
