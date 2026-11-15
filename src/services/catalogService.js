import { supabase } from "@/lib/supabaseClient";
import { cached } from "@/lib/cache";

export const PAGE_SIZE = 12;
const TTL = 60_000;

function db() {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export const CARD_SELECT = `
  id, name, slug, price, discount_price, has_variants, stock_quantity,
  low_stock_threshold, is_featured, created_at,
  images:product_images(storage_path, alt_text, is_primary, display_order),
  variants:product_variants(stock_quantity, is_active)
`;

// Filters: { q, category, collection, material, minPrice, maxPrice,
//            availableOnly, sort, page }
export async function listProducts(filters = {}) {
  const {
    q,
    category,
    collection,
    material,
    minPrice,
    maxPrice,
    availableOnly,
    sort = "newest",
    page = 1,
  } = filters;

  let select = CARD_SELECT;
  if (category) select += ", categories!inner(slug)";
  if (collection) select += ", collections!inner(slug)";

  let query = db().from("products").select(select, { count: "exact" });

  if (category) query = query.eq("categories.slug", category);
  if (collection) query = query.eq("collections.slug", collection);
  if (material) query = query.eq("material", material);
  if (minPrice != null) query = query.gte("price", minPrice);
  if (maxPrice != null) query = query.lte("price", maxPrice);

  // Products with variants keep stock on the variants, so they count as available here.
  if (availableOnly)
    query = query.or("stock_quantity.gt.0,has_variants.eq.true");

  // Strip characters that would break the PostgREST or() syntax.
  const term = (q ?? "").replace(/[%,()*\\"]/g, " ").trim();
  if (term) {
    const p = `"%${term}%"`;
    query = query.or(
      `name.ilike.${p},description.ilike.${p},material.ilike.${p},color.ilike.${p}`,
    );
  }

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc")
    query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  query = query.order("id"); // stable paging

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

export async function getFeaturedProducts(limit = 8) {
  return unwrap(
    await db()
      .from("products")
      .select(CARD_SELECT)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export async function getProductBySlug(slug) {
  return unwrap(
    await db()
      .from("products")
      .select(
        `
        id, name, slug, description, story, material, color, dimensions, weight_grams,
        care_instructions, sku, price, discount_price, has_variants, stock_quantity,
        low_stock_threshold, is_featured, category_id, created_at,
        category:categories(name, slug),
        collection:collections(name, slug),
        images:product_images(id, storage_path, alt_text, is_primary, display_order),
        variants:product_variants(id, name, sku, price, stock_quantity, is_active)
      `,
      )
      .eq("slug", slug)
      .maybeSingle(),
  );
}

export async function getRelatedProducts(product, limit = 4) {
  if (!product.category_id) return [];
  return unwrap(
    await db()
      .from("products")
      .select(CARD_SELECT)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export const getCollections = () =>
  cached("collections", TTL, async () =>
    unwrap(
      await db()
        .from("collections")
        .select("id, name, slug, description, banner_path, is_featured")
        .order("display_order"),
    ),
  );

export const getCategories = () =>
  cached("categories", TTL, async () =>
    unwrap(
      await db()
        .from("categories")
        .select("id, name, slug")
        .order("display_order"),
    ),
  );

export const getShopFilterOptions = () =>
  cached("filter-options", TTL, async () => {
    const [categories, collections, materials] = await Promise.all([
      db()
        .from("categories")
        .select("name, slug")
        .order("display_order")
        .then(unwrap),
      db()
        .from("collections")
        .select("name, slug")
        .order("display_order")
        .then(unwrap),
      db().from("products").select("material").then(unwrap),
    ]);
    const distinct = [
      ...new Set(materials.map((m) => m.material).filter(Boolean)),
    ].sort();
    return { categories, collections, materials: distinct };
  });

export async function getProductReviews(productId, limit = 20) {
  return unwrap(
    await db()
      .from("reviews")
      .select('id, rating, title, comment, created_at, is_verified_purchase, images:review_images(id, storage_path)')
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export async function getReviewStats(productId) {
  return unwrap(
    await db()
      .from("product_review_stats")
      .select("review_count, average_rating")
      .eq("product_id", productId)
      .maybeSingle(),
  );
}

export const getDeliveryZones = () =>
  cached("delivery-zones", TTL, async () =>
    unwrap(
      await db()
        .from("delivery_zones")
        .select("code, name, fee, free_delivery_threshold")
        .order("display_order"),
    ),
  );

export const getPublicSetting = (key) =>
  cached(`setting:${key}`, TTL, async () => {
    const data = unwrap(
      await db()
        .from("store_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle(),
    );
    return data?.value ?? null;
  });

// Live data for cart lines. RLS returns only active products.
export async function getProductsByIds(ids) {
  if (!ids.length) return [];
  return unwrap(
    await db()
      .from("products")
      .select(
        `
        id, name, slug, price, discount_price, has_variants, stock_quantity, low_stock_threshold,
        images:product_images(storage_path, alt_text, is_primary, display_order),
        variants:product_variants(id, name, price, stock_quantity, is_active)
      `,
      )
      .in("id", ids),
  );
}

export const getHomeBanners = () =>
  cached("home-banners", TTL, async () =>
    unwrap(
      await db()
        .from("home_banners")
        .select(
          "id, kind, title, subtitle, cta_label, cta_url, image_path, ends_at",
        )
        .order("display_order")
        .order("created_at", { ascending: false })
        .limit(6),
    ),
  );
