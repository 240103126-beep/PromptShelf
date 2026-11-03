import { describe, expect, it } from 'vitest'
import { itemToMarkdown, slugify } from './exporter'
import type { Item } from '@/types'

const item: Item = {
  id: 'item-1', title: 'SQL notes', prompt: 'Explain indexes', response: 'Indexes speed up reads.',
  source: 'claude', categoryId: 'c1', tagIds: ['t1'], collectionIds: ['col1'],
  notes: 'Check writes too', favorite: true, createdAt: '2026-11-03T08:00:00Z', updatedAt: '2026-11-03T09:00:00Z',
}

describe('Markdown export fidelity', () => {
  it('keeps prompt response notes and metadata readable outside the app', () => {
    const markdown = itemToMarkdown(item, {
      tags: new Map([['t1', { id: 't1', name: 'database', color: 'blue', itemCount: 1 }]]),
      categories: new Map([['c1', { id: 'c1', name: 'Study', color: 'green', itemCount: 1 }]]),
    })
    for (const text of ['# SQL notes', 'Explain indexes', 'Indexes speed up reads.', 'Check writes too', 'Source: Claude', 'Category: Study', '#database', 'Favorite: yes', 'Updated: 2026-11-03']) {
      expect(markdown).toContain(text)
    }
    expect(markdown).not.toContain('undefined')
  })

  it('omits missing optional metadata and empty answer sections', () => {
    const markdown = itemToMarkdown({ ...item, response: '', notes: '', favorite: false }, { tags: new Map(), categories: new Map() })
    expect(markdown).not.toMatch(/Category:|Tags:|Favorite:|## Response|## Notes|undefined/)
    expect(markdown).toContain('Explain indexes')
  })

  it('produces safe portable names while retaining Kazakh and Russian letters', () => {
    expect(slugify('../ SQL / Query?')).toBe('sql-query')
    expect(slugify('Қазақша Промпт')).toBe('қазақша-промпт')
    expect(slugify('!!!')).toBe('untitled')
  })
})
