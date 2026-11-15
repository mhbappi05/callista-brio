import { supabase } from "./supabaseClient";

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <rect width="800" height="800" fill="#F8D8DC"/>
      <text x="400" y="410" font-family="Georgia, serif" font-size="44" fill="#4A141A" text-anchor="middle">Callista Brio</text>
    </svg>`,
  );

function publicUrl(bucket, path) {
  if (!supabase || !path) return PLACEHOLDER;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export const productImageUrl = (path) => publicUrl("product-images", path);
export const bannerImageUrl = (path) =>
  path ? publicUrl("collection-banners", path) : null;
export { PLACEHOLDER as placeholderImage };
export const homeBannerUrl = (path) =>
  path ? publicUrl("home-banners", path) : null;
