"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createEvent(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("events")
    .insert({ name: name.trim(), user_id: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  redirect(`/events/${data.id}`);
}

export async function renameEvent(eventId: string, name: string) {
  if (!name?.trim()) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ name: name.trim() })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();

  // Remove storage objects before deleting the DB rows
  const { data: files } = await supabase
    .from("event_files")
    .select("storage_path")
    .eq("event_id", eventId);

  if (files?.length) {
    await supabase.storage
      .from("uploads")
      .remove(files.map((f) => f.storage_path as string));
  }

  // Deleting the event cascades through event_files → file_validations → validation_rows
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);

  redirect("/events");
}
