"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createEvent(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ name: name.trim() })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  redirect(`/events/${data.id}`);
}
