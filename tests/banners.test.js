import { describe, it, expect } from "vitest";
import {
  bannerStatus,
  toSlides,
  validateCtaUrl,
} from "../src/utils/banners.js";

describe("validateCtaUrl", () => {
  it("accepts site paths and web links", () => {
    for (const ok of [
      "/",
      "/shop",
      "/shop?category=jhumkas",
      "https://example.com/x",
      "http://a.co",
    ]) {
      expect(validateCtaUrl(ok)).toBe(true);
    }
  });
  it("rejects anything else, including look-alike and script links", () => {
    for (const bad of [
      "//evil.com",
      "javascript:alert(1)",
      "shop",
      "",
      null,
      "ftp://x.com",
      "data:text/html,hi",
    ]) {
      expect(validateCtaUrl(bad)).toBe(false);
    }
  });
});

describe("bannerStatus", () => {
  const now = Date.parse("2026-12-10T12:00:00Z");
  const base = { is_active: true, starts_at: null, ends_at: null };
  it("follows the same rule as the database", () => {
    expect(bannerStatus(base, now)).toBe("live");
    expect(bannerStatus({ ...base, is_active: false }, now)).toBe("hidden");
    expect(
      bannerStatus({ ...base, starts_at: "2026-12-11T00:00:00Z" }, now),
    ).toBe("scheduled");
    expect(
      bannerStatus({ ...base, ends_at: "2026-12-10T12:00:00Z" }, now),
    ).toBe("expired");
  });
});

describe("toSlides", () => {
  it("maps banners and builds image URLs", () => {
    const [a, b] = toSlides(
      [
        {
          id: "1",
          kind: "offer",
          title: "Eid sale",
          subtitle: null,
          cta_label: "Shop",
          cta_url: "/shop",
          image_path: "a/b.webp",
          ends_at: null,
        },
        {
          id: "2",
          kind: "news",
          title: "Closed Friday",
          subtitle: "Back Saturday",
          cta_label: null,
          cta_url: null,
          image_path: null,
          ends_at: null,
        },
      ],
      (p) => `https://cdn/${p}`,
    );
    expect(a.imageUrl).toBe("https://cdn/a/b.webp");
    expect(a.subtitle).toBe("");
    expect(b.imageUrl).toBeNull();
    expect(b.ctaUrl).toBe("");
  });
});
