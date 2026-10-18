import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import { useApi } from '@/providers/ApiProvider'
import type { ItemQuery } from '@/types'

type Scope = 'items' | 'item' | 'tags' | 'categories' | 'collections' | 'collection'

export function useItems(query: ItemQuery = {}) {
  const api = useApi()
  return useSWR(['items', query], () => api.listItems(query), { keepPreviousData: true })
}

export function useItem(id: string | undefined) {
  const api = useApi()
  return useSWR(id ? ['item', id] : null, () => api.getItem(id!), { shouldRetryOnError: false })
}

export function useTags() {
  const api = useApi()
  return useSWR(['tags'], () => api.listTags())
}

export function useCategories() {
  const api = useApi()
  return useSWR(['categories'], () => api.listCategories())
}

export function useCollections() {
  const api = useApi()
  return useSWR(['collections'], () => api.listCollections())
}

export function useCollection(id: string | undefined) {
  const api = useApi()
  return useSWR(id ? ['collection', id] : null, () => api.getCollection(id!), { shouldRetryOnError: false })
}

/** Revalidate every cached query belonging to the given scopes. */
export function useInvalidate() {
  const { mutate } = useSWRConfig()
  return useCallback(
    (...scopes: Scope[]) =>
      mutate((key) => Array.isArray(key) && scopes.includes(key[0] as Scope), undefined, { revalidate: true }),
    [mutate],
  )
}

export const ALL_SCOPES: Scope[] = ['items', 'item', 'tags', 'categories', 'collections', 'collection']
