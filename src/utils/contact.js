import { normalizeBDPhone } from "./phone.js";

// tel: and WhatsApp links from a typed number. Bangladesh numbers may be typed
// locally (01712-345678); anything else must include the country code.
export function phoneLinks(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const bd = normalizeBDPhone(raw);
  const digits = bd ? bd.slice(1) : raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (!bd && digits.startsWith("0")) return null; // local format we can't turn into a valid link
  return { tel: `tel:+${digits}`, wa: `https://wa.me/${digits}` };
}

const HOSTS = {
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: [
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    "fb.com",
    "www.fb.com",
  ],
};
const BASE = {
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
};

// Accepts "name", "@name" or a profile link. Returns '' when empty and
// null when the value isn't a valid handle for that network.
export function cleanHandle(kind, input) {
  let v = String(input ?? "").trim();
  if (!v) return "";
  if (
    /^https?:\/\//i.test(v) ||
    /^(www\.|m\.)?(instagram|facebook|fb)\.com/i.test(v)
  ) {
    try {
      const url = new URL(/^https?:/i.test(v) ? v : `https://${v}`);
      if (!HOSTS[kind].includes(url.hostname.toLowerCase())) return null;
      v = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return null;
    }
  }
  v = v.replace(/^@/, "");
  if (v === "profile.php") return null;
  return /^[A-Za-z0-9._-]{1,60}$/.test(v) ? v : null;
}

export function socialUrl(kind, input) {
  const handle = cleanHandle(kind, input);
  return handle ? `${BASE[kind]}${handle}` : null;
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const countLinks = (s) =>
  (String(s ?? "").match(/https?:\/\/|www\./gi) ?? []).length;

export function validateContactForm(v) {
  const e = {};
  if (!v.name.trim()) e.name = "Enter your name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!v.subject.trim()) e.subject = "Enter a subject.";
  const m = v.message.trim();
  if (!m) e.message = "Write your message.";
  else if (m.length > 3000)
    e.message = "Please keep your message under 3,000 characters.";
  else if (countLinks(m) > 3) e.message = "Please remove some of the links.";
  return e;
}
