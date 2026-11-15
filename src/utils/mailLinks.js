const enc = encodeURIComponent

const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || 'there'

export function replySubject(subject) {
  const s = String(subject ?? '').trim()
  return /^re:/i.test(s) ? s : `Re: ${s}`
}

// A friendly greeting plus the customer's message quoted underneath (shortened,
// because very long links stop working in some mail apps).
export function replyBody(m, maxQuote = 500) {
  const text = String(m.message ?? '').trim()
  const cut = text.length > maxQuote ? `${text.slice(0, maxQuote).trimEnd()}…` : text
  const quoted = cut.split(/\r?\n/).map((line) => `> ${line}`).join('\n')
  return `Hi ${firstName(m.name)},\n\n\n\n--- Your message ---\n${quoted}\n`
}

export function replyLinks(m) {
  const subject = replySubject(m.subject)
  const body = replyBody(m)
  return {
    // Opens a new Gmail compose window in the browser (no mail app needed).
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(m.email)}&su=${enc(subject)}&body=${enc(body)}`,
    // Opens the computer's default mail app, if one is set up. mailto bodies want CRLF line breaks.
    mailto: `mailto:${m.email}?subject=${enc(subject)}&body=${enc(body.replace(/\n/g, '\r\n'))}`,
  }
}