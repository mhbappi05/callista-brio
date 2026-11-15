import { supabase } from "@/lib/supabaseClient";
import { extensionFor, prepareImage } from "@/lib/imageUpload";

function db() {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

const clean = (s) =>
  String(s ?? "")
    .replace(/[%,()*\\"]/g, " ")
    .trim();
const TAXONOMY = ["categories", "collections"];

async function uploadTo(bucket, ownerId, file) {
  const prepared = await prepareImage(file); // resizes to 1800px WebP; throws FILE_TYPE / FILE_SIZE
  const ext = extensionFor(prepared.type);
  // Path must be <uuid>/<name>.<ext> to satisfy the storage policy.
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(bucket).upload(path, prepared, {
    contentType: prepared.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

// ------------------------------------------------------------------ products
export async function listProducts({ q = "", status = "" } = {}) {
  let query = db()
    .from("products")
    .select(
      `
      id, name, slug, price, discount_price, has_variants, stock_quantity, low_stock_threshold,
      is_active, is_featured, category:categories(name),
      variants:product_variants(stock_quantity, is_active)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  const term = clean(q);
  if (term) {
    const p = `"%${term}%"`;
    query = query.or(`name.ilike.${p},sku.ilike.${p}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getProduct(id) {
  const { data, error } = await db()
    .from("products")
    .select("*, images:product_images(*), variants:product_variants(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProduct(id, values) {
  const q = id
    ? db().from("products").update(values).eq("id", id)
    : db().from("products").insert(values);
  const { data, error } = await q.select("id").single();
  if (error) throw error;
  return data.id;
}

export async function setProductActive(id, active) {
  const { error } = await db()
    .from("products")
    .update({ is_active: active })
    .eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------------- stock
export async function adjustStock({
  productId,
  variantId = null,
  change,
  reason,
  note,
}) {
  const { data, error } = await db().rpc("admin_adjust_stock", {
    p_product_id: productId,
    p_variant_id: variantId,
    p_change: change,
    p_reason: reason,
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}

export async function listInventoryLogs(productId) {
  const { data, error } = await db()
    .from("inventory_logs")
    .select("id, variant_id, quantity_change, reason, note, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(15);
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------- variants
export async function saveVariant(id, values) {
  const q = id
    ? db().from("product_variants").update(values).eq("id", id)
    : db().from("product_variants").insert(values);
  const { data, error } = await q.select("id").single();
  if (error) throw error;
  return data.id;
}

// ------------------------------------------------------------------ images
export async function uploadProductImage(
  productId,
  file,
  altText,
  displayOrder,
  makePrimary,
) {
  const path = await uploadTo("product-images", productId, file);
  try {
    if (makePrimary) {
      const reset = await db()
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);
      if (reset.error) throw reset.error;
    }
    const { error } = await db().from("product_images").insert({
      product_id: productId,
      storage_path: path,
      alt_text: altText,
      display_order: displayOrder,
      is_primary: makePrimary,
    });
    if (error) throw error;
  } catch (err) {
    await db().storage.from("product-images").remove([path]);
    throw err;
  }
}

export async function setPrimaryImage(productId, imageId) {
  const reset = await db()
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);
  if (reset.error) throw reset.error;
  const { error } = await db()
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId);
  if (error) throw error;
}

export async function updateImageAlt(imageId, altText) {
  const { error } = await db()
    .from("product_images")
    .update({ alt_text: altText })
    .eq("id", imageId);
  if (error) throw error;
}

export async function reorderProductImages(productId, ids) {
  const { error } = await db().rpc("admin_reorder_product_images", {
    p_product_id: productId,
    p_ids: ids,
  });
  if (error) throw error;
}

export async function deleteReviewImage(image) {
  const { error } = await db()
    .from("review_images")
    .delete()
    .eq("id", image.id);
  if (error) throw error;
  await db().storage.from("review-images").remove([image.storage_path]); // best effort
}

export async function deleteProductImage(image) {
  const { error } = await db()
    .from("product_images")
    .delete()
    .eq("id", image.id);
  if (error) throw error;
  await db().storage.from("product-images").remove([image.storage_path]);
  if (image.is_primary) {
    const { data } = await db()
      .from("product_images")
      .select("id")
      .eq("product_id", image.product_id)
      .order("display_order")
      .limit(1);
    if (data?.[0])
      await db()
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", data[0].id);
  }
}

// ---------------------------------------------- categories and collections
function assertTable(table) {
  if (!TAXONOMY.includes(table)) throw new Error("invalid table");
}

export async function listTaxonomy(table) {
  assertTable(table);
  const { data, error } = await db()
    .from(table)
    .select("*")
    .order("display_order")
    .order("name");
  if (error) throw error;
  return data;
}

export async function saveTaxonomy(table, id, values) {
  assertTable(table);
  const q = id
    ? db().from(table).update(values).eq("id", id)
    : db().from(table).insert(values);
  const { data, error } = await q.select("id").single();
  if (error) throw error;
  return data.id;
}

export const uploadBanner = (collectionId, file) =>
  uploadTo("collection-banners", collectionId, file);

// ----------------------------------------------------------------- reviews
export async function listReviews(status) {
  const { data, error } = await db()
    .from("reviews")
    .select(
      `
        id, rating, title, comment, status, is_verified_purchase, created_at,
        product:products(name, slug), reviewer:profiles(full_name),
        images:review_images(id, storage_path)
      `,
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function moderateReview(id, status) {
  const { error } = await db().from("reviews").update({ status }).eq("id", id);
  if (error) throw error;
}

// --------------------------------------------------------------- dashboard
export async function catalogCounts() {
  const [reviews, products] = await Promise.all([
    db()
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db()
      .from("products")
      .select(
        "id, name, stock_quantity, low_stock_threshold, has_variants, variants:product_variants(name, stock_quantity, is_active)",
      )
      .eq("is_active", true)
      .limit(500),
  ]);
  if (reviews.error) throw reviews.error;
  if (products.error) throw products.error;

  const lowStock = [];
  for (const p of products.data) {
    if (p.has_variants) {
      for (const v of p.variants.filter((x) => x.is_active)) {
        if (v.stock_quantity <= p.low_stock_threshold) {
          lowStock.push({
            id: p.id,
            name: `${p.name} (${v.name})`,
            stock: v.stock_quantity,
          });
        }
      }
    } else if (p.stock_quantity <= p.low_stock_threshold) {
      lowStock.push({ id: p.id, name: p.name, stock: p.stock_quantity });
    }
  }
  lowStock.sort((a, b) => a.stock - b.stock);
  return { pendingReviews: reviews.count ?? 0, lowStock };
}
