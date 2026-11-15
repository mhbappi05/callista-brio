import { supabase } from "@/lib/supabaseClient";

function db() {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

export async function listMessages(status) {
  const { data, error } = await db()
    .from("contact_messages")
    .select("id, name, email, subject, message, status, staff_note, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function updateMessage(id, values) {
  const { error } = await db()
    .from("contact_messages")
    .update(values)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMessage(id) {
  const { error } = await db().from("contact_messages").delete().eq("id", id);
  if (error) throw error;
}

export async function countNewMessages() {
  const { count, error } = await db()
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}
