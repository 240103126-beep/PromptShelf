import { ApiError, type ApiClient } from './api'
import { buildExport } from './exporter'
import { createMockAi } from './mockAi'
import { seedCategories, seedCollections, seedItems, seedTags, type SeedCollection, type SeedTag } from './seed'
import type { Category, Collection, ColorKey, Item, ItemInput, ItemQuery, Tag } from '@/types'

export interface MockApiOptions {
  /** Simulated network latency in ms. Use 0 in tests. */
  latency?: number
  seed?: boolean
}

let counter = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`
const clone = <T>(v: T): T => structuredClone(v)

export function createMockApi({ latency = 300, seed = true }: MockApiOptions = {}): ApiClient {
  let items: Item[] = seed ? clone(seedItems) : []
  let tags: SeedTag[] = seed ? clone(seedTags) : []
  let categories: SeedTag[] = seed ? clone(seedCategories) : []
  let collections: SeedCollection[] = seed ? clone(seedCollections) : []

  const delay = () => new Promise<void>((r) => setTimeout(r, latency ? latency * (0.6 + Math.random() * 0.8) : 0))
  const now = () => new Date().toISOString()

  const withTagCount = (t: SeedTag): Tag => ({ ...t, itemCount: items.filter((i) => i.tagIds.includes(t.id)).length })
  const withCatCount = (c: SeedTag): Category => ({ ...c, itemCount: items.filter((i) => i.categoryId === c.id).length })
  const withColCount = (c: SeedCollection): Collection => ({
    ...c,
    itemCount: items.filter((i) => i.collectionIds.includes(c.id)).length,
  })

  const findItem = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) throw new ApiError('Item not found', 404)
    return item
  }
  const assertName = (name: string | undefined) => {
    if (name !== undefined && !name.trim()) throw new ApiError('Name is required', 422)
  }
  const assertUnique = (list: SeedTag[], name: string, exceptId?: string) => {
    const key = name.trim().toLowerCase()
    if (list.some((x) => x.id !== exceptId && x.name.toLowerCase() === key)) throw new ApiError('Name already exists', 409)
  }

  const sanitize = (input: Partial<ItemInput>): Partial<ItemInput> => {
    const out = { ...input }
    if (out.tagIds) out.tagIds = Array.from(new Set(out.tagIds)).filter((id) => tags.some((t) => t.id === id))
    if (out.collectionIds)
      out.collectionIds = Array.from(new Set(out.collectionIds)).filter((id) => collections.some((c) => c.id === id))
    if (out.categoryId && !categories.some((c) => c.id === out.categoryId)) out.categoryId = null
    if (out.title !== undefined) out.title = out.title.slice(0, 200)
    return out
  }

  const matches = (item: Item, q: ItemQuery) => {
    if (q.tagId && !item.tagIds.includes(q.tagId)) return false
    if (q.categoryId && item.categoryId !== q.categoryId) return false
    if (q.collectionId && !item.collectionIds.includes(q.collectionId)) return false
    if (q.favorite && !item.favorite) return false
    if (q.source && item.source !== q.source) return false
    if (q.search) {
      const needle = q.search.trim().toLowerCase()
      if (needle) {
        const tagNames = item.tagIds.map((id) => tags.find((t) => t.id === id)?.name ?? '').join(' ')
        const hay = `${item.title}\n${item.prompt}\n${item.response}\n${item.notes}\n${tagNames}`.toLowerCase()
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false
      }
    }
    return true
  }

  const sorters: Record<NonNullable<ItemQuery['sort']>, (a: Item, b: Item) => number> = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    title: (a, b) => a.title.localeCompare(b.title),
  }

  const createOne = (input: ItemInput): Item => {
    const ts = now()
    const item: Item = {
      title: '',
      prompt: '',
      response: '',
      source: 'other',
      categoryId: null,
      tagIds: [],
      collectionIds: [],
      notes: '',
      favorite: false,
      ...(sanitize(input) as ItemInput),
      id: uid('item'),
      createdAt: ts,
      updatedAt: ts,
    }
    if (!item.prompt.trim() && !item.response.trim()) throw new ApiError('Prompt or response is required', 422)
    items = [item, ...items]
    return item
  }

  const mergeInto = (list: 'tags' | 'categories', sourceIds: string[], targetId: string) => {
    const sources = sourceIds.filter((id) => id !== targetId)
    if (list === 'tags') {
      if (!tags.some((t) => t.id === targetId)) throw new ApiError('Tag not found', 404)
      items = items.map((i) =>
        i.tagIds.some((id) => sources.includes(id))
          ? { ...i, tagIds: Array.from(new Set(i.tagIds.map((id) => (sources.includes(id) ? targetId : id)))) }
          : i,
      )
      tags = tags.filter((t) => !sources.includes(t.id))
    } else {
      if (!categories.some((c) => c.id === targetId)) throw new ApiError('Category not found', 404)
      items = items.map((i) => (i.categoryId && sources.includes(i.categoryId) ? { ...i, categoryId: targetId } : i))
      categories = categories.filter((c) => !sources.includes(c.id))
    }
  }

  const api: ApiClient = {
    async listItems(query = {}) {
      await delay()
      return clone(items.filter((i) => matches(i, query)).sort(sorters[query.sort ?? 'updated']))
    },
    async getItem(id) {
      await delay()
      return clone(findItem(id))
    },
    async createItem(input) {
      await delay()
      return clone(createOne(input))
    },
    async createItems(inputs) {
      await delay()
      return clone(inputs.map(createOne))
    },
    async updateItem(id, patch) {
      await delay()
      const current = findItem(id)
      const next: Item = { ...current, ...sanitize(patch), id, createdAt: current.createdAt, updatedAt: now() }
      items = items.map((i) => (i.id === id ? next : i))
      return clone(next)
    },
    async bulkUpdateItems(ids, patch) {
      await delay()
      const set = new Set(ids)
      const ts = now()
      items = items.map((i) => {
        if (!set.has(i.id)) return i
        let collectionIds = i.collectionIds
        if (patch.addCollectionIds) collectionIds = [...collectionIds, ...patch.addCollectionIds]
        if (patch.removeCollectionIds) collectionIds = collectionIds.filter((c) => !patch.removeCollectionIds!.includes(c))
        const s = sanitize({
          tagIds: patch.addTagIds ? [...i.tagIds, ...patch.addTagIds] : i.tagIds,
          collectionIds,
        })
        return { ...i, ...s, favorite: patch.favorite ?? i.favorite, updatedAt: ts }
      })
      return clone(items.filter((i) => set.has(i.id)))
    },
    async deleteItems(ids) {
      await delay()
      const set = new Set(ids)
      items = items.filter((i) => !set.has(i.id))
    },

    async listTags() {
      await delay()
      return tags.map(withTagCount).sort((a, b) => a.name.localeCompare(b.name))
    },
    async createTag({ name, color = 'gray' }) {
      await delay()
      assertName(name)
      assertUnique(tags, name)
      const tag = { id: uid('tag'), name: name.trim().toLowerCase(), color }
      tags = [...tags, tag]
      return withTagCount(tag)
    },
    async updateTag(id, patch) {
      await delay()
      assertName(patch.name)
      if (patch.name) assertUnique(tags, patch.name, id)
      const tag = tags.find((t) => t.id === id)
      if (!tag) throw new ApiError('Tag not found', 404)
      const next = { ...tag, ...patch, name: (patch.name ?? tag.name).trim().toLowerCase() }
      tags = tags.map((t) => (t.id === id ? next : t))
      return withTagCount(next)
    },
    async mergeTags(sourceIds, targetId) {
      await delay()
      mergeInto('tags', sourceIds, targetId)
      return withTagCount(tags.find((t) => t.id === targetId)!)
    },
    async deleteTag(id) {
      await delay()
      tags = tags.filter((t) => t.id !== id)
      items = items.map((i) => (i.tagIds.includes(id) ? { ...i, tagIds: i.tagIds.filter((t) => t !== id) } : i))
    },

    async listCategories() {
      await delay()
      return categories.map(withCatCount).sort((a, b) => a.name.localeCompare(b.name))
    },
    async createCategory({ name, color = 'gray' }) {
      await delay()
      assertName(name)
      assertUnique(categories, name)
      const cat = { id: uid('cat'), name: name.trim(), color }
      categories = [...categories, cat]
      return withCatCount(cat)
    },
    async updateCategory(id, patch) {
      await delay()
      assertName(patch.name)
      if (patch.name) assertUnique(categories, patch.name, id)
      const cat = categories.find((c) => c.id === id)
      if (!cat) throw new ApiError('Category not found', 404)
      const next = { ...cat, ...patch, name: (patch.name ?? cat.name).trim() }
      categories = categories.map((c) => (c.id === id ? next : c))
      return withCatCount(next)
    },
    async mergeCategories(sourceIds, targetId) {
      await delay()
      mergeInto('categories', sourceIds, targetId)
      return withCatCount(categories.find((c) => c.id === targetId)!)
    },
    async deleteCategory(id) {
      await delay()
      categories = categories.filter((c) => c.id !== id)
      items = items.map((i) => (i.categoryId === id ? { ...i, categoryId: null } : i))
    },

    async listCollections() {
      await delay()
      return collections.map(withColCount).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async getCollection(id) {
      await delay()
      const col = collections.find((c) => c.id === id)
      if (!col) throw new ApiError('Collection not found', 404)
      return withColCount(col)
    },
    async createCollection({ name, description = '' }) {
      await delay()
      if (!name.trim()) throw new ApiError('Name is required', 422)
      const col = { id: uid('col'), name: name.trim(), description: description.trim(), createdAt: now() }
      collections = [col, ...collections]
      return withColCount(col)
    },
    async updateCollection(id, patch) {
      await delay()
      assertName(patch.name)
      const col = collections.find((c) => c.id === id)
      if (!col) throw new ApiError('Collection not found', 404)
      const next = { ...col, ...patch }
      collections = collections.map((c) => (c.id === id ? next : c))
      return withColCount(next)
    },
    async deleteCollection(id) {
      await delay()
      collections = collections.filter((c) => c.id !== id)
      items = items.map((i) =>
        i.collectionIds.includes(id) ? { ...i, collectionIds: i.collectionIds.filter((c) => c !== id) } : i,
      )
    },

    async exportCollections({ collectionIds, format }) {
      await delay()
      const selected = collectionIds
        .map((id) => collections.find((c) => c.id === id))
        .filter((c): c is SeedCollection => Boolean(c))
      if (!selected.length) throw new ApiError('Select at least one collection', 422)
      return buildExport({
        collections: selected.map(withColCount),
        items: [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        tags: tags.map(withTagCount),
        categories: categories.map(withCatCount),
        format,
      })
    },

    ai: createMockAi({
      delay: () => new Promise((r) => setTimeout(r, latency ? latency * 3 : 0)),
      getItems: () => items,
      getTags: () => tags.map(withTagCount),
      getCategories: () => categories.map(withCatCount),
    }),
  }
  return api
}

export type { ColorKey }
