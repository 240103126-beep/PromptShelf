import { ApiError, type ApiClient } from './api'
import type { ExportResult } from '@/types'

/**
 * HTTP implementation for the real backend. Endpoints follow a conventional REST
 * shape; adjust paths once the backend contract is final.
 */
export function createHttpApi(baseUrl: string): ApiClient {
  const base = baseUrl.replace(/\/$/, '')

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
    if (!res.ok) {
      const message = await res.text().catch(() => res.statusText)
      throw new ApiError(message || res.statusText, res.status)
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  const json = (method: string, body?: unknown): RequestInit => ({
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const qs = (params: Record<string, unknown>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== false) sp.set(k, String(v))
    const s = sp.toString()
    return s ? `?${s}` : ''
  }

  return {
    listItems: (query = {}) => request(`/items${qs({ ...query })}`),
    getItem: (id) => request(`/items/${encodeURIComponent(id)}`),
    createItem: (input) => request('/items', json('POST', input)),
    createItems: (inputs) => request('/items/batch', json('POST', { items: inputs })),
    updateItem: (id, patch) => request(`/items/${encodeURIComponent(id)}`, json('PATCH', patch)),
    bulkUpdateItems: (ids, patch) => request('/items/bulk', json('PATCH', { ids, patch })),
    deleteItems: (ids) => request('/items/bulk-delete', json('POST', { ids })),

    listTags: () => request('/tags'),
    createTag: (input) => request('/tags', json('POST', input)),
    updateTag: (id, patch) => request(`/tags/${encodeURIComponent(id)}`, json('PATCH', patch)),
    mergeTags: (sourceIds, targetId) => request('/tags/merge', json('POST', { sourceIds, targetId })),
    deleteTag: (id) => request(`/tags/${encodeURIComponent(id)}`, json('DELETE')),

    listCategories: () => request('/categories'),
    createCategory: (input) => request('/categories', json('POST', input)),
    updateCategory: (id, patch) => request(`/categories/${encodeURIComponent(id)}`, json('PATCH', patch)),
    mergeCategories: (sourceIds, targetId) => request('/categories/merge', json('POST', { sourceIds, targetId })),
    deleteCategory: (id) => request(`/categories/${encodeURIComponent(id)}`, json('DELETE')),

    listCollections: () => request('/collections'),
    getCollection: (id) => request(`/collections/${encodeURIComponent(id)}`),
    createCollection: (input) => request('/collections', json('POST', input)),
    updateCollection: (id, patch) => request(`/collections/${encodeURIComponent(id)}`, json('PATCH', patch)),
    deleteCollection: (id) => request(`/collections/${encodeURIComponent(id)}`, json('DELETE')),

    async exportCollections({ collectionIds, format }): Promise<ExportResult> {
      const res = await fetch(`${base}/export`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionIds, format }),
      })
      if (!res.ok) throw new ApiError(res.statusText, res.status)
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `promptshelf-export.${format}`
      const itemCount = Number(res.headers.get('X-Item-Count') ?? 0)
      return { blob: await res.blob(), filename, itemCount }
    },

    ai: {
      suggestTitles: (input) => request('/ai/suggest-titles', json('POST', input)),
      summarize: (input) => request('/ai/summarize', json('POST', input)),
      suggestTags: (input) => request('/ai/suggest-tags', json('POST', input)),
      suggestCategories: (input) => request('/ai/suggest-categories', json('POST', input)),
      improvePrompt: (input) => request('/ai/improve-prompt', json('POST', input)),
      splitChat: (input) => request('/ai/split-chat', json('POST', input)),
      askLibrary: (input) => request('/ai/ask', json('POST', input)),
    },
  }
}
