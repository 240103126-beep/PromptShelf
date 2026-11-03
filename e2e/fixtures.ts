import { test as base, expect, type APIRequestContext } from '@playwright/test'

export type ItemInput = {
  title: string; prompt: string; response?: string; source?: string;
  categoryId?: string | null; tagIds?: string[]; collectionIds?: string[];
  notes?: string; favorite?: boolean;
}
export class TestData {
  readonly prefix = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  constructor(readonly request: APIRequestContext) {}
  name(label: string) { return `${this.prefix} ${label}` }
  async post(path: string, data: unknown): Promise<any> {
    const result = await this.request.post(`/api${path}`, { data })
    expect(result.ok(), `${path}: ${await result.text()}`).toBeTruthy()
    return result.json()
  }
  async item(label: string, patch: Partial<ItemInput> = {}) {
    return this.post('/items', {
      title: this.name(label), prompt: `Explain ${this.name(label)}`, response: 'A useful answer.',
      source: 'chatgpt', categoryId: null, tagIds: [], collectionIds: [], notes: '', favorite: false,
      ...patch,
    })
  }
  async tag(label: string) { return this.post('/tags', { name: this.name(label), color: 'indigo' }) }
  async category(label: string) { return this.post('/categories', { name: this.name(label), color: 'blue' }) }
  async collection(label: string) { return this.post('/collections', { name: this.name(label), description: 'Browser test collection' }) }
  async cleanup() {
    // Delete only data created by this test; never reset an existing user's DB.
    const items = await (await this.request.get('/api/items')).json()
    const ids = items.filter((x: any) => x.title.startsWith(this.prefix)).map((x: any) => x.id)
    if (ids.length) await this.request.post('/api/items/bulk-delete', { data: { ids } })
    for (const kind of ['collections', 'tags', 'categories']) {
      const entries = await (await this.request.get(`/api/${kind}`)).json()
      for (const entry of entries.filter((x: any) => x.name.startsWith(this.prefix))) {
        await this.request.delete(`/api/${kind}/${entry.id}`)
      }
    }
  }
}
export const test = base.extend<{ data: TestData }>({
  data: async ({ request, page }, use) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('ps-lang')) localStorage.setItem('ps-lang', 'en')
      if (!localStorage.getItem('ps-theme')) localStorage.setItem('ps-theme', 'light')
    })
    const data = new TestData(request)
    await use(data)
    await data.cleanup()
  },
})
export { expect } from '@playwright/test'
