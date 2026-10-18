export type Source = 'chatgpt' | 'claude' | 'gemini' | 'other'
export const SOURCES: Source[] = ['chatgpt', 'claude', 'gemini', 'other']

export type ColorKey = 'gray' | 'red' | 'amber' | 'green' | 'teal' | 'blue' | 'indigo' | 'violet' | 'pink'
export const COLOR_KEYS: ColorKey[] = ['gray', 'red', 'amber', 'green', 'teal', 'blue', 'indigo', 'violet', 'pink']

export type Locale = 'kk' | 'ru' | 'en'

export interface Item {
  id: string
  title: string
  prompt: string
  response: string
  source: Source
  categoryId: string | null
  tagIds: string[]
  collectionIds: string[]
  notes: string
  favorite: boolean
  createdAt: string
  updatedAt: string
}

export type ItemInput = Omit<Item, 'id' | 'createdAt' | 'updatedAt'>

export interface Tag {
  id: string
  name: string
  color: ColorKey
  itemCount: number
}

export interface Category {
  id: string
  name: string
  color: ColorKey
  itemCount: number
}

export interface Collection {
  id: string
  name: string
  description: string
  createdAt: string
  itemCount: number
}

export type SortKey = 'updated' | 'newest' | 'oldest' | 'title'

export interface ItemQuery {
  search?: string
  tagId?: string
  categoryId?: string
  collectionId?: string
  favorite?: boolean
  source?: Source
  sort?: SortKey
}

export type ExportFormat = 'md' | 'zip'

export interface ExportResult {
  blob: Blob
  filename: string
  itemCount: number
}

export interface SplitChatItem {
  title: string
  prompt: string
  response: string
  source: Source
}

export interface Citation {
  itemId: string
  title: string
}

export interface AskResult {
  answer: string
  citations: Citation[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}
