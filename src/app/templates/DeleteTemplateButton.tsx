"use client";

import { deleteTemplate } from "@/app/actions/templates";
import { useTransition } from "react";

export default function DeleteTemplateButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${templateName}"?`)) return;
    startTransition(() => deleteTemplate(templateId));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40 transition-colors"
      title="Delete"
    >
      Delete
    </button>
  );
}
