// Mirrors normalize_bd_phone() in the database. Returns +8801XXXXXXXXX or null.
export function normalizeBDPhone(input) {
    if (typeof input !== 'string') return null
    const d = input.replace(/\D/g, '')
    let n = null
    if (/^8801\d{9}$/.test(d)) n = `+${d}`
    else if (/^01\d{9}$/.test(d)) n = `+88${d}`
    return n && /^\+8801[3-9]\d{8}$/.test(n) ? n : null
  }