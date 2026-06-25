import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createNewTemplate } from "@/app/actions/templates";

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
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-sm font-semibold">Templates</h1>
        <form action={createNewTemplate}>
          <button
            type="submit"
            className="text-sm font-medium bg-[#2a5bd7] text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
          >
            New template
          </button>
        </form>
      </div>

      {!templates?.length ? (
        <p className="text-sm text-zinc-400">No templates yet.</p>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
          {templates.map((t) => {
            const fieldCount = (t.template_fields as { id: string }[]).length;
            return (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors">
                <Link
                  href={`/templates/${t.id}/edit`}
                  className="text-sm font-medium text-zinc-800 hover:text-[#2a5bd7] truncate"
                >
                  {t.name}
                </Link>
                <span className="text-xs text-zinc-400 shrink-0">
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
