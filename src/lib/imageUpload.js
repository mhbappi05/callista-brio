const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const extensionFor = (type) => TYPES[type] ?? null;
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;

const fail = (code) => Object.assign(new Error(code), { code });

// Shrinks big photos and saves them as WebP. If anything goes wrong the
// original file is used unchanged.
export async function prepareImage(
  file,
  { maxWidth = 1800, quality = 0.85 } = {},
) {
  if (!TYPES[file.type]) throw fail("FILE_TYPE");
  if (file.size > MAX_ORIGINAL_BYTES) throw fail("FILE_SIZE");

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) return file;
    if (scale === 1 && blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.\w+$/, "")}.webp`, {
      type: "image/webp",
    });
  } catch {
    return file;
  }
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

// Splits a FileList (or array) into image files we accept and everything else.
export function filterImageFiles(files) {
  const list = Array.from(files ?? []);
  return {
    accepted: list.filter((f) => IMAGE_TYPES.includes(f.type)),
    rejected: list.filter((f) => !IMAGE_TYPES.includes(f.type)),
  };
}

// How many of `accepted` fit, and how many are left out, given a limit and what already exists.
export function fitToLimit(accepted, existing, max) {
  const room = Math.max(0, max - existing);
  return {
    take: accepted.slice(0, room),
    skipped: Math.max(0, accepted.length - room),
  };
}
