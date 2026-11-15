import { supabase } from "@/lib/supabaseClient";
import { getPublicSetting } from "./catalogService";

export class ApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function call(name, body) {
  if (!supabase)
    throw new ApiError("not_configured", "The store connection is not set up.");
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let payload = null;
    try {
      payload = await error.context.json();
    } catch {
      // Network failure or non-JSON response.
    }
    const e = payload?.error;
    throw new ApiError(
      e?.code ?? "network_error",
      e?.message ??
        "We couldn’t reach the store. Please check your connection and try again.",
      e?.details,
    );
  }
  return data;
}

export const quoteOrder = ({ items, district, couponCode, phone }) =>
  call("quote-order", {
    items,
    district,
    coupon_code: couponCode || "",
    phone: phone || "",
  });

export const createOrder = (payload) => call("create-order", payload);

export const trackOrder = (orderNumber, phone) =>
  call("track-order", { order_number: orderNumber, phone });

const SUPPORTED = ["cod", "bkash_manual", "nagad_manual"];

export async function getPaymentOptions() {
  const [methods, instructions] = await Promise.all([
    getPublicSetting("payment_methods"),
    getPublicSetting("payment_instructions"),
  ]);
  return {
    enabled: SUPPORTED.filter((k) => methods?.[k] === true),
    instructions: instructions ?? {},
  };
}
