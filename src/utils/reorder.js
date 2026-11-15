// Returns the SAME array when nothing changes, so callers can skip a save.
export function moveItem(list, from, to) {
  if (
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length ||
    from === to
  )
    return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const moveToFront = (list, id) => moveItem(list, list.indexOf(id), 0);
export const moveBy = (list, id, delta) =>
  moveItem(list, list.indexOf(id), list.indexOf(id) + delta);
