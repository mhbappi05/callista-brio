import { supabase } from "@/lib/supabaseClient";
import { extensionFor, prepareImage } from "@/lib/imageUpload";

function db() {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

const MESSAGES = {
  not_signed_in: "Please sign in first.",
  returns_unavailable:
    "Online return requests aren’t available right now. Please contact us.",
  invalid_type: "Choose return or exchange.",
  invalid_reason: "Please tell us why (up to 1,000 characters).",
  order_not_found: "We couldn’t find that order in your account.",
  order_not_delivered:
    "You can request a return once the order has been delivered.",
  return_window_closed: "The return window for this order has closed.",
  return_already_open: "You already have an open request for this order.",
  invalid_items:
    "Choose at least one item, with a quantity no higher than you ordered.",
  review_not_allowed:
    "You can review a product once the order has been delivered.",
  too_many_review_images: "A review can have up to 3 photos.",
  FILE_TYPE: "Use JPG, PNG or WebP photos.",
  FILE_SIZE: "That photo is too large. Try a smaller one.",
};

// Errors from the database arrive as { message: 'code', code: SQLSTATE }.
export function accountErrorMessage(err) {
  if (MESSAGES[err?.message]) return MESSAGES[err.message];
  if (err?.code === "23505") return "You have already submitted this.";
  if (err?.code === "23514")
    return "One of the values isn’t allowed. Please check and try again.";
  return "That didn’t work. Please try again.";
}

function fail(error) {
  if (error) throw error;
}

// ------------------------------------------------------------------ orders
// Every query below filters by user_id explicitly. Row-level security alone
// is not enough: staff accounts can read all orders, and anyone can read
// other people's approved reviews.
export async function listMyOrders(userId) {
  const { data, error } = await db()
    .from("orders")
    .select(
      "id, order_number, order_status, payment_status, payment_method, total_amount, placed_at",
    )
    .eq("user_id", userId)
    .order("placed_at", { ascending: false })
    .limit(50);
  fail(error);
  return data;
}

export async function getMyOrder(userId, orderId) {
  const { data: order, error } = await db()
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  fail(error);
  if (!order) return null;

  const itemIds = order.order_items.map((i) => i.id);
  const [payments, refunds, returns, reviews] = await Promise.all([
    db().from("my_payments").select("*").eq("order_id", orderId),
    db()
      .from("refunds")
      .select("id, amount, status, created_at")
      .eq("order_id", orderId),
    db()
      .from("return_requests")
      .select("*")
      .eq("order_id", orderId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    itemIds.length
      ? db()
          .from("reviews")
          .select("id, order_item_id, status")
          .eq("user_id", userId)
          .in("order_item_id", itemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [payments, refunds, returns, reviews]) fail(r.error);

  return {
    ...order,
    payments: payments.data,
    refunds: refunds.data,
    returns: returns.data,
    reviews: reviews.data,
  };
}

// ----------------------------------------------------------------- returns
export async function requestReturn(orderId, { type, reason, items }) {
  const { data, error } = await db().rpc("request_return", {
    p_order_id: orderId,
    p_type: type,
    p_reason: reason,
    p_items: items,
  });
  fail(error);
  return data;
}

export async function listMyReturns(userId) {
  const { data, error } = await db()
    .from("return_requests")
    .select("*, order:orders(order_number)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  fail(error);
  return data;
}

// ----------------------------------------------------------------- reviews
export async function listMyReviews(userId) {
  const { data, error } = await db()
    .from("reviews")
    .select(
      "id, rating, title, comment, status, created_at, product:products(name, slug), images:review_images(id, storage_path)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  fail(error);
  return data;
}

const ITEM_SELECT = `
  id, product_id, product_name, variant_description, product_image,
  order:orders!inner(order_number, order_status, delivered_at, user_id)
`;

// Delivered items the customer has not reviewed yet.
export async function listReviewableItems(userId) {
  const [items, reviews] = await Promise.all([
    db()
      .from("order_items")
      .select(ITEM_SELECT)
      .eq("order.user_id", userId)
      .eq("order.order_status", "delivered")
      .not("product_id", "is", null)
      .limit(200),
    db().from("reviews").select("order_item_id").eq("user_id", userId),
  ]);
  fail(items.error);
  fail(reviews.error);
  const reviewed = new Set(reviews.data.map((r) => r.order_item_id));
  return items.data.filter((i) => !reviewed.has(i.id));
}

export async function getReviewItem(userId, itemId) {
  const { data, error } = await db()
    .from("order_items")
    .select(ITEM_SELECT)
    .eq("id", itemId)
    .eq("order.user_id", userId)
    .maybeSingle();
  fail(error);
  if (!data) return null;
  const existing = await db()
    .from("reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("order_item_id", itemId)
    .maybeSingle();
  fail(existing.error);
  return { ...data, alreadyReviewed: Boolean(existing.data) };
}

export const MAX_REVIEW_PHOTOS = 3;

async function uploadReviewImage(userId, file) {
  const prepared = await prepareImage(file, { maxWidth: 1200, quality: 0.82 });
  const ext = extensionFor(prepared.type);
  if (!["jpg", "png", "webp"].includes(ext))
    throw Object.assign(new Error("FILE_TYPE"), { code: "FILE_TYPE" });
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db()
    .storage.from("review-images")
    .upload(path, prepared, {
      contentType: prepared.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw error;
  return path;
}

// The review is saved first; photos are then added one by one.
// A photo that fails does not lose the review: it is reported back in `failed`.
export async function submitReview(
  userId,
  { productId, orderItemId, rating, title, comment, files = [] },
) {
  const { data, error } = await db()
    .from("reviews")
    .insert({
      user_id: userId,
      product_id: productId,
      order_item_id: orderItemId,
      rating,
      title: title || null,
      comment: comment || null,
    })
    .select("id")
    .single();
  fail(error);

  const failed = [];
  for (const file of files.slice(0, MAX_REVIEW_PHOTOS)) {
    let path = null;
    try {
      path = await uploadReviewImage(userId, file);
      const res = await db()
        .from("review_images")
        .insert({ review_id: data.id, storage_path: path });
      if (res.error) throw res.error;
    } catch (err) {
      console.error(err);
      failed.push(file.name);
      if (path) await db().storage.from("review-images").remove([path]);
    }
  }
  return { id: data.id, failed };
}

// ----------------------------------------------------------- notifications
export async function listNotifications(userId) {
  const { data, error } = await db()
    .from("notifications")
    .select("id, type, title, body, data, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  fail(error);
  return data;
}

export async function countUnread(userId) {
  const { count, error } = await db()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  fail(error);
  return count ?? 0;
}

export async function markRead(userId, id) {
  const { error } = await db()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  fail(error);
}

export async function markAllRead(userId) {
  const { error } = await db()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  fail(error);
}

// ----------------------------------------------------------------- profile
export async function updateProfile(userId, { full_name, phone }) {
  const { error } = await db()
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", userId);
  fail(error);
}
