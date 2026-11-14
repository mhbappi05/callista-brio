export function sortImages(images = []) {
    return [...images].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order
    )
  }