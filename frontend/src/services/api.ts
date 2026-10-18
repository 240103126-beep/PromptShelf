import type {
  AskResult,
  Category,
  ChatMessage,
  Collection,
  ColorKey,
  ExportFormat,
  ExportResult,
  Item,
  ItemInput,
  ItemQuery,
  Locale,
  SplitChatItem,
  Tag,
} from '@/types'

export interface AiClient {
  suggestTitles(input: { prompt: string; response: string }): Promise<string[]>
  summarize(input: { prompt: string; response: string; locale: Locale }): Promise<string>
  suggestTags(input: { prompt: string; response: string }): Promise<string[]>
  suggestCategories(input: { prompt: string; response: string }): Promise<string[]>
  improvePrompt(input: { prompt: string; locale: Locale }): Promise<string>
  splitChat(input: { raw: string }): Promise<SplitChatItem[]>
  askLibrary(input: { question: string; history: ChatMessage[]; locale: Locale }): Promise<AskResult>
}

export interface BulkItemPatch {
  favorite?: boolean
  addTagIds?: string[]
  addCollectionIds?: string[]
  removeCollectionIds?: string[]
}

/**
 * The single contract between the UI and any backend.
 * Every network call in the app must go through an implementation of this interface.
 */
export interface ApiClient {
  listItems(query?: ItemQuery): Promise<Item[]>
  getItem(id: string): Promise<Item>
  createItem(input: ItemInput): Promise<Item>
  createItems(inputs: ItemInput[]): Promise<Item[]>
  updateItem(id: string, patch: Partial<ItemInput>): Promise<Item>
  bulkUpdateItems(ids: string[], patch: BulkItemPatch): Promise<Item[]>
  deleteItems(ids: string[]): Promise<void>

  listTags(): Promise<Tag[]>
  createTag(input: { name: string; color?: ColorKey }): Promise<Tag>
  updateTag(id: string, patch: { name?: string; color?: ColorKey }): Promise<Tag>
  mergeTags(sourceIds: string[], targetId: string): Promise<Tag>
  deleteTag(id: string): Promise<void>

  listCategories(): Promise<Category[]>
  createCategory(input: { name: string; color?: ColorKey }): Promise<Category>
  updateCategory(id: string, patch: { name?: string; color?: ColorKey }): Promise<Category>
  mergeCategories(sourceIds: string[], targetId: string): Promise<Category>
  deleteCategory(id: string): Promise<void>

  listCollections(): Promise<Collection[]>
  getCollection(id: string): Promise<Collection>
  createCollection(input: { name: string; description?: string }): Promise<Collection>
  updateCollection(id: string, patch: { name?: string; description?: string }): Promise<Collection>
  deleteCollection(id: string): Promise<void>

  exportCollections(input: { collectionIds: string[]; format: ExportFormat }): Promise<ExportResult>

  ai: AiClient
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
