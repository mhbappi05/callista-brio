// Prices are NUMERIC(10,2) in the database. Display only.
export function formatBDT(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ''
  return `৳${n.toLocaleString('en-BD')}`
}
