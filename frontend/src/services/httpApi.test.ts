import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { selectApi } from './index'

// Verify transport failure/success boundaries, rather than duplicating every route.
afterEach(() => vi.unstubAllGlobals())

describe('HTTP API transport', () => {
  it('preserves the status and backend explanation on a rejected mutation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Name already exists', { status: 409 })))
    await expect(createHttpApi('/api/').createTag({ name: 'sql' })).rejects.toMatchObject({
      name: 'ApiError', status: 409, message: 'Name already exists',
    })
  })

  it('accepts a bodyless delete response without attempting JSON parsing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(createHttpApi('/api').deleteTag('1')).resolves.toBeUndefined()
  })

  it('encodes search text without turning it into extra query parameters', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('[]', { headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    await createHttpApi('/api').listItems({ search: 'SQL & source=claude', favorite: true, sort: 'title' })
    const url = new URL(fetch.mock.calls[0][0], 'https://example.test')
    expect(url.searchParams.get('search')).toBe('SQL & source=claude')
    expect(url.searchParams.has('source')).toBe(false)
    expect(url.searchParams.get('favorite')).toBe('true')
  })

  it('retains download filename, contents and unique item count from server headers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('# Saved prompt', {
      headers: { 'Content-Disposition': 'attachment; filename="my-library.md"', 'X-Item-Count': '3' },
    })))
    const result = await createHttpApi('/api').exportCollections({ collectionIds: ['7'], format: 'md' })
    expect(result.filename).toBe('my-library.md')
    expect(result.itemCount).toBe(3)
    expect(await result.blob.text()).toBe('# Saved prompt')
  })

  it('does not produce a successful download when export is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Invalid collection', { status: 422, statusText: 'Unprocessable Content' })))
    await expect(createHttpApi('/api').exportCollections({ collectionIds: ['missing'], format: 'zip' })).rejects.toMatchObject({ status: 422 })
  })

  it('selects the real HTTP backend when mock mode is disabled', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('[]'))
    vi.stubGlobal('fetch', fetch)
    await selectApi({ VITE_USE_MOCK: 'false', VITE_API_URL: '/real-api', MODE: 'test' }).listTags()
    expect(fetch.mock.calls[0][0]).toBe('/real-api/tags')
  })
})
