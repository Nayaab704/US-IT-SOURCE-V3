/**
 * Case-study pages (/work/<slug>) are written in plain Markdown in docs/case-studies/<file>.md and
 * bundled at build time. A deliberately small format (see docs/ADDING_A_PROJECT.md):
 *
 *   ---
 *   title: …  client: …  subtitle: …  description: …   (frontmatter, one per line)
 *   ---
 *   ## Section heading
 *   A paragraph. **Bold** works.
 *   - Label: text        (a list item with a label)
 *   - Plain list item
 *
 * Some headings get a special layout (matched by words in the heading): "lifecycle" / "workflow" →
 * the line with stages; "what we built" → two-column list; "update each other" → the animated action
 * sequence; "roles" → role columns; "stack" → inline list. Everything else renders as text / list.
 */
const files = import.meta.glob('../../docs/case-studies/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export type SectionKind = 'lifecycle' | 'modules' | 'actions' | 'roles' | 'stack' | 'text'

export interface CaseItem {
  label: string | null
  /** HTML (escaped, with **bold** → <strong>). */
  html: string
  /** Plain text (for the action sequence: "trigger → result"). */
  text: string
}

export interface CaseSection {
  id: string
  heading: string
  kind: SectionKind
  /** Paragraphs as HTML. */
  paragraphs: string[]
  items: CaseItem[]
  empty: boolean
}

export interface CaseStudy {
  title: string
  client: string
  subtitle: string
  description: string
  sections: CaseSection[]
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const inline = (s: string) => escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function kindOf(heading: string): SectionKind {
  const h = heading.toLowerCase()
  if (h.includes('lifecycle') || h.includes('workflow')) return 'lifecycle'
  if (h.includes('what we built')) return 'modules'
  if (h.includes('update each other')) return 'actions'
  if (h.includes('roles')) return 'roles'
  if (h.includes('stack')) return 'stack'
  return 'text'
}

export function parseCaseStudy(raw: string): CaseStudy {
  let src = raw.replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '')
  const meta: Record<string, string> = {}
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?/)
  if (fm) {
    for (const line of fm[1]!.split('\n')) {
      const i = line.indexOf(':')
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
    src = src.slice(fm[0].length)
  }
  const sections: CaseSection[] = []
  for (const chunk of src.split(/^## /m).slice(1)) {
    const [headingLine, ...rest] = chunk.split('\n')
    const heading = headingLine!.trim()
    const paragraphs: string[] = []
    const items: CaseItem[] = []
    let para: string[] = []
    const flush = () => {
      if (para.length) paragraphs.push(inline(para.join(' ')))
      para = []
    }
    for (const line of rest) {
      const t = line.trim()
      if (!t) {
        flush()
        continue
      }
      if (t.startsWith('- ')) {
        flush()
        const body = t.slice(2).trim()
        const c = body.indexOf(': ')
        const label = c > 0 && c < 60 ? body.slice(0, c) : null
        const text = label ? body.slice(c + 2) : body
        items.push({ label, html: inline(text), text })
      } else para.push(t)
    }
    flush()
    sections.push({ id: slugify(heading), heading, kind: kindOf(heading), paragraphs, items, empty: !paragraphs.length && !items.length })
  }
  return {
    title: meta.title ?? '',
    client: meta.client ?? '',
    subtitle: meta.subtitle ?? '',
    description: meta.description ?? '',
    sections,
  }
}

/** The case study in docs/case-studies/<file> (null if the file does not exist). */
export function loadCaseStudy(file: string): CaseStudy | null {
  const raw = files[`../../docs/case-studies/${file}`]
  return raw === undefined ? null : parseCaseStudy(raw)
}
