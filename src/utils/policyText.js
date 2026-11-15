// Turns plain text into safe blocks (never HTML):
//   "# Heading" / "## Subheading", "- list item", blank line between paragraphs.
export function parsePolicy(text) {
    const blocks = []
    let para = []
    let list = []

    const flushPara = () => {
        if (para.length) blocks.push({ type: 'p', text: para.join('\n') })
        para = []
    }
    const flushList = () => {
        if (list.length) blocks.push({ type: 'ul', items: list })
        list = []
    }

    for (const line of String(text ?? '').replace(/\r\n/g, '\n').split('\n')) {
        const t = line.trim()
        if (!t) {
            flushPara()
            flushList()
            continue
        }
        const heading = t.match(/^(#{1,2})\s+(.+)$/)
        if (heading) {
            flushPara()
            flushList()
            blocks.push({ type: 'h', level: heading[1].length === 1 ? 2 : 3, text: heading[2] })
        } else if (/^[-*]\s+/.test(t)) {
            flushPara()
            list.push(t.replace(/^[-*]\s+/, ''))
        } else {
            flushList()
            para.push(t)
        }
    }
    flushPara()
    flushList()
    return blocks
}