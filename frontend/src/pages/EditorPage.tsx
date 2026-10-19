import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Sparkles, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import { Card, Chip, PageHeader, Skeleton } from '@/components/ui/primitives'
import { ALL_SCOPES, useCategories, useInvalidate, useItem, useTags } from '@/hooks/useData'
import { currentLocale } from '@/lib/locale'
import { useApi } from '@/providers/ApiProvider'
import { SOURCES, type ItemInput, type Source } from '@/types'

const EMPTY: ItemInput = {
  title: '',
  prompt: '',
  response: '',
  source: 'other',
  categoryId: null,
  tagIds: [],
  collectionIds: [],
  notes: '',
  favorite: false,
}

interface AiState {
  titles: string[]
  summary: string
  tags: string[]
  categories: string[]
  improved: string
}
const NO_AI: AiState = { titles: [], summary: '', tags: [], categories: [], improved: '' }

export default function EditorPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { t, i18n } = useTranslation()
  const api = useApi()
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const { data: existing, isLoading, error: loadError } = useItem(id)
  const { data: tagsData } = useTags()
  const { data: categoriesData } = useCategories()
  const tags = tagsData ?? []
  const categories = categoriesData ?? []

  const [form, setForm] = useState<ItemInput>(EMPTY)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [ai, setAi] = useState<AiState>(NO_AI)

  useEffect(() => {
    if (!existing) return
    setForm({
      title: existing.title,
      prompt: existing.prompt,
      response: existing.response,
      source: existing.source,
      categoryId: existing.categoryId,
      tagIds: existing.tagIds,
      collectionIds: existing.collectionIds,
      notes: existing.notes,
      favorite: existing.favorite,
    })
  }, [existing])

  const set = <K extends keyof ItemInput>(key: K, value: ItemInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const toggleTag = (tagId: string) =>
    setForm((f) => ({ ...f, tagIds: f.tagIds.includes(tagId) ? f.tagIds.filter((x) => x !== tagId) : [...f.tagIds, tagId] }))
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : t('common.error'))

  async function save() {
    if (!form.prompt.trim() && !form.response.trim()) {
      setError(t('editor.needContent'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: ItemInput = { ...form, title: form.title.trim() || t('common.untitled') }
      if (isEdit && id) await api.updateItem(id, payload)
      else await api.createItem(payload)
      await invalidate(...ALL_SCOPES)
      navigate('/app')
    } catch (e) {
      fail(e)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!id) return
    try {
      await api.deleteItems([id])
      await invalidate(...ALL_SCOPES)
      navigate('/app')
    } catch (e) {
      fail(e)
    }
  }

  async function applyTag(name: string) {
    const key = name.trim().toLowerCase()
    if (!key) return
    try {
      let tag = tags.find((x) => x.name.toLowerCase() === key)
      if (!tag) {
        tag = await api.createTag({ name: key })
        await invalidate('tags')
      }
      const tagId = tag.id
      setForm((f) => (f.tagIds.includes(tagId) ? f : { ...f, tagIds: [...f.tagIds, tagId] }))
    } catch (e) {
      fail(e)
    }
  }

  async function applyCategory(name: string) {
    const key = name.trim().toLowerCase()
    if (!key) return
    try {
      let cat = categories.find((x) => x.name.toLowerCase() === key)
      if (!cat) {
        cat = await api.createCategory({ name: name.trim() })
        await invalidate('categories')
      }
      set('categoryId', cat.id)
    } catch (e) {
      fail(e)
    }
  }

  async function runAi(kind: string, fn: () => Promise<void>) {
    if (!form.prompt.trim() && !form.response.trim()) {
      setError(t('editor.ai.needText'))
      return
    }
    setError(null)
    setBusy(kind)
    try {
      await fn()
    } catch {
      setError(t('editor.ai.failed'))
    } finally {
      setBusy(null)
    }
  }

  const locale = currentLocale(i18n.language)
  const input = { prompt: form.prompt, response: form.response }

  if (isEdit && isLoading) return <Skeleton className="mx-auto h-96 max-w-6xl" />
  if (isEdit && loadError)
    return (
      <EmptyState
        art="lost"
        title={t('editor.notFound')}
        action={
          <Link to="/app" className="text-sm font-medium text-accent-text underline">
            {t('editor.backToLibrary')}
          </Link>
        }
      />
    )

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        {t('editor.backToLibrary')}
      </Link>
      <PageHeader
        title={isEdit ? t('editor.editTitle') : t('editor.newTitle')}
        actions={
          <>
            <Button variant="secondary" aria-pressed={form.favorite} onClick={() => set('favorite', !form.favorite)}>
              <Star className={form.favorite ? 'fill-current' : ''} aria-hidden />
              {t('editor.favorite')}
            </Button>
            <Button variant="secondary" onClick={() => setPreview((p) => !p)}>
              {preview ? t('editor.edit') : t('editor.preview')}
            </Button>
            {isEdit && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden />
                {t('common.delete')}
              </Button>
            )}
            <Button variant="primary" loading={saving} onClick={save}>
              {t('editor.save')}
            </Button>
          </>
        }
      />

      {error && (
        <p role="alert" className="mb-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div>
            <Label htmlFor="title">{t('editor.fieldTitle')}</Label>
            <Input id="title" value={form.title} placeholder={t('editor.titlePlaceholder')} onChange={(e) => set('title', e.target.value)} />
          </div>

          {preview ? (
            <Card className="space-y-5 p-4">
              {form.prompt && (
                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-faint">{t('editor.fieldPrompt')}</div>
                  <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">{form.prompt}</pre>
                </div>
              )}
              {form.response && (
                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-faint">{t('editor.fieldResponse')}</div>
                  <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">{form.response}</pre>
                </div>
              )}
              {!form.prompt && !form.response && <p className="text-muted">{t('editor.previewEmpty')}</p>}
            </Card>
          ) : (
            <>
              <div>
                <Label htmlFor="prompt">{t('editor.fieldPrompt')}</Label>
                <Textarea id="prompt" mono rows={8} value={form.prompt} placeholder={t('editor.promptPlaceholder')} onChange={(e) => set('prompt', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="response">{t('editor.fieldResponse')}</Label>
                <Textarea id="response" mono rows={10} value={form.response} placeholder={t('editor.responsePlaceholder')} onChange={(e) => set('response', e.target.value)} />
              </div>
            </>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="source">{t('editor.fieldSource')}</Label>
              <Select id="source" value={form.source} onChange={(e) => set('source', e.target.value as Source)}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {t(`sources.${s}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="category">{t('editor.fieldCategory')}</Label>
              <Select id="category" value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
                <option value="">{t('editor.noCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>{t('editor.fieldTags')}</Label>
            <div className="mb-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Chip key={tag.id} color={tag.color} active={form.tagIds.includes(tag.id)} onClick={() => toggleTag(tag.id)}>
                  {tag.name}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                placeholder={t('editor.newTagPlaceholder')}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyTag(newTag)
                    setNewTag('')
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  applyTag(newTag)
                  setNewTag('')
                }}
              >
                {t('editor.addTag')}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">{t('editor.fieldNotes')}</Label>
            <Textarea id="notes" rows={3} value={form.notes} placeholder={t('editor.notesPlaceholder')} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <aside>
          <Card className="space-y-4 p-4 lg:sticky lg:top-6">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-accent" aria-hidden />
              {t('editor.ai.title')}
            </div>
            <p className="text-xs text-faint">{t('editor.ai.hint')}</p>

            <div className="flex flex-col gap-2">
              <Button
                loading={busy === 'title'}
                onClick={() =>
                  runAi('title', async () => {
                    const titles = await api.ai.suggestTitles(input)
                    setAi((a) => ({ ...a, titles }))
                  })
                }
              >
                {t('editor.ai.suggestTitle')}
              </Button>
              {ai.titles.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {ai.titles.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => set('title', title)}
                      className="rounded-[8px] border border-border px-2.5 py-1.5 text-left text-sm hover:border-accent hover:bg-accent-soft"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              )}

              <Button
                loading={busy === 'summary'}
                onClick={() =>
                  runAi('summary', async () => {
                    const summary = await api.ai.summarize({ ...input, locale })
                    setAi((a) => ({ ...a, summary }))
                  })
                }
              >
                {t('editor.ai.summarize')}
              </Button>
              {ai.summary && (
                <div className="rounded-[8px] bg-subtle p-2.5 text-sm">
                  <p className="whitespace-pre-wrap">{ai.summary}</p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-accent-text underline"
                    onClick={() => set('notes', form.notes ? `${form.notes}\n\n${ai.summary}` : ai.summary)}
                  >
                    {t('editor.ai.appendNotes')}
                  </button>
                </div>
              )}

              <Button
                loading={busy === 'tags'}
                onClick={() =>
                  runAi('tags', async () => {
                    const names = await api.ai.suggestTags(input)
                    setAi((a) => ({ ...a, tags: names }))
                  })
                }
              >
                {t('editor.ai.suggestTags')}
              </Button>
              {ai.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ai.tags.map((name) => (
                    <Chip key={name} onClick={() => applyTag(name)}>
                      + {name}
                    </Chip>
                  ))}
                </div>
              )}

              <Button
                loading={busy === 'category'}
                onClick={() =>
                  runAi('category', async () => {
                    const names = await api.ai.suggestCategories(input)
                    setAi((a) => ({ ...a, categories: names }))
                  })
                }
              >
                {t('editor.ai.suggestCategory')}
              </Button>
              {ai.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ai.categories.map((name) => (
                    <Chip key={name} onClick={() => applyCategory(name)}>
                      {name}
                    </Chip>
                  ))}
                </div>
              )}

              <Button
                loading={busy === 'improve'}
                onClick={() =>
                  runAi('improve', async () => {
                    const improved = await api.ai.improvePrompt({ prompt: form.prompt, locale })
                    setAi((a) => ({ ...a, improved }))
                  })
                }
              >
                {t('editor.ai.improve')}
              </Button>
              {ai.improved && (
                <div className="rounded-[8px] bg-subtle p-2.5 text-sm">
                  <p className="whitespace-pre-wrap font-mono text-[12px]">{ai.improved}</p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-accent-text underline"
                    onClick={() => set('prompt', ai.improved)}
                  >
                    {t('editor.ai.useThis')}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t('editor.deleteTitle')}
        description={t('editor.deleteBody')}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}
