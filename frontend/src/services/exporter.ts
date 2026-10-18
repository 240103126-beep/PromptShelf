import JSZip from 'jszip'
import type { Category, Collection, ExportFormat, ExportResult, Item, Tag } from '@/types'

export const SOURCE_LABELS: Record<Item['source'], string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  other: 'Other',
}

export function slugify(input: string): string {
  const slug = input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'untitled'
}

interface Lookup {
  tags: Map<string, Tag>
  categories: Map<string, Category>
}

export function itemToMarkdown(item: Item, lookup: Lookup, headingLevel = 1): string {
  const h = '#'.repeat(headingLevel)
  const sub = '#'.repeat(headingLevel + 1)
  const tags = item.tagIds.map((id) => lookup.tags.get(id)?.name).filter(Boolean) as string[]
  const category = item.categoryId ? lookup.categories.get(item.categoryId)?.name : undefined

  const meta = [
    `- Source: ${SOURCE_LABELS[item.source]}`,
    category ? `- Category: ${category}` : null,
    tags.length ? `- Tags: ${tags.map((t) => `#${t}`).join(' ')}` : null,
    item.favorite ? '- Favorite: yes' : null,
    `- Updated: ${item.updatedAt.slice(0, 10)}`,
  ].filter(Boolean)

  const parts = [`${h} ${item.title || 'Untitled'}`, meta.join('\n'), `${sub} Prompt`, item.prompt.trim()]
  if (item.response.trim()) parts.push(`${sub} Response`, item.response.trim())
  if (item.notes.trim()) parts.push(`${sub} Notes`, item.notes.trim())
  return parts.join('\n\n') + '\n'
}

export async function buildExport(input: {
  collections: Collection[]
  items: Item[]
  tags: Tag[]
  categories: Category[]
  format: ExportFormat
  now?: Date
}): Promise<ExportResult> {
  const lookup: Lookup = {
    tags: new Map(input.tags.map((t) => [t.id, t])),
    categories: new Map(input.categories.map((c) => [c.id, c])),
  }
  const date = (input.now ?? new Date()).toISOString().slice(0, 10)
  const grouped = input.collections.map((col) => ({
    collection: col,
    items: input.items.filter((i) => i.collectionIds.includes(col.id)),
  }))
  const itemCount = new Set(grouped.flatMap((g) => g.items.map((i) => i.id))).size

  if (input.format === 'md') {
    const sections = grouped.map(({ collection, items }) => {
      const header = [`# ${collection.name}`, collection.description].filter(Boolean).join('\n\n')
      const body = items.map((i) => itemToMarkdown(i, lookup, 2)).join('\n---\n\n')
      return `${header}\n\n${body || '_Empty collection_\n'}`
    })
    const md = sections.join('\n\n')
    const name = grouped.length === 1 ? slugify(grouped[0].collection.name) : 'promptshelf-export'
    return {
      blob: new Blob([md], { type: 'text/markdown;charset=utf-8' }),
      filename: `${name}-${date}.md`,
      itemCount,
    }
  }

  const zip = new JSZip()
  const index: string[] = ['# PromptShelf export', '', `Exported ${date}`, '']
  for (const { collection, items } of grouped) {
    const folder = zip.folder(slugify(collection.name))!
    index.push(`## ${collection.name}`, '')
    const used = new Set<string>()
    items.forEach((item, n) => {
      let base = `${String(n + 1).padStart(2, '0')}-${slugify(item.title)}`
      while (used.has(base)) base += '-1'
      used.add(base)
      folder.file(`${base}.md`, itemToMarkdown(item, lookup))
      index.push(`- [${item.title}](${slugify(collection.name)}/${base}.md)`)
    })
    index.push('')
  }
  zip.file('README.md', index.join('\n'))
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
  return { blob, filename: `promptshelf-export-${date}.zip`, itemCount }
}
