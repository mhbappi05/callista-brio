import { supabase } from "@/lib/supabaseClient";
import { clearCache } from "@/lib/cache";
import { extensionFor, prepareImage } from "@/lib/imageUpload";

function db() {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

export async function listBanners() {
  const { data, error } = await db()
    .from("home_banners")
    .select("*")
    .order("display_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveBanner(id, values) {
  const q = id
    ? db().from("home_banners").update(values).eq("id", id)
    : db().from("home_banners").insert(values);
  const { data, error } = await q.select("id").single();
  if (error) throw error;
  clearCache();
  return data.id;
}

export async function uploadBannerImage(bannerId, file) {
  const prepared = await prepareImage(file, { maxWidth: 1800 });
  const ext = extensionFor(prepared.type);
  // Path must be <uuid>/<name>.<ext> to satisfy the storage policy.
  const path = `${bannerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db()
    .storage.from("home-banners")
    .upload(path, prepared, {
      contentType: prepared.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw error;
  return path;
}

export async function removeBannerFile(path) {
  if (!path) return;
  const { error } = await db().storage.from("home-banners").remove([path]);
  if (error) console.error(error); // best effort: a leftover file is harmless
}

export async function deleteBanner(banner) {
  const { error } = await db()
    .from("home_banners")
    .delete()
    .eq("id", banner.id);
  if (error) throw error;
  await removeBannerFile(banner.image_path);
  clearCache();
}
